import { NextApiRequest, NextApiResponse } from 'next';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { getAIConfigFromRequest } from '@/lib/ai-config-helper';
import { buildRoleBaselineJobDescription } from '@/lib/ai/roleProfiles';
import { prisma } from '@/lib/db/prisma';
import { decryptJSON } from '@/lib/security/encryption';
import * as sectionTailoringService from '@/lib/services/sectionTailoring.service';
import { AuthenticatedApiRequest } from '@/types/api.types';
import type { ResumeData, WorkExperience, Education, Project } from '@/types/resume.types';
import type { ParsedJobDescription } from '@/types/ai.types';

/**
 * POST /api/ai/optimize-section
 * Optimize a resume section for the resume's TARGET ROLES (no job description needed).
 * Returns the same response shape as /api/ai/tailor-section so the client-side
 * SuggestionCard apply logic works unchanged.
 */

const VALID_SECTIONS = ['summary', 'workExperience', 'education', 'projects', 'skills'];

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: `Method ${req.method || 'UNKNOWN'} not allowed`,
                statusCode: 405,
            },
        });
    }

    try {
        const authReq = req as AuthenticatedApiRequest;
        const { resumeId, section, sectionData } = req.body as {
            resumeId?: string;
            section?: string;
            sectionData?: unknown;
        };

        if (!resumeId || typeof resumeId !== 'string') {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Resume ID is required', statusCode: 400 },
            });
        }

        if (!section || typeof section !== 'string' || !VALID_SECTIONS.includes(section)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: `Invalid section. Must be one of: ${VALID_SECTIONS.join(', ')}`,
                    statusCode: 400,
                },
            });
        }

        // Fetch resume
        const resume = await prisma.resume.findFirst({
            where: { id: resumeId, userId: authReq.userId },
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Resume not found or access denied', statusCode: 404 },
            });
        }

        const targetRoles = resume.targetRoles || [];
        if (targetRoles.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'NO_TARGET_ROLES',
                    message: 'Set target roles on this resume to use role-based optimization',
                    statusCode: 400,
                },
            });
        }

        // Decrypt resume data
        const resumeData: ResumeData = {
            personalInfo: resume.personalInfoEncrypted
                ? decryptJSON(resume.personalInfoEncrypted)
                : { fullName: '', email: '' },
            workExperience: resume.workExperienceEncrypted ? decryptJSON(resume.workExperienceEncrypted) : [],
            education: resume.educationEncrypted ? decryptJSON(resume.educationEncrypted) : [],
            projects: resume.projectsEncrypted ? decryptJSON(resume.projectsEncrypted) : [],
            skills: resume.skillsEncrypted ? decryptJSON(resume.skillsEncrypted) : [],
            certifications: resume.certificationsEncrypted ? decryptJSON(resume.certificationsEncrypted) : [],
            customSections: resume.customSectionsEncrypted ? decryptJSON(resume.customSectionsEncrypted) : [],
        };

        // Synthetic job description built from the resume's target roles
        const parsedJob = buildRoleBaselineJobDescription(targetRoles) as ParsedJobDescription;

        const aiConfig = getAIConfigFromRequest(req);

        // Generate section-specific suggestions
        let suggestions: unknown;

        switch (section) {
            case 'summary':
                suggestions = await sectionTailoringService.generateTailoredSummary(resumeData, parsedJob, aiConfig, targetRoles);
                break;
            case 'workExperience':
                suggestions = await sectionTailoringService.generateTailoredWorkExperience(
                    (sectionData as WorkExperience[] | WorkExperience) || resumeData.workExperience,
                    resumeData,
                    parsedJob,
                    aiConfig,
                    targetRoles
                );
                break;
            case 'education':
                suggestions = await sectionTailoringService.generateTailoredEducation(
                    (sectionData as Education[] | Education) || resumeData.education,
                    parsedJob,
                    aiConfig,
                    targetRoles
                );
                break;
            case 'projects':
                suggestions = await sectionTailoringService.generateTailoredProjects(
                    (sectionData as Project[] | Project) || resumeData.projects,
                    parsedJob,
                    aiConfig,
                    targetRoles
                );
                break;
            case 'skills':
                suggestions = await sectionTailoringService.generateTailoredSkills(
                    resumeData.skills || [],
                    parsedJob,
                    aiConfig,
                    targetRoles
                );
                break;
        }

        return res.status(200).json({
            success: true,
            data: { suggestions },
            message: 'Section optimized for target roles',
        });
    } catch (error) {
        console.error('Optimize section error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'AI_SERVICE_ERROR',
                message: error instanceof Error ? error.message : 'Failed to optimize section',
                statusCode: 500,
            },
        });
    }
}

// Apply middleware
export default asyncHandler(async (req: NextApiRequest, res: NextApiResponse) => {
    await requireAuth(req, res, async () => {
        await rateLimit({ maxRequests: 30, windowMs: 900000 })(req, res, async () => {
            await handler(req, res);
        });
    });
});
