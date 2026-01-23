import { prisma } from '@/lib/db/prisma';
import { encryptJSON, decryptJSON } from '@/lib/security/encryption';
import { ResumeData } from '@/types/resume.types';

export class ResumeService {
    static async getResume(userId: string, resumeId: string) {
        const resume = await prisma.resume.findFirst({
            where: {
                id: resumeId,
                userId,
            },
        });

        if (!resume) {
            return null;
        }

        // Update last accessed time
        await prisma.resume.update({
            where: { id: resumeId },
            data: { lastAccessedAt: new Date() },
        });

        const resumeData: ResumeData = {
            personalInfo: resume.personalInfoEncrypted
                ? decryptJSON(resume.personalInfoEncrypted)
                : { fullName: '', email: '' },
            workExperience: resume.workExperienceEncrypted
                ? decryptJSON(resume.workExperienceEncrypted)
                : [],
            education: resume.educationEncrypted
                ? decryptJSON(resume.educationEncrypted)
                : [],
            projects: resume.projectsEncrypted
                ? decryptJSON(resume.projectsEncrypted)
                : [],
            skills: resume.skillsEncrypted
                ? decryptJSON(resume.skillsEncrypted)
                : [],
            certifications: resume.certificationsEncrypted
                ? decryptJSON(resume.certificationsEncrypted)
                : [],
            customSections: resume.customSectionsEncrypted
                ? decryptJSON(resume.customSectionsEncrypted)
                : [],
        };

        return {
            id: resume.id,
            title: resume.title,
            data: resumeData,
            templateId: resume.templateId,
            customStyles: resume.customStyles,
            isPublic: resume.isPublic,
            createdAt: resume.createdAt,
            updatedAt: resume.updatedAt,
        };
    }

    static async getResumes(userId: string) {
        return prisma.resume.findMany({
            where: { userId },
            select: {
                id: true,
                title: true,
                isPublic: true,
                templateId: true,
                createdAt: true,
                updatedAt: true,
                lastAccessedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    static async createResume(userId: string, data: {
        title: string;
        data: ResumeData;
        templateId?: string;
        customStyles?: string;
        isPublic?: boolean;
    }) {
        const { personalInfo, workExperience, education, projects, skills, certifications, customSections } = data.data;

        const resume = await prisma.resume.create({
            data: {
                userId,
                title: data.title,
                personalInfoEncrypted: encryptJSON(personalInfo),
                workExperienceEncrypted: encryptJSON(workExperience),
                educationEncrypted: encryptJSON(education),
                projectsEncrypted: encryptJSON(projects),
                skillsEncrypted: encryptJSON(skills),
                certificationsEncrypted: encryptJSON(certifications),
                customSectionsEncrypted: encryptJSON(customSections),
                templateId: data.templateId,
                customStyles: data.customStyles,
                isPublic: data.isPublic || false,
            },
            select: {
                id: true,
                title: true,
                isPublic: true,
                templateId: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return resume;
    }

    static async updateResume(userId: string, resumeId: string, data: {
        title?: string;
        data?: Partial<ResumeData>;
        templateId?: string;
        customStyles?: string; // string type based on schema usage in API
        isPublic?: boolean;
    }) {
        // Verify ownership
        const existing = await prisma.resume.findFirst({
            where: { id: resumeId, userId },
        });

        if (!existing) {
            return null;
        }

        const updateData: any = {};

        if (data.title) updateData.title = data.title;
        if (data.templateId) updateData.templateId = data.templateId;
        if (data.customStyles !== undefined) updateData.customStyles = data.customStyles;
        if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

        if (data.data) {
            const { personalInfo, workExperience, education, projects, skills, certifications, customSections } = data.data;
            if (personalInfo) updateData.personalInfoEncrypted = encryptJSON(personalInfo);
            if (workExperience) updateData.workExperienceEncrypted = encryptJSON(workExperience);
            if (education) updateData.educationEncrypted = encryptJSON(education);
            if (projects) updateData.projectsEncrypted = encryptJSON(projects);
            if (skills) updateData.skillsEncrypted = encryptJSON(skills);
            if (certifications) updateData.certificationsEncrypted = encryptJSON(certifications);
            if (customSections) updateData.customSectionsEncrypted = encryptJSON(customSections);
        }

        return prisma.resume.update({
            where: { id: resumeId },
            data: updateData,
            select: {
                id: true,
                title: true,
                isPublic: true,
                templateId: true,
                updatedAt: true,
            },
        });
    }

    static async deleteResume(userId: string, resumeId: string) {
        // Verify ownership
        const existing = await prisma.resume.findFirst({
            where: { id: resumeId, userId },
        });

        if (!existing) {
            return false;
        }

        await prisma.resume.delete({
            where: { id: resumeId },
        });

        return true;
    }
}
