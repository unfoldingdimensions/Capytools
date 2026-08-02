'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import type { PersonalInfoInput } from '@/lib/validations/resume.validation';
import type {
    WorkExperience,
    Education,
    Project,
    Skill,
    Certification,
} from '@/types/resume.types';

interface ResumeData {
    title: string;
    personalInfo: PersonalInfoInput;
    workExperience: WorkExperience[];
    education: Education[];
    projects: Project[];
    skills: Skill[];
    certifications: Certification[];
    customSections: unknown[];
}

export function useResumeSaver(resumeId?: string) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const { error: toastError } = useToast();

    async function saveResume(resumeData: ResumeData, title: string) {
        setIsSaving(true);
        try {
            const url = resumeId ? `/api/resumes/${resumeId}` : '/api/resumes';
            const method = resumeId ? 'PUT' : 'POST';

            const payload = {
                title: title || 'Untitled Resume',
                data: resumeData,
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to save resume');
            }

            if (result.success) {
                if (!resumeId) {
                    // If it's a new resume, redirect to the new edit page
                    router.push(`/resume/${result.data.id}`);
                }
                // For existing resumes, we stay on the page. 
                // We could add a toast here if available.
                return result.data;
            } else {
                throw new Error(result.message || 'Failed to save resume');
            }
        } catch (error) {
            console.error('Error saving resume:', error);
            toastError({
                title: 'Error saving resume',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsSaving(false);
        }
    }

    return { saveResume, isSaving };
}
