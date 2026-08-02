/**
 * Canonical ATS formatting score.
 *
 * This is the single source of truth for the "formatting" category used by both
 * the ATS scoring service (server) and the real-time resume score panel (client).
 * Previously the two implemented different rubrics, producing inconsistent scores
 * for the same resume.
 *
 * Pure module - no external dependencies (safe for both server and client bundles).
 */

import type { ResumeData } from '@/types/resume.types';

export interface AtsFormattingDetail {
    label: string;
    status: 'success' | 'warning' | 'error';
    message: string;
}

export interface AtsFormattingResult {
    score: number; // 0-100, higher is better
    details: AtsFormattingDetail[];
}

/**
 * Scores how ATS-friendly the resume's structure is.
 * Starts at 100 and subtracts points for missing essential sections.
 */
export function calculateAtsFormattingScore(resume: ResumeData): AtsFormattingResult {
    const details: AtsFormattingDetail[] = [];
    let score = 100;

    // Check for essential sections
    if (!resume.personalInfo?.fullName) {
        score -= 20;
        details.push({ label: 'Full Name', status: 'error', message: 'Missing full name' });
    }

    if (!resume.personalInfo?.email) {
        score -= 20;
        details.push({ label: 'Email', status: 'error', message: 'Missing email address' });
    }

    if (!resume.workExperience || resume.workExperience.length === 0) {
        score -= 20;
        details.push({ label: 'Work Experience', status: 'error', message: 'Missing work experience' });
    }

    if (!resume.skills || resume.skills.length === 0) {
        score -= 15;
        details.push({ label: 'Skills', status: 'error', message: 'Missing skills section' });
    }

    if (!resume.education || resume.education.length === 0) {
        score -= 10;
        details.push({ label: 'Education', status: 'warning', message: 'Missing education section' });
    }

    // Positive checks
    if (resume.personalInfo?.summary) {
        details.push({ label: 'Summary', status: 'success', message: 'Has professional summary' });
    }

    if (resume.certifications && resume.certifications.length > 0) {
        details.push({ label: 'Certifications', status: 'success', message: 'Includes certifications' });
    }

    if (score >= 90) {
        details.push({ label: 'Overall', status: 'success', message: 'Excellent ATS formatting' });
    } else if (score >= 70) {
        details.push({ label: 'Overall', status: 'success', message: 'Good ATS formatting' });
    } else if (score >= 50) {
        details.push({ label: 'Overall', status: 'warning', message: 'Needs formatting improvements' });
    } else {
        details.push({ label: 'Overall', status: 'error', message: 'Poor ATS formatting - major improvements needed' });
    }

    return { score: Math.max(0, score), details };
}
