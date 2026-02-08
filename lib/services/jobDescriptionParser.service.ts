import { createJSONCompletion, getDefaultModel, AIConfig } from './openai.service';
import type { ParsedJobDescription, JobDescriptionInput } from '@/types/ai.types';

/**
 * Job Description Parser Service
 * 
 * Parses and extracts structured data from job descriptions using AI
 */

/**
 * Parses a job description text into structured data
 */
export async function parseJobDescription(
    input: JobDescriptionInput,
    config?: AIConfig
): Promise<ParsedJobDescription> {
    if (!input.description || input.description.trim().length < 50) {
        throw new Error(
            'Job description is too short or empty. ' +
            `Minimum 50 characters required, got: ${input.description?.length || 0}`
        );
    }

    const systemPrompt = `You are an expert job description analyzer. Extract structured information from job descriptions.
Return a JSON object with the following structure:
{
  "title": "Job title",
  "company": "Company name",
  "description": "Clean job description",
  "requirements": ["requirement1", "requirement2"],
  "responsibilities": ["responsibility1", "responsibility2"],
  "skills": ["skill1", "skill2"],
  "keywords": ["keyword1", "keyword2"],
  "experienceLevel": "entry|mid|senior|lead",
  "employmentType": "full-time|part-time|contract|internship"
}`;

    const userPrompt = `Parse this job description:

Title: ${input.title}
Company: ${input.company}

Description:
${input.description}

Extract all requirements, responsibilities, skills, and relevant keywords. Be thorough but concise.`;

    try {
        const parsed = await createJSONCompletion<ParsedJobDescription>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config), // Use config model, env AI_MODEL, or default
                temperature: 0.3, // Lower temperature for more consistent parsing
                maxTokens: 2000,
                config,
            }
        );

        // Validate parsed data
        if (!parsed.requirements || !Array.isArray(parsed.requirements)) {
            throw new Error('Parsed job description missing requirements array');
        }

        if (!parsed.skills || !Array.isArray(parsed.skills)) {
            throw new Error('Parsed job description missing skills array');
        }

        // Ensure title and company are set
        parsed.title = parsed.title || input.title;
        parsed.company = parsed.company || input.company;

        return parsed;
    } catch (error) {
        throw new Error(
            `Failed to parse job description: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `Job title: ${input.title}, Company: ${input.company}`
        );
    }
}

/**
 * Extracts keywords from job description for ATS matching
 */
export async function extractKeywords(description: string, config?: AIConfig): Promise<string[]> {
    if (!description || description.trim().length < 20) {
        throw new Error('Description too short for keyword extraction');
    }

    const systemPrompt = `Extract relevant keywords from job descriptions for ATS (Applicant Tracking System) optimization.
Return ONLY a JSON array of keywords: ["keyword1", "keyword2", ...]
Focus on: technical skills, tools, frameworks, qualifications, certifications, and important action verbs.`;

    try {
        // Use the default model for keyword extraction (works with both OpenAI and NVIDIA NIM)
        const keywords = await createJSONCompletion<string[]>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: description },
            ],
            {
                model: getDefaultModel(config), // Use config model, env AI_MODEL, or default
                temperature: 0.2,
                maxTokens: 500,
                config,
            }
        );

        if (!Array.isArray(keywords)) {
            throw new Error('Keywords extraction returned non-array result');
        }

        // Remove duplicates and empty strings
        return [...new Set(keywords.filter((k) => k && k.trim().length > 0))];
    } catch (error) {
        throw new Error(
            `Keyword extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Determines experience level from job description
 */
export function inferExperienceLevel(
    description: string
): 'entry' | 'mid' | 'senior' | 'lead' {
    const lowerDesc = description.toLowerCase();

    // Lead/Principal/Director level
    if (
        lowerDesc.includes('lead') ||
        lowerDesc.includes('principal') ||
        lowerDesc.includes('director') ||
        lowerDesc.includes('head of') ||
        lowerDesc.includes('vp of') ||
        lowerDesc.includes('chief')
    ) {
        return 'lead';
    }

    // Senior level
    if (
        lowerDesc.includes('senior') ||
        lowerDesc.includes('sr.') ||
        lowerDesc.includes('10+ years') ||
        lowerDesc.includes('expert') ||
        lowerDesc.includes('architect')
    ) {
        return 'senior';
    }

    // Entry level
    if (
        lowerDesc.includes('junior') ||
        lowerDesc.includes('jr.') ||
        lowerDesc.includes('entry') ||
        lowerDesc.includes('intern') ||
        lowerDesc.includes('graduate') ||
        lowerDesc.includes('0-2 years') ||
        lowerDesc.includes('recent grad')
    ) {
        return 'entry';
    }

    // Default to mid-level
    return 'mid';
}

/**
 * Analyzes job description complexity
 */
export function analyzeJobComplexity(parsed: ParsedJobDescription): {
    score: number; // 0-100
    factors: string[];
} {
    const factors: string[] = [];
    let score = 50; // Base score

    // Requirements complexity
    if (parsed.requirements.length > 10) {
        score += 10;
        factors.push('Many requirements');
    } else if (parsed.requirements.length < 5) {
        score -= 10;
        factors.push('Few requirements');
    }

    // Skills complexity
    if (parsed.skills.length > 15) {
        score += 10;
        factors.push('Extensive skill set required');
    }

    // Experience level
    if (parsed.experienceLevel === 'senior' || parsed.experienceLevel === 'lead') {
        score += 15;
        factors.push('Senior/Lead position');
    } else if (parsed.experienceLevel === 'entry') {
        score -= 10;
        factors.push('Entry-level position');
    }

    // Responsibilities
    if (parsed.responsibilities.length > 8) {
        score += 5;
        factors.push('Multiple responsibilities');
    }

    // Clamp score between 0-100
    score = Math.max(0, Math.min(100, score));

    return { score, factors };
}

