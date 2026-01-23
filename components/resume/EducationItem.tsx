'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { MonthPicker } from '@/components/ui/month-picker';
import {
    GripVertical,
    Trash2,
    ChevronDown,
    ChevronUp,
    GraduationCap,
    BookOpen,
    MapPin,
    Calendar,
    Star
} from 'lucide-react';
import type { Education } from '@/types/resume.types';
import { BulletPointEditor } from './BulletPointEditor';
import SuggestionCard from './SuggestionCard';
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

interface EducationItemProps {
    education: Education;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (updatedEducation: Education) => void;
    onDelete: () => void;
    jobDescription?: JobDescription | null;
    jobDescriptionId?: string | null;
    resumeId?: string;
}

export function EducationItem({
    education,
    isExpanded,
    onToggleExpand,
    onUpdate,
    onDelete,
    jobDescription,
    jobDescriptionId,
    resumeId,
}: EducationItemProps) {
    const [suggestionLoading, setSuggestionLoading] = useState<boolean>(false);
    const [tailoringSuggestions, setTailoringSuggestions] = useState<{ relevantPoints: string[]; tips: string[] } | null>(null);

    const [alertModal, setAlertModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
    }>({ show: false, title: '', message: '', type: 'info' });

    const handleChange = (field: keyof Education, value: unknown) => {
        onUpdate({ ...education, [field]: value });
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

        if (!education.institution || !education.degree) {
            setAlertModal({
                show: true,
                title: 'Missing Information',
                message: 'Please fill in institution and degree before generating suggestions',
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
                    section: 'education',
                    sectionData: education,
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
        onUpdate({ ...education, achievements: [...(education.achievements || []), ...suggestions] });
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
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display font-bold text-foreground">
                                {education.degree || 'Degree'}
                                {education.field && <span className="text-muted-foreground font-normal"> in {education.field}</span>}
                            </h3>
                            {education.current && (
                                <Badge variant="brand" size="sm" shape="pill">Currently Attending</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <GraduationCap className="h-3.5 w-3.5" />
                                {education.institution || 'Institution'}
                            </span>
                            {(education.startDate || education.endDate) && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {education.startDate || '...'} — {education.current ? 'Present' : education.endDate || '...'}
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
                            label="Institution"
                            value={education.institution}
                            onChange={(e) => handleChange('institution', e.target.value)}
                            leftIcon={<GraduationCap className="h-4 w-4" />}
                            placeholder="e.g. Stanford University"
                        />
                        <div className="grid gap-6 md:grid-cols-2">
                            <FloatingLabelInput
                                label="Degree"
                                value={education.degree}
                                onChange={(e) => handleChange('degree', e.target.value)}
                                leftIcon={<BookOpen className="h-4 w-4" />}
                                placeholder="e.g. Bachelor of Science"
                            />
                            <FloatingLabelInput
                                label="Field of Study"
                                value={education.field}
                                onChange={(e) => handleChange('field', e.target.value)}
                                leftIcon={<Star className="h-4 w-4" />}
                                placeholder="e.g. Computer Science"
                            />
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <FloatingLabelInput
                            label="Location"
                            value={education.location || ''}
                            onChange={(e) => handleChange('location', e.target.value)}
                            leftIcon={<MapPin className="h-4 w-4" />}
                            placeholder="e.g. Stanford, CA"
                        />
                        <MonthPicker
                            label="Start Date"
                            value={education.startDate || ''}
                            onChange={(val) => handleChange('startDate', val)}
                            leftIcon={<Calendar className="h-4 w-4" />}
                        />
                        <div className="space-y-2">
                            <MonthPicker
                                label="End Date"
                                value={education.endDate || ''}
                                onChange={(val) => handleChange('endDate', val)}
                                disabled={education.current}
                                leftIcon={<Calendar className="h-4 w-4" />}
                            />
                            <label className="flex items-center gap-2 px-1 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={education.current}
                                    onChange={(e) => {
                                        onUpdate({
                                            ...education,
                                            current: e.target.checked,
                                            endDate: e.target.checked ? undefined : education.endDate
                                        });
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                />
                                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors tracking-wide uppercase">I am still studying here</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <FloatingLabelInput
                            label="GPA (Optional)"
                            value={education.gpa || ''}
                            onChange={(e) => handleChange('gpa', e.target.value)}
                            leftIcon={<Star className="h-4 w-4" />}
                            placeholder="e.g. 3.9/4.0"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <BulletPointEditor
                            bullets={education.achievements || []}
                            onChange={(bullets) => handleChange('achievements', bullets)}
                            context={{ role: `Graduate from ${education.institution}` }}
                        />
                    </div>

                    {jobDescription && jobDescriptionId && (
                        <div className="mt-8">
                            <SuggestionCard
                                title="Academic Customization"
                                suggestions={tailoringSuggestions?.relevantPoints || []}
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
