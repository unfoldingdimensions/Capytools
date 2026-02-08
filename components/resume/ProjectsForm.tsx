'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Code } from 'lucide-react';
import type { Project } from '@/types/resume.types';
import { ProjectItem } from './ProjectItem';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useResumeContext } from '@/context/ResumeContext';
import { TailoringContext } from '@/store/TailoringProvider';
import { useDebounce } from '@/hooks/useDebounce';

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

    // Debounce state for updates
    const debouncedProjects = useDebounce(projects, 500);
    const lastSavedDataRef = useRef<string>(JSON.stringify(initialData));

    // Modal states
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ show: false, title: '', message: '', onConfirm: () => { } });

    // Handle updates when debounced value changes
    useEffect(() => {
        const stringifiedData = JSON.stringify(debouncedProjects);
        if (stringifiedData !== lastSavedDataRef.current) {
            lastSavedDataRef.current = stringifiedData;
            onUpdate(debouncedProjects);
        }
    }, [debouncedProjects, onUpdate]);

    // Update projects when initialData changes externally
    useEffect(() => {
        if (initialData && initialData.length > 0) {
            const stringifiedInitial = JSON.stringify(initialData);
            if (stringifiedInitial !== lastSavedDataRef.current) {
                setProjects(initialData);
                lastSavedDataRef.current = stringifiedInitial;
                if (expandedIndex === null) {
                    setExpandedIndex(0);
                }
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
                setConfirmModal({ show: false, title: '', message: '', onConfirm: () => { } });
            },
        });
    };

    const handleUpdate = (index: number, updatedProject: Project) => {
        const updated = [...projects];
        updated[index] = updatedProject;
        setProjects(updated);
    };

    return (
        <div className="space-y-6">
            {projects.length === 0 ? (
                <Card variant="outlined" className="p-12 border-dashed flex flex-col items-center text-center bg-zinc-50/30 dark:bg-zinc-900/10">
                    <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                        <Code className="h-8 w-8 text-black dark:text-white" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground mb-2">No projects yet</h3>
                    <p className="text-muted-foreground max-w-xs mb-8">
                        Showcase your personal projects, open source contributions, or side hustles.
                    </p>
                    <Button
                        onClick={handleAdd}
                        className="rounded-full px-8 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
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
                        className="w-full h-12 rounded-xl border-dashed border-2 hover:bg-zinc-50/50 hover:border-black dark:hover:border-white transition-all font-bold"
                    >
                        <Plus className="mr-2 h-4 w-4 text-zinc-900 dark:text-white" />
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
