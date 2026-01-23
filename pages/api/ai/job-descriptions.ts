import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/middleware/auth';
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimit } from '@/middleware/rateLimit';
import { prisma } from '@/lib/db/prisma';
import { AuthenticatedApiRequest } from '@/types/api.types';

/**
 * API Route: Job Descriptions
 * GET /api/ai/job-descriptions - Get all job descriptions for the user
 * GET /api/ai/job-descriptions?id=xxx - Get a specific job description by ID
 */

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: 'Only GET method is allowed',
                statusCode: 405,
            },
        });
    }

    try {
        const authReq = req as AuthenticatedApiRequest;
        const { id } = req.query;

        if (id && typeof id === 'string') {
            // Fetch single job description
            const jobDescription = await prisma.jobDescription.findFirst({
                where: {
                    id,
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

            return res.status(200).json({
                success: true,
                data: {
                    id: jobDescription.id,
                    title: jobDescription.title,
                    company: jobDescription.company,
                    description: jobDescription.description,
                    requirements: jobDescription.requirements,
                    responsibilities: jobDescription.responsibilities,
                    keywords: jobDescription.keywords,
                    createdAt: jobDescription.createdAt,
                    updatedAt: jobDescription.updatedAt,
                },
            });
        } else {
            // Fetch all job descriptions for the user
            const jobDescriptions = await prisma.jobDescription.findMany({
                where: {
                    userId: authReq.userId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                select: {
                    id: true,
                    title: true,
                    company: true,
                    description: true,
                    requirements: true,
                    responsibilities: true,
                    keywords: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            return res.status(200).json({
                success: true,
                data: jobDescriptions,
            });
        }
    } catch (error) {
        console.error('Job descriptions fetch error:', error);

        if (error instanceof Error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FETCH_ERROR',
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

