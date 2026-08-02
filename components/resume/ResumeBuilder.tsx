'use client';
import { useState, useEffect, useContext, useMemo, useRef, useDeferredValue } from 'react';
import { Button } from '@/components/ui/button';
import PersonalInfoForm from './PersonalInfoForm';
import WorkExperienceForm from './WorkExperienceForm';
import EducationForm from './EducationForm';
import ProjectsForm from './ProjectsForm';
import SkillsForm from './SkillsForm';
import CertificationsForm from './CertificationsForm';
import { PreviewModal } from './PreviewModal';
import { Sparkles, X } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useResumeLoader } from '@/lib/hooks/useResumeLoader';
import { useResumeSaver } from '@/lib/hooks/useResumeSaver';
import { TailoringContext } from '@/store/TailoringProvider';
import { ResumeProvider } from '@/context/ResumeContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { SectionNavigation } from './SectionNavigation';
import { ResumeScorePanel } from './ResumeScorePanel';
import { KeywordHeatmapPanel } from './KeywordHeatmapPanel';
import { JobMatchPanel } from './JobMatchPanel';

import { Badge } from '@/components/ui/badge';
import {
    setFullResume,
    setPersonalInfo,
    updateWorkExperience,
    updateEducation,
    updateProjects,
    updateSkills,
    updateCertifications
} from '@/store/slices/resumeSlice';
import type { PersonalInfoInput } from '@/lib/validations/resume.validation';
import type {
    WorkExperience,
    Education,
    Project,
    Skill,
    Certification,
} from '@/types/resume.types';
import { BuilderHeader } from './BuilderHeader';
import { BuilderLayout } from './BuilderLayout';

interface ResumeBuilderProps {
    resumeId?: string;
}

