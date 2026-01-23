import { NextApiRequest } from 'next';
import { AIConfig } from './services/openai.service';

/**
 * Extracts AI configuration from the request headers (x-ai-config).
 * The header should contain a base64 encoded JSON string.
 */
export function getAIConfigFromRequest(req: NextApiRequest): AIConfig | undefined {
    const headerValue = req.headers['x-ai-config'];

    if (!headerValue || Array.isArray(headerValue)) {
        return undefined;
    }

    try {
        // Decode base64
        const jsonString = Buffer.from(headerValue, 'base64').toString('utf-8');
        const config = JSON.parse(jsonString) as AIConfig;

        // Basic validation
        if (config.apiKey && typeof config.apiKey === 'string') {
            return {
                apiKey: config.apiKey,
                baseURL: config.baseURL,
                model: config.model
            };
        }

        return undefined;
    } catch (error) {
        console.warn('Failed to parse x-ai-config header:', error);
        return undefined;
    }
}
