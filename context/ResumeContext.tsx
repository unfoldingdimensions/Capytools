'use client';

import { createContext, useContext, ReactNode } from 'react';

interface ResumeContextType {
    resumeId: string | undefined;
}

const ResumeContext = createContext<ResumeContextType>({
    resumeId: undefined,
});

export function useResumeContext() {
    return useContext(ResumeContext);
}

interface ResumeProviderProps {
    children: ReactNode;
    resumeId: string | undefined;
}

export function ResumeProvider({ children, resumeId }: ResumeProviderProps) {
    return (
        <ResumeContext.Provider value={{ resumeId }}>
            {children}
        </ResumeContext.Provider>
    );
}
