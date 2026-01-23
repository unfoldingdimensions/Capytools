import { createCompletion, getDefaultModel, AIConfig } from './openai.service';
import type { ResumeData, WorkExperience, Education, Project, Skill } from '@/types/resume.types';
import type { ParsedJobDescription } from '@/types/ai.types';

/**
 * Section-specific Resume Tailoring Service
 * Generates AI-powered suggestions for individual resume sections
 */

/**
 * Remove common AI preambles and explanatory text
 */
function cleanAIResponse(text: string): string {
    let cleaned = text.trim();

    const preambles = [
        /^Here is (a|an|the) (professional )?.*?:\s*/i,
        /^Here are (the )?.*?:\s*/i,
        /^Here'?s (a|an|the).*?:\s*/i,
        /^I'?ve (generated|created|written).*?:\s*/i,
        /^Based on.*?:\s*/i,
        /^Sure[,!]? (here'?s|here is).*?:\s*/i,
        /^Certainly[,!]? (here'?s|here is).*?:\s*/i,
    ];

    for (const pattern of preambles) {
        cleaned = cleaned.replace(pattern, '');
    }

    const trailingPatterns = [
        /\n\s*Note that this.*/is,
        /\n\s*This (summary|content).*/is,
        /\n\s*Let me know if you.*/is,
        /\n\s*Feel free to.*/is,
        /\n\s*I hope this.*/is,
    ];

    for (const pattern of trailingPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
}

/**
 * Generate tailored professional summary
 */
export async function generateTailoredSummary(
    resume: ResumeData,
    jobDescription: ParsedJobDescription,
    config?: AIConfig
): Promise<string> {
    const currentSummary = resume.personalInfo?.summary || 'No current summary';
    const workExperience = resume.workExperience || [];
    const allSkills = (resume.skills || []).flatMap((s) => s.skills);

    const systemPrompt = `You are an expert resume writer specializing in ATS-optimized professional summaries. 
Create a compelling 2-3 sentence professional summary tailored to the job description.
Focus on relevant skills, quantifiable achievements, and value proposition.
Write in first person without using "I". Be specific and results-oriented.
Include relevant keywords from the job description naturally.

CRITICAL: Return ONLY the summary text. No introductions, no explanations, no notes.`;

    const userPrompt = `Job Title: ${jobDescription.title}
Company: ${jobDescription.company}

Current Summary: ${currentSummary}

My Recent Experience:
${workExperience.slice(0, 3).map((exp, i) => `${i + 1}. ${exp.position} at ${exp.company}${exp.achievements?.[0] ? ` - ${exp.achievements[0]}` : ''}`).join('\n')}

My Skills: ${allSkills.slice(0, 15).join(', ')}

Key Job Requirements:
${jobDescription.requirements.slice(0, 5).map((req, i) => `${i + 1}. ${req}`).join('\n')}

Required Skills/Keywords: ${jobDescription.keywords.slice(0, 10).join(', ')}

Create a tailored professional summary that positions me as an ideal candidate. Use power words and quantifiable achievements where possible.`;

    try {
        const summary = await createCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config),
                temperature: 0.7,
                maxTokens: 250,
                config
            }
        );

        return cleanAIResponse(summary).replace(/^["']|["']$/g, '');
    } catch (error) {
        throw new Error(
            `Failed to generate tailored summary: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Generate tailored work experience suggestions
 */
export async function generateTailoredWorkExperience(
    workExperience: WorkExperience[] | WorkExperience,
    _resume: ResumeData,
    jobDescription: ParsedJobDescription,
    config?: AIConfig
): Promise<{ achievements: string[]; tips: string[] }> {
    const experiences = Array.isArray(workExperience) ? workExperience : [workExperience];
    if (experiences.length === 0 || !experiences[0]) {
        return { achievements: [], tips: ['Add your work experience to get AI suggestions'] };
    }

    const exp = experiences[0]; // Focus on the first/most relevant experience

    const systemPrompt = `You are an expert resume writer specializing in achievement-based bullet points.
Transform work experience into compelling, ATS-optimized achievement bullets.
Use the STAR method (Situation, Task, Action, Result) and quantify results where possible.
Start with strong action verbs and include relevant keywords from the job description.
Each bullet should be 1-2 lines maximum.

CRITICAL: Return ONLY 3-5 achievement bullets in JSON array format: ["bullet1", "bullet2", ...]
No introductions, no explanations, just the JSON array.`;

    const userPrompt = `Target Job: ${jobDescription.title} at ${jobDescription.company}

My Current Experience:
Position: ${exp.position} at ${exp.company}
Location: ${exp.location || 'N/A'}
Duration: ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || 'N/A'}
Current Description: ${exp.description || 'N/A'}
Current Achievements: ${exp.achievements?.join('; ') || 'None listed'}

Job Requirements: ${jobDescription.requirements.slice(0, 5).join(', ')}
Key Skills Needed: ${jobDescription.keywords.slice(0, 8).join(', ')}
Responsibilities: ${jobDescription.responsibilities.slice(0, 5).join(', ')}

Generate 3-5 powerful achievement bullets that align with this job. Focus on:
- Quantifiable results
- Relevant keywords
- Action-oriented language
- Demonstrating impact

Return ONLY a JSON array of strings.`;

    try {
        const response = await createCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config),
                temperature: 0.7,
                maxTokens: 400,
                config
            }
        );

        const cleaned = cleanAIResponse(response);

        // Try to parse as JSON array
        let achievements: string[];
        try {
            // Remove markdown code blocks if present
            const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                achievements = JSON.parse(jsonMatch[0]) as string[];
            } else {
                // Fallback: split by newlines and filter
                achievements = cleaned.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('{') && !line.startsWith('}'))
                    .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''))
                    .filter(line => line.length > 10);
            }
        } catch {
            // Fallback parsing
            achievements = cleaned.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 10)
                .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''))
                .slice(0, 5);
        }

        const tips = [
            `Include keywords: ${jobDescription.keywords.slice(0, 3).join(', ')}`,
            'Use action verbs: Led, Implemented, Increased, Reduced, Developed',
            'Quantify results with numbers, percentages, or timeframes',
        ];

        return { achievements: achievements.slice(0, 5), tips };
    } catch (error) {
        throw new Error(
            `Failed to generate work experience suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Generate tailored education suggestions
 */
export async function generateTailoredEducation(
    education: Education[] | Education,
    jobDescription: ParsedJobDescription,
    config?: AIConfig
): Promise<{ relevantPoints: string[]; tips: string[] }> {
    const educations = Array.isArray(education) ? education : [education];
    if (educations.length === 0 || !educations[0]) {
        return { relevantPoints: [], tips: ['Add your education to get AI suggestions'] };
    }

    const edu = educations[0];

    const systemPrompt = `You are an expert resume writer. Generate 2-3 achievement bullets for education section.
Focus on relevant coursework, projects, honors, or extracurriculars that align with the target job.
Be specific and highlight transferable skills.

CRITICAL: Return ONLY a JSON array of 2-3 strings: ["point1", "point2", "point3"]`;

    const userPrompt = `Target Job: ${jobDescription.title}

My Education:
Degree: ${edu.degree} in ${edu.field || 'N/A'}
School: ${edu.institution}
GPA: ${edu.gpa || 'N/A'}
Current Achievements: ${edu.achievements?.join('; ') || 'None listed'}

Job Requirements: ${jobDescription.requirements.slice(0, 5).join(', ')}
Key Skills: ${jobDescription.keywords.slice(0, 8).join(', ')}

Generate 2-3 relevant education highlights that connect to this job. Return ONLY a JSON array.`;

    try {
        const response = await createCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config),
                temperature: 0.7,
                maxTokens: 300,
                config
            }
        );

        const cleaned = cleanAIResponse(response);
        let relevantPoints: string[];

        try {
            const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                relevantPoints = JSON.parse(jsonMatch[0]) as string[];
            } else {
                relevantPoints = cleaned.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 10)
                    .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''))
                    .slice(0, 3);
            }
        } catch {
            relevantPoints = cleaned.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 10)
                .slice(0, 3);
        }

        const tips = [
            'Highlight relevant coursework or projects',
            'Mention honors, awards, or leadership roles',
            'Connect academic achievements to job requirements',
        ];

        return { relevantPoints: relevantPoints.slice(0, 3), tips };
    } catch (error) {
        throw new Error(
            `Failed to generate education suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Generate tailored project suggestions
 */
export async function generateTailoredProjects(
    projects: Project[] | Project,
    jobDescription: ParsedJobDescription,
    config?: AIConfig
): Promise<{ highlights: string[]; tips: string[] }> {
    const projectList = Array.isArray(projects) ? projects : [projects];
    if (projectList.length === 0 || !projectList[0]) {
        return { highlights: [], tips: ['Add your projects to get AI suggestions'] };
    }

    const project = projectList[0];

    const systemPrompt = `You are an expert resume writer. Generate 2-4 achievement-focused highlights for a project.
Focus on technical skills, impact, and results that align with the job description.
Use action verbs and quantify results where possible.

CRITICAL: Return ONLY a JSON array of 2-4 strings: ["highlight1", "highlight2", ...]`;

    const userPrompt = `Target Job: ${jobDescription.title}

My Project:
Name: ${project.title}
Description: ${project.description || 'N/A'}
Technologies: ${project.technologies?.join(', ') || 'N/A'}
Current Highlights: ${project.highlights?.join('; ') || 'None listed'}

Job Requirements: ${jobDescription.requirements.slice(0, 5).join(', ')}
Required Skills: ${jobDescription.keywords.slice(0, 8).join(', ')}

Generate 2-4 project highlights that demonstrate relevant skills for this job. Return ONLY a JSON array.`;

    try {
        const response = await createCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config),
                temperature: 0.7,
                maxTokens: 350,
                config
            }
        );

        const cleaned = cleanAIResponse(response);
        let highlights: string[];

        try {
            const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                highlights = JSON.parse(jsonMatch[0]) as string[];
            } else {
                highlights = cleaned.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 10)
                    .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''))
                    .slice(0, 4);
            }
        } catch {
            highlights = cleaned.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 10)
                .slice(0, 4);
        }

        const tips = [
            'Emphasize relevant technologies and methodologies',
            'Highlight measurable outcomes or impact',
            'Connect project skills to job requirements',
        ];

        return { highlights: highlights.slice(0, 4), tips };
    } catch (error) {
        throw new Error(
            `Failed to generate project suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Generate tailored skills suggestions
 */
export async function generateTailoredSkills(
    currentSkills: Skill[],
    jobDescription: ParsedJobDescription,
    config?: AIConfig
): Promise<{ suggestedSkills: string[]; tips: string[] }> {
    const allCurrentSkills = currentSkills.flatMap(cat => cat.skills);

    const systemPrompt = `You are an expert resume writer. Analyze the job description and suggest relevant skills to add or emphasize.
Focus on skills mentioned in the job posting that align with the candidate's background.

CRITICAL: Return ONLY a JSON array of 5-8 skill strings: ["skill1", "skill2", ...]`;

    const userPrompt = `Target Job: ${jobDescription.title}

My Current Skills: ${allCurrentSkills.join(', ') || 'None listed'}

Job Requirements: ${jobDescription.requirements.join(', ')}
Required Skills: ${jobDescription.keywords.join(', ')}
Responsibilities: ${jobDescription.responsibilities.slice(0, 5).join(', ')}

Suggest 5-8 relevant skills I should highlight or add to match this job. Prioritize:
1. Skills mentioned in job description
2. Industry-standard related skills
3. Technical and soft skills balance

Return ONLY a JSON array of skill names.`;

    try {
        const response = await createCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config),
                temperature: 0.6,
                maxTokens: 300,
                config
            }
        );

        const cleaned = cleanAIResponse(response);
        let suggestedSkills: string[];

        try {
            const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                suggestedSkills = JSON.parse(jsonMatch[0]) as string[];
            } else {
                suggestedSkills = cleaned.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 2)
                    .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''))
                    .slice(0, 8);
            }
        } catch {
            suggestedSkills = cleaned.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 2)
                .slice(0, 8);
        }

        const tips = [
            'Prioritize skills mentioned in job description',
            'Group skills by category (Technical, Soft, Tools)',
            'Keep most relevant skills near the top',
        ];

        return { suggestedSkills: suggestedSkills.slice(0, 8), tips };
    } catch (error) {
        throw new Error(
            `Failed to generate skill suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

