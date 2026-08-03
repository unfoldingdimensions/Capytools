import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/middleware/auth';
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimit } from '@/middleware/rateLimit';
import { scoreResumeAgainstJob } from '@/lib/services/atsScoring.service';
import { buildParsedJobDescription } from '@/lib/services/jobDescriptionParser.service';
import { buildRoleBaselineJobDescription } from '@/lib/ai/roleProfiles';
import { getAIConfigFromRequest } from '@/lib/ai-config-helper';
import { prisma } from '@/lib/db/prisma';
import { decryptJSON } from '@/lib/security/encryption';
import { AuthenticatedApiRequest } from '@/types/api.types';
import type { ResumeData } from '@/types/resume.types';
import type { ParsedJobDescription } from '@/types/ai.types';

/**
 * API Route: ATS Score
 * GET /api/ai/ats-score - Get all saved ATS scores for the user
 * POST /api/ai/ats-score - Score a resume against a job description
 * 
 * NOTE: Credits disabled for testing purposes
 */

async function handleGetScores(req: NextApiRequest, res: NextApiResponse) {
    try {
        const authReq = req as AuthenticatedApiRequest;

        const scores = await prisma.aTSScore.findMany({
            where: {
                userId: authReq.userId,
            },
            select: {
                id: true,
                reference: true,
                overallScore: true,
                formattingScore: true,
                keywordScore: true,
                experienceScore: true,
                educationScore: true,
                skillsScore: true,
                clarityScore: true,
                suggestions: true,
                missingKeywords: true,
                matchedRequirements: true,
                createdAt: true,
                resume: {
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
            data: scores,
        });
    } catch (error) {
        console.error('Failed to fetch ATS scores:', error);
        throw error;
    }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        await handleGetScores(req, res);
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

        // jobDescriptionId is optional: without it, the resume is scored against
        // its target roles (role baseline), which requires targetRoles to be set.

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

        // Fetch job description (optional): without it we score against the resume's target roles.
        type JobDescriptionRecord = {
            id: string;
            title: string;
            company: string;
            description: string;
            requirements: string[];
            responsibilities: string[];
            keywords: string[];
            experienceLevel?: string | null;
            employmentType?: string | null;
        };
        let jobDescription: JobDescriptionRecord | null = null;
        let parsedJob: ParsedJobDescription | null = null;
        let reference = '';

        if (jobDescriptionId) {
            jobDescription = await prisma.jobDescription.findFirst({
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
        } else {
            // Role baseline mode
            const targetRoles = resume.targetRoles || [];
            if (targetRoles.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'NO_TARGET_ROLES',
                        message: 'Set target roles on this resume to score without a job description',
                        statusCode: 400,
                    },
                });
            }
        }

        // NOTE: Credit check disabled for testing purposes
        // const creditResult = await deductCredits(authReq.userId, 'ats_scoring');

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

            // Prepare parsed job description (job match OR role baseline)
            if (jobDescription) {
                parsedJob = buildParsedJobDescription(jobDescription);
                // Create reference: "Company Name - Role - Resume Name"
                // Extract role from jobDescription.title (format: "Company - Role")
                const role = jobDescription.title.includes(' - ')
                    ? jobDescription.title.split(' - ').slice(1).join(' - ')
                    : jobDescription.title;
                reference = `${jobDescription.company} - ${role} - ${resume.title}`;
            } else {
                parsedJob = buildRoleBaselineJobDescription(resume.targetRoles || []);
                reference = parsedJob ? `Role baseline - ${parsedJob.title} - ${resume.title}` : '';
            }

            if (!parsedJob) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'NO_TARGET_ROLES',
                        message: 'Could not build a role baseline for this resume',
                        statusCode: 400,
                    },
                });
            }

            // Score resume against job with BYOK config
            const aiConfig = getAIConfigFromRequest(req);
            const score = await scoreResumeAgainstJob(resumeData, parsedJob, aiConfig);

            // Store ATS score in database
            const atsScore = await prisma.aTSScore.create({
                data: {
                    userId: authReq.userId,
                    resumeId: resume.id,
                    jobDescriptionId: jobDescription ? jobDescription.id : null,
                    reference,
                    overallScore: score.overallScore,
                    formattingScore: score.categoryScores.formatting,
                    keywordScore: score.categoryScores.keywords,
                    experienceScore: score.categoryScores.experience,
                    educationScore: 0, // Not implemented yet
                    skillsScore: score.categoryScores.skills,
                    clarityScore: 0, // Not implemented yet
                    suggestions: score.suggestions,
                    missingKeywords: score.missingKeywords,
                    matchedRequirements: score.matchedRequirements,
                } as any, // Temporary: Prisma client needs regeneration after schema change
            });

            return res.status(200).json({
                success: true,
                data: {
                    id: atsScore.id,
                    overallScore: score.overallScore,
                    categoryScores: score.categoryScores,
                    suggestions: score.suggestions,
                    missingKeywords: score.missingKeywords,
                    matchedRequirements: score.matchedRequirements,
                    analysisDate: score.analysisDate,
                },
            });
        } catch (scoringError) {
            // NOTE: No credit refund needed (credits disabled for testing)
            throw scoringError;
        }
    } catch (error) {
        console.error('ATS scoring error:', error);

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
                    code: 'SCORING_ERROR',
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

