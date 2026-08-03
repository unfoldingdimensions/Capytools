import * as aiWritingService from './aiWritingAssistant.service';
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

    static async generateBulletPoints(description: string, context: { role?: string; company?: string; count?: number; targetRoles?: string[] } = {}, config?: AIConfig): Promise<BulletPointsResult> {
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

    static async improveContent(text: string, type: 'summary' | 'description' | 'objective' | 'general' = 'general', config?: AIConfig, targetRoles?: string[]): Promise<ContentImprovementResult> {
        if (typeof window === 'undefined') {
            return aiWritingService.improveContent(text, type, config, targetRoles);
        }

        const response = await fetch('/api/ai/improve-content', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ text, type, mode: 'content', targetRoles }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to improve content');
        return data.data;
    }

    static async improveBulletPoint(bulletPoint: string, context: { role?: string; focus?: string; targetRoles?: string[] } = {}, config?: AIConfig): Promise<string> {
        if (typeof window === 'undefined') {
            return aiWritingService.improveBulletPoint(bulletPoint, context, config);
        }

        const response = await fetch('/api/ai/improve-content', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ text: bulletPoint, mode: 'bullet', role: context.role, focus: context.focus, targetRoles: context.targetRoles }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to improve bullet point');
        return data.data.improvedText;
    }

    static async enhanceResponsibilities(responsibilities: string[], context: { role?: string; company?: string; targetRoles?: string[] } = {}, config?: AIConfig): Promise<string[]> {
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
}
