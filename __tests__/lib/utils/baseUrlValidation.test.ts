import { validateBaseURL } from '@/lib/utils/baseUrlValidation';

describe('validateBaseURL', () => {
    it('should return undefined for missing or empty base URL', () => {
        expect(validateBaseURL(undefined)).toBeUndefined();
        expect(validateBaseURL('')).toBeUndefined();
    });

    it('should pass through the Gemini routing marker', () => {
        expect(validateBaseURL('gemini')).toBe('gemini');
    });

    it('should accept known provider HTTPS endpoints', () => {
        expect(validateBaseURL('https://api.openai.com/v1')).toBe('https://api.openai.com/v1');
        expect(validateBaseURL('https://openrouter.ai/api/v1')).toBe('https://openrouter.ai/api/v1');
        expect(validateBaseURL('https://api.z.ai/api/paas/v4/')).toBe('https://api.z.ai/api/paas/v4/');
    });

    it('should reject non-URL values that are not the gemini marker', () => {
        expect(() => validateBaseURL('not-a-url')).toThrow(/HTTPS URL or the "gemini" marker/);
    });

    it('should reject credentials embedded in the URL', () => {
        expect(() => validateBaseURL('https://user:pass@api.openai.com/v1')).toThrow(/must not contain credentials/);
    });

    it('should reject IP literal hosts (cloud metadata / internal SSRF targets)', () => {
        expect(() => validateBaseURL('https://169.254.169.254/latest/meta-data')).toThrow(/hostname, not an IP address/);
        expect(() => validateBaseURL('https://10.0.0.5/v1')).toThrow(/hostname, not an IP address/);
        expect(() => validateBaseURL('https://192.168.1.10/v1')).toThrow(/hostname, not an IP address/);
    });

    it('should reject DNS-rebinding hostname services', () => {
        expect(() => validateBaseURL('https://127.0.0.1.nip.io/v1')).toThrow(/host is not allowed/);
        expect(() => validateBaseURL('https://10.0.0.5.sslip.io/v1')).toThrow(/host is not allowed/);
    });

    it('should reject non-HTTPS endpoints outside loopback', () => {
        expect(() => validateBaseURL('http://api.openai.com/v1')).toThrow(/must use HTTPS/);
    });

    it('should allow loopback in development for local proxies', () => {
        const env = process.env as Record<string, string | undefined>;
        const original = env.NODE_ENV;
        env.NODE_ENV = 'development';
        try {
            expect(validateBaseURL('http://localhost:11434/v1')).toBe('http://localhost:11434/v1');
            expect(validateBaseURL('https://127.0.0.1/v1')).toBe('https://127.0.0.1/v1');
        } finally {
            env.NODE_ENV = original;
        }
    });

    it('should block loopback in production', () => {
        const env = process.env as Record<string, string | undefined>;
        const original = env.NODE_ENV;
        env.NODE_ENV = 'production';
        try {
            expect(() => validateBaseURL('http://localhost:11434/v1')).toThrow(/must not point to localhost/);
            expect(() => validateBaseURL('https://127.0.0.1/v1')).toThrow(/must not point to localhost/);
        } finally {
            env.NODE_ENV = original;
        }
    });

    it('should reject IPv6 literal hosts', () => {
        expect(() => validateBaseURL('https://[2001:db8::1]/v1')).toThrow(/hostname, not an IP address/);
    });
});
