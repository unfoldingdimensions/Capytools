'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ATSScoreResult } from '@/types/ai.types';

interface ATSScoringReportProps {
    score: ATSScoreResult;
    resumeId?: string;
    jobDescriptionId?: string;
}

export default function ATSScoringReport({ score, resumeId, jobDescriptionId }: ATSScoringReportProps) {
    const getScoreLabel = (value: number) => {
        if (value >= 80) return 'High Compatibility';
        if (value >= 60) return 'Moderate Compatibility';
        if (value >= 40) return 'Low Compatibility';
        return 'Needs Significant Tailoring';
    };

    return (
        <div className="space-y-6">
            {/* Overall Score */}
            <Card className="overflow-hidden border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                <div className="bg-zinc-50 dark:bg-white/[0.02] p-8 text-center border-b border-black/[0.05] dark:border-white/[0.05]">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-8">
                        ATS Compatibility Score
                    </h3>
                    <div className="relative inline-flex items-center justify-center">
                        <div className="absolute inset-0 bg-zinc-900/5 dark:bg-white/5 rounded-full animate-pulse scale-110" />
                        <div className="relative flex items-center justify-center w-48 h-48 rounded-full bg-white dark:bg-zinc-900 border-[12px] border-zinc-100 dark:border-zinc-800 shadow-xl">
                            <div className="text-center">
                                <div className="text-6xl font-display font-medium tracking-tighter text-foreground">
                                    {score.overallScore}
                                </div>
                                <div className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-60">Percent</div>
                            </div>
                        </div>
                    </div>
                    <p className="mt-10 text-2xl font-display font-medium text-foreground tracking-tight">
                        {getScoreLabel(score.overallScore)}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                        Analyzed on {new Date(score.analysisDate).toLocaleDateString()}
                    </p>
                </div>
            </Card>

            {/* Category Scores */}
            <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss overflow-hidden">
                <CardHeader className="bg-zinc-50 dark:bg-white/[0.02] border-b border-black/[0.05] dark:border-white/[0.05]">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-white" />
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-foreground">Category Breakdown</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    {Object.entries(score.categoryScores).map(([category, value]) => (
                        <div key={category} className="group">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                                    {category}
                                </span>
                                <span className="text-sm font-display font-medium text-foreground">
                                    {value}%
                                </span>
                            </div>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all duration-1000 ease-out-expo"
                                    style={{ width: `${value}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Matched Requirements */}
            <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss overflow-hidden">
                <CardHeader className="bg-zinc-50 dark:bg-white/[0.02] border-b border-black/[0.05] dark:border-white/[0.05]">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-white" />
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-foreground">Match Analysis</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="rounded-2xl bg-zinc-50 dark:bg-white/[0.02] p-6 border border-black/[0.03] dark:border-white/[0.03] text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Requirements Matched</p>
                            <p className="text-4xl font-display font-medium text-foreground">
                                {score.matchedRequirements}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-zinc-50 dark:bg-white/[0.02] p-6 border border-black/[0.03] dark:border-white/[0.03] text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Missing Keywords</p>
                            <p className="text-4xl font-display font-medium text-foreground">
                                {score.missingKeywords.length}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Missing Keywords */}
            {score.missingKeywords.length > 0 && (
                <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss overflow-hidden">
                    <CardHeader className="bg-zinc-50 dark:bg-white/[0.02] border-b border-black/[0.05] dark:border-white/[0.05]">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-white" />
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-foreground">Critical Missing Keywords</CardTitle>
                        </div>
                        <CardDescription className="text-xs font-medium text-zinc-400 mt-2">Integrating these terms significantly increases ATS visibility.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="flex flex-wrap gap-2">
                            {score.missingKeywords.slice(0, 20).map((keyword, index) => (
                                <span
                                    key={index}
                                    className="px-4 py-1.5 bg-zinc-100 text-zinc-900 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 text-xs font-bold rounded-full transition-all hover:scale-105 cursor-default"
                                >
                                    {keyword}
                                </span>
                            ))}
                            {score.missingKeywords.length > 20 && (
                                <span className="px-4 py-1.5 bg-zinc-50 text-zinc-400 text-xs font-bold rounded-full border border-dashed">
                                    + {score.missingKeywords.length - 20} others
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Improvement Suggestions */}
            {score.suggestions.length > 0 && (
                <Card className="border-black/[0.08] dark:border-white/[0.08] shadow-swiss overflow-hidden">
                    <CardHeader className="bg-zinc-50 dark:bg-white/[0.02] border-b border-black/[0.05] dark:border-white/[0.05]">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-white" />
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-foreground">Strategic Improvements</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <ul className="space-y-6">
                            {score.suggestions.map((suggestion, index) => (
                                <li key={index} className="flex gap-4 group">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black text-[10px] font-bold shadow-sm group-hover:scale-110 transition-transform">
                                        {index + 1}
                                    </span>
                                    <span className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium pt-0.5 group-hover:text-foreground transition-colors">{suggestion}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Action Button */}
            <Card className="bg-black text-white dark:bg-white dark:text-black border-none shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                    <Sparkles className="h-32 w-32" />
                </div>
                <CardContent className="p-10 relative z-10">
                    <div className="flex flex-col lg:flex-row gap-8 items-center justify-between">
                        <div className="space-y-3 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">AI Content Engine</span>
                            </div>
                            <h4 className="text-3xl font-display font-medium tracking-tight">Tailor Your Resume</h4>
                            <p className="text-sm text-white/70 dark:text-black/70 max-w-md leading-relaxed">
                                Automatically adapt your bullet points and skills match rate using our advanced tailoring engine.
                            </p>
                        </div>
                        {resumeId && jobDescriptionId && (
                            <Link href={`/ai/tailor-resume?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}`} className="w-full lg:w-auto">
                                <Button size="xl" className="w-full lg:w-auto h-16 px-10 rounded-2xl bg-white text-black hover:bg-zinc-200 dark:bg-black dark:text-white dark:hover:bg-zinc-800 text-lg font-bold shadow-xl">
                                    Launch AI Optimizer
                                </Button>
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

