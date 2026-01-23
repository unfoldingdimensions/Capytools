import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';
import { AuthenticatedApiRequest } from '@/types/api.types';

/**
 * Authentication Middleware
 * 
 * CRITICAL: Fail-loud error handling. All authentication failures
 * throw detailed errors instead of silently passing through.
 */

/**
 * Logs authentication attempts for security auditing
 */
async function logAuthAttempt(
    userId: string | null,
    action: string,
    success: boolean,
    req: NextApiRequest,
    errorMessage?: string
): Promise<void> {
    try {
        const forwarded = req.headers['x-forwarded-for'];
        const ipAddress = typeof forwarded === 'string'
            ? forwarded.split(',')[0]?.trim()
            : req.socket.remoteAddress;

        await prisma.auditLog.create({
            data: {
                userId: userId || undefined,
                action,
                resource: 'authentication',
                ipAddress: ipAddress || 'unknown',
                userAgent: req.headers['user-agent'] || undefined,
                success,
                errorMessage,
            },
        });
    } catch (error) {
        // Log to console but don't fail the request
        console.error('Failed to log auth attempt:', error);
    }
}

/**
 * Verifies Clerk authentication and attaches user info to request
 */
export async function requireAuth(
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => void | Promise<void>
): Promise<void> {
    try {
        let clerkUserId: string | null = null;

        try {
            const authResult = getAuth(req);
            clerkUserId = authResult.userId || null;

            // Log auth result for debugging
            if (!clerkUserId) {
                console.warn('getAuth returned no userId:', {
                    url: req.url,
                    method: req.method,
                    headers: {
                        'x-clerk-auth-status': req.headers['x-clerk-auth-status'],
                        'x-clerk-auth-message': req.headers['x-clerk-auth-message'],
                        'x-clerk-auth-reason': req.headers['x-clerk-auth-reason'],
                    },
                });
            }
        } catch (authError) {
            console.error('Error calling getAuth:', {
                error: authError,
                message: authError instanceof Error ? authError.message : 'Unknown error',
                stack: authError instanceof Error ? authError.stack : undefined,
                type: authError instanceof Error ? authError.constructor.name : typeof authError,
                url: req.url,
                method: req.method,
                headers: {
                    'x-clerk-auth-status': req.headers['x-clerk-auth-status'],
                    'x-clerk-auth-message': req.headers['x-clerk-auth-message'],
                    'x-clerk-auth-reason': req.headers['x-clerk-auth-reason'],
                    cookie: req.headers.cookie ? 'present' : 'missing',
                },
            });

            await logAuthAttempt(
                null,
                'api_access',
                false,
                req,
                `getAuth failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`
            );

            res.status(500).json({
                success: false,
                error: {
                    code: 'AUTH_ERROR',
                    message: 'Authentication failed due to internal error.',
                    statusCode: 500,
                    details: {
                        message: authError instanceof Error ? authError.message : 'Unknown error',
                        type: authError instanceof Error ? authError.constructor.name : typeof authError,
                    },
                },
            });
            return;
        }

        if (!clerkUserId) {
            await logAuthAttempt(null, 'api_access', false, req, 'No Clerk user ID found');

            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required. Please log in to access this resource.',
                    statusCode: 401,
                },
            });
            return;
        }

        // Find user in database
        let user = await prisma.user.findUnique({
            where: { clerkUserId },
            select: {
                id: true,
                clerkUserId: true,
                email: true,
                firstName: true,
                lastName: true,
                subscriptionTier: true,
                creditsRemaining: true,
            },
        });

        // Auto-create user if they don't exist (webhook might not have run)
        if (!user) {
            try {
                // Get user info from Clerk
                const clerk = await clerkClient();
                const clerkUser = await clerk.users.getUser(clerkUserId);
                const email = clerkUser.emailAddresses[0]?.emailAddress;

                if (!email) {
                    throw new Error('No email found in Clerk user data');
                }

                // Create user in database
                user = await prisma.user.create({
                    data: {
                        clerkUserId,
                        email,
                        firstName: clerkUser.firstName,
                        lastName: clerkUser.lastName,
                        profileImageUrl: clerkUser.imageUrl,
                        subscriptionTier: 'FREE',
                        creditsRemaining: 3,
                        creditsUsed: 0,
                    },
                    select: {
                        id: true,
                        clerkUserId: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        subscriptionTier: true,
                        creditsRemaining: true,
                    },
                });

                console.log(`Auto-created user in database: ${clerkUserId}`);
            } catch (createError) {
                await logAuthAttempt(
                    clerkUserId,
                    'api_access',
                    false,
                    req,
                    `Failed to auto-create user: ${createError instanceof Error ? createError.message : 'Unknown error'}`
                );

                throw new Error(
                    `User not found in database and failed to create: ${createError instanceof Error ? createError.message : 'Unknown error'}`
                );
            }
        }

        // Attach user info to request
        const authReq = req as AuthenticatedApiRequest;
        authReq.userId = user.id;
        authReq.clerkUserId = user.clerkUserId;

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        }).catch((error: unknown) => {
            console.error('Failed to update last login:', error);
        });

        await logAuthAttempt(user.id, 'api_access', true, req);

        await next();
    } catch (error) {
        // Log the full error for debugging
        console.error('requireAuth error:', {
            error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            type: error instanceof Error ? error.constructor.name : typeof error,
            url: req.url,
            method: req.method,
        });

        if (error instanceof Error && error.message.includes('User not found in database')) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'USER_SYNC_ERROR',
                    message: 'User account synchronization error. Please contact support.',
                    statusCode: 500,
                    details: { message: error.message },
                },
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'AUTH_ERROR',
                message: 'Authentication failed due to internal error.',
                statusCode: 500,
                details: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    type: error instanceof Error ? error.constructor.name : typeof error,
                },
            },
        });
    }
}

