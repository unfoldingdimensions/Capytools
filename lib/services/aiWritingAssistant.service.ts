import { createCompletion, createJSONCompletion, getDefaultModel, AIConfig } from './openai.service';
import type { OpenAIMessage } from '@/types/ai.types';
import type { ResumeData } from '@/types/resume.types';

/**
 * AI Writing Assistant Service
 * Provides grammar checking, bullet point generation, and content improvement
 */

/**
 * Remove common AI preambles and explanatory text from responses
 */
function cleanAIResponse(text: string): string {
    const original = text;
    let cleaned = text.trim();

    console.log('=== CLEANING AI RESPONSE ===');
    console.log('Original:', original);

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
        const before = cleaned;
        cleaned = cleaned.replace(pattern, '');
        if (before !== cleaned) {
            console.log(`Removed preamble with pattern: ${pattern}`);
        }
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
        const before = cleaned;
        cleaned = cleaned.replace(pattern, '');
        if (before !== cleaned) {
            console.log(`Removed trailing text with pattern: ${pattern}`);
        }
    }

    console.log('After cleaning:', cleaned);
    console.log('=== END CLEANING ===');

    return cleaned.trim();
}

interface GrammarCheckResult {
    originalText: string;
    correctedText: string;
    corrections: Array<{
        type: 'grammar' | 'spelling' | 'punctuation' | 'style';
        original: string;
        corrected: string;
        explanation: string;
    }>;
    hasErrors: boolean;
}

interface BulletPointsResult {
    bulletPoints: string[];
    originalInput: string;
}

interface ContentImprovementResult {
    improvedText: string;
    suggestions: string[];
}

/**
 * Check grammar and suggest corrections
 */
