'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageSquare, CheckCircle2, Loader2, AlertCircle, Clock, Eye, Target, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import InterviewQuestionsList from '@/components/ai/InterviewQuestionsList';
import type { InterviewQuestion } from '@/types/ai.types';
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

interface SavedInterviewSession {
    id: string;
    reference: string | null;
    questions: InterviewQuestion[];
    createdAt: string;
    completedAt: string | null;
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

function InterviewPrepContent() {
    const searchParams = useSearchParams();
    const resumeIdParam = searchParams?.get('resumeId') || null;
    const jobDescriptionIdParam = searchParams?.get('jobDescriptionId') || null;

    const [resumes, setResumes] = useState<Resume[]>([]);
    const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
    const [selectedResumeId, setSelectedResumeId] = useState<string | null>(resumeIdParam);
    const [selectedJobDescriptionId, setSelectedJobDescriptionId] = useState<string | null>(jobDescriptionIdParam);
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [savedSessions, setSavedSessions] = useState<SavedInterviewSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

                // Fetch saved interview sessions
                setIsLoadingSessions(true);
                const sessionsResponse = await fetch('/api/ai/interview-questions');
                const sessionsData = await sessionsResponse.json();
                if (sessionsData.success) {
                    setSavedSessions(sessionsData.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                setError('Failed to load data');
            } finally {
                setIsLoading(false);
                setIsLoadingJobs(false);
                setIsLoadingSessions(false);
            }
        }
        void fetchData();
    }, []);

    const handleGenerateQuestions = async (resumeId: string) => {
        if (!selectedJobDescriptionId || !resumeId) {
            setError('Please select both a job description and a resume');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setQuestions([]);

        try {
            const response = await fetch('/api/ai/interview-questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resumeId,
                    jobDescriptionId: selectedJobDescriptionId,
                    count: 10,
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error?.message || 'Failed to generate interview questions');
            }

            if (responseData.success && responseData.data?.questions) {
                setQuestions(responseData.data.questions);
                setSelectedResumeId(resumeId);
                // Refresh saved sessions after generating
                const sessionsResponse = await fetch('/api/ai/interview-questions');
                const sessionsData = await sessionsResponse.json();
                if (sessionsData.success) {
                    setSavedSessions(sessionsData.data || []);
                }
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err) {
            console.error('Question generation error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while generating questions');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleViewSavedSession = (session: SavedInterviewSession) => {
        setQuestions(session.questions as InterviewQuestion[]);
        setSelectedResumeId(session.resume.id);
        if (session.jobDescription) {
            setSelectedJobDescriptionId(session.jobDescription.id);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                {/* Navigation Cards - Hidden when viewing questions */}
                {questions.length === 0 && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <Link href="/ai/ats-score" className="block">
                                <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-green-300 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                                            <Target className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">ATS Score</h3>
                                            <p className="text-sm text-gray-600">Check resume compatibility</p>
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

                        {/* How it works */}
                        <div className="mb-8 rounded-lg border border-orange-200 bg-orange-50 p-6">
                            <h2 className="mb-4 text-lg font-semibold text-orange-900">How it works</h2>
                            <ol className="space-y-3 text-sm text-orange-800">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <span><strong>Parse a job description</strong> for the role you're applying to</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <span><strong>Select your resume</strong> for personalized questions</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <span><strong>Get AI-generated questions</strong> tailored to the role</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <span><strong>Practice with suggested answers</strong> and key points</span>
                                </li>
                            </ol>
                        </div>
                    </>
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

                {/* Saved Interview Questions Section */}
                {questions.length === 0 && (
                    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Saved Interview Questions</h2>
                        {isLoadingSessions ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                                <span className="ml-2 text-gray-600">Loading saved sessions...</span>
                            </div>
                        ) : savedSessions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p className="text-sm">No saved interview questions yet. Generate questions to see them here.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {savedSessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="rounded-lg border border-gray-200 bg-white p-4 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                                        onClick={() => handleViewSavedSession(session)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 mb-1">
                                                    {session.reference || `${session.jobDescription?.company || 'Unknown'} - ${session.resume.title}`}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {session.resume.title}
                                                </p>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-lg font-semibold text-orange-600">
                                                    {Array.isArray(session.questions) ? session.questions.length : 0} Questions
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-orange-600">
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

                {/* Show questions if generated */}
                {questions.length > 0 ? (
                    <div className="space-y-6">
                        {/* Back Button - Prominent */}
                        <div className="flex justify-start mb-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setQuestions([]);
                                    setSelectedResumeId(null);
                                }}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Interview Prep
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Interview Questions</h2>
                                <p className="mt-1 text-gray-600">
                                    Personalized questions based on your resume and the job description
                                </p>
                            </div>
                        </div>
                        <InterviewQuestionsList questions={questions} />
                    </div>
                ) : (
                    <>
                        {/* Job Description Selection */}
                        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Job Description</h2>

                            {isLoadingJobs ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
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
                                            setError(null);
                                        }}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="">-- Select a job description --</option>
                                        {jobDescriptions.map((jd) => (
                                            <option key={jd.id} value={jd.id}>
                                                {jd.title}
                                            </option>
                                        ))}
                                    </select>

                                    {selectedJobDescriptionId && (
                                        <Link href="/ai/job-description" className="text-sm text-orange-600 hover:text-orange-800">
                                            Or parse a new job description →
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

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
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-orange-600"></div>
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
                                                    {selectedResumeId === resume.id && isGenerating ? 'Generating questions...' : 'Ready for interview prep'}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                disabled={!selectedJobDescriptionId || isGenerating}
                                                onClick={() => handleGenerateQuestions(resume.id)}
                                            >
                                                {isGenerating && selectedResumeId === resume.id ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    'Generate Questions'
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Question Types */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 mb-6">
                    <h3 className="mb-3 font-semibold text-gray-900">Question Types You'll Get</h3>
                    <div className="space-y-3 text-sm text-gray-700">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                Behavioral
                            </div>
                            <span>Questions about past experiences using the STAR method</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                                Technical
                            </div>
                            <span>Questions about your skills and technical knowledge</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                                Situational
                            </div>
                            <span>Hypothetical scenarios relevant to the role</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                                Experience-based
                            </div>
                            <span>Questions based on your resume and job requirements</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function InterviewPrepPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="border-b bg-white">
                <div className="container mx-auto px-4 py-6">
                    <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                            <MessageSquare className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Interview Preparation</h1>
                            <p className="mt-1 text-gray-600">
                                Get personalized interview questions and practice answers
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Suspense fallback={
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                    </div>
                </div>
            }>
                <InterviewPrepContent />
            </Suspense>
        </div>
    );
}
