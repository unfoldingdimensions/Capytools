import { NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedApiRequest, ParsedResumeData } from '@/types/api.types';
import { prisma } from '@/lib/db/prisma';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { decryptJSON, encryptJSON } from '@/lib/security/encryption';

/**
 * POST /api/uploaded-resumes/create-from-upload
 * Create a new resume from an uploaded file's parsed data
 */

async function handler(req: AuthenticatedApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: `Method ${req.method || 'UNKNOWN'} not allowed`,
                statusCode: 405,
            },
        });
        return;
    }

    const { userId } = req;
    const { uploadId, title } = req.body as { uploadId?: string; title?: string };

    if (!uploadId) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'uploadId is required',
                statusCode: 400,
            },
        });
        return;
    }

    // Fetch the upload
    const upload = await prisma.uploadedFile.findUnique({
        where: { id: uploadId },
    });

    if (!upload) {
        res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Upload not found',
                statusCode: 404,
            },
        });
        return;
    }

    if (upload.userId !== userId) {
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'You do not have permission to access this upload',
                statusCode: 403,
            },
        });
        return;
    }

    if (upload.status !== 'COMPLETED' || !upload.extractedDataEncrypted) {
        res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_STATE',
                message: 'Upload is not in a completed state or has no parsed data',
                statusCode: 400,
            },
        });
        return;
    }

    // Decrypt parsed data
    const parsedData = decryptJSON(upload.extractedDataEncrypted) as ParsedResumeData;

    // Create resume from parsed data
    const resumeTitle =
        title ||
        parsedData.personalInfo?.fullName ||
        upload.originalFilename.replace(/\.(pdf|docx?)$/i, '') ||
        'Imported Resume';

    // Transform parsed data to match expected structure with required fields
    const personalInfo = parsedData.personalInfo || {};

    // Transform work experience - add required fields with defaults
    const workExperience = (parsedData.workExperience || []).map((exp, index) => ({
        id: `temp_upload_${Date.now()}_${index}`,
        company: exp.company || '',
        position: exp.position || '',
        location: exp.location || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        current: exp.current || false,
        description: exp.description || '',
        achievements: exp.achievements || [],
    }));

    // Transform education - map field names and add required fields
    const education = (parsedData.education || []).map((edu, index) => ({
        id: `temp_upload_${Date.now()}_${index}`,
        institution: edu.institution || '',
        degree: edu.degree || '',
        field: edu.field || '', // Note: parser might have different field names
        location: edu.location || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        current: edu.current || false,
        gpa: edu.gpa || '',
        achievements: edu.achievements || [],
    }));

    // Transform projects - add required fields
    const projects = (parsedData.projects || []).map((proj, index) => ({
        id: `temp_upload_${Date.now()}_${index}`,
        title: proj.title || '',
        description: proj.description || '',
        technologies: proj.technologies || [],
        url: proj.url || '',
        githubUrl: proj.githubUrl || '',
        startDate: proj.startDate || '',
        endDate: proj.endDate || '',
        highlights: proj.highlights || [],
    }));

    // Transform skills - ensure proper category structure
    const skills = (parsedData.skills || []).map((skill, index) => ({
        id: `temp_upload_${Date.now()}_${index}`,
        category: skill.category || 'Skills',
        skills: skill.skills || [],
    }));

    // Transform certifications - add required fields
    const certifications = (parsedData.certifications || []).map((cert, index) => ({
        id: `temp_upload_${Date.now()}_${index}`,
        name: cert.name || '',
        issuer: cert.issuer || '',
        issueDate: cert.issueDate || '',
        expiryDate: cert.expiryDate || '',
        credentialId: cert.credentialId || '',
        credentialUrl: cert.credentialUrl || '',
    }));

    // Create structured resume data
    const resumeData = {
        personalInfo,
        workExperience,
        education,
        projects,
        skills,
        certifications,
        customSections: [],
    };

    const resume = await prisma.resume.create({
        data: {
            userId,
            title: resumeTitle,
            personalInfoEncrypted: encryptJSON(personalInfo),
            workExperienceEncrypted: encryptJSON(workExperience),
            educationEncrypted: encryptJSON(education),
            projectsEncrypted: encryptJSON(projects),
            skillsEncrypted: encryptJSON(skills),
            certificationsEncrypted: encryptJSON(certifications),
            customSectionsEncrypted: encryptJSON([]), // Initialize with empty array
            data: JSON.parse(JSON.stringify(resumeData)), // Store full data for AI features
        },
    });

    // Log creation
    await prisma.auditLog.create({
        data: {
            userId,
            action: 'create_resume_from_upload',
            resource: 'resume',
            resourceId: resume.id,
            success: true,
            metadata: JSON.stringify({
                uploadId,
                resumeTitle,
            }),
        },
    });

    res.status(201).json({
        success: true,
        data: {
            resumeId: resume.id,
            title: resume.title,
        },
        message: 'Resume created successfully from uploaded file',
    });
}

// Apply middleware
export default asyncHandler(async (req: NextApiRequest, res: NextApiResponse) => {
    await requireAuth(req, res, async () => {
        await rateLimit()(req, res, async () => {
            await handler(req as AuthenticatedApiRequest, res);
        });
    });
});

