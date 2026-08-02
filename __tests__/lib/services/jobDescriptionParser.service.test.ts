import { buildParsedJobDescription, inferExperienceLevel } from '@/lib/services/jobDescriptionParser.service';

// Avoid loading the real openai/gemini clients in the test environment.
// buildParsedJobDescription and inferExperienceLevel are pure and don't use them.
jest.mock('@/lib/services/openai.service', () => ({
    createJSONCompletion: jest.fn(),
    getDefaultModel: jest.fn(() => 'gpt-4'),
}));

describe('buildParsedJobDescription', () => {
    const baseInput = {
        title: 'Innovative Solutions - Senior Software Engineer',
        company: 'Innovative Solutions',
        description: 'We are looking for a Senior Software Engineer with 10+ years of experience.',
        requirements: ['5+ years in software development', 'Experience with AWS'],
        responsibilities: [],
        keywords: ['React', 'Node.js', 'AWS'],
    };

    it('should fall back to inferring experience level when not persisted', () => {
        const parsed = buildParsedJobDescription({ ...baseInput, experienceLevel: null, employmentType: null });

        expect(parsed.experienceLevel).toBe('senior');
    });

    it('should preserve a persisted experience level', () => {
        const parsed = buildParsedJobDescription({ ...baseInput, experienceLevel: 'mid', employmentType: 'full-time' });

        expect(parsed.experienceLevel).toBe('mid');
        expect(parsed.employmentType).toBe('full-time');
    });

    it('should map keywords into both skills and keywords', () => {
        const parsed = buildParsedJobDescription({ ...baseInput, experienceLevel: undefined });

        expect(parsed.skills).toEqual(baseInput.keywords);
        expect(parsed.keywords).toEqual(baseInput.keywords);
    });

    it('inferExperienceLevel should default unknown descriptions to mid', () => {
        expect(inferExperienceLevel('We build software solutions for retail clients.')).toBe('mid');
    });
});
