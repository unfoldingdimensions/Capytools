'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ResumeData } from '@/types/resume.types';

export function useResumeLoader(resumeId?: string) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(!!resumeId);
    const [resumeData, setResumeData] = useState<ResumeData | null>(null);
    const [title, setTitle] = useState<string>('Untitled Resume');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!resumeId) {
            setIsLoading(false);
            return;
        }

        async function loadResume() {
            try {
                const response = await fetch(`/api/resumes/${resumeId}`);
                if (!response.ok) {
                    throw new Error('Failed to load resume');
                }
                const result = await response.json();
                if (result.success && result.data) {
                    const loadedData = result.data.data || {};
                    setTitle(result.data.title || 'Untitled Resume');
                    setResumeData({
                        personalInfo: loadedData.personalInfo || { fullName: '', email: '' },
                        workExperience: loadedData.workExperience || [],
                        education: loadedData.education || [],
                        projects: loadedData.projects || [],
                        skills: loadedData.skills || [],
                        certifications: loadedData.certifications || [],
                        customSections: loadedData.customSections || [],
                    });
                } else {
                    throw new Error(result.message || 'Failed to load resume data');
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                console.error('Error loading resume:', errorMessage);
                setError(errorMessage);
                alert(`Failed to load resume: ${errorMessage}`);
                router.push('/dashboard');
            } finally {
                setIsLoading(false);
            }
        }

        void loadResume();
    }, [resumeId, router]);

    return { resumeData, title, isLoading, error, setResumeData, setTitle };
}
