'use client';
import { useState, useEffect, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PersonalInfoForm from './PersonalInfoForm';
import WorkExperienceForm from './WorkExperienceForm';
import EducationForm from './EducationForm';
import ProjectsForm from './ProjectsForm';
import SkillsForm from './SkillsForm';
import CertificationsForm from './CertificationsForm';
import { PreviewModal } from './PreviewModal';
import { Sparkles, X, ChevronLeft, Save, Eye, Layout } from 'lucide-react';
import { useResumeLoader } from '@/lib/hooks/useResumeLoader';
import { useResumeSaver } from '@/lib/hooks/useResumeSaver';
import { TailoringContext } from '@/store/TailoringProvider';
import { ResumeProvider } from '@/context/ResumeContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { SectionNavigation } from './SectionNavigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    setTitle,
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

interface ResumeBuilderProps {
    resumeId?: string;
}

export default function ResumeBuilder({ resumeId }: ResumeBuilderProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { title, resumeData } = useAppSelector((state) => state.resume);
    const [activeSection, setActiveSection] = useState('personal');

    const {
        jobDescription,
        isTailoringMode,
        setJobDescription,
        setIsTailoringMode,
    } = useContext(TailoringContext);

    const { resumeData: loadedResumeData, isLoading, title: loadedTitle } = useResumeLoader(resumeId);
    const { saveResume, isSaving } = useResumeSaver(resumeId);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [lastSaved, setLastSaved] = useState<string | null>(null);

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
        }
    }, [loadedResumeData, loadedTitle, resumeId, dispatch]);

    const handleSave = async () => {
        const resumeState = {
            title,
            ...resumeData
        };
        // @ts-ignore
        const savedData = await saveResume(resumeState, title);
        if (savedData) {
            setLastSaved(new Date().toLocaleTimeString());
        }
    };

    const handleDownload = async () => {
        if (!resumeId) {
            alert("Please save your resume before exporting it.");
            return;
        }

        setDownloadingId(resumeId);
        try {
            const response = await fetch('/api/resumes/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resumeId,
                    format: 'PDF',
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
            alert(err instanceof Error ? err.message : 'Failed to export resume');
        } finally {
            setDownloadingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
                    <p className="text-gray-500 font-medium animate-pulse">Loading your resume...</p>
                </div>
            </div>
        );
    }

    return (
        <ResumeProvider resumeId={resumeId}>
            <div className="min-h-screen bg-[#FDFDFF]">
                {/* Modern Header */}
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
                    <div className="container mx-auto px-4">
                        <div className="flex h-16 items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghostSubtle"
                                    size="icon"
                                    className="rounded-full"
                                    onClick={() => router.push('/dashboard')}
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="h-8 w-[1px] bg-gray-200 mx-1" />
                                <div className="flex flex-col min-w-[200px]">
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => dispatch(setTitle(e.target.value))}
                                        placeholder="Enter resume title..."
                                        className="h-9 border-none bg-transparent px-0 font-display font-bold text-lg focus-visible:ring-0 placeholder:text-gray-400"
                                    />
                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                        {lastSaved ? `Last saved: ${lastSaved}` : 'Changes not saved'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="ghostSubtle" className="rounded-full hidden sm:flex">
                                    <Layout className="mr-2 h-4 w-4" />
                                    Templates
                                </Button>
                                <Button
                                    variant="ghostSubtle"
                                    className="rounded-full hidden sm:flex"
                                    onClick={() => setIsPreviewOpen(true)}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Preview
                                </Button>
                                <Button
                                    variant="gradient"
                                    size="default"
                                    className="rounded-full px-6 shadow-md shadow-brand-200"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    loading={isSaving}
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Sidebar Navigation */}
                        <aside className="w-full lg:w-64 lg:sticky lg:top-24">
                            <Card className="p-2 border-none shadow-sm bg-white/50 backdrop-blur">
                                <SectionNavigation
                                    activeSection={activeSection}
                                    setActiveSection={setActiveSection}
                                    completedSections={completedSections}
                                />
                            </Card>

                            {isTailoringMode && jobDescription && (
                                <Card className="mt-6 p-4 bg-brand-50 border-brand-100 border-none shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="h-5 w-5 text-brand-600 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-1">Tailoring For</p>
                                            <p className="text-sm font-semibold text-brand-900 line-clamp-1">{jobDescription.title}</p>
                                            <p className="text-xs text-brand-600 line-clamp-1">{jobDescription.company}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghostSubtle"
                                        size="xs"
                                        className="w-full mt-4 text-brand-700 hover:bg-brand-100"
                                        onClick={() => {
                                            setIsTailoringMode(false);
                                            setJobDescription(null);
                                        }}
                                    >
                                        <X className="mr-1 h-3 w-3" />
                                        Exit Mode
                                    </Button>
                                </Card>
                            )}
                        </aside>

                        {/* Form Area */}
                        <div className="flex-1 w-full max-w-4xl">
                            <Card className="p-8 border-none shadow-xl shadow-gray-200/50 min-h-[600px] animate-fade-in">
                                {activeSection === 'personal' && (
                                    <section className="space-y-6">
                                        <div className="flex items-center justify-between mb-8">
                                            <h2 className="text-2xl font-display font-bold text-gray-900 leading-none">
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
                                            <h2 className="text-2xl font-display font-bold text-gray-900 leading-none">
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
                                            <h2 className="text-2xl font-display font-bold text-gray-900 leading-none">
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
                                            <h2 className="text-2xl font-display font-bold text-gray-900 leading-none">
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
                                            <h2 className="text-2xl font-display font-bold text-gray-900 leading-none">
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
                                            <h2 className="text-2xl font-display font-bold text-gray-900 leading-none">
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
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
            <PreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                data={resumeData}
                resumeTitle={title}
                onDownload={handleDownload}
            />
        </ResumeProvider>
    );
}

