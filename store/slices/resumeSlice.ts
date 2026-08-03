import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
    ResumeData,
    PersonalInfo,
    WorkExperience,
    Education,
    Project,
    Skill,
    Certification,
    CustomSection
} from '@/types/resume.types';

interface ResumeState {
    currentResumeId: string | null;
    title: string;
    resumeData: ResumeData;
    targetRoles: string[];
    isLoading: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
    hasUnsavedChanges: boolean;
    error: string | null;
}

const initialResumeData: ResumeData = {
    personalInfo: {
        fullName: '',
        email: '',
    },
    workExperience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    customSections: [],
};

const initialState: ResumeState = {
    currentResumeId: null,
    title: 'Untitled Resume',
    resumeData: initialResumeData,
    targetRoles: [],
    isLoading: false,
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null,
};

const resumeSlice = createSlice({
    name: 'resume',
    initialState,
    reducers: {
        setCurrentResumeId: (state, action: PayloadAction<string | null>) => {
            state.currentResumeId = action.payload;
        },
        setTitle: (state, action: PayloadAction<string>) => {
            state.title = action.payload;
            state.hasUnsavedChanges = true;
        },
        setResumeData: (state, action: PayloadAction<ResumeData>) => {
            state.resumeData = action.payload;
            state.hasUnsavedChanges = false;
            state.error = null;
        },
        setFullResume: (state, action: PayloadAction<{ id: string; title: string; data: ResumeData; targetRoles?: string[] }>) => {
            state.currentResumeId = action.payload.id;
            state.title = action.payload.title;
            state.resumeData = action.payload.data;
            state.targetRoles = action.payload.targetRoles || [];
            state.hasUnsavedChanges = false;
            state.error = null;
        },
        setTargetRoles: (state, action: PayloadAction<string[]>) => {
            state.targetRoles = action.payload;
            state.hasUnsavedChanges = true;
        },
        updateResumeData: (state, action: PayloadAction<Partial<ResumeData>>) => {
            state.resumeData = { ...state.resumeData, ...action.payload };
            state.hasUnsavedChanges = true;
        },
        setPersonalInfo: (state, action: PayloadAction<PersonalInfo>) => {
            state.resumeData.personalInfo = action.payload;
            state.hasUnsavedChanges = true;
        },
        updateWorkExperience: (state, action: PayloadAction<WorkExperience[]>) => {
            state.resumeData.workExperience = action.payload;
            state.hasUnsavedChanges = true;
        },
        updateEducation: (state, action: PayloadAction<Education[]>) => {
            state.resumeData.education = action.payload;
            state.hasUnsavedChanges = true;
        },
        updateProjects: (state, action: PayloadAction<Project[]>) => {
            state.resumeData.projects = action.payload;
            state.hasUnsavedChanges = true;
        },
        updateSkills: (state, action: PayloadAction<Skill[]>) => {
            state.resumeData.skills = action.payload;
            state.hasUnsavedChanges = true;
        },
        updateCertifications: (state, action: PayloadAction<Certification[]>) => {
            state.resumeData.certifications = action.payload;
            state.hasUnsavedChanges = true;
        },
        updateCustomSections: (state, action: PayloadAction<CustomSection[]>) => {
            state.resumeData.customSections = action.payload;
            state.hasUnsavedChanges = true;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setSaving: (state, action: PayloadAction<boolean>) => {
            state.isSaving = action.payload;
        },
        setLastSaved: (state) => {
            state.lastSaved = new Date();
            state.hasUnsavedChanges = false;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        clearResume: (state) => {
            state.currentResumeId = null;
            state.title = 'Untitled Resume';
            state.resumeData = initialResumeData;
            state.targetRoles = [];
            state.hasUnsavedChanges = false;
            state.error = null;
        },
    },
});

export const {
    setCurrentResumeId,
    setTitle,
    setResumeData,
    setFullResume,
    setTargetRoles,
    updateResumeData,
    setPersonalInfo,
    updateWorkExperience,
    updateEducation,
    updateProjects,
    updateSkills,
    updateCertifications,
    updateCustomSections,
    setLoading,
    setSaving,
    setLastSaved,
    setError,
    clearResume,
} = resumeSlice.actions;

export default resumeSlice.reducer;

