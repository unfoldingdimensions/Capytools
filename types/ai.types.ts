/**
 * Phase 2: AI-Powered Features Types
 * 
 * All types for AI resume customization, ATS scoring, and interview questions
 */

import { ResumeData } from './resume.types';

// ==================== Job Description Types ====================

export interface JobDescription {
    id: string;
    userId: string;
    title: string;
    company: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    keywords: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface JobDescriptionInput {
    title: string;
    company: string;
    description: string;
    url?: string;
}

export interface ParsedJobDescription {
    title: string;
    company: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    skills: string[];
    keywords: string[];
    experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead';
    employmentType?: 'full-time' | 'part-time' | 'contract' | 'internship';
}

// ==================== AI Resume Tailoring Types ====================

export interface ResumeTailoringRequest {
    resumeId: string;
    jobDescriptionId: string;
    focusAreas?: string[];
    tone?: 'professional' | 'casual' | 'technical';
}

export interface TailoredResume {
    id: string;
    originalResumeId: string;
    jobDescriptionId: string;
    tailoredData: ResumeData;
    changes: ResumeChange[];
    aiSuggestions: string[];
    atsScore: number;
    createdAt: Date;
}

export interface ResumeChange {
    section: string;
    field: string;
    original: string;
    tailored: string;
    reason: string;
}

export interface AITailoringResponse {
    tailoredResume: ResumeData;
    changes: ResumeChange[];
    suggestions: string[];
    matchScore: number; // 0-100
    reasoning: string;
}

// Service layer tailored resume result
export interface TailoredResumeResult {
    originalResume: ResumeData;
    tailoredSummary: string;
    optimizedExperience: Array<{
        position: string;
        company: string;
        optimizedAchievements: string[];
    }>;
    suggestedSkills: string[];
    customizations: string[];
}

// ==================== ATS Scoring Types ====================

export interface ATSScore {
    id: string;
    resumeId: string;
    overallScore: number; // 0-100
    categoryScores: ATSCategoryScores;
    issues: ATSIssue[];
    improvements: ATSImprovement[];
    keywords: KeywordAnalysis;
    createdAt: Date;
}

export interface ATSCategoryScores {
    formatting: number; // 0-100
    keywords: number; // 0-100
    experience: number; // 0-100
    education: number; // 0-100
    skills: number; // 0-100
    clarity: number; // 0-100
}

export interface ATSIssue {
    category: 'critical' | 'warning' | 'suggestion';
    title: string;
    description: string;
    impact: number; // -1 to -100 points
    fix: string;
}

export interface ATSImprovement {
    title: string;
    description: string;
    impact: number; // +1 to +100 points
    priority: 'high' | 'medium' | 'low';
    actionable: string;
}

export interface KeywordAnalysis {
    found: string[];
    missing: string[];
    frequency: Record<string, number>;
    relevanceScore: number; // 0-100
    suggestions: string[];
}

// ==================== Interview Questions Types ====================

export interface InterviewQuestion {
    id?: string;
    category: InterviewQuestionCategory | 'experience-based';
    difficulty: 'easy' | 'medium' | 'hard';
    question: string;
    suggestedAnswer?: string; // Alias for idealAnswer
    idealAnswer?: string;
    tips?: string[];
    keyPoints?: string[]; // Alias for tips
    keywords?: string[];
}

// Simplified ATS scoring result for service layer
export interface ATSScoreResult {
    overallScore: number;
    categoryScores: {
        keywords: number;
        skills: number;
        experience: number;
        formatting: number;
    };
    suggestions: string[];
    missingKeywords: string[];
    matchedRequirements: number;
    analysisDate: Date;
}

export type InterviewQuestionCategory =
    | 'behavioral'
    | 'technical'
    | 'situational'
    | 'role-specific'
    | 'company-culture';

export interface InterviewQuestionsResponse {
    questions: InterviewQuestion[];
    preparationTips: string[];
    focusAreas: string[];
    estimatedDifficulty: 'easy' | 'medium' | 'hard';
}

export interface InterviewPracticeSession {
    id: string;
    userId: string;
    resumeId: string;
    jobDescriptionId?: string;
    questions: InterviewQuestion[];
    answers?: Record<string, string>;
    feedback?: Record<string, string>;
    createdAt: Date;
    completedAt?: Date;
}

// ==================== AI Service Types ====================

export interface OpenAIRequest {
    model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
    messages: OpenAIMessage[];
    temperature?: number;
    maxTokens?: number;
    topP?: number;
}

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OpenAIResponse {
    id: string;
    choices: Array<{
        message: OpenAIMessage;
        finishReason: string;
    }>;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

// ==================== Feature Access Control Types ====================

export interface FeatureAccess {
    feature: PremiumFeature;
    hasAccess: boolean;
    reason?: string;
    requiredTier?: string;
    requiredCredits?: number;
}

export type PremiumFeature =
    | 'ai_resume_tailoring'
    | 'ats_scoring'
    | 'interview_questions'
    | 'unlimited_exports'
    | 'custom_templates';

export interface FeatureGate {
    feature: PremiumFeature;
    checkAccess: (userId: string) => Promise<FeatureAccess>;
}

// ==================== Job Processing Types ====================

export interface JobQueueTask {
    id: string;
    type: 'resume_tailoring' | 'ats_scoring' | 'interview_generation';
    userId: string;
    payload: Record<string, unknown>;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number; // 0-100
    result?: Record<string, unknown>;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    retryCount: number;
}

// ==================== API Request/Response Types ====================

export interface TailorResumeRequest {
    resumeId: string;
    jobDescription: JobDescriptionInput;
    options?: {
        focusAreas?: string[];
        tone?: 'professional' | 'casual' | 'technical';
        async?: boolean;
    };
}

export interface TailorResumeResponse {
    jobId?: string; // If async
    tailoredResume?: TailoredResume; // If sync
    message: string;
}

export interface ATSScoringRequest {
    resumeId: string;
    jobDescriptionId?: string;
    async?: boolean;
}

export interface ATSScoringResponse {
    jobId?: string; // If async
    score?: ATSScore; // If sync
    message: string;
}

export interface GenerateInterviewQuestionsRequest {
    resumeId: string;
    jobDescriptionId?: string;
    count?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    categories?: InterviewQuestionCategory[];
}

export interface GenerateInterviewQuestionsResponse {
    sessionId: string;
    questions: InterviewQuestion[];
    preparationTips: string[];
}

