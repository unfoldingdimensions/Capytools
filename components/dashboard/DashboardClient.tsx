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
    Edit,
    TrendingUp,
    Zap,
    History,
    MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AISettings } from '@/components/dashboard/AISettings';

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
                    <Card className="w-full max-w-md p-8 shadow-2xl border-none animate-in zoom-in-95 duration-300">
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

            {/* Error Modal */}
            {errorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md p-8 shadow-2xl border-none">
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
                    <Card className="w-full max-w-md p-8 shadow-2xl border-none">
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
                    <Card className="w-full max-w-md p-8 shadow-2xl border-none">
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

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100 dark:bg-gray-950/70 dark:border-gray-800">
                <div className="container mx-auto px-4">
                    <div className="flex h-20 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="flex items-center gap-2 group">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200 group-hover:scale-105 transition-transform">
                                    <Sparkles className="h-6 w-6" />
                                </div>
                                <span className="text-2xl font-display font-black tracking-tight text-gray-900 dark:text-white uppercase">Handcraft</span>
                            </Link>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
                                <Link href="/templates" className="hover:text-brand-600 transition-colors">Templates</Link>
                                <Link href="/career-advice" className="hover:text-brand-600 transition-colors">Career Advice</Link>
                            </div>
                            <div className="h-6 w-[1px] bg-gray-200" />
                            <div className="flex items-center gap-4">
                                <AISettings />
                                <ThemeToggle />
                                <div className="flex items-center gap-3 pl-2 border-l border-gray-100">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">{user?.firstName || 'User'}</p>
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Premium Member</p>
                                    </div>
                                    <UserButton afterSignOutUrl="/" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                {/* Hero Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <Card variant="default" className="p-6 border-none shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                        <div className="h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors duration-300">
                            <FileText className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Total Resumes</p>
                            <h4 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{resumes.length}</h4>
                        </div>
                    </Card>
                    <Card variant="default" className="p-6 border-none shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                            <TrendingUp className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">ATS Score Avg</p>
                            <h4 className="text-2xl font-display font-bold text-gray-900 dark:text-white">--</h4>
                        </div>
                    </Card>
                    <Card variant="default" className="p-6 border-none shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                            <Zap className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Tailored Roles</p>
                            <h4 className="text-2xl font-display font-bold text-gray-900 dark:text-white">0</h4>
                        </div>
                    </Card>
                    <Card variant="default" className="p-6 border-none shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                        <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                            <History className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Uploads</p>
                            <h4 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{uploadedResumes.length}</h4>
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Left: Actions & Resumes */}
                    <div className="flex-1 space-y-12">
                        {/* New Resume Action */}
                        <Card gradient className="relative p-12 overflow-hidden border-none shadow-2xl shadow-brand-200/50 bg-gradient-to-r from-brand-600 to-indigo-600">
                            <div className="absolute top-0 right-0 -m-8 h-64 w-64 bg-white/10 blur-3xl rounded-full" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="text-center md:text-left">
                                    <h2 className="text-4xl font-display font-black text-white mb-4 tracking-tight">Create your next big hit.</h2>
                                    <p className="text-brand-50 text-lg max-w-md font-medium opacity-90">
                                        Use our AI-powered engine to build a resume that actually gets you hired.
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                                    <Link href="/resume/new">
                                        <Button size="xl" variant="secondary" className="rounded-2xl h-16 px-10 text-brand-700 shadow-xl shadow-brand-900/10 font-bold hover:scale-105 transition-transform">
                                            <Plus className="mr-2 h-6 w-6" />
                                            Build From Scratch
                                        </Button>
                                    </Link>
                                    <Button
                                        size="xl"
                                        variant="outline"
                                        className="rounded-2xl h-16 px-10 border-white bg-white/10 text-white font-bold hover:bg-white/20 hover:scale-105 transition-all"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <Loader2 className="animate-spin h-6 w-6" /> : <Upload className="mr-2 h-6 w-6" />}
                                        Import Existing
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.docx,.doc"
                                        onChange={(e) => void handleFileUpload(e)}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Recent Resumes */}
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                                        <FileText className="h-5 w-5 text-gray-700" />
                                    </div>
                                    <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Recent Documents</h2>
                                </div>
                                <Button variant="ghostSubtle" size="sm" className="font-bold text-gray-500 hover:text-brand-600">View All Documents</Button>
                            </div>

                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[1, 2].map(i => (
                                        <div key={i} className="h-48 rounded-3xl bg-gray-100 animate-pulse" />
                                    ))}
                                </div>
                            ) : resumes.length === 0 ? (
                                <div className="text-center py-20 px-4 rounded-[40px] border-2 border-dashed border-gray-200 bg-gray-50/50">
                                    <div className="h-20 w-20 rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 flex items-center justify-center mx-auto mb-6">
                                        <FileText className="h-10 w-10 text-gray-200" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Your document shelf is empty</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto mb-8">Start your journey by creating or importing your first professional resume.</p>
                                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="rounded-full">Upload New File</Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {resumes.map((resume) => (
                                        <Card key={resume.id} variant="default" className="group overflow-hidden border-none shadow-sm hover:shadow-xl hover:shadow-brand-500/5 hover:-translate-y-1 transition-all duration-300">
                                            <div className="flex p-5 gap-6">
                                                {/* Mini Page Preview */}
                                                <div className="h-32 w-24 shrink-0 rounded-xl bg-gray-50 ring-1 ring-gray-100 group-hover:ring-brand-100 transition-colors flex flex-col p-2 space-y-1.5 overflow-hidden">
                                                    <div className="h-1 w-full bg-brand-100 rounded-full" />
                                                    <div className="h-1 w-2/3 bg-gray-100 rounded-full" />
                                                    <div className="h-1 w-1/2 bg-gray-100 rounded-full" />
                                                    <div className="mt-4 space-y-1">
                                                        <div className="h-1 w-full bg-gray-50 rounded-full" />
                                                        <div className="h-1 w-full bg-gray-50 rounded-full" />
                                                        <div className="h-1 w-full bg-gray-50 rounded-full" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 flex flex-col pt-2">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors line-clamp-1">{resume.title}</h3>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="success" size="sm" shape="pill" className="h-5">Live</Badge>
                                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{new Date(resume.updatedAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-300">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="mt-auto flex items-center justify-between pt-4">
                                                        <Link href={`/resume/${resume.id}`}>
                                                            <Button size="sm" className="rounded-full px-5 h-9 font-bold bg-brand-50 text-brand-700 hover:bg-brand-600 hover:text-white border-none transition-all">
                                                                <Edit className="h-3.5 w-3.5 mr-1.5" />
                                                                Edit
                                                            </Button>
                                                        </Link>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghostSubtle"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-full"
                                                                onClick={() => handleDownload(resume.id, resume.title)}
                                                            >
                                                                <Download className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                            <Button
                                                                variant="ghostSubtle"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-full hover:bg-red-50 hover:text-red-500"
                                                                onClick={() => showDeleteConfirmation(resume.id, resume.title)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Sidebar Content */}
                    <div className="w-full lg:w-96 space-y-8">
                        {/* AI Toolbox */}
                        <Card variant="default" className="p-8 border-none shadow-sm relative overflow-hidden">
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
                                        <div key={upload.id} className="p-4 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 group">
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
