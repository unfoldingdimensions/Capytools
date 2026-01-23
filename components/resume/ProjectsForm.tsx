'use client';

import { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Code } from 'lucide-react';
import type { Project } from '@/types/resume.types';
import { ProjectItem } from './ProjectItem';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useResumeContext } from '@/context/ResumeContext';
import { TailoringContext } from '@/store/TailoringProvider';

interface ProjectsFormProps {
    initialData?: Project[];
    onUpdate: (data: Project[]) => void;
}

export default function ProjectsForm({
    initialData = [],
    onUpdate,
}: ProjectsFormProps) {
    const { resumeId } = useResumeContext();
    const { jobDescription, jobDescriptionId } = useContext(TailoringContext);

    const [projects, setProjects] = useState<Project[]>(
        initialData.length > 0 ? initialData : []
    );
    const [expandedIndex, setExpandedIndex] = useState<number | null>(
        projects.length > 0 ? 0 : null
    );

    // Modal states
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ show: false, title: '', message: '', onConfirm: () => { } });

    // Update projects when initialData changes
    useEffect(() => {
        if (initialData && initialData.length > 0) {
            setProjects(initialData);
            if (expandedIndex === null) {
                setExpandedIndex(0);
            }
        }
    }, [initialData]);

    const handleAdd = () => {
        const newProject: Project = {
            id: `temp_${Date.now()}`,
            title: '',
            description: '',
            technologies: [],
            url: '',
            githubUrl: '',
            highlights: [],
        };
        const updated = [...projects, newProject];
        setProjects(updated);
        setExpandedIndex(updated.length - 1);
        onUpdate(updated);
    };

    const handleDelete = (index: number) => {
        setConfirmModal({
            show: true,
            title: 'Delete Project',
            message: 'Are you sure you want to delete this project?',
            onConfirm: () => {
                const updated = projects.filter((_, i) => i !== index);
                setProjects(updated);
                if (expandedIndex === index) {
                    setExpandedIndex(updated.length > 0 ? 0 : null);
                }
                onUpdate(updated);
                setConfirmModal({ show: false, title: '', message: '', onConfirm: () => { } });
            },
        });
    };

    const handleUpdate = (index: number, updatedProject: Project) => {
        const updated = [...projects];
        updated[index] = updatedProject;
        setProjects(updated);
        onUpdate(updated);
    };

    return (
        <div className="space-y-6">
            {projects.length === 0 ? (
                <Card variant="outlined" className="p-12 border-dashed flex flex-col items-center text-center bg-gray-50/30">
                    <div className="h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                        <Code className="h-8 w-8 text-brand-600" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-gray-900 mb-2">No projects yet</h3>
                    <p className="text-gray-500 max-w-xs mb-8">
                        Showcase your personal projects, open source contributions, or side hustles.
                    </p>
                    <Button
                        onClick={handleAdd}
                        variant="gradient"
                        className="rounded-full px-8"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Project
                    </Button>
                </Card>
            ) : (
                <>
                    <div className="space-y-4">
                        {projects.map((proj, index) => (
                            <ProjectItem
                                key={proj.id || index}
                                project={proj}
                                isExpanded={expandedIndex === index}
                                onToggleExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                onUpdate={(updatedProject) => handleUpdate(index, updatedProject)}
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
                        Add Another Project
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
