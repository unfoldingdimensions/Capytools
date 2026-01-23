import OpenAI from 'openai';
import type { OpenAIMessage } from '@/types/ai.types';

/**
 * Configuration for AI Service (BYOK support)
 */
export interface AIConfig {
    apiKey?: string;
    baseURL?: string;
    model?: string;
}

/**
 * OpenAI Service - GPT-4 Integration
 * 
 * CRITICAL: Fail-loud error handling for all AI operations
 * All API calls must include detailed error context
 */

// Singleton for server-side usage with env vars
let defaultOpenAIClient: OpenAI | null = null;

/**
 * Gets or creates OpenAI client instance
 * Supports both OpenAI and NVIDIA NIM APIs, and BYOK dynamic config
 */
export function getOpenAIClient(config?: AIConfig): OpenAI {
    // 1. Use provided config (BYOK) if available
    if (config?.apiKey) {
        return new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL || undefined, // Optional custom base URL
            dangerouslyAllowBrowser: true, // Allow client-side usage if needed (though we recommend server-side proxy)
            timeout: 60000,
            maxRetries: 2,
        });
    }

    // 2. Fallback to Environment Variables (Server default)
    const openaiKey = process.env.OPENAI_API_KEY;
    const nvidiaKey = process.env.NVIDIA_API_KEY; // Legacy support
    const envBaseURL = process.env.OPENAI_BASE_URL;

    // If OPENAI_BASE_URL is set (indicating NVIDIA NIM or custom endpoint),
    // prioritize NVIDIA_API_KEY. Otherwise, use OPENAI_API_KEY.
    const apiKey = envBaseURL
        ? (nvidiaKey || openaiKey)
        : (openaiKey || nvidiaKey);

    if (!apiKey) {
        throw new Error(
            'No API Key provided. Please set OPENAI_API_KEY/NVIDIA_API_KEY in environment or provide a custom key via settings.'
        );
    }

    // Return cached default client if exists
    if (defaultOpenAIClient) return defaultOpenAIClient;

    // Create new default client
    defaultOpenAIClient = new OpenAI({
        apiKey,
        baseURL: envBaseURL || undefined,
        timeout: 60000,
        maxRetries: 2,
    });

    return defaultOpenAIClient;
}

/**
 * Gets the default AI model from environment or uses fallback
 */
export function getDefaultModel(config?: AIConfig): string {
    return config?.model || process.env.AI_MODEL || 'gpt-4-turbo';
}

/**
 * Makes a completion request to OpenAI/NVIDIA NIM/Custom Provider
 */
export async function createCompletion(
    messages: OpenAIMessage[],
    options: {
        model?: string; // Allow any model string for flexibility
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        config?: AIConfig; // BYOK Config
    } = {}
): Promise<string> {
    if (!messages || messages.length === 0) {
        throw new Error('Cannot create completion: messages array is empty');
    }

    const {
        temperature = 0.7,
        maxTokens = 2000,
        topP = 1,
        config
    } = options;

    // Resolve model: Option override -> Config override -> Env Default -> Fallback
    const model = options.model || getDefaultModel(config);

    try {
        const client = getOpenAIClient(config);

        const completion = await client.chat.completions.create({
            model,
            messages: messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
            temperature,
            max_tokens: maxTokens,
            top_p: topP,
        });

        const choice = completion.choices[0];
        const content = choice?.message?.content;
        const finishReason = choice?.finish_reason;

        if (content === null || content === undefined) {
            throw new Error(
                'AI Provider returned no content message. ' +
                `Finish reason: ${finishReason || 'unknown'}`
            );
        }

        if (content.trim().length === 0) {
            // Some providers return empty string if they hit a limit or filter immediately
            if (finishReason === 'length') {
                throw new Error(
                    'AI response was truncated before any content could be generated. ' +
                    'The input may be too long or the maxTokens limit is too low for this provider.'
                );
            }
            throw new Error(
                'AI Provider returned an empty string. ' +
                `Finish reason: ${finishReason || 'unknown'}`
            );
        }

        // Log token usage for monitoring
        console.log('AI API Usage:', {
            provider: config?.baseURL ? 'Custom/BYOK' : 'Default',
            model,
            promptTokens: completion.usage?.prompt_tokens,
            completionTokens: completion.usage?.completion_tokens,
            totalTokens: completion.usage?.total_tokens,
            finishReason
        });

        return content;
    } catch (error) {
        if (error instanceof OpenAI.APIError) {
            console.error('AI API Error:', error);
            throw new Error(
                `AI Provider Error: ${error.message}. ` +
                `Status: ${error.status}. ` +
                `Model: ${model}`
            );
        }

        throw new Error(
            `AI completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Creates a JSON completion request (for structured data)
 */
export async function createJSONCompletion<T>(
    messages: OpenAIMessage[],
    options: {
        model?: string; // Allow any model string for flexibility
        temperature?: number;
        maxTokens?: number;
        config?: AIConfig;
    } = {}
): Promise<T> {
    const jsonInstruction = 'You must respond with valid JSON only. No markdown, no explanations, just JSON.';
    const finalMessages = [...messages];

    // Find the first system message to merge into, or prepend if none exists
    const systemIndex = finalMessages.findIndex(m => m.role === 'system');
    if (systemIndex !== -1) {
        const existingSystem = finalMessages[systemIndex] as OpenAIMessage;
        finalMessages[systemIndex] = {
            role: 'system',
            content: `${existingSystem.content}\n\nIMPORTANT: ${jsonInstruction}`
        };
    } else {
        finalMessages.unshift({
            role: 'system',
            content: jsonInstruction
        });
    }

    const content = await createCompletion(finalMessages, options);

    try {
        // Robust JSON extraction from common AI formatting
        let jsonStr = content.trim();

        // 1. Remove markdown code blocks
        if (jsonStr.includes('```')) {
            const matches = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (matches && matches[1]) {
                jsonStr = matches[1].trim();
            } else {
                jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            }
        }

        // 2. Extra safety: Find the first { or [ and the matching last or ]
        const firstBrace = jsonStr.indexOf('{');
        const firstBracket = jsonStr.indexOf('[');
        const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;

        if (start === -1) {
            throw new Error('No JSON structures ( { or [ ) found in response');
        }

        const lastBrace = jsonStr.lastIndexOf('}');
        const lastBracket = jsonStr.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);

        if (end === -1 || end < start) {
            throw new Error('Incomplete JSON structure in response');
        }

        const exactJson = jsonStr.substring(start, end + 1);
        return JSON.parse(exactJson) as T;
    } catch (parseError) {
        throw new Error(
            `Failed to parse AI JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. ` +
            `Raw content length: ${content.length} characters. ` +
            `Content preview: ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`
        );
    }
}

/**
 * Validates OpenAI API key
 */
export async function validateAPIKey(config?: AIConfig): Promise<boolean> {
    try {
        const client = getOpenAIClient(config);
        const model = getDefaultModel(config);

        // Make a minimal test request
        await client.chat.completions.create({
            model,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 5,
        });

        return true;
    } catch (error) {
        console.error('OpenAI API key validation failed:', error);
        return false;
    }
}

/**
 * Estimates token count for text (approximate)
 */
export function estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
}

/**
 * Truncates text to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
    const estimatedTokens = estimateTokenCount(text);

    if (estimatedTokens <= maxTokens) {
        return text;
    }

    // Calculate characters to keep
    const charsToKeep = maxTokens * 4;
    return text.substring(0, charsToKeep) + '...';
}

