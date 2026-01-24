'use client';

import { useState, useEffect, useMemo } from 'react';
import { Target, ArrowRight, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { validateResumeForAts } from '@/lib/utils/atsValidation';
import type { ResumeData } from '@/types/resume.types';
import type { JobDescription } from '@/lib/utils/keywordMatching.utils';
import Link from 'next/link';

interface JobMatchPanelProps {
    resumeData: ResumeData;
    resumeId?: string;
    className?: string;
}

export function JobMatchPanel({ resumeData, resumeId, className }: JobMatchPanelProps) {
    const [jobs, setJobs] = useState<JobDescription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchJobs() {
            try {
                const response = await fetch('/api/ai/job-descriptions');
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data)) {
                        setJobs(result.data.slice(0, 3));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch jobs:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchJobs();
    }, []);

    const jobMatches = useMemo(() => {
        return jobs.map(job => {
            const validation = validateResumeForAts(resumeData, job);
            return {
                id: job.id,
                title: job.title,
                company: job.company,
                score: validation.score,
                color: validation.score >= 80 ? 'text-green-600 dark:text-green-400' : validation.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400',
                bgColor: validation.score >= 80 ? 'bg-green-500/10' : validation.score >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'
            };
        });
    }, [jobs, resumeData]);

    if (isLoading) {
        return (
            <div className={cn("rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col items-center justify-center gap-3", className)}>
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Analyzing Matches...</p>
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className={cn("rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4", className)}>
                <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                    <h3 className="text-sm font-bold font-display uppercase tracking-wider">Job Matching</h3>
                </div>
                <div className="text-center py-4 px-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 px-4 leading-relaxed">
                        Match your resume against specific job descriptions to boost your hireability.
                    </p>
                    <Link href="/ai/job-description">
                        <Button variant="outline" size="sm" className="rounded-full font-bold group">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Analyze New Job
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden", className)}>
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                    <h3 className="text-sm font-bold font-display uppercase tracking-wider">Top Job Matches</h3>
                </div>
                <Link href="/ai/job-description" className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 uppercase tracking-widest transition-colors flex items-center gap-1">
                    Manage <ExternalLink className="h-2.5 w-2.5" />
                </Link>
            </div>
            <div className="p-3 space-y-2">
                {jobMatches.map((job) => (
                    <div
                        key={job.id}
                        className="group flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-swiss bg-zinc-50/30 dark:bg-zinc-900/30"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground truncate">{job.title}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium truncate">{job.company}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                            <div className={cn("px-2.5 py-1 rounded-full text-xs font-black", job.bgColor, job.color)}>
                                {job.score}%
                            </div>
                            <Link href={resumeId ? `/resume/${resumeId}?jobDescriptionId=${job.id}&tailoring=true` : `/ai/job-description`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="h-7 w-7 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center">
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
            <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 text-center">
                <Link href="/ai/job-description">
                    <button className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-2 mx-auto">
                        <Plus className="h-3 w-3" /> Analyze Another Role
                    </button>
                </Link>
            </div>
        </div>
    );
}
