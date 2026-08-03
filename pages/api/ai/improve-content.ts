import { NextApiRequest, NextApiResponse } from 'next';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { getAIConfigFromRequest } from '@/lib/ai-config-helper';
import * as AIService from '@/lib/services/aiWritingAssistant.service';

/**
 * POST /api/ai/improve-content
 * Improve text content (summary, description, bullet point, or responsibilities)
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

    const { text, type, mode, role, company, responsibilities, targetRoles } = req.body as {
        text?: string;
        type?: 'summary' | 'description' | 'objective' | 'general';
        mode?: 'content' | 'bullet' | 'responsibilities';
        role?: string;
        company?: string;
        responsibilities?: string[];
        targetRoles?: string[];
    };

    const improvementMode = mode || 'content';

    try {
        const config = getAIConfigFromRequest(req);
        let result;

        if (improvementMode === 'bullet') {
            if (!text || text.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Text is required for bullet improvement',
                        statusCode: 400,
                    },
                });
                return;
            }

            const improvedBullet = await AIService.improveBulletPoint(text, { role, targetRoles }, config);
            result = {
                improvedText: improvedBullet,
                mode: 'bullet',
            };
        } else if (improvementMode === 'responsibilities') {
            if (!responsibilities || responsibilities.length === 0) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Responsibilities array is required',
                        statusCode: 400,
                    },
                });
                return;
            }

            const enhanced = await AIService.enhanceResponsibilities(responsibilities, { role, company, targetRoles }, config);
            result = {
                bulletPoints: enhanced,
                mode: 'responsibilities',
            };
        } else {
            // Content improvement
            if (!text || text.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Text is required for content improvement',
                        statusCode: 400,
                    },
                });
                return;
            }

            const improved = await AIService.improveContent(text, type || 'general', config, targetRoles);
            result = {
                ...improved,
                mode: 'content',
            };
        }

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Content improvement error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'AI_SERVICE_ERROR',
                message:
                    error instanceof Error ? error.message : 'Failed to improve content',
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

