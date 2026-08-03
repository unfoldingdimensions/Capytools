'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, Layout, Eye, Save, Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal/Modal';
import { ModalHeader, ModalTitle } from '@/components/ui/modal/ModalHeader';
import { ModalBody } from '@/components/ui/modal/ModalBody';
import { ModalFooter } from '@/components/ui/modal/ModalFooter';
import { RolePicker } from '@/components/resume/RolePicker';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTitle, setTargetRoles } from '@/store/slices/resumeSlice';
import { useToast } from '@/components/ui/toast';

interface BuilderHeaderProps {
    title: string;
    lastSaved: string | null;
    isSaving: boolean;
    onSave: () => void;
    onPreview: () => void;
    resumeId?: string;
}

export function BuilderHeader({
    title,
    lastSaved,
    isSaving,
    onSave,
    onPreview,
    resumeId,
}: BuilderHeaderProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { error: toastError, success: toastSuccess } = useToast();
    const targetRoles = useAppSelector((state) => state.resume.targetRoles);

    const [isRolesOpen, setIsRolesOpen] = useState(false);
    const [draftRoles, setDraftRoles] = useState<string[]>([]);
    const [isSavingRoles, setIsSavingRoles] = useState(false);

    const openRoles = () => {
        setDraftRoles(targetRoles);
        setIsRolesOpen(true);
    };

    const saveRoles = async () => {
        if (!resumeId) return;
        setIsSavingRoles(true);
        try {
            const response = await fetch(`/api/resumes/${resumeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: resumeId, targetRoles: draftRoles }),
            });
            const result = (await response.json()) as {
                success?: boolean;
                message?: string;
            };
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to save roles');
            }
            dispatch(setTargetRoles(draftRoles));
            toastSuccess({
                title: 'Target roles updated',
                message: 'AI prompts and the role baseline will now target these roles.',
            });
            setIsRolesOpen(false);
        } catch (error) {
            toastError({
                title: 'Failed to save roles',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsSavingRoles(false);
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => router.push('/dashboard')}
                        aria-label="Back to dashboard"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col">
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => dispatch(setTitle(e.target.value))}
                            placeholder="Untitled Resume"
                            className="h-8 border-none bg-transparent px-0 font-display font-medium text-xl focus-visible:ring-0 placeholder:text-muted-foreground/50 text-foreground w-[300px]"
                            aria-label="Resume Title"
                        />
                        <p className="text-xs text-muted-foreground font-medium" role="status">
                            {lastSaved ? `Saved ${lastSaved}` : 'Unsaved changes'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {resumeId && (
                        <Button
                            variant="ghost"
                            className="hidden sm:flex rounded-full text-muted-foreground hover:text-foreground"
                            onClick={openRoles}
                        >
                            <Target className="mr-2 h-4 w-4" />
                            Roles
                            {targetRoles.length > 0 && (
                                <span className="ml-1 rounded-full bg-foreground text-background px-1.5 py-0 text-[10px] font-bold">
                                    {targetRoles.length}
                                </span>
                            )}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        className="hidden sm:flex rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => router.push('/templates')}
                    >
                        <Layout className="mr-2 h-4 w-4" />
                        Templates
                    </Button>
                    <Button
                        variant="secondary"
                        className="rounded-full hidden sm:flex"
                        onClick={onPreview}
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                    </Button>
                    <Button
                        size="lg"
                        className="rounded-full px-8 font-bold"
                        onClick={onSave}
                        disabled={isSaving}
                        loading={isSaving}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Save
                    </Button>
                </div>
            </div>

            {/* Roles editor */}
            <Modal isOpen={isRolesOpen} onClose={() => setIsRolesOpen(false)} size="lg">
                <ModalHeader>
                    <ModalTitle>Target Roles</ModalTitle>
                    <p className="text-sm text-muted-foreground">
                        Every AI prompt in this builder targets these roles. The first role is the primary.
                    </p>
                </ModalHeader>
                <ModalBody>
                    <RolePicker selectedRoles={draftRoles} onChange={setDraftRoles} />
                </ModalBody>
                <ModalFooter>
                    <Button variant="outline" onClick={() => setIsRolesOpen(false)} disabled={isSavingRoles}>
                        Cancel
                    </Button>
                    <Button onClick={() => void saveRoles()} disabled={isSavingRoles || !resumeId}>
                        {isSavingRoles ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Roles
                    </Button>
                </ModalFooter>
            </Modal>
        </header>
    );
}
