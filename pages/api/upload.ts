import { NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedApiRequest } from '@/types/api.types';
import { prisma } from '@/lib/db/prisma';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { parseResumeFile, validateParsedData } from '@/lib/services/resumeParser.service';
import { encryptJSON } from '@/lib/security/encryption';
import { getAIConfigFromRequest } from '@/lib/ai-config-helper';
import formidable from 'formidable';
import fs from 'fs/promises';

/**
 * POST /api/upload - Upload and parse resume file
 */

async function handler(req: AuthenticatedApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: `Method ${req.method || 'UNKNOWN'} not allowed on this endpoint`,
                statusCode: 405,
            },
        });
        return;
    }

    const { userId } = req;

    // Parse multipart form data
    const form = formidable({
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowEmptyFiles: false,
        filter: (part) => {
            return (
                part.mimetype === 'application/pdf' ||
                part.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                part.mimetype === 'application/msword'
            );
        },
    });

    const [, files] = await form.parse(req);

    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
        throw new Error(
            'No file uploaded or invalid file type. Supported types: PDF, DOCX'
        );
    }

    const file = fileArray[0];
    if (!file) {
        throw new Error('File upload failed');
    }

    // Create upload record.
    // There is no durable file storage yet: the parsed content is stored encrypted
    // in extractedDataEncrypted and the temp file is deleted after processing, so
    // storageUrl is left empty rather than pointing at a soon-to-be-deleted temp path.
    const uploadRecord = await prisma.uploadedFile.create({
        data: {
            userId,
            originalFilename: file.originalFilename || 'unknown',
            fileSize: file.size,
            mimeType: file.mimetype || 'application/octet-stream',
            storageUrl: '',
            status: 'PROCESSING',
        },
    });

    try {
        // Read file buffer
        const buffer = await fs.readFile(file.filepath);

        // Parse resume with the user's BYOK config (falls back to server default)
        const parsedData = await parseResumeFile(buffer, file.mimetype || '', getAIConfigFromRequest(req));

        // Validate parsed data
        const validation = validateParsedData(parsedData);

        // Encrypt and store parsed data
        const extractedDataEncrypted = encryptJSON(parsedData);

        // Update upload record
        await prisma.uploadedFile.update({
            where: { id: uploadRecord.id },
            data: {
                status: 'COMPLETED',
                extractedDataEncrypted,
                processedAt: new Date(),
            },
        });

        // Clean up temporary file
        await fs.unlink(file.filepath).catch((error) => {
            console.error('Failed to delete temp file:', error);
        });

        // Log upload
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'upload_resume',
                resource: 'uploaded_file',
                resourceId: uploadRecord.id,
                success: true,
                metadata: JSON.stringify({
                    filename: file.originalFilename,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                }),
            },
        });

        res.status(200).json({
            success: true,
            data: {
                uploadId: uploadRecord.id,
                parsedData,
                validation,
            },
            message: validation.isValid
                ? 'Resume uploaded and parsed successfully'
                : `Resume parsed with warnings: Missing ${validation.missingFields.join(', ')}`,
        });
    } catch (error) {
        // Update upload record with error
        await prisma.uploadedFile.update({
            where: { id: uploadRecord.id },
            data: {
                status: 'FAILED',
                processingError: error instanceof Error ? error.message : 'Unknown error',
            },
        });

        // Clean up temporary file
        await fs.unlink(file.filepath).catch((unlinkError) => {
            console.error('Failed to delete temp file:', unlinkError);
        });

        throw error;
    }
}

// Apply middleware
export default asyncHandler(async (req: NextApiRequest, res: NextApiResponse) => {
    await requireAuth(req, res, async () => {
        await rateLimit({ maxRequests: 5, windowMs: 900000 })(req, res, async () => {
            await handler(req as AuthenticatedApiRequest, res);
        });
    });
});

// Disable default body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

