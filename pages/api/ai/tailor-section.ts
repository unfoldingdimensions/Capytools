import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/middleware/auth';
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimit } from '@/middleware/rateLimit';
import { prisma } from '@/lib/db/prisma';
import { decryptJSON } from '@/lib/security/encryption';
import { AuthenticatedApiRequest } from '@/types/api.types';
import type { ResumeData } from '@/types/resume.types';
import type { ParsedJobDescription } from '@/types/ai.types';
import * as sectionTailoringService from '@/lib/services/sectionTailoring.service';
import { getAIConfigFromRequest } from '@/lib/ai-config-helper';

/**
 * API Route: Tailor Section
 * POST /api/ai/tailor-section
 * 
 * Generates AI-powered suggestions for specific resume sections
 * NOTE: Credits disabled for testing purposes
 */

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: 'Only POST method is allowed',
                statusCode: 405,
            },
        });
    }

    try {
        const authReq = req as AuthenticatedApiRequest;
        const { resumeId, jobDescriptionId, section, sectionData } = req.body;

        // Validate input
        if (!resumeId || typeof resumeId !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Resume ID is required',
                    statusCode: 400,
                },
            });
        }

        if (!jobDescriptionId || typeof jobDescriptionId !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Job Description ID is required',
                    statusCode: 400,
                },
            });
        }

        if (!section || typeof section !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Section name is required',
                    statusCode: 400,
                },
            });
        }

        const validSections = ['summary', 'workExperience', 'education', 'projects', 'skills'];
        if (!validSections.includes(section)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: `Invalid section. Must be one of: ${validSections.join(', ')}`,
                    statusCode: 400,
                },
            });
        }

        // Fetch resume
        const resume = await prisma.resume.findFirst({
            where: {
                id: resumeId,
                userId: authReq.userId,
            },
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Resume not found or access denied',
                    statusCode: 404,
                },
            });
        }

        // Fetch job description
        const jobDescription = await prisma.jobDescription.findFirst({
            where: {
                id: jobDescriptionId,
                userId: authReq.userId,
            },
        });

        if (!jobDescription) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Job description not found or access denied',
                    statusCode: 404,
                },
            });
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

        // Prepare parsed job description
        const parsedJob: ParsedJobDescription = {
            title: jobDescription.title,
            company: jobDescription.company,
            description: jobDescription.description,
            requirements: jobDescription.requirements,
            responsibilities: jobDescription.responsibilities,
            skills: jobDescription.keywords,
            keywords: jobDescription.keywords,
        };

        // Get AI Config from request (BYOK support)
        const aiConfig = getAIConfigFromRequest(req);

        // Generate section-specific suggestions
        let suggestions: unknown;
        const targetRoles = resume.targetRoles || [];

        switch (section) {
            case 'summary':
                suggestions = await sectionTailoringService.generateTailoredSummary(resumeData, parsedJob, aiConfig, targetRoles);
                break;
            case 'workExperience':
                suggestions = await sectionTailoringService.generateTailoredWorkExperience(
                    sectionData || resumeData.workExperience,
                    resumeData,
                    parsedJob,
                    aiConfig,
                    targetRoles
                );
                break;
            case 'education':
                suggestions = await sectionTailoringService.generateTailoredEducation(
                    sectionData || resumeData.education,
                    parsedJob,
                    aiConfig,
                    targetRoles
                );
                break;
            case 'projects':
                suggestions = await sectionTailoringService.generateTailoredProjects(
                    sectionData || resumeData.projects,
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
            default:
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_SECTION',
                        message: 'Invalid section name',
                        statusCode: 400,
                    },
                });
        }

        return res.status(200).json({
            success: true,
            data: {
                section,
                suggestions,
            },
        });
    } catch (error) {
        console.error('Section tailoring error:', error);

        if (error instanceof Error) {
            if (error.message.includes('OpenAI') || error.message.includes('AI')) {
                return res.status(503).json({
                    success: false,
                    error: {
                        code: 'AI_SERVICE_ERROR',
                        message: 'AI service temporarily unavailable. Please try again later.',
                        statusCode: 503,
                    },
                });
            }

            return res.status(400).json({
                success: false,
                error: {
                    code: 'TAILORING_ERROR',
                    message: error.message,
                    statusCode: 400,
                },
            });
        }

        throw error;
    }
}

export default async function (req: NextApiRequest, res: NextApiResponse) {
    try {
        await requireAuth(req, res, async () => {
            await rateLimit()(req, res, async () => {
                // NOTE: No credit checks for testing
                await handler(req, res);
            });
        });
    } catch (error) {
        if (error instanceof Error) {
            await errorHandler(error, req, res);
        } else {
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An unexpected error occurred',
                    statusCode: 500,
                },
            });
        }
    }
}

