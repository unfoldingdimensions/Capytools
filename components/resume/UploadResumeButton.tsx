'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadResumeButtonProps {
    onResumeCreated?: (resumeId: string) => void;
    variant?: 'default' | 'outline' | 'ghost';
    className?: string;
}

export default function UploadResumeButton({
    onResumeCreated,
    variant = 'outline',
    className = ''
}: UploadResumeButtonProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [successModal, setSuccessModal] = useState<{ title: string; message: string; resumeId?: string } | null>(null);
    const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
        ];

        if (!validTypes.includes(file.type)) {
            setErrorModal({
                title: 'Invalid File Type',
                message: 'Please upload a PDF or DOCX file.',
            });
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setErrorModal({
                title: 'File Too Large',
                message: 'Maximum file size is 10MB.',
            });
            return;
        }

        setIsUploading(true);

        try {
            // Step 1: Upload file
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok) {
                throw new Error(uploadData.error?.message || 'Failed to upload resume');
            }

            const uploadId = uploadData.data?.uploadId;
            if (!uploadId) {
                throw new Error('Upload ID not returned from server');
            }

            // Step 2: Wait for processing to complete
            setIsUploading(false);
            setIsProcessing(true);

            // Poll for completion (max 30 seconds)
            let attempts = 0;
            const maxAttempts = 30;
            let uploadStatus = 'PROCESSING';

            while (uploadStatus === 'PROCESSING' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

                const statusResponse = await fetch('/api/uploaded-resumes');
                const statusData = await statusResponse.json();

                if (statusData.success && statusData.data) {
                    const upload = statusData.data.find((u: { id: string }) => u.id === uploadId);
                    if (upload) {
                        uploadStatus = upload.status;
                        if (uploadStatus === 'FAILED') {
                            throw new Error(upload.processingError || 'Resume parsing failed');
                        }
                        if (uploadStatus === 'COMPLETED') {
                            break;
                        }
                    }
                }
                attempts++;
            }

            if (uploadStatus !== 'COMPLETED') {
                throw new Error('Resume processing timed out. Please try again.');
            }

            // Step 3: Create resume from upload
            const createResponse = await fetch('/api/uploaded-resumes/create-from-upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uploadId }),
            });

            const createData = await createResponse.json();

            if (!createResponse.ok) {
                throw new Error(createData.error?.message || 'Failed to create resume');
            }

            // Step 4: Success - show modal and callback
            setSuccessModal({
                title: 'Resume Uploaded Successfully!',
                message: `Your resume "${createData.data.title}" has been parsed and is ready to use.`,
                resumeId: createData.data.resumeId,
            });

            // Call callback if provided
            if (onResumeCreated) {
                onResumeCreated(createData.data.resumeId);
            }

        } catch (err) {
            console.error('Upload error:', err);
            setErrorModal({
                title: 'Upload Failed',
                message: err instanceof Error ? err.message : 'An unknown error occurred while uploading the resume',
            });
        } finally {
            setIsUploading(false);
            setIsProcessing(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload-input"
            />
            <Button
                variant={variant}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isProcessing}
                className={className}
            >
                {isUploading || isProcessing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isUploading ? 'Uploading...' : 'Processing...'}
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Resume
                    </>
                )}
            </Button>

            {/* Success Modal */}
            {successModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {successModal.title}
                                </h3>
                            </div>
                        </div>
                        <p className="mb-6 text-gray-700">
                            {successModal.message}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setSuccessModal(null)}
                                className="flex-1"
                            >
                                OK
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            {errorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {errorModal.title}
                                </h3>
                            </div>
                        </div>
                        <p className="mb-6 text-gray-700">
                            {errorModal.message}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setErrorModal(null)}
                                className="flex-1"
                            >
                                OK
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

