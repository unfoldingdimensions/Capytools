import { NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedApiRequest } from '@/types/api.types';
import { prisma } from '@/lib/db/prisma';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { createResumeSchema } from '@/lib/validations/resume.validation';
import { ResumeService } from '@/lib/services/resume.service';

/**
 * GET /api/resumes - Get all resumes for authenticated user
 * POST /api/resumes - Create a new resume
 */

async function handler(req: AuthenticatedApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        await handleGetResumes(req, res);
    } else if (req.method === 'POST') {
        await handleCreateResume(req, res);
    } else {
        res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: `Method ${req.method || 'UNKNOWN'} not allowed on this endpoint`,
                statusCode: 405,
            },
        });
    }
}

async function handleGetResumes(req: AuthenticatedApiRequest, res: NextApiResponse) {
    const { userId } = req;
    const resumes = await ResumeService.getResumes(userId);
    res.status(200).json({ success: true, data: resumes });
}

async function handleCreateResume(req: AuthenticatedApiRequest, res: NextApiResponse) {
    const { userId } = req;

    // Validate request body
    const validatedData = createResumeSchema.parse(req.body);

    // Create resume using service (handles encryption)
    const resume = await ResumeService.createResume(userId, validatedData as any);

    // Log creation
    await prisma.auditLog.create({
        data: {
            userId,
            action: 'create_resume',
            resource: 'resume',
            resourceId: resume.id,
            success: true,
        },
    });

    res.status(201).json({
        success: true,
        data: resume,
        message: 'Resume created successfully',
    });
}

// Apply middleware
export default asyncHandler(async (req: NextApiRequest, res: NextApiResponse) => {
    await requireAuth(req, res, async () => {
        await rateLimit({ maxRequests: 50, windowMs: 900000 })(req, res, async () => {
            await handler(req as AuthenticatedApiRequest, res);
        });
    });
});

