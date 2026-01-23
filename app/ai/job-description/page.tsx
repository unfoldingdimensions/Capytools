'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        <div className="min-h-screen bg-muted/30 pb-12">
            {/* Header */}
            <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/80 px-6 backdrop-blur-md">
                <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild className="shrink-0">
                            <Link href="/dashboard">
                                <ArrowLeft className="h-5 w-5" />
                                <span className="sr-only">Back</span>
                            </Link>
                        </Button>
                        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                            Role Analyzer
                        </h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-5xl">

                <div className="mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Parse Job Description</h2>
                    <p className="mt-2 text-muted-foreground">
                        Extract structured data from any job posting using AI to tailor your resume perfectly.
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="mb-6">
                    <Card>
                        <CardContent className="flex items-center justify-between p-6">
                            <div>
                                <h3 className="font-semibold text-foreground">Quick Actions</h3>
                                <p className="text-sm text-muted-foreground">Upload your resume to get started with AI features</p>
                            </div>
                            <UploadResumeButton />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Input Form */}
                    <div>
                        <JobDescriptionInput onSubmit={handleSubmit} isLoading={isLoading} />
                    </div>

                    {/* Results */}
                    <div className="space-y-6">
                        {isLoading && (
                            <Card className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                                <p className="text-lg font-medium text-foreground">Analyzing job description...</p>
                                <p className="text-sm text-muted-foreground">This uses AI to extract key requirements</p>
                            </Card>
                        )}

                        {error && (
                            <Card className="border-destructive/50 bg-destructive/5">
                                <CardContent className="p-6">
                                    <h3 className="font-semibold text-destructive">Error</h3>
                                    <p className="mt-2 text-sm text-destructive/90">{error}</p>
                                </CardContent>
                            </Card>
                        )}

                        {result && !isLoading && (
                            <Card className="overflow-hidden border-primary/20 shadow-lg">
                                <div className="bg-primary/5 p-6 border-b border-primary/10">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h3 className="text-2xl font-bold text-foreground">
                                                {result.title}
                                            </h3>
                                            <p className="text-lg text-primary font-medium">{result.company}</p>
                                        </div>
                                        <div className="shrink-0 rounded-full bg-primary/10 p-2">
                                            <Upload className="h-6 w-6 text-primary" />
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-6 space-y-6">
                                    {result.requirements && result.requirements.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                Key Requirements
                                            </h4>
                                            <ul className="grid gap-2 text-sm text-muted-foreground">
                                                {result.requirements.map((req: string, idx: number) => (
                                                    <li key={idx} className="flex gap-2 items-start">
                                                        <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
                                                        {req}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {result.responsibilities && result.responsibilities.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                Responsibilities
                                            </h4>
                                            <ul className="grid gap-2 text-sm text-muted-foreground">
                                                {result.responsibilities.map((resp: string, idx: number) => (
                                                    <li key={idx} className="flex gap-2 items-start">
                                                        <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
                                                        {resp}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {result.keywords && result.keywords.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                Keywords
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {result.keywords.map((keyword: string, idx: number) => (
                                                    <span
                                                        key={idx}
                                                        className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                                                    >
                                                        {keyword}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>

                                <div className="p-6 bg-muted/30 border-t flex flex-col sm:flex-row gap-3">
                                    <Button
                                        onClick={() => router.push(`/ai/ats-score?jobDescriptionId=${result.id}`)}
                                        className="flex-1"
                                        size="lg"
                                    >
                                        Score Resume Against This Job
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setResult(null);
                                            setError(null);
                                        }}
                                        variant="outline"
                                        size="lg"
                                    >
                                        Parse Another
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {!result && !isLoading && !error && (
                            <Card className="border-dashed h-full flex items-center justify-center min-h-[400px] bg-muted/10">
                                <CardContent className="text-center p-6">
                                    <div className="mx-auto rounded-full bg-muted p-4 w-16 h-16 flex items-center justify-center mb-4">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="font-semibold text-foreground text-lg">Waiting for Input</h3>
                                    <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                                        Fill out the job description details on the left to generate a structured analysis.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


