'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDown, Target, Lightbulb, Plus } from 'lucide-react';
import { KeywordMatchBadge } from './KeywordMatchBadge';
import {
    matchKeywords,
    KeywordMatchResult,
    JobDescription,
} from '@/lib/utils/keywordMatching.utils';
import type { ResumeData } from '@/types/resume.types';

interface KeywordHeatmapPanelProps {
    /** Resume data to analyze */
    resumeData: ResumeData;
    /** Job description to match against */
    jobDescription: JobDescription;
    /** Callback when user wants to add a keyword to skills */
    onAddToSkills?: (keyword: string) => void;
    /** Whether the panel is collapsible */
    collapsible?: boolean;
    /** Whether initially collapsed */
    defaultCollapsed?: boolean;
    /** Custom class name */
    className?: string;
}

export function KeywordHeatmapPanel({
    resumeData,
    jobDescription,
    onAddToSkills,
    collapsible = true,
    defaultCollapsed = false,
    className,
}: KeywordHeatmapPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [showSuggestions, setShowSuggestions] = useState(true);

    // Calculate keyword matches
    const matchResult: KeywordMatchResult = useMemo(() => {
        return matchKeywords(resumeData, jobDescription);
    }, [resumeData, jobDescription]);

    // Get color based on match percentage
    const getPercentageColor = (percentage: number) => {
        if (percentage >= 70) return 'text-emerald-600 dark:text-emerald-400';
        if (percentage >= 40) return 'text-amber-600 dark:text-amber-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getBarColor = (percentage: number) => {
        if (percentage >= 70) return 'bg-emerald-500';
        if (percentage >= 40) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div
            className={cn(
                'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden transition-all duration-300',
                className
            )}
        >
            {/* Header */}
            <button
                type="button"
                onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
                className={cn(
                    'w-full flex items-center justify-between px-4 py-3 transition-colors',
                    collapsible && 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer',
                    !collapsible && 'cursor-default'
                )}
            >
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-brand-500" />
                    <h3 className="text-sm font-semibold text-foreground">Keyword Match</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-bold', getPercentageColor(matchResult.matchPercentage))}>
                        {matchResult.matchPercentage}%
                    </span>
                    {collapsible && (
                        <ChevronDown
                            className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                                isCollapsed && '-rotate-90'
                            )}
                        />
                    )}
                </div>
            </button>

            {/* Content */}
            {!isCollapsed && (
                <div className="px-4 pb-4 space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all duration-500 ease-out',
                                    getBarColor(matchResult.matchPercentage)
                                )}
                                style={{ width: `${matchResult.matchPercentage}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {matchResult.matched.length} of {matchResult.totalKeywords} keywords matched
                        </p>
                    </div>

                    {/* Matched Keywords */}
                    {matchResult.matched.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Matched ({matchResult.matched.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {matchResult.matched.slice(0, 12).map((match) => (
                                    <KeywordMatchBadge
                                        key={match.keyword}
                                        keyword={match.keyword}
                                        matched={true}
                                        foundIn={match.foundIn}
                                    />
                                ))}
                                {matchResult.matched.length > 12 && (
                                    <span className="text-xs text-muted-foreground px-2 py-0.5">
                                        +{matchResult.matched.length - 12} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Missing Keywords */}
                    {matchResult.missing.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    Missing ({matchResult.missing.length})
                                </p>
                                {onAddToSkills && matchResult.missing.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            matchResult.missing.forEach(k => onAddToSkills(k));
                                        }}
                                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add All
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {matchResult.missing.slice(0, 8).map((keyword) => (
                                    <KeywordMatchBadge
                                        key={keyword}
                                        keyword={keyword}
                                        matched={false}
                                        showAdd={!!onAddToSkills}
                                        onAdd={() => onAddToSkills?.(keyword)}
                                    />
                                ))}
                                {matchResult.missing.length > 8 && (
                                    <span className="text-xs text-muted-foreground px-2 py-0.5">
                                        +{matchResult.missing.length - 8} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    {matchResult.suggestAddToSkills.length > 0 && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={() => setShowSuggestions(!showSuggestions)}
                                className="w-full flex items-center justify-between py-1 text-left"
                            >
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-amber-500" />
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Add to Skills Section
                                    </span>
                                </div>
                                <ChevronDown
                                    className={cn(
                                        'h-3 w-3 text-muted-foreground transition-transform duration-200',
                                        !showSuggestions && '-rotate-90'
                                    )}
                                />
                            </button>
                            {showSuggestions && (
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                        Found in your resume but not in skills:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {matchResult.suggestAddToSkills.slice(0, 6).map((keyword) => (
                                            <button
                                                key={keyword}
                                                type="button"
                                                onClick={() => onAddToSkills?.(keyword)}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
                                            >
                                                <Plus className="h-3 w-3" />
                                                {keyword}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
