'use client';

import { createContext, useReducer, Dispatch, ReactNode } from 'react';
import type { PersonalInfoInput } from '@/lib/validations/resume.validation';
import type {
    WorkExperience,
    Education,
    Project,
    Skill,
    Certification,
} from '@/types/resume.types';

export interface ResumeState {
    title: string;
    personalInfo: PersonalInfoInput;
    workExperience: WorkExperience[];
    education: Education[];
    projects: Project[];
    skills: Skill[];
    certifications: Certification[];
    customSections: unknown[];
}

export type ResumeAction =
    | { type: 'SET_RESUME_DATA'; payload: ResumeState }
    | { type: 'SET_TITLE'; payload: string }
    | { type: 'SET_PERSONAL_INFO'; payload: PersonalInfoInput }
    | { type: 'UPDATE_WORK_EXPERIENCE'; payload: WorkExperience[] }
    | { type: 'UPDATE_EDUCATION'; payload: Education[] }
    | { type: 'UPDATE_PROJECTS'; payload: Project[] }
    | { type: 'UPDATE_SKILLS'; payload: Skill[] }
    | { type: 'UPDATE_CERTIFICATIONS'; payload: Certification[] };

export const initialState: ResumeState = {
    title: 'Untitled Resume',
    personalInfo: {} as PersonalInfoInput,
    workExperience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    customSections: [],
};

export const ResumeContext = createContext<{
    state: ResumeState;
    dispatch: Dispatch<ResumeAction>;
}>({
    state: initialState,
    dispatch: () => null,
});

function resumeReducer(state: ResumeState, action: ResumeAction): ResumeState {
    switch (action.type) {
        case 'SET_RESUME_DATA':
            return action.payload;
        case 'SET_TITLE':
            return { ...state, title: action.payload };
        case 'SET_PERSONAL_INFO':
            return { ...state, personalInfo: action.payload };
        case 'UPDATE_WORK_EXPERIENCE':
            return { ...state, workExperience: action.payload };
        case 'UPDATE_EDUCATION':
            return { ...state, education: action.payload };
        case 'UPDATE_PROJECTS':
            return { ...state, projects: action.payload };
        case 'UPDATE_SKILLS':
            return { ...state, skills: action.payload };
        case 'UPDATE_CERTIFICATIONS':
            return { ...state, certifications: action.payload };
        default:
            return state;
    }
}

/**
 * @deprecated Use Redux resumeSlice instead. This context is being phased out.
 */
export function ResumeProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(resumeReducer, initialState);

    return (
        <ResumeContext.Provider value={{ state, dispatch }}>
            {children}
        </ResumeContext.Provider>
    );
}
