'use client';

import Link from 'next/link';
import { Plus, FileText, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/loading-states';

interface Resume {
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
}

interface ResumeGridProps {
    resumes: Resume[];
    isLoading: boolean;
    onCreateNew: () => void;
    onDownload: (id: string, title: string) => void;
    onDelete: (id: string, title: string) => void;
}

export function ResumeGrid({ resumes, isLoading, onCreateNew, onDownload, onDelete }: ResumeGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-[minmax(280px,auto)]">
            {/* 1. Create New Card (Bento Style) */}
            <button
                type="button"
                onClick={onCreateNew}
                className="relative group p-8 rounded-t-4xl border-2 border-dashed border-border/70 hover:border-border transition-all duration-normal ease-out-expo cursor-pointer bg-transparent hover:bg-muted/40 flex flex-col items-center justify-center text-center space-y-4"
            >
                <div className="h-16 w-16 rounded-full bg-foreground text-background flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Plus className="h-8 w-8" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-foreground">Create New</h3>
                    <p className="text-sm text-muted-foreground">Start from scratch or import</p>
                </div>
            </button>

            {/* Resume Cards */}
            {isLoading ? (
                [1, 2, 3].map(i => <SkeletonCard key={i} className="rounded-t-4xl h-full min-h-[280px]" />)
            ) : (
                resumes.map((resume) => (
                    <div key={resume.id} className="group relative p-8 rounded-t-4xl bg-card border border-border/70 shadow-card hover:shadow-pop hover:-translate-y-1 transition-all duration-normal ease-out-expo flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-foreground">
                                <FileText className="h-6 w-6" strokeWidth={1.5} />
                            </div>
                            {/* Actions always visible on touch; hover-reveal on desktop */}
                            <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={(e) => { e.stopPropagation(); onDownload(resume.id, resume.title); }}
                                    aria-label={`Download ${resume.title}`}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:text-red-600 hover:bg-red-500/10"
                                    onClick={(e) => { e.stopPropagation(); onDelete(resume.id, resume.title); }}
                                    aria-label={`Delete ${resume.title}`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <h3 className="font-display text-xl font-medium tracking-tight text-foreground mb-2 line-clamp-1">{resume.title}</h3>
                            <p className="micro-label mb-6">Edited {new Date(resume.updatedAt).toLocaleDateString()}</p>

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
    );
}
