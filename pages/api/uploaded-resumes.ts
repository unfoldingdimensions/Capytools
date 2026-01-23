import { NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedApiRequest } from '@/types/api.types';
import { prisma } from '@/lib/db/prisma';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { decryptJSON } from '@/lib/security/encryption';

/**
 * GET /api/uploaded-resumes - Fetch user's uploaded resume files
 * DELETE /api/uploaded-resumes - Delete an uploaded resume file
 */

async function handler(req: AuthenticatedApiRequest, res: NextApiResponse) {
    const { userId } = req;

    if (req.method === 'GET') {
        return handleGetUploadedResumes(req, res, userId);
    }

    if (req.method === 'DELETE') {
        return handleDeleteUploadedResume(req, res, userId);
    }

    res.status(405).json({
        success: false,
        error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method || 'UNKNOWN'} not allowed`,
            statusCode: 405,
        },
    });
}

async function handleGetUploadedResumes(
    _req: AuthenticatedApiRequest,
    res: NextApiResponse,
    userId: string
) {
    const uploads = await prisma.uploadedFile.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            id: true,
            originalFilename: true,
            fileSize: true,
            mimeType: true,
            status: true,
            processingError: true,
            extractedDataEncrypted: true,
            createdAt: true,
            processedAt: true,
        },
    });

    // Decrypt extracted data for completed uploads
    const uploadsWithData = uploads.map((upload) => {
        if (upload.status === 'COMPLETED' && upload.extractedDataEncrypted) {
            try {
                const parsedData = decryptJSON(upload.extractedDataEncrypted);
                return {
                    ...upload,
                    parsedData,
                    extractedDataEncrypted: undefined, // Remove encrypted field from response
                };
            } catch (error) {
                console.error('Failed to decrypt upload data:', error);
                return {
                    ...upload,
                    parsedData: null,
                    extractedDataEncrypted: undefined,
                };
            }
        }
        return {
            ...upload,
            parsedData: null,
            extractedDataEncrypted: undefined,
        };
    });

    res.status(200).json({
        success: true,
        data: uploadsWithData,
    });
}

async function handleDeleteUploadedResume(
    req: AuthenticatedApiRequest,
    res: NextApiResponse,
    userId: string
) {
    const { uploadId } = req.body as { uploadId?: string };

    if (!uploadId) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'uploadId is required',
                statusCode: 400,
            },
        });
        return;
    }

    // Verify ownership
    const upload = await prisma.uploadedFile.findUnique({
        where: { id: uploadId },
        select: { userId: true },
    });

    if (!upload) {
        res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Upload not found',
                statusCode: 404,
            },
        });
        return;
    }

    if (upload.userId !== userId) {
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'You do not have permission to delete this upload',
                statusCode: 403,
            },
        });
        return;
    }

    // Delete the upload
    await prisma.uploadedFile.delete({
        where: { id: uploadId },
    });

    // Log deletion
    await prisma.auditLog.create({
        data: {
            userId,
            action: 'delete_upload',
            resource: 'uploaded_file',
            resourceId: uploadId,
            success: true,
            metadata: JSON.stringify({ uploadId }),
        },
    });

    res.status(200).json({
        success: true,
        message: 'Upload deleted successfully',
    });
}

// Apply middleware
export default asyncHandler(async (req: NextApiRequest, res: NextApiResponse) => {
    await requireAuth(req, res, async () => {
        await rateLimit()(req, res, async () => {
            await handler(req as AuthenticatedApiRequest, res);
        });
    });
});

