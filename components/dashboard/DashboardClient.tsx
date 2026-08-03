'use client';

import { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import {
    Plus,
    CheckCircle,
    Loader2,
    Search,
    Target,
    MessageSquare,
    Sparkles,
    Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal/Modal';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ResumeGrid } from '@/components/dashboard/ResumeGrid';
import { UploadsList } from '@/components/dashboard/UploadsList';
import { NewResumeModal } from '@/components/resume/NewResumeModal';

interface Resume {
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
}

interface UploadedResume {
    id: string;
    originalFilename: string;
    fileSize: number;
    mimeType: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    processingError: string | null;
    parsedData: {
        personalInfo?: {
            fullName?: string;
            email?: string;
            phone?: string;
        };
        workExperience?: unknown[];
        education?: unknown[];
        skills?: string[];
    } | null;
    createdAt: string;
    processedAt: string | null;
}

export default function DashboardClient() {
    const { user } = useUser();
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [uploadedResumes, setUploadedResumes] = useState<UploadedResume[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingUploads, setIsLoadingUploads] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);
    const [creatingResumeFromId, setCreatingResumeFromId] = useState<string | null>(null);
    const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);
    const [resumeToDelete, setResumeToDelete] = useState<{ id: string; title: string } | null>(null);
    const [uploadToDelete, setUploadToDelete] = useState<string | null>(null);
    const [successModal, setSuccessModal] = useState<{ title: string; message: string; resumeId?: string } | null>(null);
    const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
    const [showCreateOptions, setShowCreateOptions] = useState(false);
    const [showNewResumeModal, setShowNewResumeModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function fetchResumes() {
            try {
                const response = await fetch('/api/resumes');
                const data: { success: boolean; data?: Resume[]; error?: { message: string } } =
                    await response.json() as { success: boolean; data?: Resume[]; error?: { message: string } };

                if (!response.ok) {
                    throw new Error(data.error?.message ?? 'Failed to fetch resumes');
                }

                setResumes(data.data ?? []);
            } catch (err) {
                setErrorModal({
                    title: 'Error Fetching Resumes',
                    message: err instanceof Error ? err.message : 'An error occurred',
                });
            } finally {
                setIsLoading(false);
            }
        }

        async function fetchUploadedResumes() {
            try {
                const response = await fetch('/api/uploaded-resumes');
                const data = await response.json() as { success: boolean; data?: UploadedResume[] };

                if (!response.ok) {
                    throw new Error('Failed to fetch uploaded resumes');
                }

                setUploadedResumes(data.data ?? []);
            } catch (err) {
                console.error('Error fetching uploads:', err);
            } finally {
                setIsLoadingUploads(false);
            }
        }

        void fetchResumes();
        void fetchUploadedResumes();
    }, []);

    async function handleDownload(resumeId: string, resumeTitle: string) {
        if (downloadingId) return; // Prevent multiple simultaneous downloads

        setDownloadingId(resumeId);
        try {
            const response = await fetch('/api/resumes/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resumeId,
                    format: 'PDF',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || 'Failed to download resume');
            }

            // Get the blob from the response
            const blob = await response.blob();

            // Create a download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${resumeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download error:', err);
            setErrorModal({
                title: 'Download Failed',
                message: err instanceof Error ? err.message : 'An unknown error occurred while downloading the resume',
            });
        } finally {
            setDownloadingId(null);
        }
    }

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
                message: 'Maximum size is 10MB.',
            });
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to upload resume');
            }

            // Refresh uploaded resumes list
            const uploadsResponse = await fetch('/api/uploaded-resumes');
            const uploadsData = await uploadsResponse.json() as { success: boolean; data?: UploadedResume[] };
            setUploadedResumes(uploadsData.data ?? []);

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            console.error('Upload error:', err);
            setErrorModal({
                title: 'Upload Failed',
                message: err instanceof Error ? err.message : 'Failed to upload resume',
            });
        } finally {
            setIsUploading(false);
        }
    }

    function showDeleteUploadConfirmation(uploadId: string) {
        setUploadToDelete(uploadId);
    }

    async function confirmDeleteUpload() {
        if (!uploadToDelete) return;

        setDeletingUploadId(uploadToDelete);
        try {
            const response = await fetch('/api/uploaded-resumes', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uploadId: uploadToDelete }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete upload');
            }

            // Remove from state
            setUploadedResumes(prev => prev.filter(u => u.id !== uploadToDelete));
            setUploadToDelete(null);
        } catch (err) {
            console.error('Delete error:', err);
            setErrorModal({
                title: 'Error Deleting Upload',
                message: err instanceof Error ? err.message : 'An unknown error occurred',
            });
        } finally {
            setDeletingUploadId(null);
        }
    }

    function cancelDeleteUpload() {
        setUploadToDelete(null);
    }

    async function handleCreateResumeFromUpload(uploadId: string) {
        setCreatingResumeFromId(uploadId);
        try {
            const response = await fetch('/api/uploaded-resumes/create-from-upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uploadId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to create resume');
            }

            // Refresh resumes list
            const resumesResponse = await fetch('/api/resumes');
            const resumesData = await resumesResponse.json() as { success: boolean; data?: Resume[] };
            setResumes(resumesData.data ?? []);

            // Show success modal with edit and OK options
            setSuccessModal({
                title: 'Resume Created Successfully!',
                message: `Your resume "${data.data.title}" has been created and is ready to edit.`,
                resumeId: data.data.resumeId,
            });
        } catch (err) {
            console.error('Create resume error:', err);
            setErrorModal({
                title: 'Error Creating Resume',
                message: err instanceof Error ? err.message : 'An unknown error occurred',
            });
        } finally {
            setCreatingResumeFromId(null);
        }
    }

    function showDeleteConfirmation(resumeId: string, resumeTitle: string) {
        setResumeToDelete({ id: resumeId, title: resumeTitle });
    }

    async function confirmDeleteResume() {
        if (!resumeToDelete) return;

        setDeletingResumeId(resumeToDelete.id);
        try {
            const response = await fetch(`/api/resumes/${resumeToDelete.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || 'Failed to delete resume');
            }

            // Remove from state
            setResumes(prev => prev.filter(r => r.id !== resumeToDelete.id));
            setResumeToDelete(null);
        } catch (err) {
            console.error('Delete error:', err);
            setErrorModal({
                title: 'Error Deleting Resume',
                message: err instanceof Error ? err.message : 'An unknown error occurred',
            });
        } finally {
            setDeletingResumeId(null);
        }
    }

    function cancelDeleteResume() {
        setResumeToDelete(null);
    }

    return (
        <div className="min-h-screen bg-background dark:bg-gray-950">
            {/* Standardized Header */}
            <DashboardHeader />

            {/* Success Modal */}
            <Modal isOpen={!!successModal} onClose={() => setSuccessModal(null)} size="sm" showCloseButton={false}>
                {successModal && (
                    <>
                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600 animate-bounce">
                                <CheckCircle className="h-10 w-10" />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-foreground">
                                {successModal.title}
                            </h3>
                            <p className="mt-2 text-muted-foreground">
                                {successModal.message}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            {successModal.resumeId && (
                                <Link href={`/resume/${successModal.resumeId}`} className="w-full">
                                    <Button className="w-full h-12 rounded-xl text-lg font-semibold" variant="default">
                                        Edit Resume Now
                                    </Button>
                                </Link>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => setSuccessModal(null)}
                                className="w-full h-12 rounded-xl"
                            >
                                Back to Dashboard
                            </Button>
                        </div>
                    </>
                )}
            </Modal>

            {/* Create Options Modal */}
            <Modal isOpen={showCreateOptions} onClose={() => setShowCreateOptions(false)} size="md">
                <div className="text-center mb-8">
                    <h3 className="text-2xl font-display font-bold text-foreground mb-2">Create Resume</h3>
                    <p className="text-muted-foreground">Choose how you want to start building.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/resume/new" onClick={() => { setShowCreateOptions(false); setShowNewResumeModal(true); }}>
                        <div className="group p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all cursor-pointer h-full flex flex-col items-center justify-center text-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">Start Fresh</h4>
                                <p className="text-xs text-muted-foreground mt-1">Name it &amp; pick target roles</p>
                            </div>
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={() => { if (!isUploading) { setShowCreateOptions(false); fileInputRef.current?.click(); } }}
                        className={cn(
                            "group p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all cursor-pointer h-full flex flex-col items-center justify-center text-center gap-4",
                            isUploading && "opacity-50 pointer-events-none cursor-not-allowed"
                        )}
                    >
                        <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-foreground">{isUploading ? 'Uploading...' : 'Import File'}</h4>
                            <p className="text-xs text-muted-foreground mt-1">PDF or DOCX</p>
                        </div>
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => void handleFileUpload(e)}
                    className="hidden"
                />
            </Modal>

            {/* Error Modal */}
            <AlertDialog
                isOpen={!!errorModal}
                title={errorModal?.title || 'Error'}
                message={errorModal?.message || 'An unexpected error occurred'}
                type="error"
                buttonText="Got it"
                onClose={() => setErrorModal(null)}
            />

            {/* Delete Upload Confirmation */}
            <ConfirmDialog
                isOpen={!!uploadToDelete}
                title="Delete File?"
                message="This will permanently remove the uploaded resume file."
                confirmText="Delete"
                cancelText="Cancel"
                confirmVariant="destructive"
                isLoading={deletingUploadId !== null}
                onConfirm={() => void confirmDeleteUpload()}
                onCancel={cancelDeleteUpload}
            />

            {/* Delete Resume Confirmation */}
            <ConfirmDialog
                isOpen={!!resumeToDelete}
                title="Delete Resume?"
                message={`Are you sure you want to delete "${resumeToDelete?.title}"? This cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                confirmVariant="destructive"
                isLoading={deletingResumeId !== null}
                onConfirm={() => void confirmDeleteResume()}
                onCancel={cancelDeleteResume}
            />

            {/* New Resume Modal (name + target roles) */}
            <NewResumeModal
                isOpen={showNewResumeModal}
                onClose={() => setShowNewResumeModal(false)}
            />

            <main id="main-content" className="container mx-auto px-6 py-12 max-w-7xl">
                {/* Hero Typography */}
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-display font-medium tracking-tight text-foreground mb-4">
                        Welcome back, <span className="text-muted-foreground">{user?.firstName || 'Creator'}</span>.
                    </h1>
                    <p className="text-lg text-muted-foreground">Here is what is happening with your career documents today.</p>
                </div>

                {/* Bento Stats Grid */}
                <DashboardStats resumeCount={resumes.length} uploadCount={uploadedResumes.length} />

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Left: Main Grid (Resumes + Actions) */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-display font-medium text-foreground">My Documents</h2>
                        </div>

                        {/* Resume Grid Component */}
                        <ResumeGrid
                            resumes={resumes}
                            isLoading={isLoading}
                            onCreateNew={() => setShowNewResumeModal(true)}
                            onDownload={handleDownload}
                            onDelete={showDeleteConfirmation}
                        />
                    </div>

                    {/* Right: Sidebar Content */}
                    <div className="w-full lg:w-96 space-y-8">
                        {/* AI Toolbox */}
                        <Card variant="default" className="p-8 border-border/70 shadow-card relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Sparkles className="h-24 w-24 text-foreground" />
                            </div>
                            <h3 className="font-display text-xl font-semibold tracking-tight text-foreground mb-2">AI Toolbox</h3>
                            <p className="text-muted-foreground text-sm mb-8">Boost your application with these intelligent power-ups.</p>

                            <div className="space-y-3">
                                <Link href="/ai/job-description" className="block p-4 rounded-2xl bg-muted/40 hover:bg-muted/70 hover:ring-1 hover:ring-border transition-all duration-normal ease-out-expo group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-card shadow-card flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                                            <Search className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground leading-none mb-1 group-hover:text-foreground transition-colors">Role Analyzer</p>
                                            <p className="text-xs text-muted-foreground">Extract skills from job posts</p>
                                        </div>
                                    </div>
                                </Link>
                                <Link
                                    href="/ai/ats-score"
                                    className="block p-4 rounded-2xl bg-muted/40 hover:bg-muted/70 hover:ring-1 hover:ring-border transition-all duration-normal ease-out-expo group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-card shadow-card flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                                            <Target className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground leading-none mb-1 group-hover:text-foreground transition-colors">ATS Matcher</p>
                                            <p className="text-xs text-muted-foreground">Calculate your compatibility</p>
                                        </div>
                                    </div>
                                </Link>
                                <Link href="/ai/interview-prep" className="block p-4 rounded-2xl bg-muted/40 hover:bg-muted/70 hover:ring-1 hover:ring-border transition-all duration-normal ease-out-expo group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-card shadow-card flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                                            <MessageSquare className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground leading-none mb-1 group-hover:text-foreground transition-colors">Interview Prep</p>
                                            <p className="text-xs text-muted-foreground">Personalized AI coaching</p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </Card>

                        {/* Recent Activity / Uploads */}
                        <UploadsList
                            uploads={uploadedResumes}
                            isLoading={isLoadingUploads}
                            creatingFromId={creatingResumeFromId}
                            onCreateFromUpload={(id) => void handleCreateResumeFromUpload(id)}
                            onDelete={showDeleteUploadConfirmation}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
