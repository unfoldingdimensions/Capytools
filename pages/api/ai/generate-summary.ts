import { NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedApiRequest } from '@/types/api.types';
import { asyncHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { generateProfessionalSummary } from '@/lib/services/aiWritingAssistant.service';
import { getAIConfigFromRequest } from '@/lib/ai-config-helper';
import type { ResumeData } from '@/types/resume.types';

/**
 * POST /api/ai/generate-summary
 * Generate an ATS-compliant professional summary from resume data
 */

async function handler(req: AuthenticatedApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: `Method ${req.method || 'UNKNOWN'} not allowed`,
                statusCode: 405,
            },
        });
        return;
    }

    try {
        const { resumeData } = req.body as { resumeData?: ResumeData };

        if (!resumeData) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Resume data is required',
                    statusCode: 400,
                },
            });
            return;
        }

        // Validate that resume has some content to work with
        const hasContent =
            (resumeData.workExperience && resumeData.workExperience.length > 0) ||
            (resumeData.education && resumeData.education.length > 0) ||
            (resumeData.skills && resumeData.skills.length > 0) ||
            (resumeData.projects && resumeData.projects.length > 0);

        if (!hasContent) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_DATA',
                    message: 'Resume must have at least some work experience, education, skills, or projects to generate a summary',
                    statusCode: 400,
                },
            });
            return;
        }

        console.log('Generating professional summary for user:', req.userId);
        console.log('Resume data being sent to AI:');
        console.log('- Work Experience entries:', resumeData.workExperience?.length || 0);
        console.log('- Education entries:', resumeData.education?.length || 0);
        console.log('- Skills categories:', resumeData.skills?.length || 0);
        console.log('- Projects:', resumeData.projects?.length || 0);
        // Generate professional summary with BYOK config
        const aiConfig = getAIConfigFromRequest(req);
        const summary = await generateProfessionalSummary(resumeData, aiConfig);

        console.log('Final summary returned:', summary);
        console.log('Final summary length:', summary.length);

        res.status(200).json({
            success: true,
            data: {
                summary,
            },
            message: 'Professional summary generated successfully',
        });
    } catch (error) {
        console.error('Generate summary error:', error);

        res.status(500).json({
            success: false,
            error: {
                code: 'AI_ERROR',
                message: error instanceof Error ? error.message : 'Failed to generate summary',
                statusCode: 500,
            },
        });
    }
}

// Apply middleware
export default asyncHandler(async (req: NextApiRequest, res: NextApiResponse) => {
    await requireAuth(req, res, async () => {
        await rateLimit()(req, res, async () => {
            await handler(req as AuthenticatedApiRequest, res);
        });
    });
});

