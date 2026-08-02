import { GoogleGenAI, GenerateContentConfig } from '@google/genai';
import type { OpenAIMessage } from '@/types/ai.types';
import { parseJsonFromText } from '@/lib/utils/jsonExtraction';

/**
 * Gemini Service Configuration
 */
export interface GeminiConfig {
    apiKey: string;
    model?: string;
}

/**
 * Gemini Service - Google AI Integration
 * 
 * Provides a unified interface for Gemini API calls that mirrors
 * the OpenAI service interface for easy swapping.
 */

// Cache for Gemini clients by API key
const clientCache = new Map<string, GoogleGenAI>();

/**
 * Gets or creates a Gemini client instance
 */
export function getGeminiClient(apiKey: string): GoogleGenAI {
    if (!apiKey) {
        throw new Error('Gemini API key is required');
    }

    // Check cache first
    if (clientCache.has(apiKey)) {
        return clientCache.get(apiKey)!;
    }

    // Create new client
    const client = new GoogleGenAI({ apiKey });
    clientCache.set(apiKey, client);
    return client;
}

/**
 * Gets the default Gemini model
 */
export function getDefaultGeminiModel(): string {
    return 'gemini-2.0-flash';
}

/**
 * Converts OpenAI-style messages to Gemini format
 */
function convertMessagesToGeminiFormat(messages: OpenAIMessage[]): {
    systemInstruction?: string;
    contents: string;
} {
    let systemInstruction: string | undefined;
    const contentParts: string[] = [];

    for (const message of messages) {
        if (message.role === 'system') {
            // Gemini uses systemInstruction for system messages
            systemInstruction = message.content;
        } else if (message.role === 'user') {
            contentParts.push(message.content);
        } else if (message.role === 'assistant') {
            contentParts.push(`Assistant: ${message.content}`);
        }
    }

    return {
        systemInstruction,
        contents: contentParts.join('\n\n'),
    };
}

/**
 * Makes a completion request to Gemini API
 */
export async function createGeminiCompletion(
    messages: OpenAIMessage[],
    options: {
        apiKey: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
    }
): Promise<string> {
    if (!messages || messages.length === 0) {
        throw new Error('Cannot create completion: messages array is empty');
    }

    const {
        apiKey,
        model = getDefaultGeminiModel(),
        temperature = 0.7,
        maxTokens = 2000,
    } = options;

    try {
        const client = getGeminiClient(apiKey);
        const { systemInstruction, contents } = convertMessagesToGeminiFormat(messages);

        const config: GenerateContentConfig = {
            temperature,
            maxOutputTokens: maxTokens,
        };

        if (systemInstruction) {
            config.systemInstruction = systemInstruction;
        }

        const response = await client.models.generateContent({
            model,
            contents,
            config,
        });

        const content = response.text;

        if (!content) {
            throw new Error('Gemini returned no content');
        }

        if (content.trim().length === 0) {
            throw new Error('Gemini returned an empty response');
        }

        // Log usage for monitoring
        console.log('Gemini API Usage:', {
            model,
            responseLength: content.length,
        });

        return content;
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error(
            `Gemini completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Creates a JSON completion request for Gemini (for structured data)
 */
export async function createGeminiJSONCompletion<T>(
    messages: OpenAIMessage[],
    options: {
        apiKey: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
    }
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

    const content = await createGeminiCompletion(finalMessages, options);

    try {
        return parseJsonFromText<T>(content);
    } catch (parseError) {
        throw new Error(
            `Failed to parse Gemini JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. ` +
            `Raw content length: ${content.length} characters. ` +
            `Content preview: ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`
        );
    }
}

/**
 * Validates a Gemini API key by making a minimal test request
 */
export async function validateGeminiAPIKey(apiKey: string): Promise<boolean> {
    try {
        const client = getGeminiClient(apiKey);
        
        // Make a minimal test request
        await client.models.generateContent({
            model: getDefaultGeminiModel(),
            contents: 'test',
            config: {
                maxOutputTokens: 5,
            },
        });

        return true;
    } catch (error) {
        console.error('Gemini API key validation failed:', error);
        return false;
    }
}
