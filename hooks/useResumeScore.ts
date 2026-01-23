/**
 * useResumeScore Hook
 * Real-time resume scoring with debounced updates
 */

import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import {
    calculateResumeScore,
    ResumeScoreResult,
    getScoreColor,
    getScoreLabel,
} from '@/lib/utils/resumeScoring.utils';
import type { ResumeData } from '@/types/resume.types';

export interface UseResumeScoreOptions {
    /** Debounce delay in milliseconds (default: 500ms) */
    debounceMs?: number;
}

export interface UseResumeScoreReturn {
    /** The calculated score result */
    score: ResumeScoreResult | null;
    /** Whether the score is currently being calculated */
    isCalculating: boolean;
    /** Color indicator: 'red' | 'yellow' | 'green' */
    color: 'red' | 'yellow' | 'green';
    /** Human-readable label: 'Excellent' | 'Good' | 'Fair' | etc. */
    label: string;
    /** Force recalculation */
    recalculate: () => void;
}

/**
 * Hook for real-time resume scoring
 * Automatically recalculates when resume data changes (debounced)
 */
export function useResumeScore(
    resumeData: ResumeData | null,
    options: UseResumeScoreOptions = {}
): UseResumeScoreReturn {
    const { debounceMs = 500 } = options;

    const [score, setScore] = useState<ResumeScoreResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [calcTrigger, setCalcTrigger] = useState(0);

    // Debounce the resume data to avoid excessive recalculations
    const debouncedData = useDebounce(resumeData, debounceMs);

    // Force recalculation function
    const recalculate = () => {
        setCalcTrigger(prev => prev + 1);
    };

    // Calculate score when debounced data changes
    useEffect(() => {
        if (!debouncedData) {
            setScore(null);
            return;
        }

        setIsCalculating(true);

        // Use requestAnimationFrame for smooth UI
        const frameId = requestAnimationFrame(() => {
            try {
                const result = calculateResumeScore(debouncedData);
                setScore(result);
            } catch (error) {
                console.error('Error calculating resume score:', error);
            } finally {
                setIsCalculating(false);
            }
        });

        return () => {
            cancelAnimationFrame(frameId);
        };
    }, [debouncedData, calcTrigger]);

    // Derive color and label from score
    const color = useMemo(() => {
        return score ? getScoreColor(score.overallScore) : 'red';
    }, [score]);

    const label = useMemo(() => {
        return score ? getScoreLabel(score.overallScore) : 'Getting Started';
    }, [score]);

    return {
        score,
        isCalculating,
        color,
        label,
        recalculate,
    };
}
