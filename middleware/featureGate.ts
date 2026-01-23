import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db/prisma';
import { AuthenticatedApiRequest } from '@/types/api.types';
import type { PremiumFeature } from '@/types/ai.types';

/**
 * Feature Gate Middleware
 * 
 * Controls access to premium features based on subscription tiers and credits
 */

// Feature requirements configuration
const FEATURE_REQUIREMENTS: Record<
    PremiumFeature,
    {
        minTier: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
        creditsRequired: number;
        description: string;
    }
> = {
    ai_resume_tailoring: {
        minTier: 'BASIC',
        creditsRequired: 1,
        description: 'AI-powered resume tailoring for job descriptions',
    },
    ats_scoring: {
        minTier: 'BASIC',
        creditsRequired: 1,
        description: 'ATS compatibility scoring and optimization tips',
    },
    interview_questions: {
        minTier: 'BASIC',
        creditsRequired: 1,
        description: 'AI-generated interview questions and preparation',
    },
    unlimited_exports: {
        minTier: 'PREMIUM',
        creditsRequired: 0,
        description: 'Unlimited resume exports in PDF and DOCX',
    },
    custom_templates: {
        minTier: 'PREMIUM',
        creditsRequired: 0,
        description: 'Access to premium resume templates',
    },
};

// Tier hierarchy for comparison
const TIER_LEVELS = {
    FREE: 0,
    BASIC: 1,
    PREMIUM: 2,
    ENTERPRISE: 3,
};

/**
 * Checks if user has access to a specific feature
 */
export async function checkFeatureAccess(
    userId: string,
    feature: PremiumFeature
): Promise<{
    hasAccess: boolean;
    reason?: string;
    requiredTier?: string;
    requiredCredits?: number;
    currentTier?: string;
    currentCredits?: number;
}> {
    const requirements = FEATURE_REQUIREMENTS[feature];

    if (!requirements) {
        throw new Error(`Unknown feature: ${feature}. Valid features: ${Object.keys(FEATURE_REQUIREMENTS).join(', ')}`);
    }

    // Get user subscription info
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            subscriptionTier: true,
            creditsRemaining: true,
        },
    });

    if (!user) {
        return {
            hasAccess: false,
            reason: 'User not found',
        };
    }

    const userTierLevel = TIER_LEVELS[user.subscriptionTier as keyof typeof TIER_LEVELS];
    const requiredTierLevel = TIER_LEVELS[requirements.minTier];

    // Check subscription tier
    if (userTierLevel < requiredTierLevel) {
        return {
            hasAccess: false,
            reason: `This feature requires ${requirements.minTier} subscription or higher`,
            requiredTier: requirements.minTier,
            currentTier: user.subscriptionTier,
        };
    }

    // Check credits
    if (requirements.creditsRequired > 0 && user.creditsRemaining < requirements.creditsRequired) {
        return {
            hasAccess: false,
            reason: 'Insufficient credits',
            requiredCredits: requirements.creditsRequired,
            currentCredits: user.creditsRemaining,
        };
    }

    return {
        hasAccess: true,
        currentTier: user.subscriptionTier,
        currentCredits: user.creditsRemaining,
    };
}

/**
 * Middleware to require feature access
 */
