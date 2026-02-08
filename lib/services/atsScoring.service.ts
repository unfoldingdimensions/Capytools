import { createCompletion, getDefaultModel, AIConfig } from './openai.service';
import type { ResumeData } from '@/types/resume.types';
import type { ParsedJobDescription, ATSScoreResult } from '@/types/ai.types';

/**
 * ATS Scoring Service
 * 
 * Analyzes resumes against job descriptions and provides ATS compatibility scores
 */

/**
 * Scores a resume against a job description
 */
export async function scoreResumeAgainstJob(
    resume: ResumeData,
    jobDescription: ParsedJobDescription,
    config?: AIConfig
): Promise<ATSScoreResult> {
    // Validate inputs
    if (!resume.personalInfo?.fullName) {
        throw new Error('Resume missing personal information');
    }

    if (!jobDescription.requirements || jobDescription.requirements.length === 0) {
        throw new Error('Job description missing requirements');
    }

    // Calculate individual scores
    const keywordScore = calculateKeywordMatch(resume, jobDescription);
    const skillsScore = calculateSkillsMatch(resume, jobDescription);
    const experienceScore = calculateExperienceMatch(resume, jobDescription);
    const formattingScore = calculateFormattingScore(resume);

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
        keywordScore.score * 0.3 +
        skillsScore.score * 0.35 +
        experienceScore.score * 0.25 +
        formattingScore.score * 0.1
    );

    // Generate detailed suggestions using AI
    const suggestions = await generateImprovementSuggestions(
        resume,
        jobDescription,
        {
            keywordScore,
            skillsScore,
            experienceScore,
            formattingScore,
            overallScore,
        },
        config
    );

    // Identify missing keywords
    const missingKeywords = findMissingKeywords(resume, jobDescription);

    // Match analysis
    const matchedRequirements = findMatchedRequirements(resume, jobDescription);

    return {
        overallScore,
        categoryScores: {
            keywords: keywordScore.score,
            skills: skillsScore.score,
            experience: experienceScore.score,
            formatting: formattingScore.score,
        },
        suggestions,
        missingKeywords,
        matchedRequirements,
        analysisDate: new Date(),
    };
}

/**
 * Calculates keyword match score
 */
function calculateKeywordMatch(
    resume: ResumeData,
    jobDescription: ParsedJobDescription
): { score: number; details: string[] } {
    const details: string[] = [];
    const resumeText = extractResumeText(resume).toLowerCase();
    const keywords = jobDescription.keywords || [];

    if (keywords.length === 0) {
        return { score: 50, details: ['No keywords to match'] };
    }

    const matchedKeywords = keywords.filter((keyword) =>
        resumeText.includes(keyword.toLowerCase())
    );

    const matchRatio = matchedKeywords.length / keywords.length;
    const score = Math.round(matchRatio * 100);

    details.push(`Matched ${matchedKeywords.length}/${keywords.length} keywords`);

    if (matchRatio < 0.3) {
        details.push('Low keyword match - add more relevant keywords');
    } else if (matchRatio < 0.6) {
        details.push('Moderate keyword match - include additional keywords');
    } else {
        details.push('Good keyword match');
    }

    return { score, details };
}

/**
 * Calculates skills match score
 */
function calculateSkillsMatch(
    resume: ResumeData,
    jobDescription: ParsedJobDescription
): { score: number; details: string[] } {
    const details: string[] = [];
    // Extract all skills from skill categories
    const resumeSkills = (resume.skills || []).flatMap((s) => s.skills).map((skill) => skill.toLowerCase());
    const requiredSkills = jobDescription.skills.map((s) => s.toLowerCase());

    if (requiredSkills.length === 0) {
        return { score: 50, details: ['No required skills specified'] };
    }

    const matchedSkills = requiredSkills.filter((skill) =>
        resumeSkills.some((rSkill) => rSkill.includes(skill) || skill.includes(rSkill))
    );

    const matchRatio = matchedSkills.length / requiredSkills.length;
    const score = Math.round(matchRatio * 100);

    details.push(`Matched ${matchedSkills.length}/${requiredSkills.length} required skills`);

    if (matchRatio < 0.4) {
        details.push('Critical: Missing many required skills');
    } else if (matchRatio < 0.7) {
        details.push('Add more required skills to your resume');
    } else {
        details.push('Strong skills match');
    }

    return { score, details };
}

