'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AIActionButtonsProps {
    onCheckGrammar?: () => void;
    onImprove?: () => void;
    onGenerate?: () => void;
    loadingType?: string | null;
    identifiers?: {
        grammar?: string;
        improve?: string;
        generate?: string;
    };
    showGrammar?: boolean;
    showImprove?: boolean;
    showGenerate?: boolean;
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
}

export function AIActionButtons({
    onCheckGrammar,
    onImprove,
    onGenerate,
    loadingType,
    identifiers = {},
    showGrammar = true,
    showImprove = true,
    showGenerate = false,
    size = 'sm',
    className = '',
}: AIActionButtonsProps) {
    return (
        <div className={cn("flex gap-2 items-center", className)}>
            {showGrammar && onCheckGrammar && (
                <Button
                    type="button"
                    size={size}
                    variant="ghostSubtle"
                    onClick={onCheckGrammar}
                    disabled={loadingType === identifiers.grammar}
                    className="h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-wider text-foreground hover:bg-secondary hover:text-foreground"
                >
                    {loadingType === identifiers.grammar ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                        <CheckCircle className="mr-1.5 h-3 w-3" />
                    )}
                    Check Grammar
                </Button>
            )}

            {showImprove && onImprove && (
                <Button
                    type="button"
                    size={size}
                    variant="ghostSubtle"
                    onClick={onImprove}
                    disabled={loadingType === identifiers.improve}
                    className="h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-wider text-brand-600 hover:bg-brand-50 hover:text-brand-700"
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
                    variant="brand"
                    onClick={onGenerate}
                    disabled={loadingType === identifiers.generate}
                    className="rounded-full shadow-lg shadow-brand-500/10"
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
