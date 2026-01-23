'use client';

import { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Plus, X, Star, Sparkles } from 'lucide-react';
import SuggestionCard from './SuggestionCard';
import type { Skill } from '@/types/resume.types';
import { useResumeContext } from '@/context/ResumeContext';
import { TailoringContext } from '@/store/TailoringProvider';
import { AlertDialog } from '@/components/ui/AlertDialog';

interface SkillsFormProps {
    initialData?: Skill[];
    onUpdate: (data: Skill[]) => void;
}

export default function SkillsForm({
    initialData = [],
    onUpdate,
}: SkillsFormProps) {
    const { resumeId } = useResumeContext();
    const { jobDescription, jobDescriptionId } = useContext(TailoringContext);

    const [skills, setSkills] = useState<Skill[]>(initialData.length > 0 ? initialData : []);
    const [newCategory, setNewCategory] = useState('');
    const [newSkillInputs, setNewSkillInputs] = useState<Record<string, string>>({});

    // Modal states
    const [alertModal, setAlertModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
    }>({ show: false, title: '', message: '', type: 'info' });

    // AI Tailoring state
    const [tailoringSuggestion, setTailoringSuggestion] = useState<{ suggestedSkills: string[]; tips: string[] } | null>(null);
    const [suggestionLoading, setSuggestionLoading] = useState(false);

    // Update skills when initialData changes
    useEffect(() => {
        if (initialData && initialData.length > 0) {
            setSkills(initialData);
        }
    }, [initialData]);

    const categories = Array.from(new Set(skills.map((s) => s.category)));

    const handleAddCategory = () => {
        if (!newCategory.trim()) {
            setAlertModal({
                show: true,
                title: 'Category Name Required',
                message: 'Please enter a category name (e.g. Technical Skills)',
                type: 'info',
            });
            return;
        }

        if (categories.some(c => c.toLowerCase() === newCategory.trim().toLowerCase())) {
            setAlertModal({
                show: true,
                title: 'Category Exists',
                message: 'This category already exists',
                type: 'info',
            });
            return;
        }

        const categoryName = newCategory.trim();
        const newSkill: Skill = {
            id: `temp_${Date.now()}`,
            category: categoryName,
            skills: [],
        };

        const updated = [...skills, newSkill];
        setSkills(updated);
        onUpdate(updated);
        setNewCategory('');
        setNewSkillInputs({ ...newSkillInputs, [categoryName]: '' });
    };

    const handleAddSkill = (category: string) => {
        const skillName = newSkillInputs[category]?.trim();
        if (!skillName) return;

        const updated = skills.map(s => {
            if (s.category === category) {
                if (s.skills.some(skill => skill.toLowerCase() === skillName.toLowerCase())) {
                    return s;
                }
                return { ...s, skills: [...s.skills, skillName] };
            }
            return s;
        });

        setSkills(updated);
        onUpdate(updated);
        setNewSkillInputs({ ...newSkillInputs, [category]: '' });
    };

    const handleDeleteSkill = (category: string, skillName: string) => {
        const updated = skills.map(s => {
            if (s.category === category) {
                return { ...s, skills: s.skills.filter(sk => sk !== skillName) };
            }
            return s;
        }).filter(s => s.skills.length > 0 || s.category === category);

        setSkills(updated);
        onUpdate(updated);
    };

    const handleDeleteCategory = (category: string) => {
        const updated = skills.filter(s => s.category !== category);
        setSkills(updated);
        onUpdate(updated);
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

        setSuggestionLoading(true);
        try {
            const response = await fetch('/api/ai/tailor-section', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resumeId,
                    jobDescriptionId,
                    section: 'skills',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to generate suggestions');
            }

            setTailoringSuggestion(data.data.suggestions);
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
        if (suggestions.length > 0) {
            const categoryName = 'Key Skills';
            const existingCategory = skills.find(s => s.category === categoryName);

            let updated: Skill[];
            if (existingCategory) {
                const newSkills = suggestions.filter(skill => !existingCategory.skills.includes(skill));
                updated = skills.map(s =>
                    s.category === categoryName
                        ? { ...s, skills: [...s.skills, ...newSkills] }
                        : s
                );
            } else {
                updated = [{ id: `temp_${Date.now()}`, category: categoryName, skills: suggestions }, ...skills];
            }

            setSkills(updated);
            onUpdate(updated);
            setAlertModal({
                show: true,
                title: 'Skills Applied',
                message: 'Recommended skills have been added to your profile!',
                type: 'success',
            });
        }
    };

    return (
        <div className="space-y-8">
            {/* Category Input */}
            <Card variant="outlined" className="p-6 bg-gray-50/50 border-dashed">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <FloatingLabelInput
                            label="New Skill Category"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="e.g. Programming Languages, Frameworks, Soft Skills"
                            leftIcon={<Plus className="h-4 w-4" />}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                    </div>
                    <Button
                        onClick={handleAddCategory}
                        variant="brand"
                        size="lg"
                        className="rounded-xl h-[52px] px-6"
                    >
                        Create Category
                    </Button>
                </div>
            </Card>

            {/* Skill Categories Grid */}
            <div className="grid grid-cols-1 gap-6">
                {skills.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-gray-100 bg-gray-50/30">
                        <Star className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">Add categories to start organizing your skills.</p>
                    </div>
                ) : (
                    skills.map((s) => (
                        <Card key={s.id || s.category} className="group overflow-hidden border-none shadow-sm bg-white ring-1 ring-gray-100 hover:ring-brand-200 transition-all duration-300">
                            <div className="p-5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-brand-500" />
                                    <h3 className="font-display font-bold text-foreground uppercase tracking-wider text-xs">{s.category}</h3>
                                    <Badge variant="secondary" size="sm" className="ml-2 bg-white">{s.skills.length}</Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteCategory(s.category)}
                                    className="h-7 w-7 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Skills Bubbles */}
                                <div className="flex flex-wrap gap-2">
                                    {s.skills.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic">No skills added yet...</p>
                                    ) : (
                                        s.skills.map((skill, idx) => (
                                            <Badge
                                                key={idx}
                                                variant="outline"
                                                className="pl-3 pr-1 py-1 gap-1.5 rounded-full border-gray-200 bg-white group/skill hover:border-brand-300 hover:bg-brand-50/30 transition-all"
                                            >
                                                <span className="text-xs font-semibold text-gray-700">{skill}</span>
                                                <button
                                                    onClick={() => handleDeleteSkill(s.category, skill)}
                                                    className="w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))
                                    )}
                                </div>

                                {/* Add Skill Input */}
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            value={newSkillInputs[s.category] || ''}
                                            onChange={(e) =>
                                                setNewSkillInputs({
                                                    ...newSkillInputs,
                                                    [s.category]: e.target.value,
                                                })
                                            }
                                            placeholder={`Add a skill to ${s.category}...`}
                                            className="w-full h-10 px-4 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill(s.category)}
                                        />
                                    </div>
                                    <Button
                                        size="icon"
                                        onClick={() => handleAddSkill(s.category)}
                                        className="h-10 w-10 rounded-xl"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* AI Recommendations */}
            {jobDescription && jobDescriptionId && (
                <div className="pt-4">
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <Sparkles className="h-4 w-4 text-brand-600" />
                        <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">AI Power Tools</h4>
                    </div>
                    <SuggestionCard
                        title="Keyword Matching"
                        suggestions={tailoringSuggestion?.suggestedSkills || []}
                        tips={tailoringSuggestion?.tips || []}
                        isLoading={suggestionLoading}
                        onGenerate={handleGenerateTailoringSuggestions}
                        onApply={handleApplyTailoringSuggestions}
                    />
                </div>
            )}

            <AlertDialog
                isOpen={alertModal.show}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={() => setAlertModal({ show: false, title: '', message: '', type: 'info' })}
            />
        </div>
    );
}
