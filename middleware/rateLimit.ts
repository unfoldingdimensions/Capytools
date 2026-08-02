import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db/prisma';
import { getClientIp } from '@/lib/utils/clientIp';

/**
 * Rate Limiting Middleware
 * 
 * CRITICAL: Fail-loud error handling. All rate limit violations
 * throw errors instead of silently passing through.
 */

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    keyGenerator?: (req: NextApiRequest) => string;
    skipSuccessfulRequests?: boolean;
    message?: string;
}

const defaultConfig: RateLimitConfig = {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
};

/**
 * Gets the identifier for rate limiting (IP or user ID)
 */
function getIdentifier(req: NextApiRequest): string {
    // Priority: User ID > IP Address
    const userId = (req as unknown as Record<string, unknown>).userId as string | undefined;

    if (userId) {
        return `user:${userId}`;
    }

    // Get IP from various headers (for proxies, load balancers)
    const ip = getClientIp(req);

    if (!ip) {
        throw new Error(
            'Cannot determine client identifier for rate limiting. ' +
            'No user ID or IP address available. ' +
            `Headers: ${JSON.stringify(Object.keys(req.headers))}`
        );
    }

    return `ip:${ip}`;
}

/**
 * Gets the endpoint identifier for rate limiting
 */
function getEndpoint(req: NextApiRequest): string {
    const method = req.method || 'UNKNOWN';
    const url = req.url || '/unknown';
    return `${method}:${url}`;
}

/**
 * Checks if rate limit is exceeded
 */
async function checkRateLimit(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
): Promise<{
    allowed: boolean;
    current: number;
    remaining: number;
    resetAt: Date;
}> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    try {
        // Find or create rate limit record
        let rateLimit = await prisma.rateLimit.findUnique({
            where: {
                identifier_endpoint: {
                    identifier,
                    endpoint,
                },
            },
        });

        // If no record or window expired, create/reset
        if (!rateLimit || rateLimit.windowStart < windowStart) {
            rateLimit = await prisma.rateLimit.upsert({
                where: {
                    identifier_endpoint: {
                        identifier,
                        endpoint,
                    },
                },
                create: {
                    identifier,
                    endpoint,
                    requestCount: 1,
                    windowStart: now,
                },
                update: {
                    requestCount: 1,
                    windowStart: now,
                },
            });

            return {
                allowed: true,
                current: 1,
                remaining: config.maxRequests - 1,
                resetAt: new Date(now.getTime() + config.windowMs),
            };
        }

        // Check if limit exceeded
        if (rateLimit.requestCount >= config.maxRequests) {
            const resetAt = new Date(rateLimit.windowStart.getTime() + config.windowMs);

            return {
                allowed: false,
                current: rateLimit.requestCount,
                remaining: 0,
                resetAt,
            };
        }

        // Increment counter
        const updated = await prisma.rateLimit.update({
            where: {
                identifier_endpoint: {
                    identifier,
                    endpoint,
                },
            },
            data: {
                requestCount: {
                    increment: 1,
                },
            },
        });

        return {
            allowed: true,
            current: updated.requestCount,
            remaining: config.maxRequests - updated.requestCount,
            resetAt: new Date(updated.windowStart.getTime() + config.windowMs),
        };
    } catch (error) {
        // Check if it's a database connection error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isDatabaseError = errorMessage.includes("Can't reach database") ||
            errorMessage.includes('P1001') ||
            errorMessage.includes('connection') ||
            errorMessage.includes('ECONNREFUSED') ||
            errorMessage.includes('timeout');

        if (isDatabaseError) {
            // In development, allow requests to proceed if database is unavailable
            // Log a warning but don't block the request
            if (process.env.NODE_ENV === 'development') {
                console.warn(
                    `⚠️  Rate limiting disabled: Database connection failed. ` +
                    `Error: ${errorMessage}. ` +
                    `Allowing request to proceed. ` +
                    `Identifier: ${identifier}, Endpoint: ${endpoint}`
                );

                // Return a permissive rate limit result
                return {
                    allowed: true,
                    current: 0,
                    remaining: config.maxRequests,
                    resetAt: new Date(now.getTime() + config.windowMs),
                };
            }

            // In production, fail loudly
            throw new Error(
                `Rate limit database connection failed. ` +
                `This is a critical error. ` +
                `Error: ${errorMessage}. ` +
                `Identifier: ${identifier}, Endpoint: ${endpoint}`
            );
        }

        // For other errors, throw normally
        throw new Error(
            `Rate limit check failed: ${errorMessage}. ` +
            `Identifier: ${identifier}, Endpoint: ${endpoint}`
        );
    }
}

/**
 * Rate limit middleware factory
 */
export function rateLimit(config: Partial<RateLimitConfig> = {}) {
    const finalConfig = { ...defaultConfig, ...config };

    return async (
        req: NextApiRequest,
        res: NextApiResponse,
        next: () => void | Promise<void>
    ): Promise<void> => {
        try {
            const identifier = config.keyGenerator
                ? config.keyGenerator(req)
                : getIdentifier(req);

            const endpoint = getEndpoint(req);

            const result = await checkRateLimit(identifier, endpoint, finalConfig);

            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', finalConfig.maxRequests.toString());
            res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
            res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

            if (!result.allowed) {
                const message = config.message ||
                    `Rate limit exceeded. Maximum ${finalConfig.maxRequests} requests per ${Math.floor(finalConfig.windowMs / 1000 / 60)} minutes.`;

                throw new Error(
                    `${message} Current: ${result.current}, Reset at: ${result.resetAt.toISOString()}`
                );
            }

            await next();
        } catch (error) {
            if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
                res.status(429).json({
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: error.message,
                        statusCode: 429,
                    },
                });
                return;
            }

            // Re-throw other errors for error handler
            throw error;
        }
    };
}

/**
 * Cleanup old rate limit records
 */
export async function cleanupRateLimits(): Promise<number> {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const result = await prisma.rateLimit.deleteMany({
            where: {
                windowStart: {
                    lt: oneDayAgo,
                },
            },
        });

        return result.count;
    } catch (error) {
        // Don't throw for cleanup failures - just log
        console.error(
            `Rate limit cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return 0;
    }
}

