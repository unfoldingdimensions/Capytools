'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AIActionButtonsProps {
    onImprove?: () => void;
    onGenerate?: () => void;
    loadingType?: string | null;
    identifiers?: {
        improve?: string;
        generate?: string;
    };
    showImprove?: boolean;
    showGenerate?: boolean;
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
}

/**
 * AI action buttons for content improvement and generation.
 * 
 * Note: The "Check Grammar" functionality has been deprecated
 * in favor of the unified "Enhance with AI" batch processing
 * in BulletPointEditor.
 * 
 * Design: Uses monochrome design system (zinc palette).
 */
export function AIActionButtons({
    onImprove,
    onGenerate,
    loadingType,
    identifiers = {},
    showImprove = true,
    showGenerate = false,
    size = 'sm',
    className = '',
}: AIActionButtonsProps) {
    return (
        <div className={cn("flex gap-2 items-center", className)}>
            {showImprove && onImprove && (
                <Button
                    type="button"
                    size={size}
                    variant="ghostSubtle"
                    onClick={onImprove}
                    disabled={loadingType === identifiers.improve}
                    className="h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                    {loadingType === identifiers.improve ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                        <Wand2 className="mr-1.5 h-3 w-3" />
                    )}
                    Enhance Tone
                </Button>
            )}

            {showGenerate && onGenerate && (
                <Button
                    type="button"
                    size={size}
                    onClick={onGenerate}
                    disabled={loadingType === identifiers.generate}
                    className={cn(
                        "h-8 rounded-full px-4",
                        "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900",
                        "hover:bg-zinc-800 dark:hover:bg-zinc-200",
                        "disabled:opacity-50",
                        "shadow-sm btn-press"
                    )}
                >
                    {loadingType === identifiers.generate ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Thinking...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Compose Content
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}
