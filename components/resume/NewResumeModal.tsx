'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal/Modal';
import { ModalHeader, ModalTitle } from '@/components/ui/modal/ModalHeader';
import { ModalBody } from '@/components/ui/modal/ModalBody';
import { ModalFooter } from '@/components/ui/modal/ModalFooter';
import { ROLE_CATALOG, MAX_TARGET_ROLES, type RoleFamily } from '@/lib/ai/roleProfiles';
import { cn } from '@/lib/utils';

interface NewResumeModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTitle?: string;
}

const FAMILY_GROUPS: { label: string; family: RoleFamily }[] = [
    { label: 'Technology', family: 'tech' },
    { label: 'Business & Operations', family: 'business' },
    { label: 'Creative & Content', family: 'creative' },
    { label: 'People & Support', family: 'people' },
];

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
    const [customRole, setCustomRole] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleRole = (label: string) => {
        setSelectedRoles((prev) => {
            if (prev.includes(label)) {
                return prev.filter((r) => r !== label);
            }
            if (prev.length >= MAX_TARGET_ROLES) return prev;
            return [...prev, label];
        });
    };

    const addCustomRole = () => {
        const value = customRole.trim();
        if (!value) return;
        setSelectedRoles((prev) => {
            if (prev.includes(value) || prev.length >= MAX_TARGET_ROLES) return prev;
            return [...prev, value];
        });
        setCustomRole('');
    };

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
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <label className="micro-label">Job roles you&apos;re applying for</label>
                            <span className="text-xs text-muted-foreground">
                                {selectedRoles.length}/{MAX_TARGET_ROLES}
                            </span>
                        </div>
                        <p className="mb-4 text-sm text-muted-foreground">
                            1&ndash;3 roles works best &mdash; each extra role spreads your keywords and
                            weakens the target. The first role you pick is treated as the primary.
                        </p>

                        <div className="space-y-4">
                            {FAMILY_GROUPS.map((group) => {
                                const roles = ROLE_CATALOG.filter((r) => r.family === group.family);
                                if (roles.length === 0) return null;
                                return (
                                    <div key={group.family}>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {group.label}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {roles.map((role) => {
                                                const index = selectedRoles.indexOf(role.label);
                                                const selected = index !== -1;
                                                return (
                                                    <button
                                                        key={role.id}
                                                        type="button"
                                                        onClick={() => toggleRole(role.label)}
                                                        disabled={!selected && selectedRoles.length >= MAX_TARGET_ROLES}
                                                        className={cn(
                                                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-fast ease-out-expo',
                                                            selected
                                                                ? 'border-foreground bg-foreground text-background'
                                                                : 'border-border bg-muted/40 text-foreground hover:border-border hover:bg-muted/70',
                                                            !selected &&
                                                                selectedRoles.length >= MAX_TARGET_ROLES &&
                                                                'cursor-not-allowed opacity-40'
                                                        )}
                                                        aria-pressed={selected}
                                                    >
                                                        {role.label}
                                                        {index === 0 && (
                                                            <span className="rounded-full bg-background/20 px-1.5 py-0 text-[10px] font-bold uppercase">
                                                                Primary
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Custom role */}
                        <div className="mt-5 flex gap-2">
                            <Input
                                value={customRole}
                                onChange={(e) => setCustomRole(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addCustomRole();
                                    }
                                }}
                                placeholder="Other — type a custom role and press Enter"
                                disabled={selectedRoles.length >= MAX_TARGET_ROLES}
                            />
                            <Button
                                variant="secondary"
                                size="icon"
                                onClick={addCustomRole}
                                disabled={selectedRoles.length >= MAX_TARGET_ROLES || !customRole.trim()}
                                aria-label="Add custom role"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {selectedRoles.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {selectedRoles.map((role, i) => (
                                    <span
                                        key={role}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background"
                                    >
                                        {i === 0 && <span className="font-bold uppercase">Primary · </span>}
                                        {role}
                                        <button
                                            type="button"
                                            onClick={() => toggleRole(role)}
                                            className="text-background/70 hover:text-background"
                                            aria-label={`Remove ${role}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

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