export function requireFeature(feature: PremiumFeature) {
    return async (
        req: NextApiRequest,
        res: NextApiResponse,
        next: () => void | Promise<void>
    ): Promise<void> => {
        try {
            const authReq = req as AuthenticatedApiRequest;

            if (!authReq.userId) {
                throw new Error(
                    'requireFeature middleware must be used after requireAuth middleware. ' +
                    'userId is not available on request object.'
                );
            }

            const access = await checkFeatureAccess(authReq.userId, feature);

            if (!access.hasAccess) {
                const errorResponse: {
                    success: false;
                    error: {
                        code: string;
                        message: string;
                        statusCode: number;
                        details?: {
                            feature: string;
                            reason?: string;
                            requiredTier?: string;
                            currentTier?: string;
                            requiredCredits?: number;
                            currentCredits?: number;
                        };
                    };
                } = {
                    success: false,
                    error: {
                        code: access.reason === 'Insufficient credits' ? 'INSUFFICIENT_CREDITS' : 'FEATURE_LOCKED',
                        message: access.reason || 'Feature not accessible',
                        statusCode: access.reason === 'Insufficient credits' ? 402 : 403,
                        details: {
                            feature,
                            reason: access.reason,
                            requiredTier: access.requiredTier,
                            currentTier: access.currentTier,
                            requiredCredits: access.requiredCredits,
                            currentCredits: access.currentCredits,
                        },
                    },
                };

                res.status(errorResponse.error.statusCode).json(errorResponse);
                return;
            }

            // Store feature access info for handler
            (authReq as AuthenticatedApiRequest & { featureAccess?: typeof access }).featureAccess = access;

            await next();
        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'FEATURE_CHECK_ERROR',
                    message: 'Failed to verify feature access',
                    statusCode: 500,
                    details: { message: error instanceof Error ? error.message : 'Unknown error' },
                },
            });
        }
    };
}

/**
 * Deducts credits for a feature usage
 */
export async function deductCredits(
    userId: string,
    feature: PremiumFeature,
    customAmount?: number
): Promise<{
    success: boolean;
    remainingCredits: number;
    error?: string;
}> {
    const requirements = FEATURE_REQUIREMENTS[feature];
    const creditsToDeduct = customAmount || requirements.creditsRequired;

    if (creditsToDeduct === 0) {
        // No credits required for this feature
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { creditsRemaining: true },
        });

        return {
            success: true,
            remainingCredits: user?.creditsRemaining || 0,
        };
    }

    try {
        // Use atomic transaction to prevent race conditions
        const updatedUser = await prisma.$transaction(async (tx) => {
            // Lock and check current credits
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { creditsRemaining: true, creditsUsed: true },
            });

            if (!user) {
                throw new Error('User not found');
            }

            if (user.creditsRemaining < creditsToDeduct) {
                throw new Error(
                    `Insufficient credits. Required: ${creditsToDeduct}, Available: ${user.creditsRemaining}`
                );
            }

            // Deduct credits
            return await tx.user.update({
                where: { id: userId },
                data: {
                    creditsRemaining: {
                        decrement: creditsToDeduct,
                    },
                    creditsUsed: {
                        increment: creditsToDeduct,
                    },
                },
                select: { creditsRemaining: true },
            });
        });

        console.log(`Deducted ${creditsToDeduct} credits from user ${userId}. Remaining: ${updatedUser.creditsRemaining}`);

        return {
            success: true,
            remainingCredits: updatedUser.creditsRemaining,
        };
    } catch (error) {
        return {
            success: false,
            remainingCredits: 0,
            error: error instanceof Error ? error.message : 'Failed to deduct credits',
        };
    }
}

/**
 * Refunds credits (e.g., if operation failed)
 */
export async function refundCredits(
    userId: string,
    amount: number
): Promise<{
    success: boolean;
    error?: string;
}> {
    if (amount <= 0) {
        return { success: true };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                creditsRemaining: {
                    increment: amount,
                },
                creditsUsed: {
                    decrement: amount,
                },
            },
        });

        console.log(`Refunded ${amount} credits to user ${userId}`);

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to refund credits',
        };
    }
}

/**
 * Gets feature information
 */
export function getFeatureInfo(feature: PremiumFeature): {
    minTier: string;
    creditsRequired: number;
    description: string;
} | null {
    return FEATURE_REQUIREMENTS[feature] || null;
}

/**
 * Lists all features accessible to a user
 */
export async function listAccessibleFeatures(userId: string): Promise<
    Array<{
        feature: PremiumFeature;
        hasAccess: boolean;
        info: ReturnType<typeof getFeatureInfo>;
    }>
> {
    const features = Object.keys(FEATURE_REQUIREMENTS) as PremiumFeature[];

    const accessChecks = await Promise.all(
        features.map(async (feature) => ({
            feature,
            hasAccess: (await checkFeatureAccess(userId, feature)).hasAccess,
            info: getFeatureInfo(feature),
        }))
    );

    return accessChecks;
}