/**
 * Verifies user has sufficient credits
 */
export async function requireCredits(minCredits: number = 1) {
    return async (
        req: NextApiRequest,
        res: NextApiResponse,
        next: () => void | Promise<void>
    ): Promise<void> => {
        try {
            const authReq = req as AuthenticatedApiRequest;

            if (!authReq.userId) {
                throw new Error(
                    'requireCredits middleware must be used after requireAuth middleware. ' +
                    'userId is not available on request object.'
                );
            }

            const user = await prisma.user.findUnique({
                where: { id: authReq.userId },
                select: { creditsRemaining: true },
            });

            if (!user) {
                throw new Error(
                    `User not found: ${authReq.userId}. This should not happen after authentication.`
                );
            }

            if (user.creditsRemaining < minCredits) {
                await logAuthAttempt(
                    authReq.userId,
                    'credit_check',
                    false,
                    req,
                    `Insufficient credits: ${user.creditsRemaining} < ${minCredits}`
                );

                res.status(402).json({
                    success: false,
                    error: {
                        code: 'INSUFFICIENT_CREDITS',
                        message: `Insufficient credits. Required: ${minCredits}, Available: ${user.creditsRemaining}`,
                        statusCode: 402,
                        details: {
                            required: minCredits,
                            available: user.creditsRemaining,
                        },
                    },
                });
                return;
            }

            await next();
        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'CREDIT_CHECK_ERROR',
                    message: 'Failed to verify credits.',
                    statusCode: 500,
                    details: { message: error instanceof Error ? error.message : 'Unknown error' },
                },
            });
        }
    };
}

/**
 * Checks if user has required subscription tier
 */
export async function requireSubscription(requiredTier: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE') {
    const tierLevels = {
        FREE: 0,
        BASIC: 1,
        PREMIUM: 2,
        ENTERPRISE: 3,
    };

    return async (
        req: NextApiRequest,
        res: NextApiResponse,
        next: () => void | Promise<void>
    ): Promise<void> => {
        try {
            const authReq = req as AuthenticatedApiRequest;

            if (!authReq.userId) {
                throw new Error(
                    'requireSubscription middleware must be used after requireAuth middleware.'
                );
            }

            const user = await prisma.user.findUnique({
                where: { id: authReq.userId },
                select: { subscriptionTier: true },
            });

            if (!user) {
                throw new Error(`User not found: ${authReq.userId}`);
            }

            const userTierLevel = tierLevels[user.subscriptionTier as keyof typeof tierLevels];
            const requiredTierLevel = tierLevels[requiredTier];

            if (userTierLevel < requiredTierLevel) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'INSUFFICIENT_SUBSCRIPTION',
                        message: `This feature requires ${requiredTier} subscription or higher. Current: ${user.subscriptionTier}`,
                        statusCode: 403,
                        details: {
                            current: user.subscriptionTier,
                            required: requiredTier,
                        },
                    },
                });
                return;
            }

            await next();
        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'SUBSCRIPTION_CHECK_ERROR',
                    message: 'Failed to verify subscription.',
                    statusCode: 500,
                    details: { message: error instanceof Error ? error.message : 'Unknown error' },
                },
            });
        }
    };
}

