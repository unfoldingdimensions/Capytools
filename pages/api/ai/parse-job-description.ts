import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/middleware/auth';
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimit } from '@/middleware/rateLimit';
import { parseJobDescription } from '@/lib/services/jobDescriptionParser.service';
import { prisma } from '@/lib/db/prisma';
import { AuthenticatedApiRequest } from '@/types/api.types';
import type { JobDescriptionInput } from '@/types/ai.types';

/**
 * API Route: Parse Job Description
 * POST /api/ai/parse-job-description
 * 
 * Parses a job description and extracts structured data
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
        const { title, company, description, url }: JobDescriptionInput = req.body;

        // Validate input
        if (!title || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Job title is required',
                    statusCode: 400,
                },
            });
        }

        if (!company || company.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Company name is required',
                    statusCode: 400,
                },
            });
        }

        if (!description || description.trim().length < 50) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Job description must be at least 50 characters',
                    statusCode: 400,
                },
            });
        }

        // Parse job description using AI
        const parsed = await parseJobDescription({
            title,
            company,
            description,
            url,
        });

        // Store parsed job description in database
        // Save title as "Company - Role" format for easy identification
        const displayTitle = `${parsed.company} - ${parsed.title}`;
        const jobDescription = await prisma.jobDescription.create({
            data: {
                userId: authReq.userId,
                title: displayTitle,
                company: parsed.company,
                description: parsed.description,
                requirements: parsed.requirements,
                responsibilities: parsed.responsibilities,
                keywords: parsed.keywords,
            },
        });

        return res.status(200).json({
            success: true,
            data: {
                id: jobDescription.id,
                ...parsed,
                createdAt: jobDescription.createdAt,
            },
        });
    } catch (error) {
        console.error('Job description parsing error:', error);

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
                    code: 'PARSING_ERROR',
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

