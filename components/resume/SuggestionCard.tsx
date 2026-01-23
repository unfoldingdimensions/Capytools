'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle, X, Loader2, Zap, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

interface SuggestionCardProps {
    title: string;
    suggestions: string[];
    tips?: string[];
    isLoading: boolean;
    onGenerate: () => void;
    onApply: (suggestions: string[]) => void;
    onDismiss?: () => void;
}

export default function SuggestionCard({
    title,
    suggestions,
    tips = [],
    isLoading,
    onGenerate,
    onApply,
    onDismiss,
}: SuggestionCardProps) {
    const [isDismissed, setIsDismissed] = useState(false);

    if (isDismissed) {
        return null;
    }

    const hasSuggestions = suggestions.length > 0;

    return (
        <Card
            variant="default"
            className={cn(
                "overflow-hidden border-none shadow-lg transition-all duration-300",
                hasSuggestions ? "bg-white ring-1 ring-brand-100" : "bg-brand-50/30 ring-1 ring-brand-100/50"
            )}
        >
            <div className="flex items-center justify-between p-4 border-b border-brand-50 bg-brand-50/30">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm">
                        <Sparkles className="h-4 w-4 text-brand-600" />
                    </div>
                    <h4 className="text-xs font-bold text-brand-900 uppercase tracking-widest">{title}</h4>
                </div>
                {onDismiss && (
                    <button
                        onClick={() => {
                            setIsDismissed(true);
                            onDismiss();
                        }}
                        className="text-brand-300 hover:text-brand-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="p-5">
                {!hasSuggestions && !isLoading && (
                    <div className="text-center py-4">
                        <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                            <Zap className="h-6 w-6 text-brand-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-600 mb-6 max-w-[240px] mx-auto">
                            Let AI analyze the job description and suggest the best content for this section.
                        </p>
                        <Button
                            onClick={onGenerate}
                            size="default"
                            variant="brand"
                            className="rounded-full px-6 h-11"
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Analyze & Suggest
                        </Button>
                    </div>
                )}

                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-brand-500/10 blur-xl rounded-full animate-pulse" />
                            <Loader2 className="h-10 w-10 animate-spin text-brand-600 relative" />
                        </div>
                        <span className="text-sm font-bold text-brand-700 animate-pulse">Consulting AI Assistant...</span>
                    </div>
                )}

                {hasSuggestions && !isLoading && (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">AI Suggestions</label>
                            {suggestions.map((suggestion, idx) => (
                                <div
                                    key={idx}
                                    className="group relative rounded-2xl bg-gray-50/50 hover:bg-white p-4 text-sm text-gray-700 ring-1 ring-gray-100 hover:ring-brand-200 transition-all duration-200"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                                            <CheckCircle className="h-3 w-3" />
                                        </div>
                                        <span className="leading-relaxed font-medium">{suggestion}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {tips.length > 0 && (
                            <div className="rounded-2xl bg-amber-50/50 p-4 ring-1 ring-amber-100">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                                        <Lightbulb className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="text-sm text-amber-800">
                                        <p className="font-bold mb-2 uppercase tracking-tight text-xs">Strategic Tips</p>
                                        <ul className="space-y-2">
                                            {tips.map((tip, idx) => (
                                                <li key={idx} className="flex gap-2">
                                                    <span className="text-amber-400 font-bold">•</span>
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
                                variant="brand"
                                className="flex-1 rounded-xl font-bold"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Apply Suggestions
                            </Button>
                            <Button
                                onClick={onGenerate}
                                size="lg"
                                variant="outline"
                                className="rounded-xl border-gray-200 group"
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
