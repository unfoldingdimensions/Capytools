/**
 * Resume Scoring Utilities
 * Client-side scoring functions for real-time resume analysis
 */

import type { ResumeData } from '@/types/resume.types';
import { calculateAtsFormattingScore } from './atsFormattingScore';

// Common action verbs that indicate strong resume content
const ACTION_VERBS = [
    'achieved', 'improved', 'managed', 'led', 'developed', 'designed', 'created',
    'implemented', 'increased', 'decreased', 'reduced', 'generated', 'delivered',
    'launched', 'built', 'established', 'coordinated', 'executed', 'optimized',
    'streamlined', 'spearheaded', 'pioneered', 'transformed', 'accelerated',
    'automated', 'scaled', 'mentored', 'trained', 'negotiated', 'analyzed',
    'architected', 'engineered', 'resolved', 'collaborated', 'initiated'
];

// Patterns for quantified achievements
const QUANTIFIER_PATTERNS = [
    /\d+%/,                    // Percentages
    /\$[\d,]+[KMB]?/i,        // Dollar amounts
    /\d+x/i,                   // Multipliers (2x, 10x)
    /\d+\+?\s*(users?|customers?|clients?|members?)/i,  // User counts
    /\d+\+?\s*(projects?|teams?|people|engineers?)/i,   // Team/project counts
    /\d+\+?\s*(million|thousand|hundred)/i,             // Large numbers
    /saved?\s+\$?[\d,]+/i,     // Cost savings
    /reduced?\s+.*\d+/i,       // Reductions with numbers
    /increased?\s+.*\d+/i,     // Increases with numbers
];

export interface ScoreResult {
    score: number;
    maxScore: number;
    details: ScoreDetail[];
}

export interface ScoreDetail {
    label: string;
    status: 'success' | 'warning' | 'error';
    message: string;
}

export interface ResumeScoreResult {
    overallScore: number;
    categoryScores: {
        content: ScoreResult;
        formatting: ScoreResult;
        completeness: ScoreResult;
    };
    tips: string[];
}

/**
 * Calculate content quality score
 * Checks for action verbs, quantified achievements, and bullet point quality
 */
export function calculateContentScore(resumeData: ResumeData): ScoreResult {
    const details: ScoreDetail[] = [];
    let score = 0;
    const maxScore = 100;

    // Check work experience achievements
    const allAchievements: string[] = [];
    resumeData.workExperience?.forEach(exp => {
        allAchievements.push(...(exp.achievements || []));
    });

    // Check project highlights
    resumeData.projects?.forEach(proj => {
        allAchievements.push(...(proj.highlights || []));
    });

    if (allAchievements.length === 0) {
        details.push({
            label: 'Achievements',
            status: 'error',
            message: 'No bullet points found - add achievements to your experience'
        });
    } else {
        // Count action verbs
        let actionVerbCount = 0;
        allAchievements.forEach(achievement => {
            const lowerAchievement = achievement.toLowerCase();
            if (ACTION_VERBS.some(verb => lowerAchievement.startsWith(verb))) {
                actionVerbCount++;
            }
        });

        const actionVerbRatio = actionVerbCount / allAchievements.length;
        if (actionVerbRatio >= 0.8) {
            score += 30;
            details.push({
                label: 'Action Verbs',
                status: 'success',
                message: 'Great use of action verbs!'
            });
        } else if (actionVerbRatio >= 0.5) {
            score += 20;
            details.push({
                label: 'Action Verbs',
                status: 'warning',
                message: `${Math.round(actionVerbRatio * 100)}% of bullets start with action verbs`
            });
        } else {
            score += 10;
            details.push({
                label: 'Action Verbs',
                status: 'error',
                message: 'Start more bullets with strong action verbs'
            });
        }

        // Count quantified achievements
        let quantifiedCount = 0;
        allAchievements.forEach(achievement => {
            if (QUANTIFIER_PATTERNS.some(pattern => pattern.test(achievement))) {
                quantifiedCount++;
            }
        });

        const quantifiedRatio = quantifiedCount / allAchievements.length;
        if (quantifiedRatio >= 0.6) {
            score += 35;
            details.push({
                label: 'Quantified Results',
                status: 'success',
                message: 'Excellent! Many achievements include metrics'
            });
        } else if (quantifiedRatio >= 0.3) {
            score += 20;
            details.push({
                label: 'Quantified Results',
                status: 'warning',
                message: `${quantifiedCount}/${allAchievements.length} bullets have metrics`
            });
        } else {
            score += 5;
            details.push({
                label: 'Quantified Results',
                status: 'error',
                message: 'Add numbers to show impact (%, $, users)'
            });
        }

        // Check bullet point length (ideal: 50-150 characters)
        let goodLengthCount = 0;
        allAchievements.forEach(achievement => {
            const len = achievement.length;
            if (len >= 50 && len <= 200) {
                goodLengthCount++;
            }
        });

        const lengthRatio = goodLengthCount / allAchievements.length;
        if (lengthRatio >= 0.7) {
            score += 20;
            details.push({
                label: 'Bullet Length',
                status: 'success',
                message: 'Good bullet point length'
            });
        } else {
            score += 10;
            details.push({
                label: 'Bullet Length',
                status: 'warning',
                message: 'Some bullets may be too short or long'
            });
        }

        // Bonus for having enough achievements
        if (allAchievements.length >= 10) {
            score += 15;
            details.push({
                label: 'Content Volume',
                status: 'success',
                message: `${allAchievements.length} achievements listed`
            });
        } else if (allAchievements.length >= 5) {
            score += 10;
            details.push({
                label: 'Content Volume',
                status: 'warning',
                message: `${allAchievements.length} achievements - consider adding more`
            });
        } else {
            details.push({
                label: 'Content Volume',
                status: 'error',
                message: 'Add more achievements to strengthen your resume'
            });
        }
    }

    return { score: Math.min(score, maxScore), maxScore, details };
}

