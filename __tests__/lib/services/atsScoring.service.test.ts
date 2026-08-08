import { scoreResumeAgainstJob } from '@/lib/services/atsScoring.service';
import { createCompletion } from '@/lib/services/openai.service';
import { ResumeData } from '@/types/resume.types';
import { ParsedJobDescription } from '@/types/ai.types';

// Mock openai.service
jest.mock('@/lib/services/openai.service', () => ({
    createCompletion: jest.fn(),
    getDefaultModel: jest.fn(() => 'gpt-4'),
}));

describe('ATS Scoring Service', () => {
    const mockResume: ResumeData = {
        personalInfo: {
            fullName: 'John Doe',
            email: 'john@example.com',
            summary: 'Experienced Software Engineer with a focus on React and Node.js.',
            phone: '123-456-7890',
            location: 'New York, NY',
        },
        workExperience: [
            {
                id: '1',
                company: 'Tech Corp',
                position: 'Software Engineer',
                startDate: '2020-01-01',
                endDate: '2023-01-01',
                current: false,
                description: 'Developed web applications using React and TypeScript.',
                achievements: ['Improved performance by 50%', 'Led a team of 5 developers'],
            },
        ],
        education: [
            {
                id: '1',
                institution: 'University of Technology',
                degree: 'Bachelor of Science',
                field: 'Computer Science',
                startDate: '2016-09-01',
                endDate: '2020-05-01',
                current: false,
                achievements: [],
            },
        ],
        skills: [
            {
                id: '1',
                category: 'Programming Languages',
                skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
            },
        ],
        projects: [],
        certifications: [],
        customSections: [],
    };

    const mockJobDescription: ParsedJobDescription = {
        title: 'Senior Software Engineer',
        company: 'Innovative Solutions',
        description: 'We are looking for a Senior Software Engineer to join our team.',
        requirements: [
            '5+ years of experience in software development',
            'Strong knowledge of React and Node.js',
            'Experience with cloud platforms like AWS',
        ],
        responsibilities: [],
        skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
        keywords: ['React', 'Node.js', 'TypeScript', 'AWS', 'CI/CD'],
        experienceLevel: 'senior',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createCompletion as jest.Mock).mockResolvedValue(JSON.stringify(['Add more keywords', 'Highlight leadership experience']));
    });

    it('should calculate ATS score correctly', async () => {
        const result = await scoreResumeAgainstJob(mockResume, mockJobDescription);

        expect(result).toBeDefined();
        expect(result.overallScore).toBeGreaterThan(0);
        expect(result.categoryScores).toBeDefined();
        expect(result.suggestions).toEqual(['Add more keywords', 'Highlight leadership experience']);
        expect(result.missingKeywords).toBeDefined();
        expect(result.matchedRequirements).toBeDefined();
    });

    it('should throw error if resume is missing personal info', async () => {
        const invalidResume = { ...mockResume, personalInfo: {} } as ResumeData;
        await expect(scoreResumeAgainstJob(invalidResume, mockJobDescription)).rejects.toThrow('Resume missing personal information');
    });

    it('should throw error if job description is missing requirements', async () => {
        const invalidJobDescription = { ...mockJobDescription, requirements: [] };
        await expect(scoreResumeAgainstJob(mockResume, invalidJobDescription)).rejects.toThrow('Job description missing requirements');
    });

    it('should handle keyword matching correctly', async () => {
        // Resume has React, Node.js, TypeScript. Missing AWS, CI/CD.
        // Keywords are React, Node.js, TypeScript, AWS, CI/CD.
        // 3/5 match = 60%

        const result = await scoreResumeAgainstJob(mockResume, mockJobDescription);

        // Check missing keywords
        expect(result.missingKeywords).toContain('AWS');
        expect(result.missingKeywords).toContain('CI/CD');
        expect(result.missingKeywords).not.toContain('React');
    });

    it('should handle skills matching correctly', async () => {
        // Resume skills: JavaScript, TypeScript, React, Node.js, Python
        // Job skills: React, Node.js, TypeScript, AWS
        // Matches: React, Node.js, TypeScript. Missing: AWS.
        // 3/4 match = 75%

        const result = await scoreResumeAgainstJob(mockResume, mockJobDescription);

        expect(result.categoryScores.skills).toBe(75);
    });

    it('should handle experience match correctly', async () => {
         // Experience level is senior (5+ years).
         // Resume has 3 years (2020-2023).
         // Should score lower for senior role.

         const result = await scoreResumeAgainstJob(mockResume, mockJobDescription);

         // Logic: if senior and years >= 5 -> 90, if >= 4 -> 65, else 30.
         // 3 years < 4, so score should be 30.
         expect(result.categoryScores.experience).toBe(30);
    });

    it('should not produce NaN experience scores for missing or invalid dates', async () => {
        // Real resumes frequently contain entries without a start date.
        const missingDateResume = {
            ...mockResume,
            workExperience: [
                {
                    id: '1',
                    company: 'Tech Corp',
                    position: 'Software Engineer',
                    startDate: '',
                    endDate: '',
                    current: false,
                    description: '',
                    achievements: [],
                },
            ],
        };

        const result = await scoreResumeAgainstJob(missingDateResume, mockJobDescription);

        expect(Number.isNaN(result.categoryScores.experience)).toBe(false);
        expect(Number.isNaN(result.overallScore)).toBe(false);
        // No valid dates -> 0 years experience -> below senior threshold.
        expect(result.categoryScores.experience).toBe(30);
    });

    it('should handle formatting score correctly', async () => {
        // Resume has all essential sections.
        // Score starts at 100.
        // Has summary (+10 points implicitly via "Has professional summary" check logic in code?)
        // Let's re-read the code for formatting score.
        // It checks essential sections.
        // If missing full name -20, email -20, work exp -20, skills -15, education -10.
        // Positive checks: summary, certifications.
        // The implementation doesn't seem to ADD points, just subtracts?
        // Wait, "Positive checks" section in calculateFormattingScore:
        // if (resume.personalInfo?.summary) details.push('Has professional summary');
        // It doesn't modify score for positive checks in the code I read earlier?

        // Let's check the code again.

        /*
        function calculateFormattingScore(resume: ResumeData): { score: number; details: string[] } {
            const details: string[] = [];
            let score = 100;

            // Check for essential sections
            if (!resume.personalInfo?.fullName) {
                score -= 20;
                details.push('Missing full name');
            }
            ...
             // Positive checks
            if (resume.personalInfo?.summary) {
                details.push('Has professional summary');
            }
            ...
            return { score: Math.max(0, score), details };
        }
        */

       // So it starts at 100 and subtracts.

       const result = await scoreResumeAgainstJob(mockResume, mockJobDescription);
       expect(result.categoryScores.formatting).toBe(100);
    });

     it('should handle formatting score correctly when sections are missing', async () => {
        const incompleteResume = {
            ...mockResume,
            education: [], // Missing education -10
        };

        const result = await scoreResumeAgainstJob(incompleteResume, mockJobDescription);
        expect(result.categoryScores.formatting).toBe(90);
    });

    it('should use fallback suggestions if AI fails', async () => {
        (createCompletion as jest.Mock).mockRejectedValue(new Error('AI Error'));

        const result = await scoreResumeAgainstJob(mockResume, mockJobDescription);

        expect(result.suggestions).toBeDefined();
        expect(result.suggestions.length).toBeGreaterThan(0);
        // Fallback suggestions usually include "Tailor your professional summary..."
        expect(result.suggestions).toContain('Tailor your professional summary to match the job requirements');
    });
});
