'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDown } from 'lucide-react';
import type { ScoreResult, ScoreDetail } from '@/lib/utils/resumeScoring.utils';

interface CategoryScoreCardProps {
    /** Category label */
    label: string;
    /** Score result with details */
    scoreResult: ScoreResult;
    /** Optional icon component */
    icon?: React.ReactNode;
    /** Whether to show expanded details */
    expandable?: boolean;
    /** Whether initially expanded */
    defaultExpanded?: boolean;
    /** Custom class name */
    className?: string;
}

function getStatusIcon(status: ScoreDetail['status']) {
    switch (status) {
        case 'success':
            return '✓';
        case 'warning':
            return '!';
        case 'error':
            return '✗';
    }
}



export function CategoryScoreCard({
    label,
    scoreResult,
    icon,
    expandable = true,
    defaultExpanded = false,
    className,
}: CategoryScoreCardProps) {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
    const percentage = Math.round((scoreResult.score / scoreResult.maxScore) * 100);

    return (
        <div className={cn('rounded-lg', className)}>
            {/* Header with score bar */}
            <button
                type="button"
                onClick={() => expandable && setIsExpanded(!isExpanded)}
                className={cn(
                    'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                    expandable && 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer',
                    !expandable && 'cursor-default'
                )}
            >
                {icon && (
                    <span className="text-muted-foreground shrink-0">
                        {icon}
                    </span>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-foreground">
                            {label}
                        </span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                            {percentage}%
                        </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>
                {expandable && (
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0',
                            isExpanded && 'rotate-180'
                        )}
                    />
                )}
            </button>

            {/* Expandable details */}
            {expandable && isExpanded && scoreResult.details.length > 0 && (
                <div className="px-2 pb-2 pt-1 space-y-1">
                    {scoreResult.details.map((detail, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-2 text-xs"
                        >
                            <span className={cn(
                                'shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold',
                                detail.status === 'success' && 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-900 dark:text-white',
                                detail.status === 'warning' && 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400',
                                detail.status === 'error' && 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-500',
                            )}>
                                {getStatusIcon(detail.status)}
                            </span>
                            <div className="flex-1 min-w-0">
                                <span className="text-muted-foreground">{detail.message}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
