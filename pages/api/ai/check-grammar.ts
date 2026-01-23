import { NextApiRequest, NextApiResponse } from 'next';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { getAIConfigFromRequest } from '@/lib/ai-config-helper';
import * as AIService from '@/lib/services/aiWritingAssistant.service';

/**
 * POST /api/ai/check-grammar
 * Check grammar and suggest corrections
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

    const { text } = req.body as { text?: string };

    if (!text || text.trim().length === 0) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Text is required',
                statusCode: 400,
            },
        });
        return;
    }

    try {
        const config = getAIConfigFromRequest(req);
        const result = await AIService.checkGrammar(text, config);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Grammar check error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'AI_SERVICE_ERROR',
                message:
                    error instanceof Error ? error.message : 'Failed to check grammar',
                statusCode: 500,
            },
        });
    }
}

// Apply middleware
export default asyncHandler(async (req: NextApiRequest, res: NextApiResponse) => {
    await requireAuth(req, res, async () => {
        await rateLimit({ maxRequests: 20, windowMs: 900000 })(req, res, async () => {
            await handler(req, res);
        });
    });
});

