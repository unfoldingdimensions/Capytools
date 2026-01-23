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
    const getScoreColor = (value: number) => {
        if (value >= 80) return 'text-green-600 dark:text-green-400';
        if (value >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getScoreBgColor = (value: number) => {
        if (value >= 80) return 'bg-green-100 dark:bg-green-900/20';
        if (value >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
        return 'bg-red-100 dark:bg-red-900/20';
    };

    const getScoreLabel = (value: number) => {
        if (value >= 80) return 'Excellent';
        if (value >= 60) return 'Good';
        if (value >= 40) return 'Fair';
        return 'Needs Improvement';
    };

    return (
        <div className="space-y-6">
            {/* Overall Score */}
            <Card>
                <CardContent className="p-8">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-foreground mb-6">
                            ATS Compatibility Score
                        </h3>
                        <div className={`inline-flex items-center justify-center w-40 h-40 rounded-full ${getScoreBgColor(score.overallScore)} ring-8 ring-background`}>
                            <div className="text-center">
                                <div className={`text-5xl font-bold tracking-tight ${getScoreColor(score.overallScore)}`}>
                                    {score.overallScore}
                                </div>
                                <div className="text-sm font-medium text-muted-foreground mt-1">/ 100</div>
                            </div>
                        </div>
                        <p className={`mt-6 text-xl font-bold ${getScoreColor(score.overallScore)}`}>
                            {getScoreLabel(score.overallScore)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Analyzed on {new Date(score.analysisDate).toLocaleDateString()}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Category Scores */}
            <Card>
                <CardHeader>
                    <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {Object.entries(score.categoryScores).map(([category, value]) => (
                        <div key={category}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-foreground capitalize">
                                    {category}
                                </span>
                                <span className={`text-sm font-bold ${getScoreColor(value)}`}>
                                    {value}/100
                                </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${value >= 80
                                        ? 'bg-green-500'
                                        : value >= 60
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                        }`}
                                    style={{ width: `${value}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Matched Requirements */}
            <Card>
                <CardHeader>
                    <CardTitle>Job Match Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-muted/40 p-4 border text-center">
                            <p className="text-sm text-muted-foreground mb-1">Requirements Matched</p>
                            <p className="text-3xl font-bold text-foreground">
                                {score.matchedRequirements}
                            </p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-4 border text-center">
                            <p className="text-sm text-muted-foreground mb-1">Missing Keywords</p>
                            <p className="text-3xl font-bold text-foreground">
                                {score.missingKeywords.length}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Missing Keywords */}
            {score.missingKeywords.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Missing Keywords</CardTitle>
                        <CardDescription>Consider adding these keywords to improve your resume's ATS compatibility</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {score.missingKeywords.slice(0, 15).map((keyword, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-full border border-destructive/20"
                                >
                                    {keyword}
                                </span>
                            ))}
                            {score.missingKeywords.length > 15 && (
                                <span className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full">
                                    + {score.missingKeywords.length - 15} more
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Improvement Suggestions */}
            {score.suggestions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Improvement Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {score.suggestions.map((suggestion, index) => (
                                <li key={index} className="flex gap-3 text-sm">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                        {index + 1}
                                    </span>
                                    <span className="text-foreground/90 pt-0.5">{suggestion}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Action Button */}
            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="font-semibold text-primary">Pro Tip</h4>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Use our AI Resume Tailoring feature to automatically optimize your resume based on these recommendations.
                            </p>
                        </div>
                        {resumeId && jobDescriptionId && (
                            <Link href={`/ai/tailor-resume?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}`}>
                                <Button className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0">
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Tailor Your Resume with AI
                                </Button>
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

