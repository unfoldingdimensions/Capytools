'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, CheckCircle2, Loader2, AlertCircle, Clock, Eye, Target, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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

interface SavedTailoredResume {
    id: string;
    reference: string;
    atsScore: number | null;
    matchScore: number | null;
    createdAt: string;
    originalResume: {
        id: string;
        title: string;
    };
    jobDescription: {
        id: string;
        title: string;
        company: string;
    } | null;
}

function TailorResumeContent() {
    const searchParams = useSearchParams();
    const resumeIdParam = searchParams?.get('resumeId') || null;
    const jobDescriptionIdParam = searchParams?.get('jobDescriptionId') || null;

    const [resumes, setResumes] = useState<Resume[]>([]);
    const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
    const [selectedResumeId, setSelectedResumeId] = useState<string | null>(resumeIdParam);
    const [selectedJobDescriptionId, setSelectedJobDescriptionId] = useState<string | null>(jobDescriptionIdParam);
    const [savedTailoredResumes, setSavedTailoredResumes] = useState<SavedTailoredResume[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const [isLoadingTailored, setIsLoadingTailored] = useState(false);
    const [isTailoring, setIsTailoring] = useState(false);
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

                // Fetch saved tailored resumes
                setIsLoadingTailored(true);
                const tailoredResponse = await fetch('/api/ai/tailor-resume');
                const tailoredData = await tailoredResponse.json();
                if (tailoredData.success) {
                    setSavedTailoredResumes(tailoredData.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                setError('Failed to load data');
            } finally {
                setIsLoading(false);
                setIsLoadingJobs(false);
                setIsLoadingTailored(false);
            }
        }
        void fetchData();
    }, []);

    const handleTailorResume = async (resumeId: string) => {
        if (!selectedJobDescriptionId || !resumeId) {
            setError('Please select both a job description and a resume');
            return;
        }

        setIsTailoring(true);
        setSelectedResumeId(resumeId); // Set the selected resume ID when tailoring starts

        // Redirect to Resume Builder with jobDescriptionId for AI tailoring
        window.location.href = `/resume/${resumeId}?jobDescriptionId=${selectedJobDescriptionId}&tailoring=true`;
    };

    const handleViewTailoredResume = (tailoredResume: SavedTailoredResume) => {
        // Navigate to the resume editor
        window.location.href = `/resume/${tailoredResume.originalResume.id}`;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                {/* Navigation Cards */}
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
                </div>

                {/* How it works */}
                <div className="mb-8 rounded-lg border border-purple-200 bg-purple-50 p-6">
                    <h2 className="mb-4 text-lg font-semibold text-purple-900">How it works</h2>
                    <ol className="space-y-3 text-sm text-purple-800">
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                            <span><strong>Parse a job description</strong> to extract requirements</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                            <span><strong>Select your resume</strong> to tailor</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                            <span><strong>Get AI suggestions</strong> for optimizing your resume</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                            <span><strong>Apply changes</strong> to increase your chances</span>
                        </li>
                    </ol>
                </div>

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

                {/* Saved Tailored Resumes Section */}
                <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Saved Tailored Resumes</h2>
                    {isLoadingTailored ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                            <span className="ml-2 text-gray-600">Loading saved tailored resumes...</span>
                        </div>
                    ) : savedTailoredResumes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">No saved tailored resumes yet. Tailor a resume to see it here.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {savedTailoredResumes.map((tailoredResume) => (
                                <div
                                    key={tailoredResume.id}
                                    className="rounded-lg border border-gray-200 bg-white p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => handleViewTailoredResume(tailoredResume)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-1">
                                                {tailoredResume.reference || `${tailoredResume.jobDescription?.company || 'Unknown'} - ${tailoredResume.originalResume.title}`}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {tailoredResume.originalResume.title}
                                            </p>
                                        </div>
                                        {tailoredResume.atsScore !== null && (
                                            <div className="ml-4">
                                                <div className={`text-lg font-semibold ${tailoredResume.atsScore >= 80 ? 'text-green-600' :
                                                    tailoredResume.atsScore >= 60 ? 'text-yellow-600' :
                                                        'text-red-600'
                                                    }`}>
                                                    {tailoredResume.atsScore}%
                                                </div>
                                                <p className="text-xs text-gray-500">ATS Score</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{new Date(tailoredResume.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-purple-600">
                                            <Eye className="h-3 w-3" />
                                            <span>View</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Job Description Selection */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Select Job Description</h2>

                    {isLoadingJobs ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
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
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">-- Select a job description --</option>
                                {jobDescriptions.map((jd) => (
                                    <option key={jd.id} value={jd.id}>
                                        {jd.title}
                                    </option>
                                ))}
                            </select>

                            {selectedJobDescriptionId && (
                                <Link href="/ai/job-description" className="text-sm text-purple-600 hover:text-blue-800">
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
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-purple-600"></div>
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
                                            {selectedResumeId === resume.id && isTailoring ? 'Tailoring...' : 'Ready to tailor'}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        disabled={!selectedJobDescriptionId || isTailoring}
                                        onClick={() => handleTailorResume(resume.id)}
                                    >
                                        {isTailoring && selectedResumeId === resume.id ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Tailoring...
                                            </>
                                        ) : (
                                            'Tailor Resume'
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Benefits */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 mb-6">
                    <h3 className="mb-3 font-semibold text-gray-900">What You'll Get</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                            <Sparkles className="mt-0.5 h-4 w-4 text-purple-600 flex-shrink-0" />
                            <span><strong>Tailored Professional Summary</strong> optimized for the job</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Sparkles className="mt-0.5 h-4 w-4 text-purple-600 flex-shrink-0" />
                            <span><strong>Optimized Experience Bullets</strong> with relevant keywords</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Sparkles className="mt-0.5 h-4 w-4 text-purple-600 flex-shrink-0" />
                            <span><strong>Suggested Skills</strong> to highlight</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Sparkles className="mt-0.5 h-4 w-4 text-purple-600 flex-shrink-0" />
                            <span><strong>Specific Customizations</strong> for this role</span>
                        </li>
                    </ul>
                </div>

            </div>
        </div>
    );
}

export default function TailorResumePage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="border-b bg-white">
                <div className="container mx-auto px-4 py-6">
                    <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                            <Sparkles className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">AI Resume Tailoring</h1>
                            <p className="mt-1 text-gray-600">
                                Optimize your resume for specific jobs with AI
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Suspense fallback={
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    </div>
                </div>
            }>
                <TailorResumeContent />
            </Suspense>
        </div>
    );
}
