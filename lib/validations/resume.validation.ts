import { z } from 'zod';

// Personal Info Schema
export const personalInfoSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    location: z.string().max(200).optional(),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    linkedin: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
    github: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
    summary: z.string().max(1000, 'Summary must be less than 1000 characters').optional(),
});

// Work Experience Schema
export const workExperienceSchema = z.object({
    id: z.string().optional(),
    company: z.string().max(200).optional().default(''),
    position: z.string().max(200).optional().default(''),
    location: z.string().max(200).optional().default(''),
    startDate: z.string().regex(/^(\d{4}-\d{2})?$/, 'Date must be in YYYY-MM format').optional().default(''),
    endDate: z.string().regex(/^(\d{4}-\d{2})?$/, 'Date must be in YYYY-MM format').optional().default(''),
    current: z.boolean().default(false),
    description: z.string().max(2000).optional().default(''),
    achievements: z.array(z.string().max(1000)).default([]),
}).refine(
    (data) => {
        // If it's a completely empty entry, allow it (for draft saving)
        if (!data.company && !data.position && !data.startDate) return true;

        if (!data.current && !data.endDate) {
            // Only require end date if it's not current AND some other data is filled
            return true; // Relaxing for now to allow partial saves
        }
        if (data.current && data.endDate) {
            return false;
        }
        return true;
    },
    {
        message: 'Either set current to true or provide an end date',
        path: ['endDate'],
    }
);

// Education Schema
export const educationSchema = z.object({
    id: z.string().optional(),
    institution: z.string().max(200).optional().default(''),
    degree: z.string().max(200).optional().default(''),
    field: z.string().max(200).optional().default(''),
    location: z.string().max(200).optional().default(''),
    startDate: z.string().regex(/^(\d{4}-\d{2})?$/, 'Date must be in YYYY-MM format').optional().default(''),
    endDate: z.string().regex(/^(\d{4}-\d{2})?$/, 'Date must be in YYYY-MM format').optional().default(''),
    current: z.boolean().default(false),
    gpa: z.string().max(10).optional().default(''),
    achievements: z.array(z.string().max(1000)).default([]),
}).refine(
    (data) => {
        if (!data.institution && !data.degree && !data.startDate) return true;
        if (!data.current && !data.endDate) return true;
        if (data.current && data.endDate) return false;
        return true;
    },
    {
        message: 'Either set current to true or provide an end date',
        path: ['endDate'],
    }
);

// Project Schema
export const projectSchema = z.object({
    id: z.string().optional(),
    title: z.string().max(200).optional().default(''),
    description: z.string().max(2000).optional().default(''),
    technologies: z.array(z.string().max(100)).default([]),
    url: z.string().url('Invalid URL').optional().or(z.literal('')),
    githubUrl: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
    startDate: z.string().regex(/^(\d{4}-\d{2})?$/, 'Date must be in YYYY-MM format').optional().default(''),
    endDate: z.string().regex(/^(\d{4}-\d{2})?$/, 'Date must be in YYYY-MM format').optional().default(''),
    highlights: z.array(z.string().max(1000)).default([]),
});

// Skills Schema
export const skillSchema = z.object({
    id: z.string().optional(),
    category: z.string().max(100).optional().default(''),
    skills: z.array(z.string().max(100)).default([]),
});

// Certification Schema
export const certificationSchema = z.object({
    id: z.string().optional(),
    name: z.string().max(200).optional().default(''),
    issuer: z.string().max(200).optional().default(''),
    issueDate: z.string().regex(/^(\d{4}-\d{2})?$/, 'Date must be in YYYY-MM format').optional().default(''),
    expiryDate: z.string().regex(/^(\d{4}-\d{2})?$/, 'Date must be in YYYY-MM format').optional().default(''),
    credentialId: z.string().max(200).optional().default(''),
    credentialUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

// Custom Section Schema
export const customSectionSchema = z.object({
    id: z.string().optional(), // Accept any string ID (will be generated as CUID on server if missing/temp)
    title: z.string().min(1, 'Section title is required').max(100),
    content: z.string().min(1, 'Content is required').max(5000),
    order: z.number().int().min(0),
});

// Complete Resume Data Schema
export const resumeDataSchema = z.object({
    personalInfo: personalInfoSchema,
    workExperience: z.array(workExperienceSchema).default([]),
    education: z.array(educationSchema).default([]),
    projects: z.array(projectSchema).default([]),
    skills: z.array(skillSchema).default([]),
    certifications: z.array(certificationSchema).default([]),
    customSections: z.array(customSectionSchema).default([]),
});

// Resume Creation Schema
export const createResumeSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200).default('Untitled Resume'),
    data: resumeDataSchema,
    templateId: z.string().optional(),
    customStyles: z.string().optional(),
    isPublic: z.boolean().default(false),
});

// Resume Update Schema
export const updateResumeSchema = createResumeSchema.partial().extend({
    id: z.string().cuid(),
});

// Export type inference
export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
export type WorkExperienceInput = z.infer<typeof workExperienceSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
export type CertificationInput = z.infer<typeof certificationSchema>;
export type CustomSectionInput = z.infer<typeof customSectionSchema>;
export type ResumeDataInput = z.infer<typeof resumeDataSchema>;
export type CreateResumeInput = z.infer<typeof createResumeSchema>;
export type UpdateResumeInput = z.infer<typeof updateResumeSchema>;

