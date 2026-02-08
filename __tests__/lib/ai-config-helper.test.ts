import { NextApiRequest } from 'next';
import { getAIConfigFromRequest } from '@/lib/ai-config-helper';
import { AIConfig } from '@/lib/services/openai.service';

describe('AI Config Helper', () => {
    describe('getAIConfigFromRequest', () => {
        it('should return undefined if x-ai-config header is missing', () => {
            const req = {
                headers: {},
            } as NextApiRequest;

            const config = getAIConfigFromRequest(req);
            expect(config).toBeUndefined();
        });

        it('should return undefined if x-ai-config header is an array', () => {
            const req = {
                headers: {
                    'x-ai-config': ['some-value'],
                },
            } as unknown as NextApiRequest;

            const config = getAIConfigFromRequest(req);
            expect(config).toBeUndefined();
        });

        it('should return config if x-ai-config header is valid base64 json', () => {
            const validConfig: AIConfig = {
                apiKey: 'test-api-key',
                baseURL: 'https://api.example.com',
                model: 'gpt-4',
            };
            const base64Config = Buffer.from(JSON.stringify(validConfig)).toString('base64');
            const req = {
                headers: {
                    'x-ai-config': base64Config,
                },
            } as NextApiRequest;

            const config = getAIConfigFromRequest(req);
            expect(config).toEqual(validConfig);
        });

        it('should return undefined if x-ai-config header is invalid base64', () => {
             const req = {
                headers: {
                    'x-ai-config': 'invalid-base64',
                },
            } as NextApiRequest;

            const config = getAIConfigFromRequest(req);
             // JSON.parse might fail or return unexpected results, but the function should handle it or return undefined if validation fails
             // In the implementation, if JSON.parse throws, it returns undefined.
            expect(config).toBeUndefined();
        });

        it('should return undefined if parsed config is missing apiKey', () => {
            const invalidConfig = {
                baseURL: 'https://api.example.com',
                model: 'gpt-4',
            };
            const base64Config = Buffer.from(JSON.stringify(invalidConfig)).toString('base64');
            const req = {
                headers: {
                    'x-ai-config': base64Config,
                },
            } as NextApiRequest;

            const config = getAIConfigFromRequest(req);
            expect(config).toBeUndefined();
        });

        it('should return undefined if apiKey is not a string', () => {
            const invalidConfig = {
                apiKey: 123,
                baseURL: 'https://api.example.com',
                model: 'gpt-4',
            };
            const base64Config = Buffer.from(JSON.stringify(invalidConfig)).toString('base64');
            const req = {
                headers: {
                    'x-ai-config': base64Config,
                },
            } as NextApiRequest;

            const config = getAIConfigFromRequest(req);
            expect(config).toBeUndefined();
        });
    });
});
