/**
 * Keyword Matching Utilities
 * Extract and match keywords between resume and job description
 */

import type { ResumeData } from '@/types/resume.types';

export interface JobDescription {
    id: string;
    title: string;
    company: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    keywords: string[];
}

export interface KeywordMatch {
    keyword: string;
    matched: boolean;
    /** Where the keyword was found in the resume */
    foundIn: ('skills' | 'experience' | 'projects' | 'education' | 'summary')[];
    /** Confidence: exact match = 1, fuzzy = 0.5-0.9 */
    confidence: number;
}

export interface KeywordMatchResult {
    /** Overall match percentage (0-100) */
    matchPercentage: number;
    /** All matched keywords */
    matched: KeywordMatch[];
    /** Keywords from JD not found in resume */
    missing: string[];
    /** Keywords found in resume text but not in skills section */
    suggestAddToSkills: string[];
    /** Total keywords from job description */
    totalKeywords: number;
}

// Common keyword aliases for fuzzy matching
const KEYWORD_ALIASES: Record<string, string[]> = {
    'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
    'typescript': ['ts'],
    'react': ['react.js', 'reactjs', 'react js'],
    'node': ['node.js', 'nodejs', 'node js'],
    'python': ['python3', 'python 3', 'py'],
    'aws': ['amazon web services', 'amazon aws'],
    'gcp': ['google cloud', 'google cloud platform'],
    'azure': ['microsoft azure', 'ms azure'],
    'kubernetes': ['k8s', 'kube'],
    'docker': ['containerization', 'containers'],
    'ci/cd': ['cicd', 'continuous integration', 'continuous deployment', 'jenkins', 'github actions'],
    'graphql': ['graph ql', 'gql'],
    'rest': ['rest api', 'restful', 'restful api'],
    'sql': ['mysql', 'postgresql', 'postgres', 'mssql', 'sql server'],
    'nosql': ['mongodb', 'dynamodb', 'redis', 'cassandra'],
    'agile': ['scrum', 'kanban', 'sprint'],
    'machine learning': ['ml', 'deep learning', 'ai', 'artificial intelligence'],
};

/**
 * Normalize a keyword for comparison
 */
function normalizeKeyword(keyword: string): string {
    return keyword
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove special chars except spaces
        .replace(/\s+/g, ' '); // Normalize spaces
}

/**
 * Check if two keywords match (exact or fuzzy)
 */
function keywordsMatch(keyword1: string, keyword2: string): { matches: boolean; confidence: number } {
    const norm1 = normalizeKeyword(keyword1);
    const norm2 = normalizeKeyword(keyword2);

    // Exact match
    if (norm1 === norm2) {
        return { matches: true, confidence: 1 };
    }

    // Check if one contains the other
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
        return { matches: true, confidence: 0.9 };
    }

    // Check aliases
    for (const [canonical, aliases] of Object.entries(KEYWORD_ALIASES)) {
        const allVariants = [canonical, ...aliases].map(normalizeKeyword);
        if (allVariants.includes(norm1) && allVariants.includes(norm2)) {
            return { matches: true, confidence: 0.85 };
        }
        if (allVariants.includes(norm1) && allVariants.some(v => norm2.includes(v))) {
            return { matches: true, confidence: 0.7 };
        }
    }

    return { matches: false, confidence: 0 };
}

/**
 * Extract all keywords from resume
 */
export function extractResumeKeywords(resumeData: ResumeData): Map<string, Set<string>> {
    const keywordsBySection = new Map<string, Set<string>>();

    // Skills section
    const skillKeywords = new Set<string>();
    resumeData.skills?.forEach(category => {
        category.skills.forEach(skill => skillKeywords.add(skill));
    });
    keywordsBySection.set('skills', skillKeywords);

    // Work experience
    const experienceKeywords = new Set<string>();
    resumeData.workExperience?.forEach(exp => {
        exp.achievements?.forEach(achievement => {
            // Extract potential keywords from achievements
            extractKeywordsFromText(achievement).forEach(k => experienceKeywords.add(k));
        });
    });
    keywordsBySection.set('experience', experienceKeywords);

    // Projects
    const projectKeywords = new Set<string>();
    resumeData.projects?.forEach(proj => {
        proj.technologies?.forEach(tech => projectKeywords.add(tech));
        proj.highlights?.forEach(highlight => {
            extractKeywordsFromText(highlight).forEach(k => projectKeywords.add(k));
        });
    });
    keywordsBySection.set('projects', projectKeywords);

    // Education
    const educationKeywords = new Set<string>();
    resumeData.education?.forEach(edu => {
        if (edu.field) educationKeywords.add(edu.field);
        edu.achievements?.forEach(achievement => {
            extractKeywordsFromText(achievement).forEach(k => educationKeywords.add(k));
        });
    });
    keywordsBySection.set('education', educationKeywords);

    // Summary
    const summaryKeywords = new Set<string>();
    if (resumeData.personalInfo?.summary) {
        extractKeywordsFromText(resumeData.personalInfo.summary).forEach(k => summaryKeywords.add(k));
    }
    keywordsBySection.set('summary', summaryKeywords);

    return keywordsBySection;
}

