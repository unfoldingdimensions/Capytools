import { createCompletion, createJSONCompletion, getDefaultModel, AIConfig } from './openai.service';
import { cleanAIResponse } from '@/lib/utils/aiTextCleanup';
import type { ResumeData, WorkExperience, Education, Project, Skill } from '@/types/resume.types';
import type { ParsedJobDescription } from '@/types/ai.types';

/**
 * Section-specific Resume Tailoring Service
 * Generates AI-powered suggestions for individual resume sections
 */

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

    const systemPrompt = `You are an expert resume writer and ATS optimization specialist.
Your goal is to write a professional summary that ranks high in ATS systems for the specific target role.

CRITICAL RULES:
1.  **Keyword Injection:** You MUST naturally include the top 3 hard skills/keywords from the job description.
2.  **First Person (Implied):** Write in implied first person (e.g., "Experienced Software Engineer..." instead of "I am an...").
3.  **Measurable Impact:** Mention years of experience and a key quantifiable achievement if available in the source data.
4.  **Length:** Strictly 3-4 sentences (approx. 50-75 words).
5.  **No Fluff:** Remove generic soft skills like "hard worker" unless specifically requested.
6.  **Format:** Return ONLY the summary text. No introductions, no notes.`;

    const userPrompt = `Target Role: ${jobDescription.title}
Company: ${jobDescription.company}

Current Summary: ${currentSummary}

My Recent Experience:
${workExperience.slice(0, 3).map((exp, i) => `${i + 1}. ${exp.position} at ${exp.company}${exp.achievements?.[0] ? ` - ${exp.achievements[0]}` : ''}`).join('\n')}

My Skills: ${allSkills.slice(0, 15).join(', ')}

Job Requirements (Prioritize these keywords):
${jobDescription.keywords.slice(0, 10).join(', ')}

Write a high-ranking ATS summary. Return ONLY the text.`;

    try {
        const summary = await createCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config),
                temperature: 0.7,
                maxTokens: 1000,
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

    const systemPrompt = `You are a Resume Optimization AI. Transform the user's experience into elite "Action-Result" bullet points optimized for ATS.

FORMULA: [Strong Action Verb] + [Specific Task/Project] + [Quantifiable Result/Impact]

RULES:
1.  **Quantify:** If exact numbers aren't provided, distinctively estimate or use relative metrics (e.g., "increased efficiency," "reduced load time").
2.  **Keywords:** Swap generic terms for specific industry standard keywords found in the job description.
3.  **Formatting:** Plain text, standard bullet points only. No sub-bullets or rich text.
4.  **Length:** 1-2 lines maximum per bullet.
5.  **Tone:** Professional, assertive, and direct.
6.  **Context:** Align strictly with the target job's requirements.

CRITICAL: Return ONLY 3-5 achievement bullets in JSON array format: ["bullet1", "bullet2", ...]`;

    const userPrompt = `Target Job: ${jobDescription.title}
Key Requirements: ${jobDescription.keywords.slice(0, 8).join(', ')}

My Role: ${exp.position} at ${exp.company}
Description: ${exp.description || 'N/A'}
Current Achievements: ${exp.achievements?.join('; ') || 'None listed'}

Generate 3-5 powerful, ATS-optimized achievement bullets. Return ONLY a JSON array.`;

    try {
        const achievements = await createJSONCompletion<string[]>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config),
                temperature: 0.7,
                maxTokens: 1000,
                config
            }
        );

        const tips = [
            `Use keywords: ${jobDescription.keywords.slice(0, 3).join(', ')}`,
            'Follow "Action + Context + Result" format',
            'Quantify impact with numbers or %',
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

    const systemPrompt = `You are an expert resume writer. Generate 2-3 ATS-optimized achievement bullets for education.
Focus on relevant coursework, projects, honors, or transferable skills that align with the target job.
Enforce the "Action + Context" structure.

CRITICAL: Return ONLY a JSON array of 2-3 strings: ["point1", "point2", "point3"]`;

    const userPrompt = `Target Job: ${jobDescription.title}
Required Skills: ${jobDescription.keywords.slice(0, 8).join(', ')}

My Education:
Degree: ${edu.degree} in ${edu.field || 'N/A'}
School: ${edu.institution}
GPA: ${edu.gpa || 'N/A'}
Achievements: ${edu.achievements?.join('; ') || 'None listed'}

Generate 2-3 high-impact education highlights. Return ONLY a JSON array.`;

    try {
        const relevantPoints = await createJSONCompletion<string[]>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config),
                temperature: 0.7,
                maxTokens: 1000,
                config
            }
        );

        const tips = [
            'Highlight relevant coursework',
            'Mention honors/awards',
            'Connect academic projects to job skills',
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

    const systemPrompt = `You are an expert resume writer. Generate 2-4 achievement-focused highlights for a project, optimized for ATS.
FORMULA: [Strong Verb] + [Technology/Methodology] + [Outcome/Impact]

RULES:
1.  **Tech Stack:** Explicitly mention the technologies used (matches keywords).
2.  **Quantify:** Include metrics if possible.
3.  **Relevance:** Focus on features/challenges relevant to the target job.

CRITICAL: Return ONLY a JSON array of 2-4 strings: ["highlight1", "highlight2", ...]`;

    const userPrompt = `Target Job: ${jobDescription.title}
Key Skills: ${jobDescription.keywords.slice(0, 8).join(', ')}

My Project:
Title: ${project.title}
Description: ${project.description || 'N/A'}
Technologies: ${project.technologies?.join(', ') || 'N/A'}
Highlights: ${project.highlights?.join('; ') || 'None listed'}

Generate 2-4 high-impact project highlights. Return ONLY a JSON array.`;

    try {
        const highlights = await createJSONCompletion<string[]>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config),
                temperature: 0.7,
                maxTokens: 1000,
                config
            }
        );

        const tips = [
            'Mention specific technologies used',
            'Focus on the problem you solved',
            'Quantify the outcome',
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

    const systemPrompt = `You are an ATS Keyword Analyst. Extract and recommend the most valuable skills for this job.

RULES:
1.  **Hard Skills First:** Prioritize software, tools, languages, and technical methodologies.
2.  **Exact Matching:** Use the exact spelling/phrasing found in the job description to ensure ATS parsing.
3.  **Relevance:** Only suggest skills logical for the candidate's profile.
4.  **No Generic Soft Skills:** Avoid "Communication", "Teamwork" unless critical. Focus on "Agile", "Project Management", "Stakeholder Analysis".

CRITICAL: Return ONLY a JSON array of 5-8 skill strings: ["skill1", "skill2", ...]`;

    const userPrompt = `Target Job: ${jobDescription.title}
Job Requirements: ${jobDescription.keywords.join(', ')}

My Current Skills: ${allCurrentSkills.join(', ') || 'None listed'}

Suggest 5-8 high-value skills to add/emphasize. Return ONLY a JSON array.`;

    try {
        const suggestedSkills = await createJSONCompletion<string[]>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(config),
                temperature: 0.6,
                maxTokens: 1000,
                config
            }
        );

        const tips = [
            'Use exact keyword phrasing',
            'Prioritize hard technical skills',
            'Place key skills at the top',
        ];

        return { suggestedSkills: suggestedSkills.slice(0, 8), tips };
    } catch (error) {
        throw new Error(
            `Failed to generate skill suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

