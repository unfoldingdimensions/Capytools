import { ResumeData } from '@/types/resume.types';
import { matchKeywords, JobDescription } from './keywordMatching.utils';

export interface AtsValidationResult {
    score: number;
    errors: AtsIssue[];
    warnings: AtsIssue[];
    successes: AtsIssue[];
}

export interface AtsIssue {
    id: string;
    section: string;
    message: string;
    type: 'error' | 'warning' | 'success';
    scoreImpact?: number;
}

export const ATS_MAX_SCORE = 100;

/**
 * Validates resume data against ATS best practices (2024 standards).
 * Returns a score and a list of issues.
 */
export function validateResumeForAts(data: ResumeData, jobDescription?: JobDescription | null): AtsValidationResult {
    const errors: AtsIssue[] = [];
    const warnings: AtsIssue[] = [];
    const successes: AtsIssue[] = [];
    let score = ATS_MAX_SCORE;

    // --- 1. Contact Information Checks ---
    if (!data.personalInfo) {
        errors.push({
            id: 'missing-personal-info',
            section: 'Personal Info',
            message: 'Personal information section is missing.',
            type: 'error',
            scoreImpact: 20
        });
        score -= 20;
    } else {
        const { email, phone, location, fullName } = data.personalInfo;

        if (!fullName) {
            errors.push({ id: 'missing-name', section: 'Personal Info', message: 'Full name is missing.', type: 'error', scoreImpact: 10 });
            score -= 10;
        }

        if (!email) {
            errors.push({ id: 'missing-email', section: 'Personal Info', message: 'Email address is missing.', type: 'error', scoreImpact: 10 });
            score -= 10;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            warnings.push({ id: 'invalid-email', section: 'Personal Info', message: 'Email format looks incorrect.', type: 'warning', scoreImpact: 5 });
            score -= 5;
        }

        if (!phone) {
            warnings.push({ id: 'missing-phone', section: 'Personal Info', message: 'Phone number is recommended.', type: 'warning', scoreImpact: 5 });
            score -= 5;
        }

        if (!location) {
            warnings.push({ id: 'missing-location', section: 'Personal Info', message: 'Location (City, State) is recommended for local search.', type: 'warning', scoreImpact: 2 });
            score -= 2;
        } else if (location.length > 50) {
            warnings.push({ id: 'long-location', section: 'Personal Info', message: 'Location should be concise (City, State/Country).', type: 'warning', scoreImpact: 0 });
        }
    }

    // --- 2. Section Existence Checks ---
    let sectionCount = 0;
    if (data.workExperience && data.workExperience.length > 0) {
        sectionCount++;
        successes.push({ id: 'success-work', section: 'Work Experience', message: 'Work experience section is well-structured.', type: 'success' });
    } else {
        warnings.push({ id: 'missing-work', section: 'Work Experience', message: 'No work experience listed. This is critical for most roles.', type: 'warning', scoreImpact: 15 });
        score -= 15;
    }

    if ((data.education && data.education.length > 0) || (data.certifications && data.certifications.length > 0)) {
        sectionCount++;
        successes.push({ id: 'success-edu', section: 'Education', message: 'Academic/Certification background is present.', type: 'success' });
    } else {
        warnings.push({ id: 'missing-education', section: 'Education', message: 'No education or certifications listed.', type: 'warning', scoreImpact: 5 });
        score -= 5;
    }

    if (data.skills && data.skills.length > 0) {
        sectionCount++;
        if (data.skills.length >= 3) {
            successes.push({ id: 'success-skills', section: 'Skills', message: 'Diverse skill set categories detected.', type: 'success' });
        }
    } else {
        errors.push({ id: 'missing-skills', section: 'Skills', message: 'Skills section is missing. ATS rely heavily on this for keyword matching.', type: 'error', scoreImpact: 10 });
        score -= 10;
    }

    // Reward for having multiple sections
    if (sectionCount >= 3) {
        successes.push({ id: 'complete-sections', section: 'Structure', message: 'All key sections present for a well-rounded resume.', type: 'success' });
    }

    // --- 3. Content Formatting Checks ---

    // Check Work Experience Bullets
    if (data.workExperience) {
        data.workExperience.forEach((exp, index) => {
            if (!exp.company || !exp.position) {
                errors.push({ id: `missing-role-info-${index}`, section: 'Work Experience', message: `Role #${index + 1} is missing company or position title.`, type: 'error', scoreImpact: 3 });
                score -= 3;
                return;
            }

            // Check bullet points
            const achievements = exp.achievements || [];
            if (achievements.length === 0 && (!exp.description || exp.description.length < 20)) {
                warnings.push({ id: `empty-role-${index}`, section: 'Work Experience', message: `Role at ${exp.company} has no description or bullet points.`, type: 'warning', scoreImpact: 3 });
                score -= 3;
            } else if (achievements.length < 3) {
                warnings.push({ id: `few-bullets-${index}`, section: 'Work Experience', message: `Role at ${exp.company} has few bullet points. Aim for 3-5 per role for best impact.`, type: 'warning', scoreImpact: 2 });
                score -= 2;
            }

            achievements.forEach((bullet, bIndex) => {
                if (bullet.length > 300) { // Approx 3 lines
                    warnings.push({ id: `long-bullet-${index}-${bIndex}`, section: 'Work Experience', message: `Bullet point in ${exp.company} is too long (${bullet.length} chars). Keep it under 2-3 lines.`, type: 'warning', scoreImpact: 1 });
                    score -= 1;
                }

                // Check for action verbs (simple check)
                const firstWord = bullet.trim().split(' ')[0];
                if (firstWord && (firstWord.toLowerCase().endsWith('ing') || ['do', 'did', 'work', 'worked'].includes(firstWord.toLowerCase()))) {
                    warnings.push({ id: `weak-verb-${index}-${bIndex}`, section: 'Work Experience', message: `Bullet starting with "${firstWord}" in ${exp.company} could use a stronger action verb (e.g., "Spearheaded", "Engineered").`, type: 'warning', scoreImpact: 1 });
                    score -= 1;
                }
            });
        });
    }

    // --- 4. Keyword Matching (If JD provided) ---
    if (jobDescription) {
        const keywordResult = matchKeywords(data, jobDescription);
        const matchRatio = keywordResult.matchPercentage / 100;

        if (matchRatio < 0.3) {
            errors.push({ id: 'very-low-match', section: 'Optimization', message: `Critical: Keyword match is extremely low (${keywordResult.matchPercentage}%). Tailoring is required.`, type: 'error', scoreImpact: 15 });
            score -= 15;
        } else if (matchRatio < 0.6) {
            warnings.push({
                id: 'low-keyword-match',
                section: 'Optimization',
                message: `Low keyword match (${keywordResult.matchPercentage}%). Consider adding: ${keywordResult.missing.slice(0, 3).join(', ')}...`,
                type: 'warning',
                scoreImpact: 10
            });
            score -= 10;
        } else if (matchRatio >= 0.8) {
            successes.push({ id: 'high-keyword-match', section: 'Optimization', message: `Excellent keyword match (${keywordResult.matchPercentage}%) with job description!`, type: 'success' });
        }
    }

    // Cap score at 0
    return {
        score: Math.max(0, score),
        errors,
        warnings,
        successes
    };
}
