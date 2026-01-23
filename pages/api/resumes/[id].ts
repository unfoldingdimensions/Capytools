import { NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedApiRequest } from '@/types/api.types';
import { prisma } from '@/lib/db/prisma';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { updateResumeSchema } from '@/lib/validations/resume.validation';
import { ResumeService } from '@/lib/services/resume.service';

/**
 * GET /api/resumes/[id] - Get a specific resume
 * PUT /api/resumes/[id] - Update a resume
 * DELETE /api/resumes/[id] - Delete a resume
 */

async function handler(req: AuthenticatedApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        await handleGetResume(req, res);
    } else if (req.method === 'PUT') {
        await handleUpdateResume(req, res);
    } else if (req.method === 'DELETE') {
        await handleDeleteResume(req, res);
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

async function handleGetResume(req: AuthenticatedApiRequest, res: NextApiResponse) {
    const { userId } = req;
    const { id } = req.query;

    if (typeof id !== 'string') throw new Error('Invalid resume ID');

    const resume = await ResumeService.getResume(userId, id);

    if (!resume) {
        res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Resume not found', statusCode: 404 }
        });
        return;
    }

    res.status(200).json({ success: true, data: resume });
}

async function handleUpdateResume(req: AuthenticatedApiRequest, res: NextApiResponse) {
    const { userId } = req;
    const { id } = req.query;

    if (typeof id !== 'string') throw new Error('Invalid resume ID');

    const validatedData = updateResumeSchema.parse({ ...req.body, id });
    const updatedResume = await ResumeService.updateResume(userId, id, validatedData as any);

    if (!updatedResume) {
        res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Resume not found', statusCode: 404 }
        });
        return;
    }

    await prisma.auditLog.create({
        data: {
            userId,
            action: 'update_resume',
            resource: 'resume',
            resourceId: id,
            success: true,
        },
    });

    res.status(200).json({
        success: true,
        data: updatedResume,
        message: 'Resume updated successfully',
    });
}

async function handleDeleteResume(req: AuthenticatedApiRequest, res: NextApiResponse) {
    const { userId } = req;
    const { id } = req.query;

    if (typeof id !== 'string') throw new Error('Invalid resume ID');

    const success = await ResumeService.deleteResume(userId, id);

    if (!success) {
        res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Resume not found', statusCode: 404 }
        });
        return;
    }

    await prisma.auditLog.create({
        data: {
            userId,
            action: 'delete_resume',
            resource: 'resume',
            resourceId: id,
            success: true,
        },
    });

    res.status(200).json({ success: true, message: 'Resume deleted successfully' });
}

// Apply middleware
export default asyncHandler(async (req: NextApiRequest, res: NextApiResponse) => {
    await requireAuth(req, res, async () => {
        await rateLimit({ maxRequests: 50, windowMs: 900000 })(req, res, async () => {
            await handler(req as AuthenticatedApiRequest, res);
        });
    });
});

