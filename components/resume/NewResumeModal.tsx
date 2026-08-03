'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal/Modal';
import { ModalHeader, ModalTitle } from '@/components/ui/modal/ModalHeader';
import { ModalBody } from '@/components/ui/modal/ModalBody';
import { ModalFooter } from '@/components/ui/modal/ModalFooter';
import { RolePicker } from '@/components/resume/RolePicker';

interface NewResumeModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTitle?: string;
}

const EMPTY_RESUME_DATA = {
    personalInfo: { fullName: '', email: '' },
    workExperience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    customSections: [],
};

export function NewResumeModal({ isOpen, onClose, initialTitle }: NewResumeModalProps) {
    const router = useRouter();
    const [title, setTitle] = useState(initialTitle || 'Untitled Resume');
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createResume = async (roles: string[]) => {
        setIsCreating(true);
        setError(null);
        try {
            const response = await fetch('/api/resumes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim() || 'Untitled Resume',
                    data: EMPTY_RESUME_DATA,
                    targetRoles: roles,
                }),
            });
            const result = (await response.json()) as {
                success: boolean;
                data?: { id: string };
                message?: string;
                error?: { message?: string };
            };
            if (!response.ok || !result.success) {
                throw new Error(result.message || result.error?.message || 'Failed to create resume');
            }
            if (!result.data?.id) {
                throw new Error('Resume was created without an id');
            }
            router.push(`/resume/${result.data.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create resume');
            setIsCreating(false);
        }
    };

    const handleCreate = () => void createResume(selectedRoles);
    const handleSkip = () => void createResume([]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalHeader>
                <ModalTitle>Create New Resume</ModalTitle>
                <p className="text-sm text-muted-foreground">
                    What name and roles is this resume for? You can change both later.
                </p>
            </ModalHeader>

            <ModalBody>
                <div className="space-y-6">
                    {/* Resume name */}
                    <div>
                        <label htmlFor="new-resume-name" className="micro-label mb-2 block">
                            Resume name
                        </label>
                        <Input
                            id="new-resume-name"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Tech Resume, Internship 2026"
                            maxLength={200}
                        />
                    </div>

                    {/* Target roles */}
                    <RolePicker selectedRoles={selectedRoles} onChange={setSelectedRoles} />

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                            {error}
                        </p>
                    )}
                </div>
            </ModalBody>

            <ModalFooter>
                <Button
                    variant="outline"
                    onClick={handleSkip}
                    disabled={isCreating}
                    className="text-muted-foreground"
                >
                    Start without roles
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Resume
                </Button>
            </ModalFooter>
        </Modal>
    );
}
