'use client';

import { useEffect, useState, useRef } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import {
    Plus,
    FileText,
    Download,
    Sparkles,
    Target,
    MessageSquare,
    Upload,
    Trash2,
    FileUp,
    CheckCircle,
    AlertCircle,
    Loader2,
    Search,
    Zap,
    TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AISettings } from '@/components/dashboard/AISettings';
import { cn } from '@/lib/utils/cn';

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

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950">
            {/* Success Modal */}
            {successModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <Card className="w-full max-w-md p-8 shadow-swiss border border-black/[0.08] dark:border-white/[0.08] animate-in zoom-in-95 duration-300">
                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 animate-bounce">
                                <CheckCircle className="h-10 w-10" />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-gray-900">
                                {successModal.title}
                            </h3>
                            <p className="mt-2 text-gray-500">
                                {successModal.message}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            {successModal.resumeId && (
                                <Link href={`/resume/${successModal.resumeId}`} className="w-full">
                                    <Button className="w-full h-12 rounded-xl text-lg font-semibold" variant="gradient">
                                        Edit Resume Now
                                    </Button>
                                </Link>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => setSuccessModal(null)}
                                className="w-full h-12 rounded-xl text-gray-500"
                            >
                                Back to Dashboard
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Create Options Modal */}
            {showCreateOptions && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-full max-w-lg p-8 shadow-swiss border border-black/[0.08] dark:border-white/[0.08] animate-in zoom-in-95 duration-200 relative bg-white dark:bg-gray-900">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 rounded-full"
                            onClick={() => setShowCreateOptions(false)}
                        >
                            <span className="text-xl">×</span>
                        </Button>
                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-display font-bold text-foreground mb-2">Create Resume</h3>
                            <p className="text-muted-foreground">Choose how you want to start building.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Link href="/resume/new" onClick={() => setShowCreateOptions(false)}>
                                <div className="group p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all cursor-pointer h-full flex flex-col items-center justify-center text-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-foreground">Start Fresh</h4>
                                        <p className="text-xs text-muted-foreground mt-1">Build from scratch</p>
                                    </div>
                                </div>
                            </Link>
                            <div
                                onClick={() => { if (!isUploading) { setShowCreateOptions(false); fileInputRef.current?.click(); } }}
                                className={cn(
                                    "group p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all cursor-pointer h-full flex flex-col items-center justify-center text-center gap-4",
                                    isUploading && "opacity-50 pointer-events-none cursor-not-allowed"
                                )}
                            >
                                <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">{isUploading ? 'Uploading...' : 'Import File'}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">PDF or DOCX</p>
                                </div>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.doc"
                            onChange={(e) => void handleFileUpload(e)}
                            className="hidden"
                        />
                    </Card>
                </div>
            )}

            {/* Error Modal */}
            {errorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md p-8 shadow-swiss border border-black/[0.08] dark:border-white/[0.08]">
                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                                <AlertCircle className="h-10 w-10" />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-gray-900">
                                {errorModal.title}
                            </h3>
                            <p className="mt-2 text-gray-500">
                                {errorModal.message}
                            </p>
                        </div>
                        <Button
                            onClick={() => setErrorModal(null)}
                            className="w-full h-12 rounded-xl"
                            variant="default"
                        >
                            Got it
                        </Button>
                    </Card>
                </div>
            )}

            {/* Delete Confirmation Modals... (omitted for brevity but kept in final output) */}
            {/* Keeping the confirmation modals from previous version but with better styling */}
            {uploadToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md p-8 shadow-swiss border border-black/[0.08] dark:border-white/[0.08]">
                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                                <Trash2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-gray-900">Delete File?</h3>
                            <p className="mt-2 text-gray-500">This will permanently remove the uploaded resume file.</p>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={cancelDeleteUpload} className="flex-1 h-12 rounded-xl">Cancel</Button>
                            <Button variant="destructive" onClick={() => void confirmDeleteUpload()} className="flex-1 h-12 rounded-xl">
                                {deletingUploadId ? <Loader2 className="animate-spin h-5 w-5" /> : 'Delete'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {resumeToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md p-8 shadow-swiss border border-black/[0.08] dark:border-white/[0.08]">
                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                                <Trash2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-gray-900">Delete Resume?</h3>
                            <p className="mt-2 text-gray-500">Are you sure you want to delete &quot;{resumeToDelete.title}&quot;? This cannot be undone.</p>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={cancelDeleteResume} className="flex-1 h-12 rounded-xl">Cancel</Button>
                            <Button variant="destructive" onClick={() => void confirmDeleteResume()} className="flex-1 h-12 rounded-xl">
                                {deletingResumeId ? <Loader2 className="animate-spin h-5 w-5" /> : 'Delete'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Swiss Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex items-center gap-2 group">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-none group-hover:scale-110 transition-transform">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <span className="text-xl font-display font-medium tracking-tight text-foreground">Handcraft</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                            <Link href="/templates" className="hover:text-foreground transition-colors">Templates</Link>
                            <Link href="/career-advice" className="hover:text-foreground transition-colors">Career Advice</Link>
                        </div>
                        <div className="h-6 w-[1px] bg-border" />
                        <div className="flex items-center gap-4">
                            <AISettings />
                            <ThemeToggle />
                            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 max-w-7xl">
                {/* Hero Typography */}
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-display font-medium tracking-tight text-foreground mb-4">
                        Welcome back, <span className="text-muted-foreground">{user?.firstName || 'Creator'}</span>.
                    </h1>
                    <p className="text-lg text-muted-foreground">Here is what is happening with your career documents today.</p>
                </div>

                {/* Bento Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
                    {[
                        { label: 'Total Resumes', value: resumes.length, icon: FileText },
                        { label: 'ATS Score Avg', value: '--', icon: TrendingUp },
                        { label: 'Tailored Roles', value: '0', icon: Zap },
                        { label: 'Total Uploads', value: uploadedResumes.length, icon: Upload }
                    ].map((stat, i) => (
                        <div key={i} className="group relative p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-black/[0.08] dark:border-white/[0.08] shadow-swiss transition-all hover:border-black/20 dark:hover:border-white/20 hover:shadow-swiss-hover hover:-translate-y-1">
                            <div className="mb-4 text-muted-foreground group-hover:text-foreground transition-colors">
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div className="absolute bottom-6 left-6">
                                <p className="text-3xl font-display font-medium text-foreground mb-1">{stat.value}</p>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                            </div>
                            <div className="h-24" /> {/* Spacer for absolute positioning */}
                        </div>
                    ))}
                </div>

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Left: Main Grid (Resumes + Actions) */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-display font-medium text-foreground">My Documents</h2>
                            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">View Archive</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-[minmax(280px,auto)]">
                            {/* 1. Create New Card (Bento Style) */}
                            <div className="relative group p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all cursor-pointer bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900 flex flex-col items-center justify-center text-center space-y-4" onClick={() => setShowCreateOptions(true)}>
                                <div className="h-16 w-16 rounded-full bg-foreground text-background flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                    <Plus className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Create New</h3>
                                    <p className="text-sm text-muted-foreground">Start from scratch or import</p>
                                </div>
                                {/* Hidden Input Hack if needed or logic trigger */}
                            </div>

                            {/* Resume Cards */}
                            {isLoading ? (
                                [1, 2].map(i => <div key={i} className="rounded-[2.5rem] bg-gray-100 dark:bg-gray-900 animate-pulse h-full min-h-[280px]" />)
                            ) : (
                                resumes.map((resume) => (
                                    <div key={resume.id} className="group relative p-8 rounded-[2.5rem] bg-white dark:bg-gray-900 border border-black/[0.08] dark:border-white/[0.08] shadow-swiss hover:scale-[1.02] hover:shadow-swiss-hover transition-all duration-300 flex flex-col">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="h-12 w-12 rounded-2xl bg-white dark:bg-black flex items-center justify-center text-foreground shadow-sm">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); handleDownload(resume.id, resume.title); }}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:text-red-500" onClick={(e) => { e.stopPropagation(); showDeleteConfirmation(resume.id, resume.title); }}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-auto">
                                            <h3 className="text-xl font-display font-medium text-foreground mb-2 line-clamp-1">{resume.title}</h3>
                                            <p className="text-sm text-muted-foreground mb-6">Edited {new Date(resume.updatedAt).toLocaleDateString()}</p>

                                            <Link href={`/resume/${resume.id}`}>
                                                <Button className="w-full rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90">
                                                    Edit Resume
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Sidebar Content */}
                    <div className="w-full lg:w-96 space-y-8">
                        {/* AI Toolbox */}
                        <Card variant="default" className="p-8 border border-black/[0.08] dark:border-white/[0.08] shadow-swiss relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Sparkles className="h-24 w-24 text-brand-600" />
                            </div>
                            <h3 className="text-xl font-display font-bold text-gray-900 mb-2">AI Toolbox</h3>
                            <p className="text-gray-500 text-sm mb-8">Boost your application with these intelligent power-ups.</p>

                            <div className="space-y-4">
                                <Link href="/ai/job-description" className="block p-4 rounded-2xl bg-gray-50 hover:bg-brand-50 hover:ring-1 hover:ring-brand-200 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:text-brand-600 transition-colors">
                                            <Search className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 leading-none mb-1">Role Analyzer</p>
                                            <p className="text-xs text-gray-500">Extract skills from job posts</p>
                                        </div>
                                    </div>
                                </Link>
                                <Link href="/ai/ats-score" className="block p-4 rounded-2xl bg-gray-50 hover:bg-brand-50 hover:ring-1 hover:ring-brand-200 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:text-brand-600 transition-colors">
                                            <Target className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 leading-none mb-1">ATS Matcher</p>
                                            <p className="text-xs text-gray-500">Calculate your compatibility</p>
                                        </div>
                                    </div>
                                </Link>
                                <Link href="/ai/interview-prep" className="block p-4 rounded-2xl bg-gray-50 hover:bg-brand-50 hover:ring-1 hover:ring-brand-200 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:text-brand-600 transition-colors">
                                            <MessageSquare className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 leading-none mb-1">Interview Prep</p>
                                            <p className="text-xs text-gray-500">Personalized AI coaching</p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </Card>

                        {/* Recent Activity / Uploads */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-display font-bold text-gray-900">Recent Uploads</h3>
                                <Badge variant="brand" size="xs" shape="pill">{uploadedResumes.length}</Badge>
                            </div>

                            {isLoadingUploads ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
                                </div>
                            ) : uploadedResumes.length === 0 ? (
                                <div className="p-8 text-center rounded-3xl bg-gray-50 text-gray-400 text-sm">
                                    No recent files uploaded.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {uploadedResumes.slice(0, 3).map((upload) => (
                                        <div key={upload.id} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-black/[0.08] dark:border-white/[0.08] shadow-sm group">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                    <FileUp className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{upload.originalFilename}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">
                                                        {upload.status} • {formatFileSize(upload.fileSize)}
                                                    </p>
                                                </div>
                                                {upload.status === 'COMPLETED' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full text-brand-600 hover:bg-brand-50"
                                                        onClick={() => void handleCreateResumeFromUpload(upload.id)}
                                                        loading={creatingResumeFromId === upload.id}
                                                        disabled={creatingResumeFromId !== null}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50"
                                                    onClick={() => showDeleteUploadConfirmation(upload.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
