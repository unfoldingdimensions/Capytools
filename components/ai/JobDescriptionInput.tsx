'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface JobDescriptionInputProps {
    onSubmit: (data: {
        title: string;
        company: string;
        description: string;
        url?: string;
    }) => void;
    isLoading?: boolean;
}

export default function JobDescriptionInput({
    onSubmit,
    isLoading = false,
}: JobDescriptionInputProps) {
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const newErrors: Record<string, string> = {};

        if (!title.trim()) {
            newErrors.title = 'Job title is required';
        }

        if (!company.trim()) {
            newErrors.company = 'Company name is required';
        }

        if (!description.trim()) {
            newErrors.description = 'Job description is required';
        } else if (description.trim().length < 50) {
            newErrors.description = 'Job description must be at least 50 characters';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        onSubmit({ title, company, description, url: url || undefined });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Job Description Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Job Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            Job Title *
                        </label>
                        <Input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Senior Software Engineer"
                            className={errors.title ? 'border-red-500' : ''}
                            disabled={isLoading}
                        />
                        {errors.title && (
                            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                        )}
                    </div>

                    {/* Company */}
                    <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                            Company *
                        </label>
                        <Input
                            id="company"
                            type="text"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="e.g., Google"
                            className={errors.company ? 'border-red-500' : ''}
                            disabled={isLoading}
                        />
                        {errors.company && (
                            <p className="mt-1 text-sm text-red-600">{errors.company}</p>
                        )}
                    </div>

                    {/* Job URL (Optional) */}
                    <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                            Job Posting URL (Optional)
                        </label>
                        <Input
                            id="url"
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://..."
                            disabled={isLoading}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Job Description *
                        </label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Paste the full job description here..."
                            rows={12}
                            className={errors.description ? 'border-red-500' : ''}
                            disabled={isLoading}
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            {description.length} / 50 minimum characters
                        </p>
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="px-6"
                >
                    {isLoading ? (
                        <>
                            <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Processing...
                        </>
                    ) : (
                        'Analyze Job Description'
                    )}
                </Button>
            </div>
        </form>
    );
}

