'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import JobDescriptionInput from '@/components/ai/JobDescriptionInput';
import UploadResumeButton from '@/components/resume/UploadResumeButton';

export default function JobDescriptionPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (data: {
        title: string;
        company: string;
        description: string;
        url?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/ai/parse-job-description', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error?.message || 'Failed to parse job description');
            }

            setResult(responseData.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white">
                <div className="container mx-auto px-4 py-6">
                    <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Parse Job Description</h1>
                    <p className="mt-2 text-gray-600">
                        Extract structured data from any job posting using AI
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                {/* Quick Actions */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
                            <p className="text-xs text-gray-600 mt-1">Upload your resume to get started with AI features</p>
                        </div>
                        <UploadResumeButton />
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Input Form */}
                    <div>
                        <JobDescriptionInput onSubmit={handleSubmit} isLoading={isLoading} />
                    </div>

                    {/* Results */}
                    <div>
                        {isLoading && (
                            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                                <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
                                <p className="mt-4 text-sm text-gray-600">
                                    Analyzing job description with AI...
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                                <h3 className="font-semibold text-red-900">Error</h3>
                                <p className="mt-2 text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {result && !isLoading && (
                            <div className="space-y-6">
                                <div className="rounded-lg border border-gray-200 bg-white p-6">
                                    <h3 className="mb-4 text-lg font-semibold text-gray-900">
                                        Parsed Results
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-medium text-gray-700">Job Title</h4>
                                            <p className="text-gray-900">{result.title}</p>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-gray-700">Company</h4>
                                            <p className="text-gray-900">{result.company}</p>
                                        </div>

                                        {result.requirements && result.requirements.length > 0 && (
                                            <div>
                                                <h4 className="font-medium text-gray-700">Requirements</h4>
                                                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
                                                    {result.requirements.map((req: string, idx: number) => (
                                                        <li key={idx}>{req}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {result.responsibilities && result.responsibilities.length > 0 && (
                                            <div>
                                                <h4 className="font-medium text-gray-700">Responsibilities</h4>
                                                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
                                                    {result.responsibilities.map((resp: string, idx: number) => (
                                                        <li key={idx}>{resp}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {result.keywords && result.keywords.length > 0 && (
                                            <div>
                                                <h4 className="font-medium text-gray-700">Keywords</h4>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {result.keywords.map((keyword: string, idx: number) => (
                                                        <span
                                                            key={idx}
                                                            className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                                                        >
                                                            {keyword}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 flex gap-3">
                                        <Button
                                            onClick={() => router.push(`/ai/ats-score?jobDescriptionId=${result.id}`)}
                                            className="flex-1"
                                        >
                                            Score Resume Against This Job
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setResult(null);
                                                setError(null);
                                            }}
                                            variant="outline"
                                        >
                                            Parse Another
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!result && !isLoading && !error && (
                            <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                                <p className="text-gray-500">
                                    Results will appear here after parsing
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