export async function checkGrammar(text: string, config?: AIConfig): Promise<GrammarCheckResult> {
    if (!text || text.trim().length === 0) {
        throw new Error('Cannot check grammar: text is empty');
    }

    if (text.length > 5000) {
        throw new Error('Text too long. Maximum 5000 characters for grammar checking.');
    }

    const messages: OpenAIMessage[] = [
        {
            role: 'system',
            content: `You are a professional grammar and writing assistant. Analyze the given text and:
1. Identify all grammar, spelling, punctuation, and style errors
2. Provide corrected text
3. List specific corrections with explanations

Return a JSON object with this structure:
{
  "originalText": "the original text",
  "correctedText": "the corrected text",
  "corrections": [
    {
      "type": "grammar|spelling|punctuation|style",
      "original": "wrong text",
      "corrected": "right text",
      "explanation": "brief explanation"
    }
  ],
  "hasErrors": true/false
}`,
        },
        {
            role: 'user',
            content: `Check this text for grammar, spelling, and style issues:\n\n${text}`,
        },
    ];

    try {
        const result = await createJSONCompletion<GrammarCheckResult>(messages, {
            model: getDefaultModel(config),
            temperature: 0.3,
            maxTokens: 3000,
            config
        });

        // Ensure originalText is present
        result.originalText = text;
        return result;
    } catch (error) {
        console.error('Grammar check error:', error);
        throw new Error(
            `Failed to check grammar: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Generate professional bullet points from text description
 */
export async function generateBulletPoints(
    description: string,
    context: {
        role?: string;
        company?: string;
        count?: number;
    } = {},
    config?: AIConfig
): Promise<BulletPointsResult> {
    if (!description || description.trim().length === 0) {
        throw new Error('Cannot generate bullet points: description is empty');
    }

    if (description.length > 5000) {
        throw new Error(
            'Description too long. Maximum 5000 characters for bullet point generation.'
        );
    }

    const { role, company, count = 5 } = context;

    const contextInfo =
        role && company
            ? `Role: ${role} at ${company}`
            : role
                ? `Role: ${role}`
                : company
                    ? `Company: ${company}`
                    : '';

    const messages: OpenAIMessage[] = [
        {
            role: 'system',
            content: `You are a professional resume writer. Convert job descriptions or text into powerful, ATS-friendly bullet points.

Guidelines:
- Start each bullet with a strong action verb
- Use quantifiable metrics when possible (numbers, percentages, etc.)
- Focus on achievements and impact, not just responsibilities
- Keep bullets concise (1-2 lines each)
- Use professional language appropriate for resumes
- Make them ATS-friendly (avoid special characters)

Return a JSON object with this structure:
{
  "bulletPoints": ["bullet 1", "bullet 2", ...]
}`,
        },
        {
            role: 'user',
            content: `Generate ${count} professional bullet points from this description:

${contextInfo ? `Context: ${contextInfo}\n` : ''}
Description:
${description}`,
        },
    ];

    try {
        const result = await createJSONCompletion<BulletPointsResult>(messages, {
            model: getDefaultModel(config),
            temperature: 0.7,
            maxTokens: 2500,
            config
        });

        // Restore originalInput from the input itself to save tokens in response
        result.originalInput = description;
        return result;
    } catch (error) {
        console.error('Bullet point generation error:', error);
        throw new Error(
            `Failed to generate bullet points: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Improve a single bullet point
 */
/**
 * Improve a single bullet point
 */
export async function improveBulletPoint(
    bulletPoint: string,
    context: { role?: string; focus?: string } = {},
    config?: AIConfig
): Promise<string> {
    if (!bulletPoint || bulletPoint.trim().length === 0) {
        throw new Error('Cannot improve bullet point: text is empty');
    }

    const { role, focus } = context;

    const messages: OpenAIMessage[] = [
        {
            role: 'system',
            content: `You are a Resume Optimization AI. Transform the user's bullet point into an elite "Action-Result" bullet optimized for ATS.

FORMULA: [Strong Action Verb] + [Specific Task/Project] + [Quantifiable Result/Impact]

RULES:
1.  **Quantify:** If exact numbers aren't provided, distinctively estimate or use relative metrics (e.g., "significantly increased," "reduced latency").
2.  **Keywords:** Swap generic terms for specific industry standard keywords.
3.  **Tone:** Professional, assertive, and direct.
4.  **Format:** One concise sentence. No preambles.

CRITICAL: Return ONLY the improved bullet point text. If it cannot be improved, return the original.`,
        },
        {
            role: 'user',
            content: `Improve this bullet point:
${role ? `\nRole: ${role}` : ''}${focus ? `\nFocus: ${focus}` : ''}

Original Bullet: ${bulletPoint}`,
        },
    ];

    try {
        const improvedText = await createCompletion(messages, {
            model: getDefaultModel(config),
            temperature: 0.7,
            maxTokens: 2000,
            config
        });

        return cleanAIResponse(improvedText);
    } catch (error) {
        console.error('Bullet point improvement error:', error);
        throw new Error(
            `Failed to improve bullet point: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Improve any text content (descriptions, summaries, etc.)
 */
export async function improveContent(
    text: string,
    type: 'summary' | 'description' | 'objective' | 'general' = 'general',
    config?: AIConfig
): Promise<ContentImprovementResult> {
    if (!text || text.trim().length === 0) {
        throw new Error('Cannot improve content: text is empty');
    }

    if (text.length > 5000) {
        throw new Error('Text too long. Maximum 5000 characters for content improvement.');
    }

    const messages: OpenAIMessage[] = [
        {
            role: 'system',
            content: `You are a Career Editor. Polish the text to be concise, active, and professional.

CHECKS:
1.  **Passive to Active:** Convert passive voice (e.g., "was managed by") to active voice (e.g., "managed").
2.  **Remove Softeners:** Remove weak words like "helped," "assisted with," "responsible for." Use strong verbs instead.
3.  **Remove Pronouns:** Remove "I," "my," "we" (unless strictly necessary for context, but prefer implied first person).
4.  **Clarity:** Fix grammar and awkward phrasing.

Return a JSON object with:
{
  "improvedText": "the polished version",
  "suggestions": ["tip 1", "tip 2", "tip 3"]
}`,
        },
        {
            role: 'user',
            content: `Improve this ${type} for a resume:\n\n${text}`,
        },
    ];

    try {
        const result = await createJSONCompletion<ContentImprovementResult>(messages, {
            model: getDefaultModel(config),
            temperature: 0.7,
            maxTokens: 2500,
            config
        });

        // Clean the improved text from AI preambles
        result.improvedText = cleanAIResponse(result.improvedText);

        return result;
    } catch (error) {
        console.error('Content improvement error:', error);
        throw new Error(
            `Failed to improve content: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Generate achievement-focused bullet points from basic responsibilities
 */
export async function enhanceResponsibilities(
    responsibilities: string[],
    context: { role?: string; company?: string } = {},
    config?: AIConfig
): Promise<string[]> {
    if (!responsibilities || responsibilities.length === 0) {
        throw new Error('Cannot enhance responsibilities: list is empty');
    }

    const { role, company } = context;
    const contextInfo =
        role && company
            ? `Role: ${role} at ${company}`
            : role
                ? `Role: ${role}`
                : company
                    ? `Company: ${company}`
                    : '';

    const messages: OpenAIMessage[] = [
        {
            role: 'system',
            content: `You are a professional resume writer. Transform basic job responsibilities into achievement-focused bullet points.

Guidelines:
- Add quantifiable metrics when reasonable (even estimates like "50+ users", "multiple projects", etc.)
- Focus on impact and results
- Use strong action verbs
- Keep professional and ATS-friendly
- Make each bullet unique and powerful

Return a JSON object with:
{
  "bulletPoints": ["enhanced bullet 1", "enhanced bullet 2", ...]
}`,
        },
        {
            role: 'user',
            content: `Transform these responsibilities into powerful achievement-focused bullets:

${contextInfo ? `Context: ${contextInfo}\n` : ''}
Responsibilities:
${responsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}`,
        },
    ];

    try {
        const result = await createJSONCompletion<BulletPointsResult>(messages, {
            model: getDefaultModel(config),
            temperature: 0.7,
            maxTokens: 1500,
            config
        });

        return result.bulletPoints;
    } catch (error) {
        console.error('Responsibility enhancement error:', error);
        throw new Error(
            `Failed to enhance responsibilities: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Suggest action verbs for a given context
 */
export async function suggestActionVerbs(context: string, config?: AIConfig): Promise<string[]> {
    if (!context || context.trim().length === 0) {
        throw new Error('Cannot suggest action verbs: context is empty');
    }

    const messages: OpenAIMessage[] = [
        {
            role: 'system',
            content: `You are a professional resume writer. Suggest 10 powerful action verbs appropriate for the given context.

Return a JSON object with:
{
  "verbs": ["verb1", "verb2", ...]
}`,
        },
        {
            role: 'user',
            content: `Suggest action verbs for: ${context}`,
        },
    ];

    try {
        const result = await createJSONCompletion<{ verbs: string[] }>(messages, {
            model: getDefaultModel(config),
            temperature: 0.8,
            maxTokens: 1000,
            config
        });

        return result.verbs;
    } catch (error) {
        console.error('Action verb suggestion error:', error);
        throw new Error(
            `Failed to suggest action verbs: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Generate an ATS-compliant professional summary from resume data
 */
export async function generateProfessionalSummary(resumeData: ResumeData, config?: AIConfig): Promise<string> {
    try {
        // Extract key information from resume
        const workExperience = resumeData.workExperience || [];
        const education = resumeData.education || [];
        const skills = resumeData.skills || [];
        const projects = resumeData.projects || [];

        // Build context from resume data
        let context = '';

        // Personal info
        if (resumeData.personalInfo) {
            const { fullName } = resumeData.personalInfo;
            if (fullName) context += `Name: ${fullName}\n`;
        }

        // Work experience summary
        if (workExperience.length > 0) {
            context += `\nWork Experience:\n`;
            workExperience.forEach(exp => {
                context += `- ${exp.position} at ${exp.company} (${exp.startDate || 'N/A'} to ${exp.endDate || 'Present'})\n`;
                if (exp.description) context += `  ${exp.description}\n`;
                if (exp.achievements && exp.achievements.length > 0) {
                    exp.achievements.forEach(achievement => {
                        context += `  • ${achievement}\n`;
                    });
                }
            });
        }

        // Education summary
        if (education.length > 0) {
            context += `\nEducation:\n`;
            education.forEach(edu => {
                context += `- ${edu.degree} in ${edu.field} from ${edu.institution}\n`;
            });
        }

        // Skills summary
        if (skills.length > 0) {
            context += `\nSkills:\n`;
            skills.forEach(skillCategory => {
                context += `- ${skillCategory.category}: ${skillCategory.skills.join(', ')}\n`;
            });
        }

        // Projects summary
        if (projects.length > 0) {
            context += `\nProjects:\n`;
            projects.forEach(proj => {
                context += `- ${proj.title}: ${proj.description.substring(0, 100)}${proj.description.length > 100 ? '...' : ''}\n`;
            });
        }

        console.log('=== CONTEXT SENT TO AI ===');
        console.log(context);
        console.log('=== END CONTEXT ===');

        const messages: OpenAIMessage[] = [
            {
                role: 'system',
                content: `You are an expert resume writer specializing in creating ATS-compliant professional summaries. 

CRITICAL INSTRUCTIONS:
- Output ONLY the professional summary text itself
- NO introductory phrases like "Here is..." or "Role:"
- NO explanatory notes or commentary at the end
- NO meta-text like "Note that this summary..." or "Let me know if..."
- Start directly with the summary content
- End when the summary is complete

The summary should:
1. Highlight the candidate's key strengths and experience
2. Use industry-specific keywords and action verbs
3. Be concise (3-5 sentences, 50-100 words)
4. Pass ATS (Applicant Tracking System) scans
5. Focus on measurable achievements and impact
6. Use a confident, professional tone
7. Avoid clichés and generic phrases`,
            },
            {
                role: 'user',
                content: `Based on the following resume information, generate an ATS-compliant professional summary:

${context}

Return ONLY the summary text. Start directly with the first word of the summary. Do not include any preamble, role labels, or explanatory notes.`,
            },
        ];

        const summary = await createCompletion(messages, {
            model: getDefaultModel(config),
            temperature: 0.7,
            maxTokens: 1024,
            config
        });

        console.log('Raw AI summary response:', summary);
        console.log('Summary length:', summary.length);

        const cleaned = cleanAIResponse(summary);
        console.log('Cleaned summary:', cleaned);
        console.log('Cleaned length:', cleaned.length);

        // Validate the summary is substantial
        if (cleaned.length < 50) {
            console.error('AI generated insufficient summary:', cleaned);
            throw new Error('AI generated an incomplete summary. Please try again.');
        }

        return cleaned;
    } catch (error) {
        console.error('Professional summary generation error:', error);
        throw new Error(
            `Failed to generate professional summary: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

