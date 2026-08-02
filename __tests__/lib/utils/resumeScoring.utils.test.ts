import { calculateFormattingScore } from '@/lib/utils/resumeScoring.utils';
import { ResumeData } from '@/types/resume.types';

describe('calculateFormattingScore', () => {
    const mockResumeData: ResumeData = {
        personalInfo: {
            fullName: 'John Doe',
            email: 'john@example.com',
            phone: '123-456-7890',
            location: 'New York, NY',
            linkedin: 'linkedin.com/in/johndoe',
            summary: 'Experienced software engineer with a strong background in developing scalable web applications using React and Node.js. Passionate about solving complex problems and delivering high-quality code.'
        },
        workExperience: [
            {
                id: '1',
                company: 'Tech Corp',
                position: 'Senior Engineer',
                startDate: '2020-01-01',
                endDate: '2023-01-01',
                current: false,
                description: 'Working on core products',
                achievements: ['Led a team of 5', 'Improved performance by 20%']
            }
        ],
        education: [
            {
                id: '1',
                institution: 'MIT',
                degree: 'Bachelor of Science',
                field: 'Computer Science',
                startDate: '2016-09-01',
                endDate: '2020-05-01',
                current: false,
                achievements: []
            }
        ],
        projects: [],
        skills: [
            {
                id: '1',
                category: 'Languages',
                skills: ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'Ruby']
            }
        ],
        certifications: [],
        customSections: []
    };

    it('should return 100 for a perfectly formatted resume', () => {
        const result = calculateFormattingScore(mockResumeData);
        expect(result.score).toBe(100);
        expect(result.maxScore).toBe(100);
        expect(result.details.some(d => d.label === 'Summary' && d.status === 'success')).toBe(true);
        expect(result.details.some(d => d.label === 'Overall' && d.status === 'success')).toBe(true);
    });

    it('should reduce score when full name is missing', () => {
        const data: ResumeData = {
            ...mockResumeData,
            personalInfo: {
                ...mockResumeData.personalInfo,
                fullName: ''
            }
        };
        const result = calculateFormattingScore(data);
        // Full name is 20 points. 100 - 20 = 80.
        expect(result.score).toBe(80);
        expect(result.details.find(d => d.label === 'Full Name')?.status).toBe('error');
    });

    it('should reduce score when email is missing', () => {
        const data: ResumeData = {
            ...mockResumeData,
            personalInfo: {
                ...mockResumeData.personalInfo,
                email: ''
            }
        };
        const result = calculateFormattingScore(data);
        // Email is 20 points. 100 - 20 = 80.
        expect(result.score).toBe(80);
        expect(result.details.find(d => d.label === 'Email')?.status).toBe('error');
    });

    it('should reduce score when work experience is missing', () => {
        const data: ResumeData = {
            ...mockResumeData,
            workExperience: []
        };
        const result = calculateFormattingScore(data);
        // Work experience is 20 points. 100 - 20 = 80.
        expect(result.score).toBe(80);
        expect(result.details.find(d => d.label === 'Work Experience')?.status).toBe('error');
    });

    it('should reduce score when education is missing', () => {
        const data: ResumeData = {
            ...mockResumeData,
            education: []
        };
        const result = calculateFormattingScore(data);
        // Education is 10 points. 100 - 10 = 90.
        expect(result.score).toBe(90);
        expect(result.details.find(d => d.label === 'Education')?.status).toBe('warning');
    });

    it('should reduce score when skills section is missing', () => {
        const data: ResumeData = {
            ...mockResumeData,
            skills: []
        };
        const result = calculateFormattingScore(data);
        // Skills is 15 points. 100 - 15 = 85.
        expect(result.score).toBe(85);
        expect(result.details.find(d => d.label === 'Skills')?.status).toBe('error');
    });

    it('should handle missing personalInfo gracefully', () => {
        const data: any = {
            ...mockResumeData,
            personalInfo: undefined
        };
        const result = calculateFormattingScore(data as ResumeData);
        // Missing full name (-20) + email (-20) = 60.
        // Work experience, skills, and education are present.
        expect(result.score).toBe(60);
        expect(Number.isNaN(result.score)).toBe(false);
    });

    it('should never return a negative score', () => {
        const data: any = {
            personalInfo: undefined,
            workExperience: [],
            education: [],
            projects: [],
            skills: [],
            certifications: [],
            customSections: []
        };
        const result = calculateFormattingScore(data as ResumeData);
        // 100 - 20 (name) - 20 (email) - 20 (experience) - 15 (skills) - 10 (education) = 15.
        expect(result.score).toBe(15);
    });

    it('should return structured details for the score panel', () => {
        const result = calculateFormattingScore(mockResumeData);
        expect(result.details.length).toBeGreaterThan(0);
        for (const detail of result.details) {
            expect(typeof detail.label).toBe('string');
            expect(['success', 'warning', 'error']).toContain(detail.status);
            expect(typeof detail.message).toBe('string');
        }
    });
});
