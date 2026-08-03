'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { MonthPicker } from '@/components/ui/month-picker';
import {
    GripVertical,
    Trash2,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Loader2,
    Building2,
    Briefcase,
    MapPin,
    Calendar
} from 'lucide-react';
import type { WorkExperience } from '@/types/resume.types';
import { BulletPointEditor } from './BulletPointEditor';
import SuggestionCard from './SuggestionCard';
import { AIService } from '@/lib/services/ai.service';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { cn } from '@/lib/utils';
import { getAIHeaders } from '@/lib/ai-config-client';
import { useAppSelector } from '@/store/hooks';
import { useRoleSectionOptimization } from '@/lib/hooks/useRoleSectionOptimization';

interface JobDescription {
    id: string;
    title: string;
    company: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    keywords: string[];
}

interface WorkExperienceItemProps {
    experience: WorkExperience;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (updatedExp: WorkExperience) => void;
    onDelete: () => void;
    jobDescription?: JobDescription | null;
    jobDescriptionId?: string | null;
    resumeId?: string;
}

export function WorkExperienceItem({
    experience,
    isExpanded,
    onToggleExpand,
    onUpdate,
    onDelete,
    jobDescription,
    jobDescriptionId,
    resumeId,
}: WorkExperienceItemProps) {
    const targetRoles = useAppSelector((state) => state.resume.targetRoles);
    const { optimizeForRole, isOptimizing, hasTargetRoles, primaryRoleLabel } = useRoleSectionOptimization(resumeId, 'workExperience');
    const [aiLoading, setAiLoading] = useState<boolean>(false);
    const [suggestionLoading, setSuggestionLoading] = useState<boolean>(false);
    const [tailoringSuggestions, setTailoringSuggestions] = useState<{ achievements: string[]; tips: string[] } | null>(null);

    const [alertModal, setAlertModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
    }>({ show: false, title: '', message: '', type: 'info' });

    const handleChange = (field: keyof WorkExperience, value: unknown) => {
        onUpdate({ ...experience, [field]: value });
    };

    const handleGenerateBullets = async () => {
        if (!experience.description || experience.description.trim().length === 0) {
            setAlertModal({
                show: true,
                title: 'Description Required',
                message: 'Please enter a description first to generate bullet points.',
                type: 'info',
            });
            return;
        }

        setAiLoading(true);
        try {
            const result = await AIService.generateBulletPoints(experience.description, {
                role: experience.position,
                company: experience.company,
                count: 5,
                targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
            });

            onUpdate({ ...experience, achievements: [...experience.achievements, ...result.bulletPoints] });
        } catch (error) {
            setAlertModal({
                show: true,
                title: 'Error',
                message: `Failed to generate bullet points: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setAiLoading(false);
        }
    };

    const handleGenerateTailoringSuggestions = async () => {
        if (!jobDescriptionId || !resumeId) {
            setAlertModal({
                show: true,
                title: 'Tailoring Unavailable',
                message: 'Job description information is missing',
                type: 'info',
            });
            return;
        }

        if (!experience.company || !experience.position) {
            setAlertModal({
                show: true,
                title: 'Missing Information',
                message: 'Please fill in company and position before generating suggestions',
                type: 'info',
            });
            return;
        }

        setSuggestionLoading(true);
        try {
            const response = await fetch('/api/ai/tailor-section', {
                method: 'POST',
                headers: getAIHeaders(),
                body: JSON.stringify({
                    resumeId,
                    jobDescriptionId,
                    section: 'workExperience',
                    sectionData: experience,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to generate suggestions');
            }

            setTailoringSuggestions(data.data.suggestions);
        } catch (error) {
            setAlertModal({
                show: true,
                title: 'Error',
                message: `Failed to generate suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setSuggestionLoading(false);
        }
    };

    const handleApplyTailoringSuggestions = (suggestions: string[]) => {
        onUpdate({ ...experience, achievements: [...experience.achievements, ...suggestions] });
        setAlertModal({
            show: true,
            title: 'Success',
            message: 'AI suggestions applied successfully!',
            type: 'success',
        });
    };

    const handleOptimizeForRole = async () => {
        if (!experience.company || !experience.position) {
            setAlertModal({
                show: true,
                title: 'Missing Information',
                message: 'Please fill in company and position before optimizing',
                type: 'info',
            });
            return;
        }
        try {
            const suggestions = await optimizeForRole(experience);
            if (suggestions) {
                setTailoringSuggestions(suggestions as { achievements: string[]; tips: string[] });
            }
        } catch (error) {
            setAlertModal({
                show: true,
                title: 'Error',
                message: `Failed to optimize: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error',
            });
        }
    };

    return (
        <Card
            variant={isExpanded ? "default" : "outlined"}
            className={cn(
                "overflow-hidden transition-all duration-300",
                isExpanded ? "shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800" : "hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
        >
            {/* Header */}
            <div
                className={cn(
                    "flex cursor-pointer items-center justify-between p-5 transition-colors",
                    isExpanded ? "bg-zinc-50/50 dark:bg-zinc-900/50" : "hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30"
                )}
                onClick={onToggleExpand}
            >
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                        <GripVertical className="h-5 w-5 text-gray-300 hover:text-gray-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display font-bold text-foreground">
                                {experience.position || 'Untitled Position'}
                            </h3>
                            {experience.current && (
                                <Badge variant="success" size="sm" shape="pill">Current</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {experience.company || 'Company'}
                            </span>
                            {(experience.startDate || experience.endDate) && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {experience.startDate || '...'} — {experience.current ? 'Present' : experience.endDate || '...'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghostSubtle"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="text-gray-400 hover:text-red-500 rounded-full h-9 w-9"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                        isExpanded ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "text-zinc-400"
                    )}>
                        {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                        ) : (
                            <ChevronDown className="h-5 w-5" />
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-6 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid gap-6 md:grid-cols-2">
                        <FloatingLabelInput
                            label="Job Title"
                            value={experience.position}
                            onChange={(e) => handleChange('position', e.target.value)}
                            leftIcon={<Briefcase className="h-4 w-4" />}
                            placeholder="e.g. Senior Software Engineer"
                        />
                        <FloatingLabelInput
                            label="Company"
                            value={experience.company}
                            onChange={(e) => handleChange('company', e.target.value)}
                            leftIcon={<Building2 className="h-4 w-4" />}
                            placeholder="e.g. Acme Corp"
                        />
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <FloatingLabelInput
                            label="Location"
                            value={experience.location || ''}
                            onChange={(e) => handleChange('location', e.target.value)}
                            leftIcon={<MapPin className="h-4 w-4" />}
                            placeholder="e.g. San Francisco, CA"
                            className="md:col-span-1"
                        />
                        <MonthPicker
                            label="Start Date"
                            value={experience.startDate}
                            onChange={(val) => handleChange('startDate', val)}
                            leftIcon={<Calendar className="h-4 w-4" />}
                        />
                        <div className="space-y-2">
                            <MonthPicker
                                label="End Date"
                                value={experience.endDate || ''}
                                onChange={(val) => handleChange('endDate', val)}
                                disabled={experience.current}
                                leftIcon={<Calendar className="h-4 w-4" />}
                            />
                            <label className="flex items-center gap-2 px-1 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={experience.current}
                                    onChange={(e) => {
                                        onUpdate({
                                            ...experience,
                                            current: e.target.checked,
                                            endDate: e.target.checked ? undefined : experience.endDate
                                        });
                                    }}
                                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                                />
                                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors tracking-wide uppercase">I currently work here</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-foreground uppercase tracking-wider">Role Description</label>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleGenerateBullets}
                                disabled={aiLoading}
                                className="rounded-full h-8 px-4 text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 border-none"
                            >
                                {aiLoading ? (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                ) : (
                                    <Sparkles className="mr-2 h-3 w-3 text-white dark:text-black group-hover:rotate-12 transition-transform" />
                                )}
                                Auto-Generate Bullets
                            </Button>
                        </div>
                        <Textarea
                            value={experience.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Briefly describe your core responsibilities and team context..."
                            className="min-h-[100px] bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 transition-all resize-none"
                        />
                        <p className="text-[11px] text-muted-foreground italic">
                            Tip: Describe what you did in plain text, then use the button above to transform it into professional bullet points.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <BulletPointEditor
                            bullets={experience.achievements}
                            onChange={(bullets) => handleChange('achievements', bullets)}
                            context={{ role: experience.position, company: experience.company }}
                        />
                    </div>

                    {jobDescription && jobDescriptionId && (
                        <div className="mt-8">
                            <SuggestionCard
                                title="Tailoring Recommendations"
                                suggestions={tailoringSuggestions?.achievements || []}
                                tips={tailoringSuggestions?.tips || []}
                                isLoading={suggestionLoading}
                                onGenerate={handleGenerateTailoringSuggestions}
                                onApply={handleApplyTailoringSuggestions}
                                onGenerateRole={hasTargetRoles ? handleOptimizeForRole : undefined}
                                roleLabel={hasTargetRoles ? primaryRoleLabel : undefined}
                                isGeneratingRole={isOptimizing}
                            />
                        </div>
                    )}
                </div>
            )}

            <AlertDialog
                isOpen={alertModal.show}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={() => setAlertModal({ ...alertModal, show: false })}
            />
        </Card>
    );
}
