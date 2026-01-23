'use client';

import { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, GraduationCap } from 'lucide-react';
import type { Education } from '@/types/resume.types';
import { EducationItem } from './EducationItem';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useResumeContext } from '@/context/ResumeContext';
import { TailoringContext } from '@/store/TailoringProvider';

interface EducationFormProps {
    initialData?: Education[];
    onUpdate: (data: Education[]) => void;
}

export default function EducationForm({
    initialData = [],
    onUpdate,
}: EducationFormProps) {
    const { resumeId } = useResumeContext();
    const { jobDescription, jobDescriptionId } = useContext(TailoringContext);

    const [educationList, setEducationList] = useState<Education[]>(
        initialData.length > 0 ? initialData : []
    );
    const [expandedIndex, setExpandedIndex] = useState<number | null>(
        educationList.length > 0 ? 0 : null
    );

    // Modal states
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ show: false, title: '', message: '', onConfirm: () => { } });

    // Update educationList when initialData changes
    useEffect(() => {
        if (initialData && initialData.length > 0) {
            setEducationList(initialData);
            if (expandedIndex === null) {
                setExpandedIndex(0);
            }
        }
    }, [initialData]);

    const handleAdd = () => {
        const newEducation: Education = {
            id: `temp_${Date.now()}`,
            institution: '',
            degree: '',
            field: '',
            location: '',
            startDate: '',
            endDate: '',
            current: false,
            gpa: '',
            achievements: [],
        };
        const updated = [...educationList, newEducation];
        setEducationList(updated);
        setExpandedIndex(updated.length - 1);
        onUpdate(updated);
    };

    const handleDelete = (index: number) => {
        setConfirmModal({
            show: true,
            title: 'Delete Education',
            message: 'Are you sure you want to delete this education entry?',
            onConfirm: () => {
                const updated = educationList.filter((_, i) => i !== index);
                setEducationList(updated);
                if (expandedIndex === index) {
                    setExpandedIndex(updated.length > 0 ? 0 : null);
                }
                onUpdate(updated);
                setConfirmModal({ show: false, title: '', message: '', onConfirm: () => { } });
            },
        });
    };

    const handleUpdate = (index: number, updatedEducation: Education) => {
        const updated = [...educationList];
        updated[index] = updatedEducation;
        setEducationList(updated);
        onUpdate(updated);
    };

    return (
        <div className="space-y-6">
            {educationList.length === 0 ? (
                <Card variant="outlined" className="p-12 border-dashed flex flex-col items-center text-center bg-gray-50/30">
                    <div className="h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                        <GraduationCap className="h-8 w-8 text-brand-600" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground mb-2">No education added</h3>
                    <p className="text-muted-foreground max-w-xs mb-8">
                        Add your degrees, certifications, and academic achievements to complete your profile.
                    </p>
                    <Button
                        onClick={handleAdd}
                        variant="gradient"
                        className="rounded-full px-8"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Education
                    </Button>
                </Card>
            ) : (
                <>
                    <div className="space-y-4">
                        {educationList.map((edu, index) => (
                            <EducationItem
                                key={edu.id || index}
                                education={edu}
                                isExpanded={expandedIndex === index}
                                onToggleExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                onUpdate={(updatedEducation) => handleUpdate(index, updatedEducation)}
                                onDelete={() => handleDelete(index)}
                                jobDescription={jobDescription}
                                jobDescriptionId={jobDescriptionId}
                                resumeId={resumeId}
                            />
                        ))}
                    </div>

                    <Button
                        onClick={handleAdd}
                        variant="outline"
                        className="w-full h-12 rounded-xl border-dashed border-2 hover:bg-gray-50/50 hover:border-brand-500 transition-all"
                    >
                        <Plus className="mr-2 h-4 w-4 text-brand-600" />
                        Add Another Education
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
