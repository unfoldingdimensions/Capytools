'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Textarea } from '@/components/ui/textarea';
import {
    GripVertical,
    Trash2,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Loader2,
    ExternalLink,
    Github,
    Cpu,
    Target
} from 'lucide-react';
import type { Project } from '@/types/resume.types';
import { BulletPointEditor } from './BulletPointEditor';
import SuggestionCard from './SuggestionCard';
import { AIService } from '@/lib/services/ai.service';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { cn } from '@/lib/utils/cn';

interface JobDescription {
    id: string;
    title: string;
    company: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    keywords: string[];
}

interface ProjectItemProps {
    project: Project;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (updatedProject: Project) => void;
    onDelete: () => void;
    jobDescription?: JobDescription | null;
    jobDescriptionId?: string | null;
    resumeId?: string;
}

export function ProjectItem({
    project,
    isExpanded,
    onToggleExpand,
    onUpdate,
    onDelete,
    jobDescription,
    jobDescriptionId,
    resumeId,
}: ProjectItemProps) {
    const [aiLoading, setAiLoading] = useState<boolean>(false);
    const [suggestionLoading, setSuggestionLoading] = useState<boolean>(false);
    const [tailoringSuggestions, setTailoringSuggestions] = useState<{ highlights: string[]; tips: string[] } | null>(null);

    const [alertModal, setAlertModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
    }>({ show: false, title: '', message: '', type: 'info' });

    const handleChange = (field: keyof Project, value: unknown) => {
        onUpdate({ ...project, [field]: value });
    };

    const handleGenerateHighlights = async () => {
        if (!project.description || project.description.trim().length === 0) {
            setAlertModal({
                show: true,
                title: 'Description Required',
                message: 'Please enter a project description first.',
                type: 'info',
            });
            return;
        }

        setAiLoading(true);
        try {
            const result = await AIService.generateBulletPoints(project.description, {
                role: `Project: ${project.title}`,
                count: 3
            });

            onUpdate({ ...project, highlights: [...(project.highlights || []), ...result.bulletPoints] });
        } catch (error) {
            setAlertModal({
                show: true,
                title: 'Error',
                message: `Failed to generate highlights: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

        if (!project.title) {
            setAlertModal({
                show: true,
                title: 'Missing Information',
                message: 'Please fill in project title before generating suggestions',
                type: 'info',
            });
            return;
        }

        setSuggestionLoading(true);
        try {
            const response = await fetch('/api/ai/tailor-section', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resumeId,
                    jobDescriptionId,
                    section: 'projects',
                    sectionData: project,
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
        onUpdate({ ...project, highlights: [...(project.highlights || []), ...suggestions] });
        setAlertModal({
            show: true,
            title: 'Success',
            message: 'AI suggestions applied successfully!',
            type: 'success',
        });
    };

    return (
        <Card
            variant={isExpanded ? "default" : "outlined"}
            className={cn(
                "overflow-hidden transition-all duration-300",
                isExpanded ? "shadow-lg ring-1 ring-brand-100" : "hover:border-brand-200"
            )}
        >
            {/* Header */}
            <div
                className={cn(
                    "flex cursor-pointer items-center justify-between p-5 transition-colors",
                    isExpanded ? "bg-brand-50/30 dark:bg-brand-950/30" : "hover:bg-gray-50/50 dark:hover:bg-gray-900/50"
                )}
                onClick={onToggleExpand}
            >
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                        <GripVertical className="h-5 w-5 text-gray-300 hover:text-gray-400" />
                    </div>
                    <div>
                        <h3 className="font-display font-bold text-foreground mb-1">
                            {project.title || 'Untitled Project'}
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {project.technologies && project.technologies.length > 0 ? (
                                project.technologies.slice(0, 4).map((tech, i) => (
                                    <Badge key={i} variant="secondary" size="sm" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none">
                                        {tech}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-xs text-muted-foreground italic">No technologies listed</span>
                            )}
                            {project.technologies && project.technologies.length > 4 && (
                                <span className="text-[10px] text-muted-foreground self-center">+{project.technologies.length - 4} more</span>
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
                        isExpanded ? "bg-brand-100 text-brand-600" : "text-gray-400"
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
                    <div className="space-y-6">
                        <FloatingLabelInput
                            label="Project Title"
                            value={project.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            leftIcon={<Target className="h-4 w-4" />}
                            placeholder="e.g. AI-Powered Portfolio"
                        />
                        <div className="grid gap-6 md:grid-cols-2">
                            <FloatingLabelInput
                                label="Project Link (Optional)"
                                value={project.url || ''}
                                onChange={(e) => handleChange('url', e.target.value)}
                                leftIcon={<ExternalLink className="h-4 w-4" />}
                                placeholder="e.g. https://myproject.com"
                            />
                            <FloatingLabelInput
                                label="GitHub Repository (Optional)"
                                value={project.githubUrl || ''}
                                onChange={(e) => handleChange('githubUrl', e.target.value)}
                                leftIcon={<Github className="h-4 w-4" />}
                                placeholder="e.g. github.com/user/repo"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-foreground uppercase tracking-wider">Technologies Used</label>
                        <FloatingLabelInput
                            label="Technologies (comma separated)"
                            value={project.technologies?.join(', ') || ''}
                            onChange={(e) =>
                                handleChange(
                                    'technologies',
                                    e.target.value
                                        .split(',')
                                        .map((s) => s.trim())
                                        .filter((s) => s.length > 0)
                                )
                            }
                            leftIcon={<Cpu className="h-4 w-4" />}
                            placeholder="e.g. React, TypeScript, Tailwind"
                        />
                        <p className="text-[11px] text-muted-foreground">Separate values with commas for best presentation.</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-foreground uppercase tracking-wider">What was this project about?</label>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleGenerateHighlights}
                                disabled={aiLoading}
                                className="rounded-full h-8 px-4 text-xs font-bold"
                            >
                                {aiLoading ? (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                ) : (
                                    <Sparkles className="mr-2 h-3 w-3 text-brand-500" />
                                )}
                                Auto-Generate Highlights
                            </Button>
                        </div>
                        <Textarea
                            value={project.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Briefly explain the goal and your role in this project..."
                            className="min-h-[100px] bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 transition-all resize-none"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <BulletPointEditor
                            bullets={project.highlights || []}
                            onChange={(bullets) => handleChange('highlights', bullets)}
                            context={{ role: `Creator of ${project.title}` }}
                        />
                    </div>

                    {jobDescription && jobDescriptionId && (
                        <div className="mt-8">
                            <SuggestionCard
                                title="Optimize for Role"
                                suggestions={tailoringSuggestions?.highlights || []}
                                tips={tailoringSuggestions?.tips || []}
                                isLoading={suggestionLoading}
                                onGenerate={handleGenerateTailoringSuggestions}
                                onApply={handleApplyTailoringSuggestions}
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
