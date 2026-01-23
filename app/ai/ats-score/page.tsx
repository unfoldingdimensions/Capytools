'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Target, CheckCircle2, Loader2, AlertCircle, Clock, Eye, MessageSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ATSScoringReport from '@/components/ai/ATSScoringReport';
import type { ATSScoreResult } from '@/types/ai.types';
import UploadResumeButton from '@/components/resume/UploadResumeButton';

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

function ATSScoreContent() {
    const searchParams = useSearchParams();
    const jobDescriptionId = searchParams?.get('jobDescriptionId') || null;

    const [resumes, setResumes] = useState<Resume[]>([]);
    const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
    const [jobDescription, setJobDescription] = useState<JobDescription | null>(null);
    const [selectedJobDescriptionId, setSelectedJobDescriptionId] = useState<string | null>(jobDescriptionId);
    const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
    const [scoreResult, setScoreResult] = useState<ATSScoreResult | null>(null);
    const [savedScores, setSavedScores] = useState<SavedATSScore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const [isLoadingJob, setIsLoadingJob] = useState(false);
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

    // Fetch job description when selectedJobDescriptionId changes
    useEffect(() => {
        if (selectedJobDescriptionId) {
            setIsLoadingJob(true);
            setError(null);
            async function fetchJobDescription() {
                try {
                    const response = await fetch(`/api/ai/job-descriptions?id=${selectedJobDescriptionId}`);
                    const data = await response.json();
                    if (data.success) {
                        setJobDescription(data.data);
                    } else {
                        setError(data.error?.message || 'Failed to load job description');
                        setJobDescription(null);
                    }
                } catch (error) {
                    console.error('Failed to fetch job description:', error);
                    setError('Failed to load job description');
                    setJobDescription(null);
                } finally {
                    setIsLoadingJob(false);
                }
            }
            void fetchJobDescription();
        } else {
            setJobDescription(null);
        }
    }, [selectedJobDescriptionId]);

    const handleScoreResume = async (resumeId: string) => {
        if (!selectedJobDescriptionId || !resumeId) {
            setError('Please select both a job description and a resume');
            return;
        }

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
                setSelectedResumeId(resumeId);
                // Refresh saved scores after scoring
                const scoresResponse = await fetch('/api/ai/ats-score');
                const scoresData = await scoresResponse.json();
                if (scoresData.success) {
                    setSavedScores(scoresData.data || []);
                }
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
        const scoreResult: ATSScoreResult = {
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
        setScoreResult(scoreResult);
        setSelectedResumeId(savedScore.resume.id);
        if (savedScore.jobDescription) {
            setSelectedJobDescriptionId(savedScore.jobDescription.id);
        }
    };


    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                {/* Navigation Cards - Hidden when viewing results */}
                {!scoreResult && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <Link href="/ai/interview-prep" className="block">
                            <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-orange-300 hover:shadow-md transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                                        <MessageSquare className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Interview Prep</h3>
                                        <p className="text-sm text-gray-600">Practice with AI-generated questions</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <Link href="/ai/tailor-resume" className="block">
                            <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-purple-300 hover:shadow-md transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                                        <Sparkles className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Tailor Resume</h3>
                                        <p className="text-sm text-gray-600">Optimize your resume for jobs</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-900">Error</h3>
                            <p className="mt-1 text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Saved Scores Section */}
                {!scoreResult && (
                    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Saved Scores</h2>
                        {isLoadingScores ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                <span className="ml-2 text-gray-600">Loading saved scores...</span>
                            </div>
                        ) : savedScores.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p className="text-sm">No saved scores yet. Score a resume to see it here.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {savedScores.map((savedScore) => (
                                    <div
                                        key={savedScore.id}
                                        className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                        onClick={() => handleViewSavedScore(savedScore)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 mb-1">
                                                    {savedScore.reference || `${savedScore.jobDescription?.company || 'Unknown'} - ${savedScore.resume.title}`}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {savedScore.resume.title}
                                                </p>
                                            </div>
                                            <div className="ml-4">
                                                <div className={`text-2xl font-bold ${savedScore.overallScore >= 80 ? 'text-green-600' :
                                                    savedScore.overallScore >= 60 ? 'text-yellow-600' :
                                                        'text-red-600'
                                                    }`}>
                                                    {savedScore.overallScore}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{new Date(savedScore.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-blue-600">
                                                <Eye className="h-3 w-3" />
                                                <span>View</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* If score result exists, show it */}
                {scoreResult ? (
                    <div className="space-y-6">
                        {/* Back Button - Prominent */}
                        <div className="flex justify-start mb-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setScoreResult(null);
                                    setSelectedResumeId(null);
                                }}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to ATS Score
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Scoring Results</h2>
                                {jobDescription && (
                                    <p className="mt-1 text-gray-600">
                                        {jobDescription.title} at {jobDescription.company}
                                    </p>
                                )}
                            </div>
                        </div>
                        <ATSScoringReport
                            score={scoreResult}
                            resumeId={selectedResumeId || undefined}
                            jobDescriptionId={selectedJobDescriptionId || undefined}
                        />
                    </div>
                ) : (
                    <>
                        {/* How it works */}
                        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
                            <h2 className="mb-4 text-lg font-semibold text-blue-900">How it works</h2>
                            <ol className="space-y-3 text-sm text-blue-800">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <span><strong>Parse a job description</strong> using the Job Description Parser</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <span><strong>Select your resume</strong> below</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <span><strong>Get AI-powered scoring</strong> with improvement suggestions</span>
                                </li>
                            </ol>
                        </div>

                        {/* Job Description Selection */}
                        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Job Description</h2>

                            {isLoadingJobs ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                    <span className="ml-2 text-gray-600">Loading job descriptions...</span>
                                </div>
                            ) : jobDescriptions.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-sm text-gray-600 mb-4">
                                        No saved job descriptions found. Parse a job description first.
                                    </p>
                                    <Link href="/ai/job-description">
                                        <Button>Parse Job Description</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <select
                                        value={selectedJobDescriptionId || ''}
                                        onChange={(e) => {
                                            setSelectedJobDescriptionId(e.target.value || null);
                                            setScoreResult(null);
                                            setSelectedResumeId(null);
                                        }}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Select a job description --</option>
                                        {jobDescriptions.map((jd) => (
                                            <option key={jd.id} value={jd.id}>
                                                {jd.title}
                                            </option>
                                        ))}
                                    </select>

                                    {selectedJobDescriptionId && (
                                        <Link href="/ai/job-description" className="text-sm text-blue-600 hover:text-blue-800">
                                            Or parse a new job description →
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Job Description Details */}
                        {isLoadingJob ? (
                            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                    <span className="ml-2 text-gray-600">Loading job description...</span>
                                </div>
                            </div>
                        ) : jobDescription ? (
                            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-gray-900 mb-2">Selected Job Description</h2>
                                        <h3 className="text-lg font-semibold text-gray-800">{jobDescription.title}</h3>
                                        {jobDescription.keywords && jobDescription.keywords.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {jobDescription.keywords.slice(0, 8).map((keyword, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                                                    >
                                                        {keyword}
                                                    </span>
                                                ))}
                                                {jobDescription.keywords.length > 8 && (
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                                                        +{jobDescription.keywords.length - 8} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Your Resumes */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Your Resumes</h2>
                                <UploadResumeButton
                                    onResumeCreated={() => {
                                        // Refresh resumes list
                                        fetch('/api/resumes')
                                            .then(res => res.json())
                                            .then(data => {
                                                if (data.success) {
                                                    setResumes(data.data || []);
                                                }
                                            })
                                            .catch(err => console.error('Failed to refresh resumes:', err));
                                    }}
                                />
                            </div>
                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
                                </div>
                            ) : resumes.length === 0 ? (
                                <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                                    <p className="text-gray-600 mb-4">No resumes yet</p>
                                    <div className="flex gap-3 justify-center">
                                        <Link href="/resume/new">
                                            <Button>Create Your First Resume</Button>
                                        </Link>
                                        <UploadResumeButton />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {resumes.map((resume) => (
                                        <div
                                            key={resume.id}
                                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300"
                                        >
                                            <div>
                                                <h3 className="font-medium text-gray-900">{resume.title}</h3>
                                                <p className="text-sm text-gray-600">
                                                    {selectedResumeId === resume.id ? 'Selected' : 'Ready to score'}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                disabled={!jobDescription || isScoring}
                                                onClick={() => handleScoreResume(resume.id)}
                                            >
                                                {isScoring && selectedResumeId === resume.id ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Scoring...
                                                    </>
                                                ) : (
                                                    'Score Resume'
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function ATSScorePage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="border-b bg-white">
                <div className="container mx-auto px-4 py-6">
                    <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                            <Target className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">ATS Score</h1>
                            <p className="mt-1 text-gray-600">
                                Check how well your resume matches job requirements
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Suspense fallback={
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                </div>
            }>
                <ATSScoreContent />
            </Suspense>
        </div>
    );
}