/**
 * Calculates experience match score
 */
function calculateExperienceMatch(
    resume: ResumeData,
    jobDescription: ParsedJobDescription
): { score: number; details: string[] } {
    const details: string[] = [];

    // Calculate total years of experience
    const totalYears = calculateTotalExperience(resume.workExperience || []);
    const experienceLevel = jobDescription.experienceLevel;

    let score = 50;

    if (experienceLevel === 'entry') {
        score = totalYears >= 0 ? 90 : 50;
        details.push('Entry-level position');
    } else if (experienceLevel === 'mid') {
        if (totalYears >= 3) {
            score = 90;
            details.push('Experience matches mid-level requirement');
        } else if (totalYears >= 2) {
            score = 70;
            details.push('Slightly below mid-level experience');
        } else {
            score = 40;
            details.push('Insufficient experience for mid-level');
        }
    } else if (experienceLevel === 'senior') {
        if (totalYears >= 5) {
            score = 90;
            details.push('Experience matches senior requirement');
        } else if (totalYears >= 4) {
            score = 65;
            details.push('Approaching senior-level experience');
        } else {
            score = 30;
            details.push('Insufficient experience for senior role');
        }
    } else if (experienceLevel === 'lead') {
        if (totalYears >= 8) {
            score = 90;
            details.push('Experience matches lead requirement');
        } else if (totalYears >= 6) {
            score = 60;
            details.push('Approaching lead-level experience');
        } else {
            score = 25;
            details.push('Insufficient experience for lead role');
        }
    }

    details.push(`Total experience: ${totalYears} years`);

    return { score, details };
}

/**
 * Calculates formatting score (ATS-friendliness)
 */
function calculateFormattingScore(resume: ResumeData): { score: number; details: string[] } {
    const details: string[] = [];
    let score = 100;

    // Check for essential sections
    if (!resume.personalInfo?.fullName) {
        score -= 20;
        details.push('Missing full name');
    }

    if (!resume.personalInfo?.email) {
        score -= 20;
        details.push('Missing email address');
    }

    if (!resume.workExperience || resume.workExperience.length === 0) {
        score -= 20;
        details.push('Missing work experience');
    }

    if (!resume.skills || resume.skills.length === 0) {
        score -= 15;
        details.push('Missing skills section');
    }

    if (!resume.education || resume.education.length === 0) {
        score -= 10;
        details.push('Missing education section');
    }

    // Positive checks
    if (resume.personalInfo?.summary) {
        details.push('Has professional summary');
    }

    if (resume.certifications && resume.certifications.length > 0) {
        details.push('Includes certifications');
    }

    if (score >= 90) {
        details.push('Excellent ATS formatting');
    } else if (score >= 70) {
        details.push('Good ATS formatting');
    } else if (score >= 50) {
        details.push('Needs formatting improvements');
    } else {
        details.push('Poor ATS formatting - major improvements needed');
    }

    return { score: Math.max(0, score), details };
}

/**
 * Generates improvement suggestions using AI
 */
async function generateImprovementSuggestions(
    resume: ResumeData,
    jobDescription: ParsedJobDescription,
    scores: {
        keywordScore: { score: number; details: string[] };
        skillsScore: { score: number; details: string[] };
        experienceScore: { score: number; details: string[] };
        formattingScore: { score: number; details: string[] };
        overallScore: number;
    },
    config?: AIConfig
): Promise<string[]> {
    const systemPrompt = `You are an expert resume consultant and ATS optimization specialist.
Provide 5-7 specific, actionable suggestions to improve a resume for a specific job.
Return ONLY a JSON array of strings: ["suggestion1", "suggestion2", ...]`;

    const userPrompt = `Job: ${jobDescription.title} at ${jobDescription.company}

Resume Summary: ${resume.personalInfo?.summary || 'No summary'}
Skills: ${(resume.skills || []).flatMap((s) => s.skills).join(', ')}
Experience: ${(resume.workExperience || []).length} positions

Scores:
- Overall: ${scores.overallScore}/100
- Keywords: ${scores.keywordScore.score}/100 (${scores.keywordScore.details.join(', ')})
- Skills: ${scores.skillsScore.score}/100 (${scores.skillsScore.details.join(', ')})
- Experience: ${scores.experienceScore.score}/100 (${scores.experienceScore.details.join(', ')})
- Formatting: ${scores.formattingScore.score}/100 (${scores.formattingScore.details.join(', ')})

Key Requirements: ${jobDescription.requirements.slice(0, 5).join(', ')}
Required Skills: ${jobDescription.skills.slice(0, 10).join(', ')}

Provide specific, actionable suggestions to improve this resume for this job.`;

    try {
        const response = await createCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config),
                temperature: 0.7,
                maxTokens: 1000,
                config,
            }
        );

        // Parse suggestions from response
        const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const suggestions = JSON.parse(cleanedResponse) as string[];

        if (!Array.isArray(suggestions)) {
            throw new Error('AI returned non-array suggestions');
        }

        return suggestions;
    } catch (error) {
        console.error('Failed to generate AI suggestions:', error);

        // Fallback to rule-based suggestions
        return generateFallbackSuggestions(scores);
    }
}

