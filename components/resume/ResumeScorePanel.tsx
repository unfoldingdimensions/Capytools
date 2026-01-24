'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDown, Lightbulb, FileText, Layout, CheckSquare, ShieldCheck, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { ScoreProgressRing } from '@/components/ui/score-progress-ring';
import { CategoryScoreCard } from './CategoryScoreCard';
import { useResumeScore } from '@/hooks/useResumeScore';
import type { ResumeData } from '@/types/resume.types';
import { validateResumeForAts } from '@/lib/utils/atsValidation';
import { AtsMetricsDialog } from './AtsMetricsDialog';
import { Button } from '@/components/ui/button';
import type { JobDescription } from '@/lib/utils/keywordMatching.utils';

interface ResumeScorePanelProps {
    /** Resume data to score */
    resumeData: ResumeData;
    /** Optional job description for keyword matching */
    jobDescription?: JobDescription | null;
    /** Whether the panel is collapsible */
    collapsible?: boolean;
    /** Whether initially collapsed */
    defaultCollapsed?: boolean;
    /** Custom class name */
    className?: string;
}

type Tab = 'general' | 'ats';

export function ResumeScorePanel({
    resumeData,
    jobDescription,
    collapsible = true,
    defaultCollapsed = false,
    className,
}: ResumeScorePanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [showTips, setShowTips] = useState(true);
    const [showAtsInfo, setShowAtsInfo] = useState(false);

    const { score, isCalculating, color, label } = useResumeScore(resumeData);

    const atsResult = useMemo(() => {
        return validateResumeForAts(resumeData, jobDescription);
    }, [resumeData, jobDescription]);

    const atsColor: "green" | "yellow" | "red" = atsResult.score >= 80 ? 'green' : atsResult.score >= 50 ? 'yellow' : 'red';
    const atsLabel = atsResult.score >= 80 ? 'ATS Ready' : atsResult.score >= 50 ? 'Needs Work' : 'Critical Issues';

    return (
        <div
            className={cn(
                'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden transition-all duration-300',
                className
            )}
        >
            {/* Header */}
            <div
                className={cn(
                    'w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800',
                    collapsible && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}
                onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", activeTab === 'general' ? "bg-zinc-900 dark:bg-white" : "bg-blue-600")} />
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Resume Analysis
                    </h3>
                </div>
                {collapsible && (
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform duration-200',
                            isCollapsed && '-rotate-90'
                        )}
                    />
                )}
            </div>

            {/* Content */}
            {!isCollapsed && (
                <div className="p-4 space-y-4">
                    {/* Tabs */}
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={cn(
                                "flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                                activeTab === 'general'
                                    ? "bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                        >
                            General Score
                        </button>
                        <button
                            onClick={() => setActiveTab('ats')}
                            className={cn(
                                "flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1",
                                activeTab === 'ats'
                                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                        >
                            <ShieldCheck className="h-3 w-3" />
                            ATS Compliance
                        </button>
                    </div>

                    {activeTab === 'general' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            {/* Overall Score Ring */}
                            <div className="flex justify-center py-2">
                                <ScoreProgressRing
                                    score={score?.overallScore ?? 0}
                                    size="md"
                                    color={color}
                                    label={label}
                                    isLoading={isCalculating}
                                />
                            </div>

                            {/* Category Scores */}
                            {score && (
                                <div className="space-y-1">
                                    <CategoryScoreCard
                                        label="Content"
                                        scoreResult={score.categoryScores.content}
                                        icon={<FileText className="h-4 w-4" />}
                                    />
                                    <CategoryScoreCard
                                        label="Formatting"
                                        scoreResult={score.categoryScores.formatting}
                                        icon={<Layout className="h-4 w-4" />}
                                    />
                                    <CategoryScoreCard
                                        label="Completeness"
                                        scoreResult={score.categoryScores.completeness}
                                        icon={<CheckSquare className="h-4 w-4" />}
                                    />
                                </div>
                            )}

                            {/* Quick Tips */}
                            {score && score.tips.length > 0 && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowTips(!showTips)}
                                        className="w-full flex items-center justify-between py-1 text-left"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Lightbulb className="h-4 w-4 text-zinc-900 dark:text-white" />
                                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                                Optimization Path
                                            </span>
                                        </div>
                                        <ChevronDown
                                            className={cn(
                                                'h-3 w-3 text-muted-foreground transition-transform duration-200',
                                                !showTips && '-rotate-90'
                                            )}
                                        />
                                    </button>
                                    {showTips && (
                                        <ul className="mt-2 space-y-1.5">
                                            {score.tips.map((tip, index) => (
                                                <li
                                                    key={index}
                                                    className="flex items-start gap-2 text-xs text-muted-foreground"
                                                >
                                                    <span className="text-zinc-900 dark:text-white font-bold shrink-0">•</span>
                                                    <span>{tip}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* ATS Score Ring */}
                            <div className="flex justify-center py-2 relative group">
                                <ScoreProgressRing
                                    score={atsResult.score}
                                    size="md"
                                    color={atsColor}
                                    label={atsLabel}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowAtsInfo(true)}
                                    className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700 hover:text-blue-600 transition-colors"
                                >
                                    <Info className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Issues List */}
                            <div className="space-y-3">
                                {atsResult.errors.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Critical Issues
                                        </h4>
                                        <ul className="space-y-2">
                                            {atsResult.errors.map((error, idx) => (
                                                <li key={idx} className="text-xs bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400">
                                                    <span className="font-bold block mb-0.5">{error.section}</span>
                                                    {error.message}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {atsResult.warnings.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Warnings
                                        </h4>
                                        <ul className="space-y-2">
                                            {atsResult.warnings.slice(0, 5).map((warning, idx) => (
                                                <li key={idx} className="text-xs bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded border border-yellow-100 dark:border-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                                                    <span className="font-bold block mb-0.5">{warning.section}</span>
                                                    {warning.message}
                                                </li>
                                            ))}
                                            {atsResult.warnings.length > 5 && (
                                                <p className="text-xs text-center text-muted-foreground italic">
                                                    + {atsResult.warnings.length - 5} more warnings
                                                </p>
                                            )}
                                        </ul>
                                    </div>
                                )}

                                {atsResult.errors.length === 0 && atsResult.warnings.length === 0 && (
                                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20">
                                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                        <p className="text-sm font-bold text-green-700 dark:text-green-400">ATS Optimized!</p>
                                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">Your resume is looking great for standard tracking systems.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <AtsMetricsDialog
                isOpen={showAtsInfo}
                onClose={() => setShowAtsInfo(false)}
            />
        </div>
    );
}

