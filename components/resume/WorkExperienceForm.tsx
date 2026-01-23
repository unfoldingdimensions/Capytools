'use client';

import { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Briefcase } from 'lucide-react';
import type { WorkExperience } from '@/types/resume.types';
import { WorkExperienceItem } from './WorkExperienceItem';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useResumeContext } from '@/context/ResumeContext';
import { TailoringContext } from '@/store/TailoringProvider';

interface WorkExperienceFormProps {
    initialData?: WorkExperience[];
    onUpdate: (data: WorkExperience[]) => void;
}

export default function WorkExperienceForm({
    initialData = [],
    onUpdate,
}: WorkExperienceFormProps) {
    const { resumeId } = useResumeContext();
    const { jobDescription, jobDescriptionId } = useContext(TailoringContext);

    const [experiences, setExperiences] = useState<WorkExperience[]>(
        initialData.length > 0 ? initialData : []
    );
    const [expandedIndex, setExpandedIndex] = useState<number | null>(
        experiences.length > 0 ? 0 : null
    );

    // Modal states
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ show: false, title: '', message: '', onConfirm: () => { } });

    // Update experiences when initialData changes
    useEffect(() => {
        if (initialData && initialData.length > 0) {
            setExperiences(initialData);
            if (expandedIndex === null) {
                setExpandedIndex(0);
            }
        }
    }, [initialData]);

    const handleAddExperience = () => {
        const newExperience: WorkExperience = {
            id: `temp_${Date.now()}`,
            company: '',
            position: '',
            location: '',
            startDate: '',
            endDate: '',
            current: false,
            description: '',
            achievements: [],
        };
        const updated = [...experiences, newExperience];
        setExperiences(updated);
        setExpandedIndex(updated.length - 1);
        onUpdate(updated);
    };

    const handleDeleteExperience = (index: number) => {
        setConfirmModal({
            show: true,
            title: 'Delete Work Experience',
            message: 'Are you sure you want to delete this work experience?',
            onConfirm: () => {
                const updated = experiences.filter((_, i) => i !== index);
                setExperiences(updated);
                if (expandedIndex === index) {
                    setExpandedIndex(updated.length > 0 ? 0 : null);
                }
                onUpdate(updated);
                setConfirmModal({ show: false, title: '', message: '', onConfirm: () => { } });
            },
        });
    };

    const handleUpdateExperience = (index: number, updatedExp: WorkExperience) => {
        const updated = [...experiences];
        updated[index] = updatedExp;
        setExperiences(updated);
        onUpdate(updated);
    };

    return (
        <div className="space-y-6">
            {experiences.length === 0 ? (
                <Card variant="outlined" className="p-12 border-dashed flex flex-col items-center text-center bg-gray-50/30">
                    <div className="h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                        <Briefcase className="h-8 w-8 text-brand-600" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground mb-2">No work experience yet</h3>
                    <p className="text-muted-foreground max-w-xs mb-8">
                        Add your work history to show employers your professional journey and achievements.
                    </p>
                    <Button
                        onClick={handleAddExperience}
                        variant="gradient"
                        className="rounded-full px-8"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Role
                    </Button>
                </Card>
            ) : (
                <>
                    <div className="space-y-4">
                        {experiences.map((exp, index) => (
                            <WorkExperienceItem
                                key={exp.id || index}
                                experience={exp}
                                isExpanded={expandedIndex === index}
                                onToggleExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                onUpdate={(updatedExp) => handleUpdateExperience(index, updatedExp)}
                                onDelete={() => handleDeleteExperience(index)}
                                jobDescription={jobDescription}
                                jobDescriptionId={jobDescriptionId}
                                resumeId={resumeId}
                            />
                        ))}
                    </div>

                    <Button
                        onClick={handleAddExperience}
                        variant="outline"
                        className="w-full h-12 rounded-xl border-dashed border-2 hover:bg-gray-50/50 hover:border-brand-500 transition-all"
                    >
                        <Plus className="mr-2 h-4 w-4 text-brand-600" />
                        Add Another Experience
                    </Button>
                </>
            )}

            <ConfirmDialog
                isOpen={confirmModal.show}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: () => { } })}
            />
        </div>
    );
}