/**
 * Extract potential keywords from free text
 */
function extractKeywordsFromText(text: string): string[] {
    // Look for technology-like words and common keywords
    const techPatterns = [
        /\b[A-Z][a-z]+(?:\.[a-z]+)*\b/g, // PascalCase words like React, Node.js
        /\b[A-Z]{2,}\b/g, // Acronyms like AWS, GCP
        /\b\w+(?:\.js|\.py|\.ts)\b/gi, // File extensions
    ];

    const keywords: string[] = [];

    // Known technology words to look for
    const knownTechWords = Object.keys(KEYWORD_ALIASES).concat(
        Object.values(KEYWORD_ALIASES).flat()
    );

    const lowerText = text.toLowerCase();
    knownTechWords.forEach(tech => {
        if (lowerText.includes(tech.toLowerCase())) {
            keywords.push(tech);
        }
    });

    // Also look for capitalized words that might be technologies
    techPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            keywords.push(...matches);
        }
    });

    return [...new Set(keywords)];
}

/**
 * Match job description keywords against resume
 */
export function matchKeywords(
    resumeData: ResumeData,
    jobDescription: JobDescription
): KeywordMatchResult {
    const resumeKeywords = extractResumeKeywords(resumeData);
    const allJdKeywords = [...new Set([
        ...jobDescription.keywords,
        ...extractKeywordsFromRequirements(jobDescription.requirements),
        ...extractKeywordsFromRequirements(jobDescription.responsibilities),
    ])].filter(k => k.length > 1); // Filter out single characters

    const matched: KeywordMatch[] = [];
    const missing: string[] = [];
    const suggestAddToSkills: string[] = [];

    allJdKeywords.forEach(jdKeyword => {
        const foundIn: KeywordMatch['foundIn'] = [];
        let bestConfidence = 0;

        // Check each section
        for (const [section, keywords] of resumeKeywords) {
            for (const resumeKeyword of keywords) {
                const { matches, confidence } = keywordsMatch(jdKeyword, resumeKeyword);
                if (matches) {
                    foundIn.push(section as KeywordMatch['foundIn'][number]);
                    bestConfidence = Math.max(bestConfidence, confidence);
                    break; // Found in this section
                }
            }
        }

        if (foundIn.length > 0) {
            matched.push({
                keyword: jdKeyword,
                matched: true,
                foundIn,
                confidence: bestConfidence,
            });

            // Check if found elsewhere but not in skills
            if (!foundIn.includes('skills') && foundIn.length > 0) {
                // Check if it's a concrete skill worth adding
                if (isAddableSkill(jdKeyword)) {
                    suggestAddToSkills.push(jdKeyword);
                }
            }
        } else {
            missing.push(jdKeyword);
        }
    });

    const matchPercentage = allJdKeywords.length > 0
        ? Math.round((matched.length / allJdKeywords.length) * 100)
        : 0;

    return {
        matchPercentage,
        matched,
        missing,
        suggestAddToSkills,
        totalKeywords: allJdKeywords.length,
    };
}

/**
 * Extract keywords from requirements/responsibilities text
 */
function extractKeywordsFromRequirements(requirements: string[]): string[] {
    const keywords: string[] = [];
    requirements.forEach(req => {
        keywords.push(...extractKeywordsFromText(req));
    });
    return keywords;
}

/**
 * Check if a keyword is likely a skill worth adding to skills section
 */
function isAddableSkill(keyword: string): boolean {
    // Filter out common non-skill words
    const nonSkillWords = [
        'experience', 'years', 'team', 'work', 'ability', 'strong',
        'excellent', 'good', 'great', 'communication', 'skills',
    ];
    const lower = keyword.toLowerCase();
    return !nonSkillWords.some(w => lower.includes(w)) && keyword.length > 2;
}

/**
 * Get match color based on status
 */
export function getMatchColor(matched: boolean): 'green' | 'red' {
    return matched ? 'green' : 'red';
}
