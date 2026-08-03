'use client';

import { FileUp, Plus, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

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
                <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">Recent Uploads</h3>
                <Badge variant="brand" size="xs" shape="pill">{uploads.length}</Badge>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-muted/60 animate-pulse" />)}
                </div>
            ) : uploads.length === 0 ? (
                <EmptyState
                    icon={FolderOpen}
                    title="No files uploaded yet"
                    description="Upload a PDF or DOCX resume and we'll parse it into a new draft in seconds."
                />
            ) : (
                <div className="space-y-4">
                    {uploads.slice(0, 3).map((upload) => (
                        <div
                            key={upload.id}
                            className="rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-all duration-normal ease-out-expo group hover:border-border hover:shadow-pop"
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                                    <FileUp className="h-5 w-5" strokeWidth={1.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{upload.originalFilename}</p>
                                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest leading-none mt-1">
                                        {upload.status} • {formatFileSize(upload.fileSize)}
                                    </p>
                                </div>
                                {upload.status === 'COMPLETED' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full text-foreground hover:bg-muted"
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
                                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
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
