'use client';

import { cn } from '@/lib/utils/cn';
import { Check, X, Plus } from 'lucide-react';

interface KeywordMatchBadgeProps {
    /** The keyword text */
    keyword: string;
    /** Whether the keyword is matched or missing */
    matched: boolean;
    /** Where the keyword was found */
    foundIn?: string[];
    /** Click handler for adding to skills */
    onAdd?: () => void;
    /** Whether this badge should show an add button */
    showAdd?: boolean;
    /** Size variant */
    size?: 'sm' | 'md';
    /** Custom class name */
    className?: string;
}

export function KeywordMatchBadge({
    keyword,
    matched,
    foundIn = [],
    onAdd,
    showAdd = false,
    size = 'sm',
    className,
}: KeywordMatchBadgeProps) {
    const isSmall = size === 'sm';

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full font-medium transition-all',
                isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
                matched
                    ? 'bg-black text-white dark:bg-white dark:text-black border border-transparent'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700',
                className
            )}
            title={matched && foundIn.length > 0 ? `Found in: ${foundIn.join(', ')}` : undefined}
        >
            {matched ? (
                <Check className={cn(isSmall ? 'h-3 w-3' : 'h-4 w-4')} />
            ) : (
                <X className={cn(isSmall ? 'h-3 w-3' : 'h-4 w-4')} />
            )}
            <span>{keyword}</span>
            {showAdd && onAdd && !matched && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAdd();
                    }}
                    className={cn(
                        'ml-0.5 rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors',
                        isSmall ? '-mr-0.5' : '-mr-1'
                    )}
                    title="Add to skills"
                >
                    <Plus className={cn(isSmall ? 'h-3 w-3' : 'h-4 w-4')} />
                </button>
            )}
        </span>
    );
}
