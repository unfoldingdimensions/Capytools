// Core Resume Types

export interface PersonalInfo {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
    github?: string;
    summary?: string;
}

export interface WorkExperience {
    id: string;
    company: string;
    position: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
    achievements: string[];
}

export interface Education {
    id: string;
    institution: string;
    degree: string;
    field: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    gpa?: string;
    achievements: string[];
}

export interface Project {
    id: string;
    title: string;
    description: string;
    technologies: string[];
    url?: string;
    githubUrl?: string;
    startDate?: string;
    endDate?: string;
    highlights: string[];
}

export interface Skill {
    id: string;
    category: string;
    skills: string[];
}

export interface Certification {
    id: string;
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
}

export interface CustomSection {
    id: string;
    title: string;
    content: string;
    order: number;
}

export interface ResumeData {
    personalInfo: PersonalInfo;
    workExperience: WorkExperience[];
    education: Education[];
    projects: Project[];
    skills: Skill[];
    certifications: Certification[];
    customSections: CustomSection[];
}

export interface Resume {
    id: string;
    userId: string;
    title: string;
    data: ResumeData;
    templateId?: string;
    customStyles?: string;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastAccessedAt: Date;
}

export type ExportFormat = 'PDF' | 'DOCX';

export interface ExportOptions {
    format: ExportFormat;
    resumeId: string;
    template?: string;
}

