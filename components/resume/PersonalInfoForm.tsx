'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalInfoSchema, PersonalInfoInput } from '@/lib/validations/resume.validation';
import { Button } from '@/components/ui/button';
import SuggestionCard from './SuggestionCard';
import { AIEnhancedTextarea } from './AIEnhancedTextarea';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { useContext } from 'react';
import { useResumeContext } from '@/context/ResumeContext';
import { TailoringContext } from '@/store/TailoringProvider';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, User } from 'lucide-react';
import { getAIHeaders } from '@/lib/ai-config-client';
import { useAppSelector } from '@/store/hooks';
import { useRoleSectionOptimization } from '@/lib/hooks/useRoleSectionOptimization';

interface PersonalInfoFormProps {
    initialData?: PersonalInfoInput;
    onSubmit: (data: PersonalInfoInput) => void;
    onNext?: () => void;
    onFormReady?: (getValues: () => PersonalInfoInput, trigger: () => Promise<boolean>) => void;
    resumeData?: {
        workExperience?: unknown[];
        education?: unknown[];
        skills?: unknown[];
        projects?: unknown[];
    };
}

export default function PersonalInfoForm({
    initialData,
    onSubmit,
    onNext,
    onFormReady,
    resumeData,
}: PersonalInfoFormProps) {
    const { resumeId } = useResumeContext();
    const { jobDescription, jobDescriptionId } = useContext(TailoringContext);
    const targetRoles = useAppSelector((state) => state.resume.targetRoles);
    const { optimizeForRole, isOptimizing, hasTargetRoles, primaryRoleLabel } = useRoleSectionOptimization(resumeId, 'summary');

    const [isGeneratingSummary, setIsGeneratingSummary] = React.useState(false);
    const [alertModal, setAlertModal] = React.useState<{
        show: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
    }>({ show: false, title: '', message: '', type: 'info' });

    // AI Tailoring state
    const [tailoringSuggestion, setTailoringSuggestion] = React.useState<string>('');
    const [suggestionLoading, setSuggestionLoading] = React.useState(false);

    const {
        register,
        handleSubmit,
        getValues,
        trigger,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<PersonalInfoInput>({
        resolver: zodResolver(personalInfoSchema),
        defaultValues: initialData,
    });

    // Watch values for FloatingLabelInput state
    const formValues = watch();

    // Update form when initialData changes
    React.useEffect(() => {
        if (initialData) {
            reset(initialData);
        }
    }, [initialData, reset]);

    const handleGenerateSummary = async () => {
        if (!resumeData) {
            setAlertModal({
                show: true,
                title: 'Data Missing',
                message: 'Please add some work experience, education, or skills before generating a summary',
                type: 'info',
            });
            return;
        }

        setIsGeneratingSummary(true);
        try {
            const currentFormData = getValues();
            const fullResumeData = {
                personalInfo: currentFormData,
                ...resumeData,
            };

            const response = await fetch('/api/ai/generate-summary', {
                method: 'POST',
                headers: getAIHeaders(),
                body: JSON.stringify({ resumeData: fullResumeData, targetRoles }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'Failed to generate summary');
            }

            // Set the generated summary in the form
            setValue('summary', result.data.summary, { shouldDirty: true });

            // Trigger onSubmit to save the updated data
            onSubmit({ ...currentFormData, summary: result.data.summary });
        } catch (error) {
            console.error('Generate summary error:', error);
            setAlertModal({
                show: true,
                title: 'Error',
                message: `Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    // AI Tailoring Functions
    const handleGenerateTailoringSuggestion = async () => {
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
                headers: getAIHeaders(),
                body: JSON.stringify({
                    resumeId,
                    jobDescriptionId,
                    section: 'summary',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to generate suggestions');
            }

            setTailoringSuggestion(data.data.suggestions);
        } catch (error) {
            console.error('Tailoring error:', error);
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

    const handleApplyTailoringSuggestion = (suggestions: string[]) => {
        if (suggestions.length > 0) {
            setValue('summary', suggestions[0], { shouldDirty: true });
            const currentFormData = getValues();
            onSubmit({ ...currentFormData, summary: suggestions[0] });
        }
    };

    const handleOptimizeForRole = async () => {
        try {
            const suggestions = await optimizeForRole(undefined);
            if (typeof suggestions === 'string' && suggestions.length > 0) {
                setTailoringSuggestion(suggestions);
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

    // Expose form methods to parent
    React.useEffect(() => {
        if (onFormReady) {
            onFormReady(() => getValues(), () => trigger());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFormSubmit = (data: PersonalInfoInput) => {
        onSubmit(data);
        if (onNext) {
            onNext();
        }
    };

    return (
        <>
            <form onSubmit={(e) => void handleSubmit(handleFormSubmit)(e)} className="space-y-8 animate-fade-in-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FloatingLabelInput
                        label="Full Name"
                        leftIcon={<User className="h-4 w-4" />}
                        {...register('fullName')}
                        value={formValues.fullName || ''}
                        helperText={errors.fullName?.message}
                    />

                    <FloatingLabelInput
                        label="Email Address"
                        leftIcon={<Mail className="h-4 w-4" />}
                        type="email"
                        {...register('email')}
                        value={formValues.email || ''}
                        helperText={errors.email?.message}
                    />

                    <FloatingLabelInput
                        label="Phone Number"
                        leftIcon={<Phone className="h-4 w-4" />}
                        {...register('phone')}
                        value={formValues.phone || ''}
                        helperText={errors.phone?.message}
                    />

                    <FloatingLabelInput
                        label="Location"
                        leftIcon={<MapPin className="h-4 w-4" />}
                        {...register('location')}
                        value={formValues.location || ''}
                        helperText={errors.location?.message}
                    />

                    <FloatingLabelInput
                        label="Website / Portfolio"
                        leftIcon={<Globe className="h-4 w-4" />}
                        {...register('website')}
                        value={formValues.website || ''}
                        helperText={errors.website?.message}
                    />

                    <FloatingLabelInput
                        label="LinkedIn URL"
                        leftIcon={<Linkedin className="h-4 w-4" />}
                        {...register('linkedin')}
                        value={formValues.linkedin || ''}
                        helperText={errors.linkedin?.message}
                    />

                    <FloatingLabelInput
                        label="GitHub URL"
                        leftIcon={<Github className="h-4 w-4" />}
                        {...register('github')}
                        value={formValues.github || ''}
                        helperText={errors.github?.message}
                    />
                </div>

                <div className="pt-4">
                    <AIEnhancedTextarea
                        id="summary"
                        label="Professional Summary"
                        {...register('summary')}
                        onGenerate={handleGenerateSummary}
                        isGenerating={isGeneratingSummary}
                        placeholder="Brief summary of your professional background and goals..."
                        rows={5}
                        error={errors.summary?.message}
                    />

                    {/* AI Tailoring Suggestion Card */}
                    {jobDescription && jobDescriptionId && (
                        <div className="mt-6">
                            <SuggestionCard
                                title="AI Tailored Summary"
                                suggestions={tailoringSuggestion ? [tailoringSuggestion] : []}
                                tips={[
                                    'Highlight relevant experience and skills',
                                    'Use keywords from the job description',
                                    'Keep it concise and impactful (2-3 sentences)',
                                ]}
                                isLoading={suggestionLoading}
                                onGenerate={handleGenerateTailoringSuggestion}
                                onApply={handleApplyTailoringSuggestion}
                                onGenerateRole={hasTargetRoles ? handleOptimizeForRole : undefined}
                                roleLabel={hasTargetRoles ? primaryRoleLabel : undefined}
                                isGeneratingRole={isOptimizing}
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-6">
                    <Button
                        type="submit"
                        size="lg"
                        className="rounded-full px-10"
                        disabled={isSubmitting}
                        loading={isSubmitting}
                    >
                        Save & Continue
                    </Button>
                </div>
            </form>

            <AlertDialog
                isOpen={alertModal.show}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={() => setAlertModal({ ...alertModal, show: false })}
            />
        </>
    );
}