/**
 * Generates fallback suggestions if AI fails
 */
function generateFallbackSuggestions(scores: {
    keywordScore: { score: number; details: string[] };
    skillsScore: { score: number; details: string[] };
    experienceScore: { score: number; details: string[] };
    formattingScore: { score: number; details: string[] };
}): string[] {
    const suggestions: string[] = [];

    if (scores.keywordScore.score < 60) {
        suggestions.push('Add more job-specific keywords from the job description throughout your resume');
    }

    if (scores.skillsScore.score < 60) {
        suggestions.push('Highlight required skills more prominently in your skills section and work experience');
    }

    if (scores.experienceScore.score < 60) {
        suggestions.push('Emphasize relevant experience and quantify your achievements with metrics');
    }

    if (scores.formattingScore.score < 80) {
        suggestions.push('Ensure all standard resume sections are complete and properly formatted');
    }

    suggestions.push('Use action verbs to start bullet points in your experience section');
    suggestions.push('Tailor your professional summary to match the job requirements');

    return suggestions;
}

/**
 * Finds missing keywords from job description
 */
function findMissingKeywords(
    resume: ResumeData,
    jobDescription: ParsedJobDescription
): string[] {
    const resumeText = extractResumeText(resume).toLowerCase();
    const keywords = jobDescription.keywords || [];

    return keywords.filter((keyword) => !resumeText.includes(keyword.toLowerCase()));
}

/**
 * Finds matched requirements
 */
function findMatchedRequirements(
    resume: ResumeData,
    jobDescription: ParsedJobDescription
): number {
    const resumeText = extractResumeText(resume).toLowerCase();
    const requirements = jobDescription.requirements || [];

    return requirements.filter((req) => {
        const reqKeywords = req.toLowerCase().split(' ').filter((w) => w.length > 3);
        const matchCount = reqKeywords.filter((keyword) => resumeText.includes(keyword)).length;
        return matchCount / reqKeywords.length >= 0.5; // At least 50% of keywords match
    }).length;
}

/**
 * Extracts all text from resume
 */
function extractResumeText(resume: ResumeData): string {
    const parts: string[] = [];

    if (resume.personalInfo?.fullName) parts.push(resume.personalInfo.fullName);
    if (resume.personalInfo?.summary) parts.push(resume.personalInfo.summary);

    // Extract all skills from skill categories
    (resume.skills || []).forEach((skillGroup) => {
        parts.push(...skillGroup.skills);
    });

    (resume.workExperience || []).forEach((exp) => {
        parts.push(exp.company, exp.position);
        parts.push(...(exp.achievements || []));
    });

    (resume.education || []).forEach((edu) => {
        parts.push(edu.institution, edu.degree, edu.field || '');
    });

    (resume.projects || []).forEach((proj) => {
        parts.push(proj.title, proj.description);
    });

    return parts.join(' ');
}

/**
 * Calculates total years of experience
 */
function calculateTotalExperience(
    workExperience: Array<{ startDate: string; endDate?: string | null }>
): number {
    let totalMonths = 0;

    workExperience.forEach((exp) => {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();

        const months = (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth());

        totalMonths += Math.max(0, months);
    });

    return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal place
}

