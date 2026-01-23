import { NextApiRequest, NextApiResponse } from 'next';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { getAIConfigFromRequest } from '@/lib/ai-config-helper';
import * as AIService from '@/lib/services/aiWritingAssistant.service';

/**
 * POST /api/ai/generate-bullets
 * Generate professional bullet points from description
 */

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const { description, role, company, count } = req.body as {
        description?: string;
        role?: string;
        company?: string;
        count?: number;
    };

    if (!description || description.trim().length === 0) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Description is required',
                statusCode: 400,
            },
        });
        return;
    }

    try {
        const config = getAIConfigFromRequest(req);
        const result = await AIService.generateBulletPoints(description, { role, company, count }, config);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Bullet generation error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'AI_SERVICE_ERROR',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to generate bullet points',
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

