import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { prisma } from '@/lib/db/prisma';

/**
 * Global Error Handler Middleware
 * 
 * CRITICAL: Implements fail-loud error handling philosophy.
 * All errors are logged with full context and returned with detailed messages.
 */

interface ErrorLog {
    userId?: string;
    endpoint: string;
    method: string;
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Logs error to database for auditing
 */
async function logError(req: NextApiRequest, error: Error, errorLog: ErrorLog): Promise<void> {
    try {
        const forwarded = req.headers['x-forwarded-for'];
        const ipAddress = typeof forwarded === 'string'
            ? forwarded.split(',')[0]?.trim()
            : req.socket.remoteAddress;

        await prisma.auditLog.create({
            data: {
                userId: errorLog.userId,
                action: 'error',
                resource: errorLog.endpoint,
                ipAddress: ipAddress || 'unknown',
                userAgent: req.headers['user-agent'] || undefined,
                success: false,
                errorMessage: errorLog.errorMessage,
                metadata: JSON.stringify({
                    errorType: errorLog.errorType,
                    method: errorLog.method,
                    stackTrace: errorLog.stackTrace,
                }),
            },
        });
    } catch (logError) {
        // If logging fails, at least log to console
        console.error('Failed to log error to database:', logError);
        console.error('Original error:', error);
    }
}

/**
 * Formats Zod validation errors
 */
function formatZodError(error: ZodError): string {
    return error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
}

/**
 * Main error handler
 */
export async function errorHandler(
    error: Error,
    req: NextApiRequest,
    res: NextApiResponse
): Promise<void> {
    const authReq = req as unknown as Record<string, unknown>;
    const userId = authReq.userId as string | undefined;

    const errorLog: ErrorLog = {
        userId,
        endpoint: req.url || '/unknown',
        method: req.method || 'UNKNOWN',
        errorType: error.constructor.name,
        errorMessage: error.message,
        stackTrace: error.stack,
    };

    // Log error to database
    await logError(req, error, errorLog);

    // Zod Validation Errors
    if (error instanceof ZodError) {
        const formattedError = formatZodError(error);

        console.error('Validation Error:', {
            endpoint: errorLog.endpoint,
            method: errorLog.method,
            userId: errorLog.userId,
            errors: error.errors,
        });

        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed. Check the details for specific field errors.',
                statusCode: 400,
                details: {
                    formattedMessage: formattedError,
                    errors: error.errors,
                },
            },
        });
        return;
    }

    // Prisma Database Errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Database Error:', {
            code: error.code,
            meta: error.meta,
            message: error.message,
            endpoint: errorLog.endpoint,
            userId: errorLog.userId,
        });

        // Unique constraint violation
        if (error.code === 'P2002') {
            const target = (error.meta?.target as string[]) || [];
            res.status(409).json({
                success: false,
                error: {
                    code: 'DUPLICATE_ENTRY',
                    message: `A record with this ${target.join(', ')} already exists.`,
                    statusCode: 409,
                    details: {
                        fields: target,
                        prismaCode: error.code,
                    },
                },
            });
            return;
        }

        // Record not found
        if (error.code === 'P2025') {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'The requested resource was not found.',
                    statusCode: 404,
                    details: {
                        prismaCode: error.code,
                        meta: error.meta,
                    },
                },
            });
            return;
        }

        // Foreign key constraint violation
        if (error.code === 'P2003') {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_REFERENCE',
                    message: 'Invalid reference to related resource.',
                    statusCode: 400,
                    details: {
                        prismaCode: error.code,
                        meta: error.meta,
                    },
                },
            });
            return;
        }

        // Generic database error
        res.status(500).json({
            success: false,
            error: {
                code: 'DATABASE_ERROR',
                message: 'A database error occurred. The error has been logged and will be investigated.',
                statusCode: 500,
                details: {
                    prismaCode: error.code,
                    message: error.message,
                },
            },
        });
        return;
    }

    // Prisma Validation Errors
    if (error instanceof Prisma.PrismaClientValidationError) {
        console.error('Prisma Validation Error:', {
            message: error.message,
            endpoint: errorLog.endpoint,
            userId: errorLog.userId,
        });

        res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_DATA',
                message: 'Invalid data provided to database operation.',
                statusCode: 400,
                details: {
                    message: error.message,
                },
            },
        });
        return;
    }

    // Custom Application Errors
    if (error.message.includes('ENCRYPTION_KEY') || error.message.includes('JWT_SECRET')) {
        console.error('Configuration Error:', {
            message: error.message,
            endpoint: errorLog.endpoint,
        });

        res.status(500).json({
            success: false,
            error: {
                code: 'CONFIGURATION_ERROR',
                message: 'Server configuration error. Please contact the administrator.',
                statusCode: 500,
                details: {
                    hint: 'Check environment variables',
                },
            },
        });
        return;
    }

    // Generic Error
    console.error('Unhandled Error:', {
        type: errorLog.errorType,
        message: error.message,
        stack: error.stack,
        endpoint: errorLog.endpoint,
        method: errorLog.method,
        userId: errorLog.userId,
    });

    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: process.env.NODE_ENV === 'development'
                ? `Internal server error: ${error.message}`
                : 'An unexpected error occurred. The error has been logged and will be investigated.',
            statusCode: 500,
            details: process.env.NODE_ENV === 'development'
                ? {
                    type: errorLog.errorType,
                    message: error.message,
                    stack: error.stack,
                }
                : undefined,
        },
    });
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
    return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
        try {
            await handler(req, res);
        } catch (error) {
            await errorHandler(error as Error, req, res);
        }
    };
}

