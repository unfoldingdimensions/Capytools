import { createJSONCompletion, getDefaultModel } from './openai.service';
import type { ResumeData } from '@/types/resume.types';
import type { ParsedJobDescription, InterviewQuestion } from '@/types/ai.types';

/**
 * Interview Questions Generator Service
 * 
 * Generates personalized interview questions and preparation guidance
 */

/**
 * Generates interview questions based on resume and job description
 */
export async function generateInterviewQuestions(
    resume: ResumeData,
    jobDescription: ParsedJobDescription,
    count: number = 10
): Promise<InterviewQuestion[]> {
    if (count < 1 || count > 30) {
        throw new Error('Question count must be between 1 and 30');
    }

    if (!resume.personalInfo?.fullName) {
        throw new Error('Resume must have personal information');
    }

    const systemPrompt = `You are an expert interview coach and technical interviewer.
Generate realistic interview questions for a specific job and candidate.
Return JSON array with this structure:
[{
  "question": "The interview question",
  "category": "behavioral|technical|situational|experience-based",
  "difficulty": "easy|medium|hard",
  "suggestedAnswer": "A strong sample answer",
  "keyPoints": ["point1", "point2"]
}]`;

    const userPrompt = `Job: ${jobDescription.title} at ${jobDescription.company}

Job Requirements:
${jobDescription.requirements.slice(0, 8).join('\n')}

Required Skills: ${jobDescription.skills.slice(0, 10).join(', ')}

Candidate Background:
Experience: ${(resume.workExperience || []).slice(0, 3).map((exp) =>
        `${exp.position} at ${exp.company}`).join(', ')}

Skills: ${(resume.skills || []).flatMap((s) => s.skills).slice(0, 15).join(', ')}

Education: ${(resume.education || []).map((edu) =>
            `${edu.degree} in ${edu.field || 'N/A'}`).join(', ')}

Generate ${count} realistic interview questions for this candidate applying to this role.
Include a mix of behavioral, technical, and experience-based questions.
Provide suggested answers and key points to cover.`;

    try {
        const questions = await createJSONCompletion<InterviewQuestion[]>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(),
                temperature: 0.8, // Higher temperature for variety
                maxTokens: 3000,
            }
        );

        // Validate questions
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('No questions generated');
        }

        return questions.map(validateAndEnrichQuestion).slice(0, count);
    } catch (error) {
        throw new Error(
            `Failed to generate interview questions: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Generates behavioral interview questions
 */
export async function generateBehavioralQuestions(
    jobDescription: ParsedJobDescription,
    count: number = 5
): Promise<InterviewQuestion[]> {
    const systemPrompt = `You are an HR expert specializing in behavioral interviews.
Generate behavioral interview questions using the STAR method (Situation, Task, Action, Result).
Return JSON array with: [{
  "question": "question text",
  "category": "behavioral",
  "difficulty": "easy|medium|hard",
  "suggestedAnswer": "STAR method answer example",
  "keyPoints": ["point1", "point2"]
}]`;

    const userPrompt = `Job: ${jobDescription.title}
Key Responsibilities: ${jobDescription.responsibilities.slice(0, 5).join(', ')}

Generate ${count} behavioral interview questions relevant to this role.
Focus on: teamwork, leadership, problem-solving, conflict resolution, and adaptability.`;

    try {
        const questions = await createJSONCompletion<InterviewQuestion[]>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(),
                temperature: 0.7,
                maxTokens: 2000,
            }
        );

        return questions.map(validateAndEnrichQuestion).slice(0, count);
    } catch (error) {
        console.error('Failed to generate behavioral questions:', error);
        return getDefaultBehavioralQuestions().slice(0, count);
    }
}

/**
 * Generates technical interview questions
 */
export async function generateTechnicalQuestions(
    skills: string[],
    experienceLevel: 'entry' | 'mid' | 'senior' | 'lead',
    count: number = 8
): Promise<InterviewQuestion[]> {
    if (!skills || skills.length === 0) {
        throw new Error('Skills array cannot be empty');
    }

    const systemPrompt = `You are a technical interviewer creating relevant technical questions.
Generate technical questions appropriate for the candidate's experience level.
Return JSON array with: [{
  "question": "technical question",
  "category": "technical",
  "difficulty": "easy|medium|hard",
  "suggestedAnswer": "detailed technical answer",
  "keyPoints": ["concept1", "concept2"]
}]`;

    const userPrompt = `Skills to assess: ${skills.slice(0, 10).join(', ')}
Experience Level: ${experienceLevel}

Generate ${count} technical interview questions covering these skills.
Adjust difficulty based on experience level:
- entry: fundamentals and basic concepts
- mid: practical application and problem-solving
- senior: architecture, optimization, and best practices
- lead: system design, mentorship, and technical leadership`;

    try {
        const questions = await createJSONCompletion<InterviewQuestion[]>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(),
                temperature: 0.7,
                maxTokens: 2500,
            }
        );

        return questions.map(validateAndEnrichQuestion).slice(0, count);
    } catch (error) {
        throw new Error(
            `Failed to generate technical questions: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Evaluates a candidate's answer to an interview question
 */
export async function evaluateAnswer(
    question: string,
    candidateAnswer: string,
    suggestedAnswer?: string
): Promise<{
    score: number; // 0-100
    feedback: string;
    strengths: string[];
    improvements: string[];
}> {
    if (!candidateAnswer || candidateAnswer.trim().length < 10) {
        throw new Error('Candidate answer is too short (minimum 10 characters)');
    }

    const systemPrompt = `You are an interview coach providing constructive feedback on interview answers.
Evaluate answers on: clarity, relevance, completeness, structure, and confidence.
Return JSON: {
  "score": 0-100,
  "feedback": "overall feedback",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`;

    const userPrompt = `Question: ${question}

${suggestedAnswer ? `Ideal Answer: ${suggestedAnswer}\n\n` : ''}Candidate's Answer: ${candidateAnswer}

Evaluate this answer and provide constructive feedback.`;

    try {
        const evaluation = await createJSONCompletion<{
            score: number;
            feedback: string;
            strengths: string[];
            improvements: string[];
        }>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(),
                temperature: 0.5,
                maxTokens: 800,
            }
        );

        // Validate score
        evaluation.score = Math.max(0, Math.min(100, evaluation.score));

        return evaluation;
    } catch (error) {
        throw new Error(
            `Failed to evaluate answer: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Generates a personalized interview preparation plan
 */
export async function generatePreparationPlan(
    resume: ResumeData,
    jobDescription: ParsedJobDescription
): Promise<{
    strengths: string[];
    areasToImprove: string[];
    studyTopics: string[];
    practiceQuestions: number[];
    timeline: string;
}> {
    const systemPrompt = `You are a career coach creating personalized interview preparation plans.
Return JSON: {
  "strengths": ["strength1", "strength2"],
  "areasToImprove": ["area1", "area2"],
  "studyTopics": ["topic1", "topic2"],
  "practiceQuestions": [question_indices],
  "timeline": "suggested preparation timeline"
}`;

    const userPrompt = `Job: ${jobDescription.title} at ${jobDescription.company}

Candidate Background:
- Experience: ${(resume.workExperience || []).length} positions
- Skills: ${(resume.skills || []).flatMap((s) => s.skills).join(', ')}
- Education: ${(resume.education || []).map((e) => e.degree).join(', ')}

Job Requirements: ${jobDescription.requirements.slice(0, 5).join(', ')}

Create a personalized interview preparation plan for this candidate.`;

    try {
        const plan = await createJSONCompletion<{
            strengths: string[];
            areasToImprove: string[];
            studyTopics: string[];
            practiceQuestions: number[];
            timeline: string;
        }>(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            {
                model: getDefaultModel(),
                temperature: 0.6,
                maxTokens: 1000,
            }
        );

        return plan;
    } catch (error) {
        throw new Error(
            `Failed to generate preparation plan: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Validates and enriches interview question
 */
function validateAndEnrichQuestion(question: InterviewQuestion): InterviewQuestion {
    // Ensure all required fields exist
    if (!question.question || question.question.trim().length === 0) {
        throw new Error('Interview question cannot be empty');
    }

    if (!question.category) {
        question.category = 'experience-based';
    }

    if (!question.difficulty) {
        question.difficulty = 'medium';
    }

    if (!question.keyPoints || question.keyPoints.length === 0) {
        question.keyPoints = ['Demonstrate relevant experience', 'Be specific and concise'];
    }

    // Ensure valid enum values
    const validCategories = ['behavioral', 'technical', 'situational', 'experience-based'];
    if (!validCategories.includes(question.category)) {
        question.category = 'experience-based';
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(question.difficulty)) {
        question.difficulty = 'medium';
    }

    return question;
}

/**
 * Returns default behavioral questions as fallback
 */
function getDefaultBehavioralQuestions(): InterviewQuestion[] {
    return [
        {
            question: 'Tell me about a time when you had to work under pressure to meet a tight deadline.',
            category: 'behavioral',
            difficulty: 'medium',
            suggestedAnswer: 'Use STAR method: Describe the situation, your specific task, the actions you took to manage time and priorities, and the successful result.',
            keyPoints: [
                'Demonstrate time management skills',
                'Show ability to prioritize',
                'Highlight successful outcome',
            ],
        },
        {
            question: 'Describe a situation where you had to resolve a conflict with a team member.',
            category: 'behavioral',
            difficulty: 'medium',
            suggestedAnswer: 'Use STAR method: Explain the conflict situation, your role in resolution, specific steps taken to address the issue, and the positive outcome.',
            keyPoints: [
                'Show emotional intelligence',
                'Demonstrate communication skills',
                'Focus on resolution and learning',
            ],
        },
        {
            question: 'Give an example of a goal you set and how you achieved it.',
            category: 'behavioral',
            difficulty: 'easy',
            suggestedAnswer: 'Use STAR method: State the goal, explain why it was important, describe your action plan, and share the measurable results.',
            keyPoints: [
                'Demonstrate goal-setting ability',
                'Show determination and follow-through',
                'Include measurable outcomes',
            ],
        },
        {
            question: 'Tell me about a time when you had to learn a new skill quickly.',
            category: 'behavioral',
            difficulty: 'easy',
            suggestedAnswer: 'Use STAR method: Describe what you needed to learn and why, your learning approach, and how you successfully applied the new skill.',
            keyPoints: [
                'Demonstrate learning agility',
                'Show resourcefulness',
                'Highlight practical application',
            ],
        },
        {
            question: 'Describe a situation where you had to make a difficult decision without complete information.',
            category: 'behavioral',
            difficulty: 'hard',
            suggestedAnswer: 'Use STAR method: Explain the situation and constraints, your decision-making process, the choice you made, and the outcome.',
            keyPoints: [
                'Show critical thinking',
                'Demonstrate decision-making under uncertainty',
                'Include lessons learned',
            ],
        },
    ];
}

