'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDown, Lightbulb, FileText, Layout, CheckSquare } from 'lucide-react';
import { ScoreProgressRing } from '@/components/ui/score-progress-ring';
import { CategoryScoreCard } from './CategoryScoreCard';
import { useResumeScore } from '@/hooks/useResumeScore';
import type { ResumeData } from '@/types/resume.types';

interface ResumeScorePanelProps {
    /** Resume data to score */
    resumeData: ResumeData;
    /** Whether the panel is collapsible */
    collapsible?: boolean;
    /** Whether initially collapsed */
    defaultCollapsed?: boolean;
    /** Custom class name */
    className?: string;
}

export function ResumeScorePanel({
    resumeData,
    collapsible = true,
    defaultCollapsed = false,
    className,
}: ResumeScorePanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [showTips, setShowTips] = useState(true);

    const { score, isCalculating, color, label } = useResumeScore(resumeData);

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
                    <div className={cn(
                        'w-2 h-2 rounded-full',
                        color === 'green' && 'bg-emerald-500',
                        color === 'yellow' && 'bg-amber-500',
                        color === 'red' && 'bg-red-500',
                    )} />
                    <h3 className="text-sm font-semibold text-foreground">Resume Score</h3>
                </div>
                {collapsible && (
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform duration-200',
                            isCollapsed && '-rotate-90'
                        )}
                    />
                )}
            </button>

            {/* Content */}
            {!isCollapsed && (
                <div className="px-4 pb-4 space-y-4">
                    {/* Overall Score Ring */}
                    <div className="flex justify-center py-2">
                        <ScoreProgressRing
                            score={score?.overallScore ?? 0}
                            size="md"
                            color={color}
                            label={label}
                            isLoading={isCalculating}
                        />
                    </div>

                    {/* Category Scores */}
                    {score && (
                        <div className="space-y-1">
                            <CategoryScoreCard
                                label="Content"
                                scoreResult={score.categoryScores.content}
                                icon={<FileText className="h-4 w-4" />}
                            />
                            <CategoryScoreCard
                                label="Formatting"
                                scoreResult={score.categoryScores.formatting}
                                icon={<Layout className="h-4 w-4" />}
                            />
                            <CategoryScoreCard
                                label="Completeness"
                                scoreResult={score.categoryScores.completeness}
                                icon={<CheckSquare className="h-4 w-4" />}
                            />
                        </div>
                    )}

                    {/* Quick Tips */}
                    {score && score.tips.length > 0 && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={() => setShowTips(!showTips)}
                                className="w-full flex items-center justify-between py-1 text-left"
                            >
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-amber-500" />
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Quick Tips
                                    </span>
                                </div>
                                <ChevronDown
                                    className={cn(
                                        'h-3 w-3 text-muted-foreground transition-transform duration-200',
                                        !showTips && '-rotate-90'
                                    )}
                                />
                            </button>
                            {showTips && (
                                <ul className="mt-2 space-y-1.5">
                                    {score.tips.map((tip, index) => (
                                        <li
                                            key={index}
                                            className="flex items-start gap-2 text-xs text-muted-foreground"
                                        >
                                            <span className="text-amber-500 shrink-0">•</span>
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
