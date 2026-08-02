import { cleanAIResponse } from '@/lib/utils/aiTextCleanup';

describe('cleanAIResponse', () => {
    it('should pass through clean text unchanged', () => {
        const text = 'Experienced software engineer with 8 years of experience.';
        expect(cleanAIResponse(text)).toBe(text);
    });

    it('should strip common preambles', () => {
        expect(cleanAIResponse('Here is a professional summary: Led teams...')).toBe('Led teams...');
        expect(cleanAIResponse('Here are the bullet points: ["a"]')).toBe('["a"]');
        expect(cleanAIResponse('Sure! Here is a summary: Managed...')).toBe('Managed...');
    });

    it('should strip trailing explanatory notes', () => {
        expect(cleanAIResponse('Led teams.\n\nLet me know if you need changes!')).toBe('Led teams.');
    });
});
