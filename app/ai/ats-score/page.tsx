'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, Target, Sparkles, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AIGlowingLoader, Skeleton } from '@/components/ui/loading-states';
import ATSScoringReport from '@/components/ai/ATSScoringReport';
import type { ATSScoreResult } from '@/types/ai.types';
import { cn } from '@/lib/utils/cn';

interface Resume {
    id: string;
    title: string;
}

interface JobDescription {
    id: string;
    title: string;
    company: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    keywords: string[];
    createdAt: string;
}

interface SavedATSScore {
    id: string;
    reference: string | null;
    overallScore: number;
    formattingScore: number;
    keywordScore: number;
    experienceScore: number;
    educationScore: number;
    skillsScore: number;
    clarityScore: number;
    suggestions: string[];
    missingKeywords: string[];
    matchedRequirements: number;
    createdAt: string;
    resume: {
        id: string;
        title: string;
    };
    jobDescription: {
        id: string;
        title: string;
        company: string;
    } | null;
}

export function ATSScoreContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const jobDescriptionId = searchParams?.get('jobDescriptionId') || null;

    const [resumes, setResumes] = useState<Resume[]>([]);
    const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
    const [selectedJobDescriptionId, setSelectedJobDescriptionId] = useState<string | null>(jobDescriptionId);
    const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
    const [scoreResult, setScoreResult] = useState<ATSScoreResult | null>(null);
    const [savedScores, setSavedScores] = useState<SavedATSScore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const [isLoadingScores, setIsLoadingScores] = useState(false);
    const [isScoring, setIsScoring] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch resumes, job descriptions, and saved scores
    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch resumes
                const resumesResponse = await fetch('/api/resumes');
                const resumesData = await resumesResponse.json();
                if (resumesData.success) {
                    setResumes(resumesData.data || []);
                }

                // Fetch job descriptions
                setIsLoadingJobs(true);
                const jobsResponse = await fetch('/api/ai/job-descriptions');
                const jobsData = await jobsResponse.json();
                if (jobsData.success) {
                    setJobDescriptions(jobsData.data || []);
                }

                // Fetch saved scores
                setIsLoadingScores(true);
                const scoresResponse = await fetch('/api/ai/ats-score');
                const scoresData = await scoresResponse.json();
                if (scoresData.success) {
                    setSavedScores(scoresData.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                setError('Failed to load data');
            } finally {
                setIsLoading(false);
                setIsLoadingJobs(false);
                setIsLoadingScores(false);
            }
        }
        void fetchData();
    }, []);

    // Fetch job description details not needed for this simplified layout
    // but we still need the list of jobs which is fetched in the main useEffect.


    const handleScoreResume = async (resumeId: string) => {
        if (!selectedJobDescriptionId || !resumeId) {
            setError('Please select both a job description and a resume');
            return;
        }

        setSelectedResumeId(resumeId);
        setIsScoring(true);
        setError(null);
        setScoreResult(null);

        try {
            const response = await fetch('/api/ai/ats-score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resumeId,
                    jobDescriptionId: selectedJobDescriptionId,
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error?.message || 'Failed to score resume');
            }

            if (responseData.success && responseData.data) {
                setScoreResult(responseData.data);
                // Refresh saved scores after scoring
                const scoresResponse = await fetch('/api/ai/ats-score');
                const scoresData = await scoresResponse.json();
                if (scoresData.success) {
                    setSavedScores(scoresData.data || []);
                }

                // Automatically route to the resume builder after a brief delay
                // to allow the user to see the score result briefly
                setTimeout(() => {
                    router.push(`/resume/${resumeId}?jobDescriptionId=${selectedJobDescriptionId}&tailoring=true`);
                }, 2000);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err) {
            console.error('Scoring error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while scoring');
        } finally {
            setIsScoring(false);
        }
    };

    const handleViewSavedScore = (savedScore: SavedATSScore) => {
        // Convert saved score to ATSScoreResult format
        const result: ATSScoreResult = {
            overallScore: savedScore.overallScore,
            categoryScores: {
                formatting: savedScore.formattingScore,
                keywords: savedScore.keywordScore,
                experience: savedScore.experienceScore,
                skills: savedScore.skillsScore,
            },
            suggestions: savedScore.suggestions,
            missingKeywords: savedScore.missingKeywords,
            matchedRequirements: savedScore.matchedRequirements,
            analysisDate: new Date(savedScore.createdAt),
        };
        setScoreResult(result);
        setSelectedResumeId(savedScore.resume.id);
        if (savedScore.jobDescription) {
            setSelectedJobDescriptionId(savedScore.jobDescription.id);
        }
    };


    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-medium tracking-tight text-foreground">ATS Matcher</h2>
                <p className="mt-2 text-muted-foreground">
                    Calculate your compatibility score against specific job descriptions.
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Left Column: Form / Selectors (col-span-4) - Hidden when showing results */}
                {!scoreResult && (
                    <div className="lg:col-span-4 space-y-6">
                        {/* Job Selection */}
                        <Card className="overflow-hidden border-black/[0.08] dark:border-white/[0.08] shadow-swiss">
                            <CardHeader className="bg-muted/30 pb-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Select Scope</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-4 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-foreground">Target Role</label>
                                    {isLoadingJobs ? (
                                        <div className="h-10 w-full animate-pulse bg-muted rounded-xl" />
                                    ) : jobDescriptions.length === 0 ? (
                                        <div className="p-4 rounded-xl border border-dashed text-center">
                                            <p className="text-xs text-muted-foreground mb-2">No job descriptions found</p>
                                            <Link href="/ai/job-description">
                                                <Button size="xs" variant="outline">Parse New Job</Button>
                                            </Link>
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedJobDescriptionId || ''}
                                            onChange={(e) => {
                                                setSelectedJobDescriptionId(e.target.value || null);
                                                setScoreResult(null);
                                                setError(null);
                                            }}
                                            className="w-full h-11 appearance-none rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-gray-50 dark:bg-gray-800/50 px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                                        >
                                            <option value="">Choose a Job...</option>
                                            {jobDescriptions.map((jd) => (
                                                <option key={jd.id} value={jd.id}>{jd.title} at {jd.company}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-foreground">Your Resume</label>
                                    {isLoading ? (
                                        <div className="h-10 w-full animate-pulse bg-muted rounded-xl" />
                                    ) : resumes.length === 0 ? (
                                        <div className="p-4 rounded-xl border border-dashed text-center">
                                            <p className="text-xs text-muted-foreground mb-2">No resumes found</p>
                                            <Link href="/resume/new">
                                                <Button size="xs" variant="outline">Create Resume</Button>
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {resumes.map((resume) => (
                                                <div
                                                    key={resume.id}
                                                    onClick={() => !isScoring && setSelectedResumeId(resume.id)}
                                                    className={cn(
                                                        "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group",
                                                        selectedResumeId === resume.id
                                                            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 ring-1 ring-brand-500"
                                                            : "border-black/[0.08] dark:border-white/[0.08] hover:border-brand-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-2 w-2 rounded-full transition-colors",
                                                            selectedResumeId === resume.id ? "bg-brand-600Scale" : "bg-gray-200"
                                                        )} />
                                                        <span className="text-sm font-medium text-foreground truncate max-w-[150px]">{resume.title}</span>
                                                    </div>
                                                    {selectedResumeId === resume.id && <CheckCircle2 className="h-4 w-4 text-brand-600" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    className="w-full h-12 rounded-xl bg-foreground text-background font-bold mt-4"
                                    disabled={!selectedJobDescriptionId || !selectedResumeId || isScoring}
                                    onClick={() => selectedResumeId && handleScoreResume(selectedResumeId)}
                                    loading={isScoring}
                                >
                                    Calculate Match
                                </Button>
                            </CardContent>
                        </Card>

                        {/* How it works Mini */}
                        <Card className="p-6 bg-brand-50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-500/20">
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-brand-600 shadow-sm">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-foreground">AI Matcher</h4>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Our AI analyzes formatting, key skills, and experience intensity to give you a realistic ATS pass probability.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Right Column: Results / Lists (col-span-8) - Expand to full width when showing results */}
                <div className={cn(
                    "space-y-6",
                    scoreResult ? "lg:col-span-12" : "lg:col-span-8"
                )}>
                    {/* Error Display */}
                    {error && (
                        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/20">
                            <CardContent className="p-4 flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Dynamic View */}
                    {isScoring ? (
                        <Card className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[500px] border-black/[0.08] dark:border-white/[0.08] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm shadow-xl">
                            <div className="mb-10">
                                <AIGlowingLoader size="xl" />
                            </div>
                            <h3 className="text-3xl font-display font-medium text-foreground tracking-tight">Analyzing Match...</h3>
                            <p className="text-muted-foreground mt-4 max-w-sm mx-auto leading-relaxed">
                                Our AI is meticulously parsing your resume against every job requirement. This usually takes 10-15 seconds.
                            </p>
                            <div className="mt-12 w-64 mx-auto">
                                <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-600 animate-[shimmer_2s_infinite] w-full origin-left" />
                                </div>
                            </div>
                        </Card>
                    ) : scoreResult ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Unified Results Header (Concise Top Bar) */}
                            <div className="sticky top-20 z-40 -mx-4 px-4 py-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between mb-8 shadow-sm">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-zinc-200 dark:border-zinc-800">Target Role</Badge>
                                        <div className="h-1 w-1 rounded-full bg-zinc-300" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            {jobDescriptions.find(j => j.id === selectedJobDescriptionId)?.company}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-display font-medium text-foreground tracking-tight leading-none">
                                        {jobDescriptions.find(j => j.id === selectedJobDescriptionId)?.title}
                                    </h3>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghostSubtle"
                                        size="sm"
                                        onClick={() => { setScoreResult(null); setSelectedResumeId(null); }}
                                        className="text-[10px] font-bold uppercase tracking-widest"
                                    >
                                        New Score
                                    </Button>

                                    {selectedResumeId && selectedJobDescriptionId && (
                                        <Link href={`/resume/${selectedResumeId}?jobDescriptionId=${selectedJobDescriptionId}&tailoring=true`}>
                                            <Button
                                                size="sm"
                                                className="rounded-xl px-4 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-bold flex items-center gap-2 h-10 shadow-lg shadow-black/5"
                                            >
                                                <Sparkles className="h-3.5 w-3.5" />
                                                Launch AI Optimizer
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>

                            <ATSScoringReport score={scoreResult} />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-display font-medium text-foreground">Recent Scoring Reports</h3>
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">{savedScores.length} Reports</Badge>
                            </div>

                            {isLoadingScores ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <Card key={i} className="p-5 border-black/[0.05] dark:border-white/[0.05]">
                                            <div className="flex items-center gap-4">
                                                <Skeleton className="h-12 w-12 rounded-xl" />
                                                <div className="space-y-2 flex-1">
                                                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                                                    <Skeleton className="h-3 w-1/2 rounded-lg" />
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : savedScores.length === 0 ? (
                                <Card className="border-dashed h-full flex items-center justify-center min-h-[400px] bg-muted/5">
                                    <div className="text-center p-12">
                                        <div className="mx-auto rounded-full bg-gray-100 dark:bg-gray-800 h-16 w-16 flex items-center justify-center mb-6">
                                            <Target className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground">No reports yet</h3>
                                        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                                            Select a job description and one of your resumes to get started.
                                        </p>
                                    </div>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {savedScores.map((savedScore) => (
                                        <Card
                                            key={savedScore.id}
                                            onClick={() => handleViewSavedScore(savedScore)}
                                            className="group cursor-pointer border-black/[0.08] dark:border-white/[0.08] hover:border-brand-300 dark:hover:border-brand-800 transition-all hover:shadow-md bg-white dark:bg-gray-900 overflow-hidden"
                                        >
                                            <div className="p-5 flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-brand-600 transition-colors">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div className={cn(
                                                        "px-2 px-1 text-[10px] font-bold rounded-md bg-muted uppercase tracking-wider",
                                                        savedScore.overallScore >= 80 ? "text-green-600 bg-green-50" :
                                                            savedScore.overallScore >= 60 ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50"
                                                    )}>
                                                        {savedScore.overallScore}% MATCH
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-foreground leading-tight line-clamp-1">{savedScore.jobDescription?.company || 'Unknown Company'}</h4>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 mb-4">{savedScore.jobDescription?.title || 'Unknown Role'}</p>
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground/60 tracking-wider">
                                                        <span>{new Date(savedScore.createdAt).toLocaleDateString()}</span>
                                                        <span className="group-hover:text-brand-600 flex items-center gap-1">VIEW REPORT <ArrowLeft className="h-3 w-3 rotate-180" /></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ATSScorePage() {
    return (
        <div className="min-h-screen bg-muted/30 dark:bg-gray-950 pb-20">
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-display font-medium tracking-tight text-foreground">
                            ATS Score
                        </h1>
                    </div>
                </div>
            </header>

            <Suspense fallback={
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                    </div>
                </div>
            }>
                <ATSScoreContent />
            </Suspense>
        </div>
    );
}
