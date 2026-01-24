'use client';

import { Check, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface BulletRecommendationCardProps {
    originalText: string;
    recommendedText: string;
    onAccept: () => void;
    onDecline: () => void;
    className?: string;
}

/**
 * Inline recommendation card for AI-enhanced bullet points.
 * Displays the AI suggestion with accept/decline actions.
 * 
 * Design: Follows monochrome design system with zinc/neutral palette.
 * Uses shadow-swiss for depth and subtle hover states.
 */
export function BulletRecommendationCard({
    originalText,
    recommendedText,
    onAccept,
    onDecline,
    className,
}: BulletRecommendationCardProps) {
    // Don't render if the recommendation is the same as original
    if (originalText.trim() === recommendedText.trim()) {
        return null;
    }

    return (
        <div
            className={cn(
                "animate-fade-in",
                "rounded-xl border border-zinc-200 dark:border-zinc-700",
                "bg-zinc-50 dark:bg-zinc-900",
                "shadow-swiss",
                "overflow-hidden",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                <Sparkles className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    AI Suggestion
                </span>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Original text - crossed out */}
                <div className="text-sm text-muted-foreground/60 line-through decoration-zinc-300 dark:decoration-zinc-600">
                    {originalText}
                </div>

                {/* Recommendation */}
                <div className="text-sm text-foreground font-medium leading-relaxed">
                    {recommendedText}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onDecline}
                    className="h-8 px-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Decline
                </Button>
                <Button
                    type="button"
                    size="sm"
                    onClick={onAccept}
                    className="h-8 px-4 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm btn-press"
                >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Accept
                </Button>
            </div>
        </div>
    );
}
