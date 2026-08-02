'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ListChecks, Wand2, Sparkles, Loader2, XCircle, RotateCcw, AlertCircle } from 'lucide-react';
import { BulletRecommendationCard } from './BulletRecommendationCard';
import { AIService } from '@/lib/services/ai.service';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { cn } from '@/lib/utils';
import { retryWithBackoff, delay } from '@/lib/utils/rateLimitedQueue';
import { ActionVerbSelector } from './ActionVerbSelector';

interface BulletPointEditorProps {
    bullets: string[];
    onChange: (bullets: string[]) => void;
    context: {
        role?: string;
        company?: string;
    };
}

interface EnhancementState {
    status: 'idle' | 'processing' | 'success' | 'error';
    errorMessage?: string;
}

export function BulletPointEditor({
    bullets,
    onChange,
    context,
}: BulletPointEditorProps) {
    // Enhancement state: maps bullet index to AI recommendation
    const [recommendations, setRecommendations] = useState<Map<number, string>>(new Map());
    const [isEnhancing, setIsEnhancing] = useState(false);
    // Track enhancement state per bullet (for individual loading/error states)
    const [bulletStates, setBulletStates] = useState<Map<number, EnhancementState>>(new Map());
    // Track enhancement progress
    const [enhanceProgress, setEnhanceProgress] = useState<{ current: number; total: number } | null>(null);

    // Abort controller for cancelling enhancement
    const abortControllerRef = useRef<AbortController | null>(null);

    // Counts recommendations actually added during the current run. State updates
    // are async, so reading `recommendations.size` right after the loop sees a
    // stale (empty) value; a ref gives us the true count for the summary modal.
    const recommendationCountRef = useRef(0);

    // Alert modal for feedback
    const [alertModal, setAlertModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
    }>({ show: false, title: '', message: '', type: 'info' });

    const handleAddBullet = () => {
        onChange([...bullets, '']);
    };

    const handleUpdateBullet = (index: number, value: string) => {
        const newBullets = [...bullets];
        newBullets[index] = value;
        onChange(newBullets);
    };

    const handleDeleteBullet = (index: number) => {
        onChange(bullets.filter((_, i) => i !== index));
        // Also remove any pending recommendation and state for this bullet
        setRecommendations(prev => {
            const updated = new Map(prev);
            updated.delete(index);
            return updated;
        });
        setBulletStates(prev => {
            const updated = new Map(prev);
            updated.delete(index);
            return updated;
        });
    };

    /**
     * Cancel ongoing enhancement process
     */
    const handleCancelEnhance = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsEnhancing(false);
        setEnhanceProgress(null);
        // Keep bullet states and recommendations as they are
    };

    /**
     * Update enhancement state for a specific bullet
     */
    const updateBulletState = useCallback((index: number, state: EnhancementState) => {
        setBulletStates(prev => {
            const updated = new Map(prev);
            updated.set(index, state);
            return updated;
        });
    }, []);

    /**
     * Add a recommendation immediately as it's processed
     */
    const addRecommendation = useCallback((index: number, improved: string, originalBullet: string) => {
        // Only add if different from original
        if (improved.trim() !== originalBullet.trim()) {
            recommendationCountRef.current += 1;
            setRecommendations(prev => {
                const updated = new Map(prev);
                updated.set(index, improved);
                return updated;
            });
        }
    }, []);

    /**
     * Enhance a single bullet point with retry logic
     */
    const enhanceSingleBullet = useCallback(async (
        bullet: string,
        index: number,
        signal?: AbortSignal
    ): Promise<boolean> => {
        if (signal?.aborted) return false;

        updateBulletState(index, { status: 'processing' });

        try {
            const improved = await retryWithBackoff(
                () => AIService.improveBulletPoint(bullet, { role: context.role }),
                {
                    maxRetries: 3,
                    initialDelayMs: 1500,
                    backoffMultiplier: 2,
                    maxDelayMs: 10000,
                }
            );

            if (signal?.aborted) return false;

            addRecommendation(index, improved, bullet);
            updateBulletState(index, { status: 'success' });
            return true;
        } catch (error) {
            if (signal?.aborted) return false;

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            updateBulletState(index, { status: 'error', errorMessage });
            console.error(`Enhancement failed for bullet ${index}:`, { error: errorMessage });
            return false;
        }
    }, [context.role, updateBulletState, addRecommendation]);

    /**
     * Retry a specific failed bullet
     */
    const handleRetryBullet = useCallback(async (index: number) => {
        const bullet = bullets[index];
        if (!bullet || bullet.trim().length === 0) return;

        await enhanceSingleBullet(bullet, index);
    }, [bullets, enhanceSingleBullet]);

    /**
     * Batch process all non-empty bullets with AI enhancement.
     * Shows results immediately as each bullet is processed.
     */
    const handleEnhanceAll = async () => {
        // Filter out empty bullets and get their indices
        const nonEmptyBullets = bullets
            .map((bullet, index) => ({ bullet, index }))
            .filter(({ bullet }) => bullet.trim().length > 0);

        if (nonEmptyBullets.length === 0) {
            setAlertModal({
                show: true,
                title: 'No Bullets to Enhance',
                message: 'Add some bullet points with content first, then try enhancing them.',
                type: 'info'
            });
            return;
        }

        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setIsEnhancing(true);
        setEnhanceProgress({ current: 0, total: nonEmptyBullets.length });
        // Clear previous recommendations and states
        setRecommendations(new Map());
        setBulletStates(new Map());
        recommendationCountRef.current = 0;

        let successCount = 0;
        let failedCount = 0;

        // Process each bullet sequentially, showing results immediately
        for (let i = 0; i < nonEmptyBullets.length; i++) {
            if (signal.aborted) break;

            const { bullet, index } = nonEmptyBullets[i]!;
            setEnhanceProgress({ current: i + 1, total: nonEmptyBullets.length });

            const success = await enhanceSingleBullet(bullet, index, signal);

            if (success) {
                successCount++;
            } else if (!signal.aborted) {
                failedCount++;
            }

            // Add delay between requests to avoid rate limits (except for last item)
            if (i < nonEmptyBullets.length - 1 && !signal.aborted) {
                await delay(600); // 600ms delay between requests
            }
        }

        setIsEnhancing(false);
        setEnhanceProgress(null);
        abortControllerRef.current = null;

        // Show completion summary
        if (signal.aborted) {
            // Don't show modal on cancel - user initiated it
        } else if (failedCount > 0) {
            setAlertModal({
                show: true,
                title: 'Partial Success',
                message: `Enhanced ${successCount} of ${nonEmptyBullets.length} bullets. ${failedCount} failed - you can retry them individually.`,
                type: 'info'
            });
        } else if (recommendationCountRef.current === 0 && successCount > 0) {
            setAlertModal({
                show: true,
                title: 'Already Optimized',
                message: 'Your bullet points are already well-written! No improvements needed.',
                type: 'success'
            });
        }
    };

    /**
     * Retry all failed bullets
     */
    const handleRetryFailed = async () => {
        const failedBullets = Array.from(bulletStates.entries())
            .filter(([_, state]) => state.status === 'error')
            .map(([index]) => ({ index, bullet: bullets[index] }))
            .filter(({ bullet }) => bullet && bullet.trim().length > 0);

        if (failedBullets.length === 0) return;

        setIsEnhancing(true);
        setEnhanceProgress({ current: 0, total: failedBullets.length });

        for (let i = 0; i < failedBullets.length; i++) {
            const { index, bullet } = failedBullets[i]!;
            setEnhanceProgress({ current: i + 1, total: failedBullets.length });
            await enhanceSingleBullet(bullet!, index);

            if (i < failedBullets.length - 1) {
                await delay(600);
            }
        }

        setIsEnhancing(false);
        setEnhanceProgress(null);
    };

    /**
     * Accept a recommendation: update the bullet and remove the card.
     */
    const handleAcceptRecommendation = (index: number) => {
        const recommendation = recommendations.get(index);
        if (recommendation) {
            handleUpdateBullet(index, recommendation);
            setRecommendations(prev => {
                const updated = new Map(prev);
                updated.delete(index);
                return updated;
            });
            setBulletStates(prev => {
                const updated = new Map(prev);
                updated.delete(index);
                return updated;
            });
        }
    };

    /**
     * Decline a recommendation: just remove the card.
     */
    const handleDeclineRecommendation = (index: number) => {
        setRecommendations(prev => {
            const updated = new Map(prev);
            updated.delete(index);
            return updated;
        });
        setBulletStates(prev => {
            const updated = new Map(prev);
            updated.delete(index);
            return updated;
        });
    };

    const hasNonEmptyBullets = bullets.some(b => b.trim().length > 0);
    const failedCount = Array.from(bulletStates.values()).filter(s => s.status === 'error').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    <label className="text-sm font-bold text-foreground uppercase tracking-wider">Achievements & Impact</label>
                </div>
                <div className="flex items-center gap-2">
                    {/* Retry failed button - show when there are failed bullets and not currently enhancing */}
                    {failedCount > 0 && !isEnhancing && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleRetryFailed}
                            className="h-8 rounded-full px-3 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
                        >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Retry {failedCount} Failed
                        </Button>
                    )}

                    {/* Enhance with AI button - show progress or cancel when enhancing */}
                    {hasNonEmptyBullets && (
                        isEnhancing ? (
                            <div className="flex items-center gap-2">
                                {/* Progress indicator */}
                                <div className="flex items-center gap-1.5">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                                    <span className="text-xs text-muted-foreground">
                                        {enhanceProgress ? `${enhanceProgress.current}/${enhanceProgress.total}` : 'Starting...'}
                                    </span>
                                </div>
                                {/* Cancel button */}
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEnhance}
                                    className="h-8 rounded-full px-3 text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleEnhanceAll}
                                disabled={isEnhancing}
                                className={cn(
                                    "h-8 rounded-full px-4",
                                    "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900",
                                    "hover:bg-zinc-800 dark:hover:bg-zinc-200",
                                    "disabled:opacity-50",
                                    "shadow-sm btn-press"
                                )}
                            >
                                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                Enhance with AI
                            </Button>
                        )
                    )}
                    <ActionVerbSelector />
                    <Button
                        type="button"
                        size="sm"
                        variant="ghostSubtle"
                        onClick={handleAddBullet}
                        className="h-8 rounded-full text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add Achievement
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {bullets.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 group cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                        onClick={handleAddBullet}
                    >
                        <Wand2 className="h-8 w-8 text-muted-foreground/30 group-hover:text-zinc-400 transition-colors mb-2" />
                        <p className="text-sm text-muted-foreground font-medium">Click to add your first achievement</p>
                    </div>
                ) : (
                    bullets.map((bullet, index) => {
                        const bulletState = bulletStates.get(index);
                        const isProcessing = bulletState?.status === 'processing';
                        const hasError = bulletState?.status === 'error';
                        const hasRecommendation = recommendations.has(index);

                        return (
                            <div
                                key={index}
                                className={cn(
                                    "group relative rounded-2xl border bg-white dark:bg-zinc-900 p-4 transition-all duration-200",
                                    isProcessing
                                        ? "border-zinc-400 dark:border-zinc-500 shadow-swiss"
                                        : hasError
                                            ? "border-amber-300 dark:border-amber-700"
                                            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-swiss"
                                )}
                            >
                                {/* Processing indicator */}
                                {isProcessing && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Enhancing...</span>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "mt-2.5 h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
                                        isProcessing
                                            ? "bg-zinc-600 animate-pulse"
                                            : hasError
                                                ? "bg-amber-500"
                                                : "bg-zinc-400 dark:bg-zinc-500"
                                    )} />
                                    <div className="flex-1 space-y-3">
                                        <Textarea
                                            value={bullet}
                                            onChange={(e) => handleUpdateBullet(index, e.target.value)}
                                            placeholder="e.g. Led a team of 5 to deliver a 20% increase in system performance..."
                                            className="flex-1 min-h-[60px] border-none bg-transparent p-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50 resize-none leading-relaxed"
                                        />

                                        {/* Error indicator with retry button - Moved to bottom */}
                                        {hasError && !isProcessing && !hasRecommendation && (
                                            <div className="flex items-center gap-2 pt-1 border-t border-amber-100 dark:border-amber-900/50">
                                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Enhancement Failed
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleRetryBullet(index)}
                                                    className="h-6 px-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-full"
                                                >
                                                    <RotateCcw className="h-3 w-3 mr-1" />
                                                    Retry
                                                </Button>
                                            </div>
                                        )}

                                        {/* Inline recommendation card - shows immediately as processed */}
                                        {hasRecommendation && (
                                            <BulletRecommendationCard
                                                originalText={bullet}
                                                recommendedText={recommendations.get(index)!}
                                                onAccept={() => handleAcceptRecommendation(index)}
                                                onDecline={() => handleDeclineRecommendation(index)}
                                                className="mt-3 animate-fade-in"
                                            />
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDeleteBullet(index)}
                                        className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <AlertDialog
                isOpen={alertModal.show}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={() => setAlertModal({ ...alertModal, show: false })}
            />
        </div>
    );
}
