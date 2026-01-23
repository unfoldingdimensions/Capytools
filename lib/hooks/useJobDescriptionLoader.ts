import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface JobDescription {
    id: string;
    title: string;
    company: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    keywords: string[];
}

export function useJobDescriptionLoader() {
    const searchParams = useSearchParams();
    const [jobDescription, setJobDescription] = useState<JobDescription | null>(null);
    const [jobDescriptionId, setJobDescriptionId] = useState<string | null>(null);
    const [isTailoringMode, setIsTailoringMode] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const jdId = searchParams?.get('jobDescriptionId');
        const tailoring = searchParams?.get('tailoring');

        if (jdId) {
            setJobDescriptionId(jdId);
            setIsTailoringMode(tailoring === 'true');
            loadJobDescription(jdId);
        }
    }, [searchParams]);

    async function loadJobDescription(jdId: string) {
        try {
            const response = await fetch(`/api/ai/job-descriptions?id=${jdId}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setJobDescription(result.data);
                } else {
                    throw new Error(result.message || 'Failed to load job description');
                }
            } else {
                throw new Error('Failed to load job description');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error('Error loading job description:', errorMessage);
            setError(errorMessage);
        }
    }

    return { jobDescription, jobDescriptionId, isTailoringMode, error, setJobDescription, setIsTailoringMode };
}
