import { createCompletion, createJSONCompletion, getDefaultModel } from './openai.service';
import type { ResumeData } from '@/types/resume.types';
import type { ParsedJobDescription, TailoredResumeResult } from '@/types/ai.types';

/**
 * Resume Tailoring Service
 * 
 * AI-powered resume optimization for specific job descriptions
 */

/**
 * Remove common AI preambles and explanatory text from responses
 */
function cleanAIResponse(text: string): string {
    let cleaned = text.trim();

    // Remove common preambles at the start
    const preambles = [
        /^Here is (a|an|the) (professional )?summary.*?:\s*/i,
        /^Here are (the )?(bullet points?|suggestions?).*?:\s*/i,
        /^Here'?s (a|an|the).*?:\s*/i,
        /^I'?ve (generated|created|written).*?:\s*/i,
        /^Based on.*?:\s*/i,
        /^Sure[,!]? (here'?s|here is).*?:\s*/i,
        /^Certainly[,!]? (here'?s|here is).*?:\s*/i,
        /^Role:.*?\n/i,
        /^(Position|Title|Job):.*?\n/i,
    ];

    for (const pattern of preambles) {
        cleaned = cleaned.replace(pattern, '');
    }

    // Remove explanatory notes and trailing text
    const trailingPatterns = [
        /\n\s*Note that this.*/is,
        /\n\s*This (summary|content).*/is,
        /\n\s*Let me know if you.*/is,
        /\n\s*Feel free to.*/is,
        /\n\s*I hope this.*/is,
        /\n\s*Please let me know.*/is,
        /\n\s*Would you like.*/is,
        /\n\s*If you need.*/is,
    ];

    for (const pattern of trailingPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
}

/**
 * Tailors a resume to match a job description
 */
export async function tailorResumeToJob(
    resume: ResumeData,
    jobDescription: ParsedJobDescription
): Promise<TailoredResumeResult> {
    if (!resume.personalInfo?.fullName) {
        throw new Error('Resume must have personal information');
    }

    if (!jobDescription.title) {
        throw new Error('Job description must have a title');
    }

    // Generate tailored professional summary
    const tailoredSummary = await generateTailoredSummary(resume, jobDescription);

    // Optimize experience descriptions
    const optimizedExperience = await optimizeExperienceDescriptions(
        resume.workExperience || [],
        jobDescription
    );

    // Suggest additional skills to highlight
    const suggestedSkills = await suggestSkillsToHighlight(resume, jobDescription);

    // Generate customized bullet points
    const customizations = await generateCustomizations(resume, jobDescription);

    return {
        originalResume: resume,
        tailoredSummary,
        optimizedExperience,
        suggestedSkills,
        customizations,
    };
}

/**
 * Generates a tailored professional summary
 */
async function generateTailoredSummary(
    resume: ResumeData,
    jobDescription: ParsedJobDescription
): Promise<string> {
    const currentSummary = resume.personalInfo?.summary || 'No current summary';
    const workExperience = resume.workExperience || [];
    const allSkills = (resume.skills || []).flatMap((s) => s.skills);

    const systemPrompt = `You are an expert resume writer. Create a compelling professional summary (2-3 sentences) 
tailored to a specific job. Focus on relevant skills, experience, and value proposition. 
Write in first person without using "I". Be specific and results-oriented.

CRITICAL: Return ONLY the summary text itself. No introductory phrases, no role labels, no notes, no explanations.`;

    const userPrompt = `Job: ${jobDescription.title} at ${jobDescription.company}

Current Summary: ${currentSummary}

My Experience:
${workExperience.slice(0, 3).map((exp) => `- ${exp.position} at ${exp.company}`).join('\n')}

My Skills: ${allSkills.slice(0, 10).join(', ')}

Key Job Requirements:
${jobDescription.requirements.slice(0, 5).join('\n')}

Required Skills: ${jobDescription.skills.slice(0, 8).join(', ')}

Write a tailored professional summary that positions me as an ideal candidate for this role. Return ONLY the summary text, no preamble or notes.`;

    try {
        const summary = await createCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(),
                temperature: 0.7,
                maxTokens: 200,
            }
        );

        // Clean AI preambles and surrounding quotes
        return cleanAIResponse(summary).replace(/^["']|["']$/g, '');
    } catch (error) {
        throw new Error(
            `Failed to generate tailored summary: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Optimizes experience descriptions for job match
 */
async function optimizeExperienceDescriptions(
    workExperience: ResumeData['workExperience'],
    jobDescription: ParsedJobDescription
): Promise<Array<{ position: string; company: string; optimizedAchievements: string[] }>> {
    if (!workExperience || workExperience.length === 0) {
        return [];
    }

    const systemPrompt = `You are an expert resume writer specializing in achievement-focused bullet points.
Optimize work experience bullet points to match job requirements while maintaining truthfulness.
Use strong action verbs, quantify results when possible, and highlight relevant skills.
Return JSON array: [{"position": "title", "company": "name", "achievements": ["bullet1", "bullet2"]}]`;

    const userPrompt = `Target Job: ${jobDescription.title}
Required Skills: ${jobDescription.skills.slice(0, 10).join(', ')}
Key Requirements: ${jobDescription.requirements.slice(0, 5).join('; ')}

Current Experience:
${workExperience.slice(0, 3).map((exp, i: number) => `
${i + 1}. ${exp.position} at ${exp.company}
Current bullets:
${(exp.achievements || ['No achievements listed']).slice(0, 4).map((a: string) => `- ${a}`).join('\n')}
`).join('\n')}

Optimize each position's achievements (3-5 bullets each) to better match the target job. 
Keep the core responsibilities but emphasize relevant skills and quantifiable results.`;

    try {
        const optimized = await createJSONCompletion<
            Array<{ position: string; company: string; achievements: string[] }>
        >(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(),
                temperature: 0.6,
                maxTokens: 2000,
            }
        );

        return optimized.map((exp) => ({
            position: exp.position,
            company: exp.company,
            optimizedAchievements: exp.achievements || [],
        }));
    } catch (error) {
        console.error('Failed to optimize experience descriptions:', error);
        return [];
    }
}

/**
 * Suggests skills to highlight based on job requirements
 */
async function suggestSkillsToHighlight(
    resume: ResumeData,
    jobDescription: ParsedJobDescription
): Promise<string[]> {
    const currentSkills = (resume.skills || []).flatMap((s) => s.skills);
    const requiredSkills = jobDescription.skills;

    const systemPrompt = `You are a career coach helping identify which skills to emphasize.
Return ONLY a JSON array of skill names: ["skill1", "skill2", ...]
Include skills the candidate has that match job requirements, plus relevant related skills.`;

    const userPrompt = `Job Required Skills: ${requiredSkills.join(', ')}

Candidate's Current Skills: ${currentSkills.join(', ')}

Candidate's Experience:
${(resume.workExperience || [])
            .slice(0, 3)
            .map((exp) => `${exp.position} at ${exp.company}`)
            .join(', ')}

Which skills should this candidate highlight most prominently for this role? 
Include both exact matches and closely related skills they likely have.`;

    try {
        const skills = await createJSONCompletion<string[]>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(),
                temperature: 0.4,
                maxTokens: 300,
            }
        );

        return skills.slice(0, 15); // Limit to top 15 skills
    } catch (error) {
        console.error('Failed to suggest skills:', error);

        // Fallback: return skills that match job requirements
        const currentSkillsArray = (resume.skills || []).flatMap((s) => s.skills);
        return currentSkillsArray.filter((skill: string) =>
            requiredSkills.some((req) =>
                skill.toLowerCase().includes(req.toLowerCase()) ||
                req.toLowerCase().includes(skill.toLowerCase())
            )
        );
    }
}

/**
 * Generates specific customization recommendations
 */
async function generateCustomizations(
    resume: ResumeData,
    jobDescription: ParsedJobDescription
): Promise<string[]> {
    const systemPrompt = `You are a resume consultant providing specific customization advice.
Return ONLY a JSON array of actionable recommendations: ["action1", "action2", ...]
Each recommendation should be specific and directly applicable to this resume and job.`;

    const userPrompt = `Target Job: ${jobDescription.title} at ${jobDescription.company}

Job Requirements:
${jobDescription.requirements.slice(0, 7).join('\n')}

Resume Highlights:
- Summary: ${resume.personalInfo?.summary || 'None'}
- Experience: ${(resume.workExperience || []).length} positions
- Skills: ${(resume.skills || []).flatMap((s) => s.skills).length} skills listed
- Education: ${(resume.education || []).length} degrees
- Projects: ${(resume.projects || []).length} projects

Provide 5-7 specific customizations this candidate should make to optimize their resume for this job.`;

    try {
        const customizations = await createJSONCompletion<string[]>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(),
                temperature: 0.7,
                maxTokens: 800,
            }
        );

        return customizations;
    } catch (error) {
        console.error('Failed to generate customizations:', error);
        return [
            'Update your professional summary to mention skills relevant to this role',
            'Reorder your skills section to prioritize job requirements',
            'Add quantifiable metrics to your achievements where possible',
            'Highlight projects or experience that demonstrate required skills',
            'Include relevant keywords from the job description naturally throughout your resume',
        ];
    }
}

/**
 * Generates keyword-optimized content for a section
 */
export async function optimizeSection(
    sectionName: string,
    currentContent: string,
    jobDescription: ParsedJobDescription,
    keywords: string[]
): Promise<string> {
    if (!currentContent || currentContent.trim().length < 10) {
        throw new Error('Section content is too short to optimize');
    }

    const systemPrompt = `You are a resume optimization expert. Improve resume content to include relevant keywords naturally 
while maintaining readability and truthfulness. Do not fabricate information.`;

    const userPrompt = `Section: ${sectionName}

Current Content:
${currentContent}

Target Job: ${jobDescription.title}
Keywords to incorporate: ${keywords.slice(0, 10).join(', ')}

Rewrite this section to better match the job while keeping it truthful and professional.
Include relevant keywords naturally.`;

    try {
        const optimized = await createCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(),
                temperature: 0.6,
                maxTokens: 300,
            }
        );

        return cleanAIResponse(optimized);
    } catch (error) {
        throw new Error(
            `Failed to optimize section: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Validates tailored resume changes
 */
export function validateTailoredResume(tailored: TailoredResumeResult): {
    isValid: boolean;
    issues: string[];
} {
    const issues: string[] = [];

    if (!tailored.tailoredSummary || tailored.tailoredSummary.length < 50) {
        issues.push('Tailored summary is too short');
    }

    if (tailored.tailoredSummary.length > 500) {
        issues.push('Tailored summary is too long (max 500 characters)');
    }

    if (!tailored.suggestedSkills || tailored.suggestedSkills.length === 0) {
        issues.push('No suggested skills provided');
    }

    if (!tailored.customizations || tailored.customizations.length === 0) {
        issues.push('No customizations provided');
    }

    return {
        isValid: issues.length === 0,
        issues,
    };
}

