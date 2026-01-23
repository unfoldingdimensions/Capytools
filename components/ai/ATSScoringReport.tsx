'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ATSScoreResult } from '@/types/ai.types';

interface ATSScoringReportProps {
    score: ATSScoreResult;
}

export default function ATSScoringReport({ score }: ATSScoringReportProps) {
    const getScoreLabel = (value: number) => {
        if (value >= 80) return 'High Compatibility';
        if (value >= 60) return 'Moderate Compatibility';
        if (value >= 40) return 'Low Compatibility';
        return 'Needs Significant Tailoring';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Zone: Scores & Categories (col-span-5) */}
            <div className="lg:col-span-4 space-y-6">
                {/* Compact Overall Score */}
                <Card className="overflow-hidden border-black/[0.08] dark:border-white/[0.08] shadow-swiss bg-zinc-50 dark:bg-zinc-900/10">
                    <CardContent className="p-6 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Overall Match</p>
                        <div className="relative inline-flex items-center justify-center mb-4">
                            <div className="absolute inset-0 bg-black/5 dark:bg-white/5 rounded-full animate-pulse scale-110" />
                            <div className="relative flex items-center justify-center w-32 h-32 rounded-full bg-white dark:bg-zinc-950 border-[8px] border-zinc-100 dark:border-zinc-800 shadow-lg">
                                <div className="text-center">
                                    <div className="text-4xl font-display font-medium tracking-tighter text-foreground">
                                        {score.overallScore}%
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm font-bold text-foreground tracking-tight">
                            {getScoreLabel(score.overallScore)}
                        </p>
                    </CardContent>
                </Card>

                {/* Dense Category breakdown */}
                <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                    <CardHeader className="p-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {Object.entries(score.categoryScores).map(([category, value]) => (
                            <div key={category} className="group">
                                <div className="flex justify-between items-end mb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                        {category}
                                    </span>
                                    <span className="text-xs font-bold text-foreground">
                                        {value}%
                                    </span>
                                </div>
                                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                                    <div
                                        className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all duration-1000"
                                        style={{ width: `${value}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Right Zone: Content & Suggestions (col-span-7) */}
            <div className="lg:col-span-8 space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Matched</p>
                            <p className="text-2xl font-display font-medium text-foreground">{score.matchedRequirements} Requirements</p>
                        </CardContent>
                    </Card>
                    <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Missing</p>
                            <p className="text-2xl font-display font-medium text-foreground">{score.missingKeywords.length} Keywords</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Missing Keywords (Compact) */}
                {score.missingKeywords.length > 0 && (
                    <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                        <CardHeader className="p-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Missing Keywords</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="flex flex-wrap gap-1.5">
                                {score.missingKeywords.slice(0, 15).map((keyword, index) => (
                                    <span
                                        key={index}
                                        className="px-2.5 py-1 bg-zinc-50 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold rounded-md"
                                    >
                                        {keyword}
                                    </span>
                                ))}
                                {score.missingKeywords.length > 15 && (
                                    <span className="px-2 py-1 text-[10px] font-bold text-muted-foreground">
                                        + {score.missingKeywords.length - 15} others
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Improvements (Compact List) */}
                {score.suggestions.length > 0 && (
                    <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                        <CardHeader className="p-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Optimization Suggestions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <ul className="space-y-3">
                                {score.suggestions.slice(0, 4).map((suggestion, index) => (
                                    <li key={index} className="flex gap-3 group">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-white dark:text-black text-[9px] font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-bold group-hover:text-foreground transition-colors overflow-hidden line-clamp-2">
                                            {suggestion}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

