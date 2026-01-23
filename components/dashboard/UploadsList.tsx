'use client';

import { FileUp, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UploadedResume {
    id: string;
    originalFilename: string;
    fileSize: number;
    mimeType: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    createdAt: string;
}

interface UploadsListProps {
    uploads: UploadedResume[];
    isLoading: boolean;
    creatingFromId: string | null;
    onCreateFromUpload: (id: string) => void;
    onDelete: (id: string) => void;
}

export function UploadsList({ uploads, isLoading, creatingFromId, onCreateFromUpload, onDelete }: UploadsListProps) {
    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-foreground">Recent Uploads</h3>
                <Badge variant="brand" size="xs" shape="pill">{uploads.length}</Badge>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
                </div>
            ) : uploads.length === 0 ? (
                <div className="p-8 text-center rounded-3xl bg-gray-50 dark:bg-white/5 text-muted-foreground text-sm">
                    No recent files uploaded.
                </div>
            ) : (
                <div className="space-y-4">
                    {uploads.slice(0, 3).map((upload) => (
                        <div key={upload.id} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-black/[0.08] dark:border-white/[0.08] shadow-sm group">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 flex items-center justify-center">
                                    <FileUp className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{upload.originalFilename}</p>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1">
                                        {upload.status} • {formatFileSize(upload.fileSize)}
                                    </p>
                                </div>
                                {upload.status === 'COMPLETED' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full text-brand-600 hover:bg-brand-50"
                                        onClick={() => onCreateFromUpload(upload.id)}
                                        disabled={creatingFromId !== null}
                                        aria-label="Create resume from file"
                                    >
                                        {creatingFromId === upload.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => onDelete(upload.id)}
                                    aria-label="Delete file"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
