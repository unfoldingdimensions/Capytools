import type { ResumeData, WorkExperience, Education, Project, Skill } from '@/types/resume.types';
import type { ParsedJobDescription } from '@/types/ai.types';
import * as aiWritingService from './aiWritingAssistant.service';
import * as sectionTailoringService from './sectionTailoring.service';
import { AIConfig } from './openai.service';


export interface GrammarCheckResult {
    originalText: string;
    correctedText: string;
    corrections: Array<{
        type: 'grammar' | 'spelling' | 'punctuation' | 'style';
        original: string;
        corrected: string;
        explanation: string;
    }>;
    hasErrors: boolean;
}

export interface BulletPointsResult {
    bulletPoints: string[];
    originalInput: string;
}

export interface ContentImprovementResult {
    improvedText: string;
    suggestions: string[];
}

/**
 * AI Service Facade
 * On client: Calls the backend API endpoints and handles BYOK configuration headers.
 * On server: Delegates directly to specialized AI services.
 */
export class AIService {

    /**
     * Helper to get headers with BYOK config (Client only)
     */
    private static getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (typeof window !== 'undefined') {
            const storedConfig = localStorage.getItem('ai-config');
            if (storedConfig) {
                try {
                    // Encode config in header to pass to backend safely
                    headers['x-ai-config'] = btoa(storedConfig);
                } catch (e) {
                    console.error('Failed to encode AI config', e);
                }
            }
        }

        return headers;
    }

    // --- Writing Assistant Methods ---

    static async checkGrammar(text: string, config?: AIConfig): Promise<GrammarCheckResult> {
        if (typeof window === 'undefined') {
            return aiWritingService.checkGrammar(text, config);
        }

        const response = await fetch('/api/ai/check-grammar', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ text }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to check grammar');
        return data.data;
    }

    static async generateBulletPoints(description: string, context: { role?: string; company?: string; count?: number } = {}, config?: AIConfig): Promise<BulletPointsResult> {
        if (typeof window === 'undefined') {
            return aiWritingService.generateBulletPoints(description, context, config);
        }

        const response = await fetch('/api/ai/generate-bullets', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ description, ...context }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to generate bullet points');
        return data.data;
    }

    static async improveContent(text: string, type: 'summary' | 'description' | 'objective' | 'general' = 'general', config?: AIConfig): Promise<ContentImprovementResult> {
        if (typeof window === 'undefined') {
            return aiWritingService.improveContent(text, type, config);
        }

        const response = await fetch('/api/ai/improve-content', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ text, type, mode: 'content' }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to improve content');
        return data.data;
    }

    static async improveBulletPoint(bulletPoint: string, context: { role?: string; focus?: string } = {}, config?: AIConfig): Promise<string> {
        if (typeof window === 'undefined') {
            return aiWritingService.improveBulletPoint(bulletPoint, context, config);
        }

        const response = await fetch('/api/ai/improve-content', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ text: bulletPoint, mode: 'bullet', role: context.role }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to improve bullet point');
        return data.data.improvedText;
    }

    static async enhanceResponsibilities(responsibilities: string[], context: { role?: string; company?: string } = {}, config?: AIConfig): Promise<string[]> {
        if (typeof window === 'undefined') {
            return aiWritingService.enhanceResponsibilities(responsibilities, context, config);
        }

        const response = await fetch('/api/ai/improve-content', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ responsibilities, mode: 'responsibilities', ...context }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to enhance responsibilities');
        return data.data.bulletPoints;
    }

    // --- Tailoring Methods ---

    static async generateTailoredSummary(resume: ResumeData, jobDescription: ParsedJobDescription, config?: AIConfig): Promise<string> {
        if (typeof window === 'undefined') {
            return sectionTailoringService.generateTailoredSummary(resume, jobDescription, config);
        }

        const response = await fetch('/api/ai/tailor-section', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ section: 'summary', resumeData: resume, jobDescription }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to generate tailored summary');
        return data.data.suggestions;
    }

    static async generateTailoredWorkExperience(
        workExperience: WorkExperience[] | WorkExperience,
        resume: ResumeData,
        jobDescription: ParsedJobDescription,
        config?: AIConfig
    ): Promise<{ achievements: string[]; tips: string[] }> {
        if (typeof window === 'undefined') {
            return sectionTailoringService.generateTailoredWorkExperience(workExperience, resume, jobDescription, config);
        }

        const response = await fetch('/api/ai/tailor-section', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ section: 'workExperience', sectionData: workExperience, resumeData: resume, jobDescription }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to generate tailored work experience');
        return data.data.suggestions;
    }

    static async generateTailoredEducation(education: Education[] | Education, jobDescription: ParsedJobDescription, config?: AIConfig): Promise<{ relevantPoints: string[]; tips: string[] }> {
        if (typeof window === 'undefined') {
            return sectionTailoringService.generateTailoredEducation(education, jobDescription, config);
        }

        const response = await fetch('/api/ai/tailor-section', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ section: 'education', sectionData: education, jobDescription }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to generate tailored education');
        return data.data.suggestions;
    }

    static async generateTailoredProjects(projects: Project[] | Project, jobDescription: ParsedJobDescription, config?: AIConfig): Promise<{ highlights: string[]; tips: string[] }> {
        if (typeof window === 'undefined') {
            return sectionTailoringService.generateTailoredProjects(projects, jobDescription, config);
        }

        const response = await fetch('/api/ai/tailor-section', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ section: 'projects', sectionData: projects, jobDescription }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to generate tailored projects');
        return data.data.suggestions;
    }

    static async generateTailoredSkills(skills: Skill[], jobDescription: ParsedJobDescription, config?: AIConfig): Promise<{ suggestedSkills: string[]; tips: string[] }> {
        if (typeof window === 'undefined') {
            return sectionTailoringService.generateTailoredSkills(skills, jobDescription, config);
        }

        const response = await fetch('/api/ai/tailor-section', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ section: 'skills', sectionData: skills, jobDescription }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to generate tailored skills');
        return data.data.suggestions;
    }
}