/**
 * Calculate formatting score
 * Uses the same canonical ATS formatting rubric as the ATS scoring service,
 * so the real-time panel and the ATS report always agree.
 */
export function calculateFormattingScore(resumeData: ResumeData): ScoreResult {
    const result = calculateAtsFormattingScore(resumeData);

    const details: ScoreDetail[] = result.details.map((detail) => ({
        label: detail.label,
        status: detail.status,
        message: detail.message,
    }));

    return { score: result.score, maxScore: 100, details };
}

/**
 * Calculate completeness score
 * Measures how filled out each section is
 */
export function calculateCompletenessScore(resumeData: ResumeData): ScoreResult {
    const details: ScoreDetail[] = [];
    let score = 0;
    const maxScore = 100;

    // Personal Info (20 points)
    const pi = resumeData.personalInfo;
    if (pi?.fullName && pi?.email) {
        score += 20;
        details.push({
            label: 'Personal Info',
            status: 'success',
            message: 'Required info complete'
        });
    } else {
        details.push({
            label: 'Personal Info',
            status: 'error',
            message: 'Name and email required'
        });
    }

    // Work Experience (30 points)
    const expCount = resumeData.workExperience?.length || 0;
    if (expCount >= 2) {
        score += 30;
        details.push({
            label: 'Experience',
            status: 'success',
            message: `${expCount} positions listed`
        });
    } else if (expCount === 1) {
        score += 20;
        details.push({
            label: 'Experience',
            status: 'warning',
            message: 'Consider adding more experience'
        });
    } else {
        details.push({
            label: 'Experience',
            status: 'error',
            message: 'Add work experience'
        });
    }

    // Education (15 points)
    const eduCount = resumeData.education?.length || 0;
    if (eduCount >= 1) {
        score += 15;
        details.push({
            label: 'Education',
            status: 'success',
            message: `${eduCount} education entries`
        });
    } else {
        details.push({
            label: 'Education',
            status: 'warning',
            message: 'Add education background'
        });
    }

    // Skills (20 points)
    const skillCount = resumeData.skills?.reduce((acc, cat) => acc + cat.skills.length, 0) || 0;
    if (skillCount >= 5) {
        score += 20;
        details.push({
            label: 'Skills',
            status: 'success',
            message: `${skillCount} skills listed`
        });
    } else if (skillCount > 0) {
        score += 10;
        details.push({
            label: 'Skills',
            status: 'warning',
            message: 'Add more skills'
        });
    } else {
        details.push({
            label: 'Skills',
            status: 'error',
            message: 'Add your skills'
        });
    }

    // Projects (15 points) - Optional but valuable
    const projCount = resumeData.projects?.length || 0;
    if (projCount >= 1) {
        score += 15;
        details.push({
            label: 'Projects',
            status: 'success',
            message: `${projCount} projects showcased`
        });
    } else {
        details.push({
            label: 'Projects',
            status: 'warning',
            message: 'Consider adding projects'
        });
    }

    return { score: Math.min(score, maxScore), maxScore, details };
}

/**
 * Generate quick improvement tips based on scores
 */
export function generateQuickTips(
    contentScore: ScoreResult,
    formattingScore: ScoreResult,
    completenessScore: ScoreResult
): string[] {
    const tips: string[] = [];

    // Find the lowest scoring areas and generate tips
    const errorDetails = [
        ...contentScore.details,
        ...formattingScore.details,
        ...completenessScore.details
    ].filter(d => d.status === 'error');

    const warningDetails = [
        ...contentScore.details,
        ...formattingScore.details,
        ...completenessScore.details
    ].filter(d => d.status === 'warning');

    // Add tips for errors first (max 2)
    errorDetails.slice(0, 2).forEach(detail => {
        tips.push(detail.message);
    });

    // Add tips for warnings (max 2 more)
    warningDetails.slice(0, 2).forEach(detail => {
        if (tips.length < 4) {
            tips.push(detail.message);
        }
    });

    // If no issues, add encouraging message
    if (tips.length === 0) {
        tips.push('Great job! Your resume is looking strong.');
    }

    return tips;
}

/**
 * Calculate overall resume score
 */
export function calculateResumeScore(resumeData: ResumeData): ResumeScoreResult {
    const contentScore = calculateContentScore(resumeData);
    const formattingScore = calculateFormattingScore(resumeData);
    const completenessScore = calculateCompletenessScore(resumeData);

    // Weighted average: Content 35%, Formatting 30%, Completeness 35%
    const overallScore = Math.round(
        (contentScore.score * 0.35) +
        (formattingScore.score * 0.30) +
        (completenessScore.score * 0.35)
    );

    const tips = generateQuickTips(contentScore, formattingScore, completenessScore);

    return {
        overallScore,
        categoryScores: {
            content: contentScore,
            formatting: formattingScore,
            completeness: completenessScore,
        },
        tips,
    };
}

/**
 * Get score color based on value
 */
export function getScoreColor(score: number): 'red' | 'yellow' | 'green' {
    if (score >= 70) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
}

/**
 * Get score label based on value
 */
export function getScoreLabel(score: number): string {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Needs Work';
    return 'Getting Started';
}
