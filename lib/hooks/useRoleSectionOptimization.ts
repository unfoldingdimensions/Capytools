'use client';

import { useCallback, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { resolveRoles } from '@/lib/ai/roleProfiles';
import { getAIHeaders } from '@/lib/ai-config-client';

/**
 * Optimizes a resume section against the resume's TARGET ROLES (no job description needed).
 * Returns the same suggestions shape as the JD-based tailoring flow.
 * Errors propagate to the caller (components show their own error dialog).
 */
export function useRoleSectionOptimization(resumeId: string | undefined, section: string) {
    const targetRoles = useAppSelector((state) => state.resume.targetRoles);
    const [isOptimizing, setIsOptimizing] = useState(false);

    const primaryRoleLabel = resolveRoles(targetRoles)[0]?.label ?? '';

    const optimizeForRole = useCallback(
        async (sectionData?: unknown): Promise<unknown> => {
            if (!resumeId || targetRoles.length === 0) return null;

            setIsOptimizing(true);
            try {
                const response = await fetch('/api/ai/optimize-section', {
                    method: 'POST',
                    headers: getAIHeaders(),
                    body: JSON.stringify({ resumeId, section, sectionData }),
                });
                const data = (await response.json()) as {
                    success?: boolean;
                    error?: { message?: string };
                    data?: { suggestions?: unknown };
                };
                if (!response.ok || !data.success) {
                    throw new Error(data.error?.message || 'Failed to optimize section');
                }
                return data.data?.suggestions ?? null;
            } finally {
                setIsOptimizing(false);
            }
        },
        [resumeId, section, targetRoles]
    );

    return {
        optimizeForRole,
        isOptimizing,
        hasTargetRoles: targetRoles.length > 0,
        primaryRoleLabel,
    };
}
