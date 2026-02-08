import {
    personalInfoSchema,
    workExperienceSchema,
    educationSchema,
    skillSchema,
} from '@/lib/validations/resume.validation';

describe('Resume Validation Schemas', () => {
    describe('personalInfoSchema', () => {
        it('should validate correct personal info', () => {
            const validData = {
                fullName: 'John Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                location: 'New York, NY',
            };

            const result = personalInfoSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject invalid email', () => {
            const invalidData = {
                fullName: 'John Doe',
                email: 'invalid-email',
            };

            const result = personalInfoSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject short full name', () => {
            const invalidData = {
                fullName: 'J',
                email: 'john@example.com',
            };

            const result = personalInfoSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('workExperienceSchema', () => {
        it('should validate work experience with end date', () => {
            const validData = {
                company: 'Tech Corp',
                position: 'Software Engineer',
                startDate: '2020-01',
                endDate: '2023-06',
                current: false,
                description: 'Developed web applications',
                achievements: ['Improved performance by 50%'],
            };

            const result = workExperienceSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate current position without end date', () => {
            const validData = {
                company: 'Tech Corp',
                position: 'Software Engineer',
                startDate: '2020-01',
                current: true,
                description: '',
                achievements: [],
            };

            const result = workExperienceSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject invalid date format', () => {
            const invalidData = {
                company: 'Tech Corp',
                position: 'Software Engineer',
                startDate: '2020/01/01', // Wrong format
                current: true,
                description: '',
                achievements: [],
            };

            const result = workExperienceSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('educationSchema', () => {
        it('should validate education with all fields', () => {
            const validData = {
                institution: 'MIT',
                degree: 'Bachelor of Science',
                field: 'Computer Science',
                startDate: '2016-09',
                endDate: '2020-05',
                current: false,
                gpa: '3.8',
                achievements: ['Dean\'s List'],
            };

            const result = educationSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('skillSchema', () => {
        it('should validate skills with category', () => {
            const validData = {
                category: 'Programming Languages',
                skills: ['JavaScript', 'TypeScript', 'Python'],
            };

            const result = skillSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should allow empty skills array', () => {
            const validData = {
                category: 'Programming Languages',
                skills: [],
            };

            const result = skillSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });
});

