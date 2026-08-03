'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle, X, Loader2, Zap, Lightbulb, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SuggestionCardProps {
    title: string;
    suggestions: string[];
    tips?: string[];
    isLoading: boolean;
    onGenerate: () => void;
    onApply: (suggestions: string[]) => void;
    onDismiss?: () => void;
    /** Role-baseline optimization (no job description needed). Shown when provided. */
    onGenerateRole?: () => void;
    roleLabel?: string;
    isGeneratingRole?: boolean;
}

export default function SuggestionCard({
    title,
    suggestions,
    tips = [],
    isLoading,
    onGenerate,
    onApply,
    onDismiss,
    onGenerateRole,
    roleLabel,
    isGeneratingRole = false,
}: SuggestionCardProps) {
    const [isDismissed, setIsDismissed] = useState(false);

    if (isDismissed) {
        return null;
    }

    const hasSuggestions = suggestions.length > 0;
    const isBusy = isLoading || isGeneratingRole;

    return (
        <Card
            variant="default"
            className={cn(
                "overflow-hidden border-none shadow-lg transition-all duration-300",
                hasSuggestions ? "bg-white dark:bg-zinc-950 ring-1 ring-zinc-100 dark:ring-zinc-800" : "bg-zinc-50/30 dark:bg-zinc-900/10 ring-1 ring-zinc-100/50 dark:ring-zinc-800/50"
            )}
        >
            <div className="flex items-center justify-between p-4 border-b border-zinc-50 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                        <Sparkles className="h-4 w-4 text-zinc-900 dark:text-white" />
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-[0.2em]">{title}</h4>
                </div>
                {onDismiss && (
                    <button
                        onClick={() => {
                            setIsDismissed(true);
                            onDismiss();
                        }}
                        className="text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-100 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="p-5">
                {!hasSuggestions && !isBusy && (
                    <div className="text-center py-4">
                        <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <Zap className="h-6 w-6 text-zinc-900 dark:text-white" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-6 max-w-[240px] mx-auto">
                            Let AI analyze the job description and suggest the best content for this section.
                        </p>
                        <div className="flex flex-col items-center gap-3">
                            <Button
                                onClick={onGenerate}
                                className="rounded-full px-8 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Analyze & Suggest
                            </Button>
                            {onGenerateRole && roleLabel && (
                                <Button
                                    onClick={onGenerateRole}
                                    variant="outline"
                                    disabled={isGeneratingRole}
                                    className="rounded-full px-6 border-zinc-300 dark:border-zinc-700"
                                >
                                    {isGeneratingRole ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Target className="h-4 w-4 mr-2" />
                                    )}
                                    {isGeneratingRole ? 'Optimizing...' : `Optimize for ${roleLabel}`}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {isBusy && (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-zinc-900/5 dark:bg-white/5 blur-xl rounded-full animate-pulse" />
                            <Loader2 className="h-10 w-10 animate-spin text-zinc-900 dark:text-white relative" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 animate-pulse">Consulting AI...</span>
                    </div>
                )}

                {hasSuggestions && !isBusy && (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] px-1">AI Suggestions</label>
                            {suggestions.map((suggestion, idx) => (
                                <div
                                    key={idx}
                                    className="group relative rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 p-4 text-sm text-foreground ring-1 ring-zinc-100 dark:ring-zinc-800 hover:ring-zinc-200 dark:hover:ring-zinc-700 transition-all duration-200"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                                            <CheckCircle className="h-3 w-3" />
                                        </div>
                                        <span className="leading-relaxed font-bold">{suggestion}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {tips.length > 0 && (
                            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 p-4 ring-1 ring-zinc-200 dark:ring-zinc-800">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black">
                                        <Lightbulb className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="text-sm text-foreground">
                                        <p className="font-bold mb-2 uppercase tracking-tight text-xs">Strategic Tips</p>
                                        <ul className="space-y-2">
                                            {tips.map((tip, idx) => (
                                                <li key={idx} className="flex gap-2">
                                                    <span className="text-zinc-400 font-bold">•</span>
                                                    <span>{tip}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={() => onApply(suggestions)}
                                size="lg"
                                className="flex-1 rounded-xl font-bold bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Apply Suggestions
                            </Button>
                            <Button
                                onClick={onGenerate}
                                size="lg"
                                variant="outline"
                                className="rounded-xl border-zinc-200 dark:border-zinc-800 group"
                            >
                                <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
