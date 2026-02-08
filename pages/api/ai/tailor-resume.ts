import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/middleware/auth';
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimit } from '@/middleware/rateLimit';
import { tailorResumeToJob } from '@/lib/services/resumeTailoring.service';
import { getAIConfigFromRequest } from '@/lib/ai-config-helper';
import { prisma } from '@/lib/db/prisma';
import { decryptJSON, encryptJSON } from '@/lib/security/encryption';
import { AuthenticatedApiRequest } from '@/types/api.types';
import type { ResumeData } from '@/types/resume.types';
import type { ParsedJobDescription } from '@/types/ai.types';

/**
 * API Route: Tailor Resume
 * GET /api/ai/tailor-resume - Get all saved tailored resumes
 * POST /api/ai/tailor-resume - Tailor a resume to match a job description
 * 
 * NOTE: Credits disabled for testing purposes
 */

async function handleGetTailoredResumes(req: NextApiRequest, res: NextApiResponse) {
    try {
        const authReq = req as AuthenticatedApiRequest;

        const tailoredResumes = await prisma.tailoredResume.findMany({
            where: {
                userId: authReq.userId,
            },
            select: {
                id: true,
                reference: true,
                atsScore: true,
                matchScore: true,
                createdAt: true,
                originalResume: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                jobDescription: {
                    select: {
                        id: true,
                        title: true,
                        company: true,
                    },
                },
            } as any, // Temporary: Prisma client needs regeneration after schema change
            orderBy: {
                createdAt: 'desc',
            },
        });

        return res.status(200).json({
            success: true,
            data: tailoredResumes,
        });
    } catch (error) {
        console.error('Failed to fetch tailored resumes:', error);
        throw error;
    }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        await handleGetTailoredResumes(req, res);
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: 'Only GET and POST methods are allowed',
                statusCode: 405,
            },
        });
    }

    try {
        const authReq = req as AuthenticatedApiRequest;
        const { resumeId, jobDescriptionId } = req.body;

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

        // NOTE: Credit check disabled for testing purposes
        // const creditResult = await deductCredits(authReq.userId, 'ai_resume_tailoring');

        try {
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

            // Tailor resume to job with BYOK config
            const aiConfig = getAIConfigFromRequest(req);
            const tailoredResult = await tailorResumeToJob(resumeData, parsedJob, aiConfig);

            // Create reference: "Company Name - Role - Resume Name"
            // Extract role from jobDescription.title (format: "Company - Role")
            const role = jobDescription.title.includes(' - ')
                ? jobDescription.title.split(' - ').slice(1).join(' - ')
                : jobDescription.title;
            const reference = `${jobDescription.company} - ${role} - ${resume.title}`;

            // Prepare tailored resume data (original resume with tailored summary)
            // Note: optimizedExperience is suggestions, not full WorkExperience objects
            const tailoredResumeData: ResumeData = {
                ...resumeData,
                personalInfo: {
                    ...resumeData.personalInfo,
                    summary: tailoredResult.tailoredSummary,
                },
                // Keep original workExperience, optimizedExperience is stored in changes
            };

            // Prepare changes object
            const changes = {
                summary: tailoredResult.tailoredSummary,
                optimizedExperience: tailoredResult.optimizedExperience,
                suggestedSkills: tailoredResult.suggestedSkills,
            };

            // Prepare suggestions object
            const suggestions = {
                customizations: tailoredResult.customizations,
                suggestedSkills: tailoredResult.suggestedSkills,
            };

            // Store tailored resume in database
            const tailoredResume = await prisma.tailoredResume.create({
                data: {
                    userId: authReq.userId,
                    originalResumeId: resume.id,
                    jobDescriptionId: jobDescription.id,
                    reference,
                    tailoredDataEncrypted: encryptJSON(tailoredResumeData),
                    changesEncrypted: encryptJSON(changes),
                    suggestionsEncrypted: encryptJSON(suggestions),
                } as any, // Temporary: Prisma client needs regeneration after schema change
            });

            return res.status(200).json({
                success: true,
                data: {
                    id: tailoredResume.id,
                    reference: (tailoredResume as any).reference, // Temporary: Prisma client needs regeneration
                    tailoredSummary: tailoredResult.tailoredSummary,
                    optimizedExperience: tailoredResult.optimizedExperience,
                    suggestedSkills: tailoredResult.suggestedSkills,
                    customizations: tailoredResult.customizations,
                },
            });
        } catch (tailoringError) {
            // NOTE: No credit refund needed (credits disabled for testing)
            throw tailoringError;
        }
    } catch (error) {
        console.error('Resume tailoring error:', error);

        if (error instanceof Error) {
            if (error.message.includes('OpenAI')) {
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
        await rateLimit()(req, res, async () => {
            await requireAuth(req, res, async () => {
                // NOTE: requireFeature removed for testing (no credit checks)
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

