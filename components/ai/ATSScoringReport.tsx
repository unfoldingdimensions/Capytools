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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Zone: Scores & Categories (col-span-4) */}
            <div className="lg:col-span-4 space-y-8">
                {/* Larger Overall Score */}
                <Card className="overflow-hidden border-black/[0.08] dark:border-white/[0.08] shadow-swiss bg-zinc-50 dark:bg-zinc-900/10">
                    <CardContent className="p-8 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">Overall ATS Match</p>
                        <div className="relative inline-flex items-center justify-center mb-6">
                            <div className="absolute inset-0 bg-black/5 dark:bg-white/5 rounded-full animate-pulse scale-110" />
                            <div className="relative flex items-center justify-center w-48 h-48 rounded-full bg-white dark:bg-zinc-950 border-[10px] border-zinc-100 dark:border-zinc-800 shadow-xl">
                                <div className="text-center">
                                    <div className="text-6xl font-display font-medium tracking-tighter text-foreground">
                                        {score.overallScore}%
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-lg font-display font-medium text-foreground tracking-tight">
                            {getScoreLabel(score.overallScore)}
                        </p>
                    </CardContent>
                </Card>

                {/* Substantial Category breakdown */}
                <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                    <CardHeader className="p-5 border-b border-black/[0.05] dark:border-white/[0.05]">
                        <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Detailed Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {Object.entries(score.categoryScores).map(([category, value]) => (
                            <div key={category} className="group">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                                        {category}
                                    </span>
                                    <span className="text-sm font-bold text-foreground">
                                        {value}%
                                    </span>
                                </div>
                                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
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

            {/* Right Zone: Content & Suggestions (col-span-8) */}
            <div className="lg:col-span-8 space-y-8">
                {/* Larger Stats Row */}
                <div className="grid grid-cols-2 gap-6">
                    <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Requirements Matched</p>
                            <p className="text-4xl font-display font-medium text-foreground">{score.matchedRequirements}</p>
                            <p className="text-xs text-muted-foreground mt-2">Verified Proof Points</p>
                        </CardContent>
                    </Card>
                    <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Missing Keywords</p>
                            <p className="text-4xl font-display font-medium text-foreground">{score.missingKeywords.length}</p>
                            <p className="text-xs text-muted-foreground mt-2">Optimization Gaps</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Missing Keywords (Better spacing) */}
                {score.missingKeywords.length > 0 && (
                    <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                        <CardHeader className="p-5 border-b border-black/[0.05] dark:border-white/[0.05]">
                            <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Priority Keyword Gaps</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex flex-wrap gap-2">
                                {score.missingKeywords.slice(0, 20).map((keyword, index) => (
                                    <span
                                        key={index}
                                        className="px-4 py-2 bg-zinc-50 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 text-xs font-bold rounded-xl transition-transform hover:scale-105"
                                    >
                                        {keyword}
                                    </span>
                                ))}
                                {score.missingKeywords.length > 20 && (
                                    <span className="px-3 py-2 text-xs font-bold text-muted-foreground">
                                        + {score.missingKeywords.length - 20} more critical terms
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Improvements (Clearer List) */}
                {score.suggestions.length > 0 && (
                    <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                        <CardHeader className="p-5 border-b border-black/[0.05] dark:border-white/[0.05]">
                            <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Strategic Optimization Plan</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ul className="space-y-6">
                                {score.suggestions.slice(0, 5).map((suggestion, index) => (
                                    <li key={index} className="flex gap-4 group">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black text-xs font-bold shadow-md">
                                            {index + 1}
                                        </span>
                                        <span className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 font-bold group-hover:text-foreground transition-colors pt-0.5">
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

