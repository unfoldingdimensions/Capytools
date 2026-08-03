import { NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedApiRequest } from '@/types/api.types';
import { prisma } from '@/lib/db/prisma';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { exportResume } from '@/lib/services/resumeExport.service';
import { decryptJSON } from '@/lib/security/encryption';
import { ResumeData, ExportFormat } from '@/types/resume.types';
import { z } from 'zod';

/**
 * POST /api/resumes/export - Export a resume to PDF or DOCX
 */

const exportSchema = z.object({
    resumeId: z.string().cuid(),
    format: z.enum(['PDF', 'DOCX']),
    isAtsMode: z.boolean().optional(),
    headline: z.string().max(120).optional(),
});

async function handler(req: AuthenticatedApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: `Method ${req.method || 'UNKNOWN'} not allowed on this endpoint`,
                statusCode: 405,
            },
        });
        return;
    }

    const { userId } = req;

    // Validate request body
    const { resumeId, format, isAtsMode, headline } = exportSchema.parse(req.body);

    // Get resume
    const resume = await prisma.resume.findFirst({
        where: {
            id: resumeId,
            userId,
        },
    });

    if (!resume) {
        res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Resume not found or access denied',
                statusCode: 404,
            },
        });
        return;
    }

    // Decrypt resume data - only decrypt if encrypted data exists
    const resumeData: ResumeData = {
        personalInfo: resume.personalInfoEncrypted
            ? decryptJSON(resume.personalInfoEncrypted)
            : { fullName: '', email: '' },
        workExperience: resume.workExperienceEncrypted
            ? decryptJSON(resume.workExperienceEncrypted)
            : [],
        education: resume.educationEncrypted
            ? decryptJSON(resume.educationEncrypted)
            : [],
        projects: resume.projectsEncrypted
            ? decryptJSON(resume.projectsEncrypted)
            : [],
        skills: resume.skillsEncrypted
            ? decryptJSON(resume.skillsEncrypted)
            : [],
        certifications: resume.certificationsEncrypted
            ? decryptJSON(resume.certificationsEncrypted)
            : [],
        customSections: resume.customSectionsEncrypted
            ? decryptJSON(resume.customSectionsEncrypted)
            : [],
    };

    // Create export record
    const exportRecord = await prisma.export.create({
        data: {
            resumeId,
            format: format as ExportFormat,
            status: 'PROCESSING',
        },
    });

    try {
        // Export resume
        const result = exportResume(resumeData, { format: format as ExportFormat, isAtsMode, headline });
        const buffer = result instanceof Promise ? await result : result;

        // Update export record
        await prisma.export.update({
            where: { id: exportRecord.id },
            data: {
                status: 'COMPLETED',
                fileSize: buffer.length,
                completedAt: new Date(),
            },
        });

        // Note: Basic resume exports are FREE (Phase 1 feature)
        // Credits are only required for premium AI features

        // Log export
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'export_resume',
                resource: 'resume',
                resourceId: resumeId,
                success: true,
                metadata: JSON.stringify({ format, fileSize: buffer.length }),
            },
        });

        // Set response headers
        const filename = `${resume.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format.toLowerCase()}`;
        const mimeType = format === 'PDF'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);

        res.status(200).send(buffer);
    } catch (error) {
        // Update export record with error
        await prisma.export.update({
            where: { id: exportRecord.id },
            data: {
                status: 'FAILED',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
        });

        throw error;
    }
}

// Apply middleware
export default asyncHandler(async (req: NextApiRequest, res: NextApiResponse) => {
    await requireAuth(req, res, async () => {
        // No credit check for basic exports - Phase 1 feature is FREE
        await rateLimit({ maxRequests: 10, windowMs: 900000 })(req, res, async () => {
            await handler(req as AuthenticatedApiRequest, res);
        });
    });
});

// Disable body parser for binary data
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

