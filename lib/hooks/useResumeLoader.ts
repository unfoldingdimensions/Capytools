'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { ResumeData } from '@/types/resume.types';

export function useResumeLoader(resumeId?: string) {
    const router = useRouter();
    const { error: toastError } = useToast();
    const [isLoading, setIsLoading] = useState(!!resumeId);
    const [resumeData, setResumeData] = useState<ResumeData | null>(null);
    const [title, setTitle] = useState<string>('Untitled Resume');
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [targetRoles, setTargetRoles] = useState<string[]>([]);
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
                    setTemplateId(result.data.templateId || null);
                    setTargetRoles(result.data.targetRoles || []);
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
                toastError({
                    title: 'Failed to load resume',
                    message: errorMessage,
                });
                router.push('/dashboard');
            } finally {
                setIsLoading(false);
            }
        }

        void loadResume();
    }, [resumeId, router, toastError]);

    return { resumeData, title, templateId, targetRoles, isLoading, error, setResumeData, setTitle };
}
