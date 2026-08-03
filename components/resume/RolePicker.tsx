'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ROLE_CATALOG, MAX_TARGET_ROLES, type RoleFamily } from '@/lib/ai/roleProfiles';
import { cn } from '@/lib/utils';

interface RolePickerProps {
    selectedRoles: string[];
    onChange: (roles: string[]) => void;
    disabled?: boolean;
}

const FAMILY_GROUPS: { label: string; family: RoleFamily }[] = [
    { label: 'Technology', family: 'tech' },
    { label: 'Business & Operations', family: 'business' },
    { label: 'Creative & Content', family: 'creative' },
    { label: 'People & Support', family: 'people' },
];

export function RolePicker({ selectedRoles, onChange, disabled = false }: RolePickerProps) {
    const [customRole, setCustomRole] = useState('');

    const toggleRole = (label: string) => {
        if (disabled) return;
        onChange(
            selectedRoles.includes(label)
                ? selectedRoles.filter((r) => r !== label)
                : selectedRoles.length >= MAX_TARGET_ROLES
                    ? selectedRoles
                    : [...selectedRoles, label]
        );
    };

    const addCustomRole = () => {
        if (disabled) return;
        const value = customRole.trim();
        if (!value) return;
        if (!selectedRoles.includes(value) && selectedRoles.length < MAX_TARGET_ROLES) {
            onChange([...selectedRoles, value]);
        }
        setCustomRole('');
    };

    const atCap = selectedRoles.length >= MAX_TARGET_ROLES;

    return (
        <div className="space-y-4">
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Job roles you&apos;re applying for
                    </span>
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
                                                disabled={disabled || (!selected && atCap)}
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-fast ease-out-expo',
                                                    selected
                                                        ? 'border-foreground bg-foreground text-background'
                                                        : 'border-border bg-muted/40 text-foreground hover:border-border hover:bg-muted/70',
                                                    !selected && atCap && 'cursor-not-allowed opacity-40'
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
            </div>

            {/* Custom role */}
            <div className="flex gap-2">
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
                    disabled={disabled || atCap}
                />
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={addCustomRole}
                    disabled={disabled || atCap || !customRole.trim()}
                    aria-label="Add custom role"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {selectedRoles.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
                                disabled={disabled}
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
    );
}