export default function ResumeBuilder({ resumeId }: ResumeBuilderProps) {
    // const router = useRouter(); // Kept for consistency if needed by children, though Header handles nav
    const dispatch = useAppDispatch();
    const { title, resumeData } = useAppSelector((state) => state.resume);
    const deferredResumeData = useDeferredValue(resumeData);
    const [activeSection, setActiveSection] = useState('personal');

    const {
        jobDescription,
        isTailoringMode,
        setJobDescription,
        setIsTailoringMode,
    } = useContext(TailoringContext);

    const { resumeData: loadedResumeData, isLoading, title: loadedTitle, templateId: loadedTemplateId } = useResumeLoader(resumeId);
    const { saveResume, isSaving } = useResumeSaver(resumeId);
    const { error: toastError } = useToast();
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState('modern-indigo');

    // Snapshot of the last state that was successfully saved. Used to avoid a
    // no-op save right after loading and to drive the beforeunload guard.
    const lastSavedSnapshotRef = useRef<string | null>(null);

    // Capture the initial snapshot so we never treat the pristine state as "dirty".
    useEffect(() => {
        if (lastSavedSnapshotRef.current === null) {
            lastSavedSnapshotRef.current = JSON.stringify({ title, ...resumeData });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Once an existing resume is loaded, lock the snapshot so autosave only fires on real edits.
    useEffect(() => {
        if (loadedResumeData && resumeId) {
            lastSavedSnapshotRef.current = JSON.stringify(loadedResumeData);
        }
    }, [loadedResumeData, resumeId]);

    // Debounced autosave for existing resumes. New resumes keep the explicit
    // "Finish & Save" flow (which creates the resume and redirects).
    useEffect(() => {
        if (!resumeId || isLoading || isSaving) return;

        const currentSnapshot = JSON.stringify({ title, ...resumeData });
        if (lastSavedSnapshotRef.current === currentSnapshot) return;

        const timer = setTimeout(async () => {
            const saved = await saveResume({ title, ...resumeData }, title);
            if (saved) {
                lastSavedSnapshotRef.current = JSON.stringify({ title, ...resumeData });
                setLastSaved(new Date().toLocaleTimeString());
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [resumeId, resumeData, title, isLoading, isSaving, saveResume]);

    // Warn before closing/leaving with unsaved changes.
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const currentSnapshot = JSON.stringify({ title, ...resumeData });
            if (lastSavedSnapshotRef.current !== currentSnapshot) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [title, resumeData]);

    const completedSections = useMemo(() => {
        const completed = [];
        if (resumeData.personalInfo?.fullName && resumeData.personalInfo?.email) {
            completed.push('personal');
        }
        if (resumeData.workExperience && resumeData.workExperience.length > 0) {
            completed.push('experience');
        }
        if (resumeData.education && resumeData.education.length > 0) {
            completed.push('education');
        }
        if (resumeData.projects && resumeData.projects.length > 0) {
            completed.push('projects');
        }
        if (resumeData.skills && resumeData.skills.length > 0) {
            completed.push('skills');
        }
        if (resumeData.certifications && resumeData.certifications.length > 0) {
            completed.push('certifications');
        }
        return completed;
    }, [resumeData]);

    useEffect(() => {
        if (loadedResumeData && resumeId) {
            dispatch(setFullResume({
                id: resumeId,
                title: loadedTitle || 'Untitled Resume',
                data: loadedResumeData
            }));
            // Save as last active resume
            localStorage.setItem('lastActiveResumeId', resumeId);
        }
    }, [loadedResumeData, loadedTitle, resumeId, dispatch]);

    useEffect(() => {
        const savedTemplate = localStorage.getItem('selectedTemplate');
        if (savedTemplate) {
            setSelectedTemplate(savedTemplate);
        }
    }, []);

    // The persisted template on the resume wins once loaded (takes precedence over localStorage).
    useEffect(() => {
        if (loadedTemplateId) {
            setSelectedTemplate(loadedTemplateId);
        }
    }, [loadedTemplateId]);

    const handleSave = async () => {
        const resumeState = {
            title,
            ...resumeData
        };
        // @ts-ignore
        const savedData = await saveResume(resumeState, title);
        if (savedData) {
            setLastSaved(new Date().toLocaleTimeString());
            lastSavedSnapshotRef.current = JSON.stringify(resumeState);
        }
    };

    const handleDownload = async (options: { isAtsMode?: boolean } = {}) => {
        if (!resumeId) {
            toastError({
                title: 'Save required',
                message: 'Please save your resume before exporting it.',
            });
            return;
        }

        try {
            const response = await fetch('/api/resumes/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resumeId,
                    format: 'PDF',
                    isAtsMode: options.isAtsMode,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || 'Failed to download resume');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download error:', err);
            toastError({
                title: 'Export failed',
                message: err instanceof Error ? err.message : 'Please try again.',
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
                    <p className="text-muted-foreground font-medium animate-pulse">Loading your resume...</p>
                </div>
            </div>
        );
    }

    return (
        <ResumeProvider resumeId={resumeId}>
            <BuilderLayout
                header={
                    <BuilderHeader
                        title={title}
                        lastSaved={lastSaved}
                        isSaving={isSaving}
                        onSave={handleSave}
                        onPreview={() => setIsPreviewOpen(true)}
                    />
                }
                leftSidebar={
                    <div className="px-2">
                        <SectionNavigation
                            activeSection={activeSection}
                            setActiveSection={setActiveSection}
                            completedSections={completedSections}
                        />
                    </div>
                }
                rightSidebar={
                    <div className="space-y-6">
                        {/* Tailoring Mode Banner - Show at top when active */}
                        {isTailoringMode && jobDescription && (
                            <div className="p-6 rounded-[1.5rem] bg-black text-white dark:bg-white dark:text-black shadow-swiss-hover group">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 dark:bg-black/5">
                                        <Sparkles className="h-5 w-5 text-white dark:text-black shrink-0 group-hover:rotate-12 transition-transform" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70 mb-1">Tailoring For</p>
                                        <p className="text-sm font-bold line-clamp-1">{jobDescription.title}</p>
                                        <p className="text-xs opacity-50 line-clamp-1">{jobDescription.company}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="xs"
                                    className="w-full rounded-full border-white/20 hover:bg-white/10 text-white dark:text-black dark:border-black/10 font-bold"
                                    onClick={() => {
                                        setIsTailoringMode(false);
                                        setJobDescription(null);
                                    }}
                                >
                                    <X className="mr-1 h-3 w-3" />
                                    Exit Tailoring Mode
                                </Button>
                            </div>
                        )}

                        {/* Resume Score Panel */}
                        <ResumeScorePanel
                            resumeData={deferredResumeData}
                            jobDescription={jobDescription}
                            defaultCollapsed={false}
                        />

                        {/* Job Match Panel - Hide when in tailoring mode */}
                        {!isTailoringMode && (
                            <JobMatchPanel resumeData={deferredResumeData} resumeId={resumeId} />
                        )}

                        {/* Keyword Match Heatmap - only visible in tailoring mode */}
                        {isTailoringMode && jobDescription && (
                            <KeywordHeatmapPanel
                                resumeData={deferredResumeData}
                                jobDescription={jobDescription}
                                onAddToSkills={(keyword) => {
                                    // Add keyword to skills - find or create "Other" category
                                    const existingSkills = resumeData.skills || [];
                                    let otherCategory = existingSkills.find(s => s.category === 'Other');

                                    if (otherCategory) {
                                        // Add to existing "Other" category
                                        const updatedSkills = existingSkills.map(s =>
                                            s.category === 'Other'
                                                ? { ...s, skills: [...new Set([...s.skills, keyword])] }
                                                : s
                                        );
                                        dispatch(updateSkills(updatedSkills));
                                    } else {
                                        // Create new "Other" category
                                        const newCategory = {
                                            id: `skill-${Date.now()}`,
                                            category: 'Other',
                                            skills: [keyword]
                                        };
                                        dispatch(updateSkills([...existingSkills, newCategory]));
                                    }
                                }}
                            />
                        )}
                    </div>
                }
            >
                {/* Mobile section navigation - the left sidebar is hidden below lg */}
                <div className="lg:hidden mb-6">
                    <SectionNavigation
                        activeSection={activeSection}
                        setActiveSection={setActiveSection}
                        completedSections={completedSections}
                    />
                </div>
                <div className="p-8 md:p-12 rounded-t-4xl bg-white dark:bg-gray-900 border border-black/[0.08] dark:border-white/[0.08] shadow-swiss min-h-[600px]">
                    {activeSection === 'personal' && (
                        <section className="space-y-6">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-display font-bold text-foreground leading-none">
                                    Personal Information
                                </h2>
                                <Badge variant="brand" shape="pill">Section 1/6</Badge>
                            </div>
                            <PersonalInfoForm
                                initialData={resumeData.personalInfo}
                                onSubmit={(data: PersonalInfoInput) => {
                                    dispatch(setPersonalInfo(data));
                                    setActiveSection('experience');
                                }}
                                onFormReady={() => { }}
                                resumeData={{
                                    workExperience: resumeData.workExperience,
                                    education: resumeData.education,
                                    skills: resumeData.skills,
                                    projects: resumeData.projects,
                                }}
                            />
                        </section>
                    )}

                    {activeSection === 'experience' && (
                        <section className="space-y-6">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-display font-bold text-foreground leading-none">
                                    Work Experience
                                </h2>
                                <Badge variant="brand" shape="pill">Section 2/6</Badge>
                            </div>
                            <WorkExperienceForm
                                initialData={resumeData.workExperience}
                                onUpdate={(data: WorkExperience[]) => {
                                    dispatch(updateWorkExperience(data));
                                }}
                            />
                            <div className="flex justify-end pt-8">
                                <Button
                                    variant="default"
                                    onClick={() => setActiveSection('education')}
                                    className="rounded-full px-8"
                                >
                                    Continue to Education
                                </Button>
                            </div>
                        </section>
                    )}

                    {activeSection === 'education' && (
                        <section className="space-y-6">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-display font-bold text-foreground leading-none">
                                    Education
                                </h2>
                                <Badge variant="brand" shape="pill">Section 3/6</Badge>
                            </div>
                            <EducationForm
                                initialData={resumeData.education}
                                onUpdate={(data: Education[]) => {
                                    dispatch(updateEducation(data));
                                }}
                            />
                            <div className="flex justify-end pt-8">
                                <Button
                                    variant="default"
                                    onClick={() => setActiveSection('projects')}
                                    className="rounded-full px-8"
                                >
                                    Continue to Projects
                                </Button>
                            </div>
                        </section>
                    )}

                    {activeSection === 'projects' && (
                        <section className="space-y-6">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-display font-bold text-foreground leading-none">
                                    Projects
                                </h2>
                                <Badge variant="brand" shape="pill">Section 4/6</Badge>
                            </div>
                            <ProjectsForm
                                initialData={resumeData.projects}
                                onUpdate={(data: Project[]) => {
                                    dispatch(updateProjects(data));
                                }}
                            />
                            <div className="flex justify-end pt-8">
                                <Button
                                    variant="default"
                                    onClick={() => setActiveSection('skills')}
                                    className="rounded-full px-8"
                                >
                                    Continue to Skills
                                </Button>
                            </div>
                        </section>
                    )}

                    {activeSection === 'skills' && (
                        <section className="space-y-6">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-display font-bold text-foreground leading-none">
                                    Skills
                                </h2>
                                <Badge variant="brand" shape="pill">Section 5/6</Badge>
                            </div>
                            <SkillsForm
                                initialData={resumeData.skills}
                                onUpdate={(data: Skill[]) => {
                                    dispatch(updateSkills(data));
                                }}
                            />
                            <div className="flex justify-end pt-8">
                                <Button
                                    variant="default"
                                    onClick={() => setActiveSection('certifications')}
                                    className="rounded-full px-8"
                                >
                                    Continue to Certifications
                                </Button>
                            </div>
                        </section>
                    )}

                    {activeSection === 'certifications' && (
                        <section className="space-y-6">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-display font-bold text-foreground leading-none">
                                    Certifications
                                </h2>
                                <Badge variant="brand" shape="pill">Section 6/6</Badge>
                            </div>
                            <CertificationsForm
                                initialData={resumeData.certifications}
                                onUpdate={(data: Certification[]) => {
                                    dispatch(updateCertifications(data));
                                }}
                            />
                            <div className="flex justify-end pt-8">
                                <Button
                                    variant="gradient"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="rounded-full px-10 h-12 text-lg"
                                >
                                    Finish & Save
                                </Button>
                            </div>
                        </section>
                    )}
                </div>
            </BuilderLayout>
            <PreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                data={resumeData}
                resumeTitle={title}
                onDownload={handleDownload}
                template={selectedTemplate}
            />
        </ResumeProvider>
    );
}
