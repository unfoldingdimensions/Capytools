'use client';

import { createContext, ReactNode } from 'react';
import { useJobDescriptionLoader } from '@/lib/hooks/useJobDescriptionLoader';

interface JobDescription {
    id: string;
    title: string;
    company: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    keywords: string[];
}

interface TailoringContextProps {
    jobDescription: JobDescription | null;
    jobDescriptionId: string | null;
    isTailoringMode: boolean;
    setJobDescription: (jobDescription: JobDescription | null) => void;
    setIsTailoringMode: (isTailoringMode: boolean) => void;
}

export const TailoringContext = createContext<TailoringContextProps>({
    jobDescription: null,
    jobDescriptionId: null,
    isTailoringMode: false,
    setJobDescription: () => {},
    setIsTailoringMode: () => {},
});

export function TailoringProvider({ children }: { children: ReactNode }) {
    const {
        jobDescription,
        jobDescriptionId,
        isTailoringMode,
        setJobDescription,
        setIsTailoringMode,
    } = useJobDescriptionLoader();

    return (
        <TailoringContext.Provider
            value={{
                jobDescription,
                jobDescriptionId,
                isTailoringMode,
                setJobDescription,
                setIsTailoringMode,
            }}
        >
            {children}
        </TailoringContext.Provider>
    );
}
