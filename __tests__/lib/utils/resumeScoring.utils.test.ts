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
        education: [],
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
        expect(result.details.some(d => d.label === 'Contact Info' && d.status === 'success')).toBe(true);
        expect(result.details.some(d => d.label === 'LinkedIn' && d.status === 'success')).toBe(true);
        expect(result.details.some(d => d.label === 'Summary' && d.status === 'success')).toBe(true);
        expect(result.details.some(d => d.label === 'Date Format' && d.status === 'success')).toBe(true);
        expect(result.details.some(d => d.label === 'Skills' && d.status === 'success')).toBe(true);
    });

    it('should reduce score when contact info is missing', () => {
        const data: ResumeData = {
            ...mockResumeData,
            personalInfo: {
                ...mockResumeData.personalInfo,
                phone: '',
                location: ''
            }
        };
        const result = calculateFormattingScore(data);
        // Original: 25 for contact info. Missing phone and location: 10 points. Loss = 15.
        // 100 - 15 = 85.
        expect(result.score).toBe(85);
        const contactDetail = result.details.find(d => d.label === 'Contact Info');
        expect(contactDetail?.status).toBe('warning');
        expect(contactDetail?.message).toContain('phone');
        expect(contactDetail?.message).toContain('location');
    });

    it('should reduce score when LinkedIn is missing', () => {
        const data: ResumeData = {
            ...mockResumeData,
            personalInfo: {
                ...mockResumeData.personalInfo,
                linkedin: ''
            }
        };
        const result = calculateFormattingScore(data);
        // LinkedIn is 10 points. 100 - 10 = 90.
        expect(result.score).toBe(90);
        expect(result.details.some(d => d.label === 'LinkedIn')).toBe(false);
    });

    it('should reduce score when summary is short or missing', () => {
        // Short summary (< 100 chars)
        const shortSummaryData: ResumeData = {
            ...mockResumeData,
            personalInfo: {
                ...mockResumeData.personalInfo,
                summary: 'Short summary.'
            }
        };
        const resultShort = calculateFormattingScore(shortSummaryData);
        // Full summary is 20. Short summary is 10. Loss = 10.
        // 100 - 10 = 90.
        expect(resultShort.score).toBe(90);
        expect(resultShort.details.find(d => d.label === 'Summary')?.status).toBe('warning');

        // Missing summary
        const missingSummaryData: ResumeData = {
            ...mockResumeData,
            personalInfo: {
                ...mockResumeData.personalInfo,
                summary: ''
            }
        };
        const resultMissing = calculateFormattingScore(missingSummaryData);
        // Full summary is 20. Missing is 0. Loss = 20.
        // 100 - 20 = 80.
        expect(resultMissing.score).toBe(80);
        expect(resultMissing.details.find(d => d.label === 'Summary')?.status).toBe('error');
    });

    it('should reduce score for inconsistent dates', () => {
        const data: ResumeData = {
            ...mockResumeData,
            workExperience: [
                {
                    ...mockResumeData.workExperience[0],
                    endDate: '',
                    current: false
                }
            ]
        };
        const result = calculateFormattingScore(data);
        // Consistent dates is 20. Inconsistent is 10. Loss = 10.
        // 100 - 10 = 90.
        expect(result.score).toBe(90);
        expect(result.details.find(d => d.label === 'Date Format')?.status).toBe('warning');
    });

    it('should handle missing work experience', () => {
        const data: ResumeData = {
            ...mockResumeData,
            workExperience: []
        };
        const result = calculateFormattingScore(data);
        // Consistent dates + presence is 20. Empty is 0. Loss = 20.
        // 100 - 20 = 80.
        expect(result.score).toBe(80);
        expect(result.details.some(d => d.label === 'Date Format')).toBe(false);
    });

    it('should reduce score for low skill count', () => {
        // 4-7 skills: 15 points (Loss = 10)
        const data4Skills: ResumeData = {
            ...mockResumeData,
            skills: [
                {
                    id: '1',
                    category: 'Languages',
                    skills: ['TS', 'JS', 'Python', 'Go']
                }
            ]
        };
        const result4 = calculateFormattingScore(data4Skills);
        expect(result4.score).toBe(90);
        expect(result4.details.find(d => d.label === 'Skills')?.status).toBe('warning');

        // 1-3 skills: 5 points (Loss = 20)
        const data1Skill: ResumeData = {
            ...mockResumeData,
            skills: [
                {
                    id: '1',
                    category: 'Languages',
                    skills: ['TS']
                }
            ]
        };
        const result1 = calculateFormattingScore(data1Skill);
        expect(result1.score).toBe(80);
        expect(result1.details.find(d => d.label === 'Skills')?.status).toBe('error');

        // 0 skills: 0 points (Loss = 25)
        const data0Skills: ResumeData = {
            ...mockResumeData,
            skills: []
        };
        const result0 = calculateFormattingScore(data0Skills);
        expect(result0.score).toBe(75);
        expect(result0.details.some(d => d.label === 'Skills')).toBe(false);
    });

    it('should handle missing personalInfo gracefully', () => {
        const data: any = {
            ...mockResumeData,
            personalInfo: undefined
        };
        const result = calculateFormattingScore(data as ResumeData);
        // No personal info: Contact info (0), LinkedIn (0), Summary (0).
        // Loss = 25 + 10 + 20 = 55.
        // Remaining: Date Format (20), Skills (25) = 45.
        expect(result.score).toBe(45);
    });
});
