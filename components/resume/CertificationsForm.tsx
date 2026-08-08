'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { MonthPicker } from '@/components/ui/month-picker';
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    GripVertical,
    Award,
    Calendar,
    Link as LinkIcon,
    Hash,
    Building2,
    ShieldCheck
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Certification } from '@/types/resume.types';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface CertificationsFormProps {
    initialData?: Certification[];
    onUpdate: (data: Certification[]) => void;
}

export default function CertificationsForm({
    initialData = [],
    onUpdate,
}: CertificationsFormProps) {
    const [certifications, setCertifications] = useState<Certification[]>(
        initialData.length > 0 ? initialData : []
    );
    const [expandedIndex, setExpandedIndex] = useState<number | null>(
        certifications.length > 0 ? 0 : null
    );

    // Debounce state for updates
    const debouncedCertifications = useDebounce(certifications, 500);
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
        const stringifiedData = JSON.stringify(debouncedCertifications);
        if (stringifiedData !== lastSavedDataRef.current) {
            lastSavedDataRef.current = stringifiedData;
            onUpdate(debouncedCertifications);
        }
    }, [debouncedCertifications, onUpdate]);

    // Update certifications when initialData changes externally
    useEffect(() => {
        if (initialData && initialData.length > 0) {
            const stringifiedInitial = JSON.stringify(initialData);
            if (stringifiedInitial !== lastSavedDataRef.current) {
                setCertifications(initialData);
                lastSavedDataRef.current = stringifiedInitial;
                if (expandedIndex === null) {
                    setExpandedIndex(0);
                }
            }
        }
    }, [initialData]);

    const handleAdd = () => {
        const newCert: Certification = {
            id: `temp_${Date.now()}`,
            name: '',
            issuer: '',
            issueDate: '',
            expiryDate: '',
            credentialId: '',
            credentialUrl: '',
        };
        const updated = [...certifications, newCert];
        setCertifications(updated);
        setExpandedIndex(updated.length - 1);
    };

    const handleDelete = (index: number) => {
        setConfirmModal({
            show: true,
            title: 'Delete Certification',
            message: 'Are you sure you want to delete this certification?',
            onConfirm: () => {
                const updated = certifications.filter((_, i) => i !== index);
                setCertifications(updated);
                if (expandedIndex === index) {
                    setExpandedIndex(updated.length > 0 ? 0 : null);
                }
                setConfirmModal({ show: false, title: '', message: '', onConfirm: () => { } });
            },
        });
    };

    const handleUpdate = (index: number, field: keyof Certification, value: unknown) => {
        const updated = [...certifications];
        updated[index] = { ...updated[index], [field]: value } as Certification;
        setCertifications(updated);
    };

    return (
        <div className="space-y-6">
            {certifications.length === 0 ? (
                <Card variant="outlined" className="p-12 border-dashed flex flex-col items-center text-center bg-zinc-50/30 dark:bg-zinc-900/10">
                    <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                        <Award className="h-8 w-8 text-black dark:text-white" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground mb-2">No certifications yet</h3>
                    <p className="text-muted-foreground max-w-xs mb-8">
                        Highlight your professional certifications and specialized training.
                    </p>
                    <Button
                        onClick={handleAdd}
                        className="rounded-full px-8 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Certification
                    </Button>
                </Card>
            ) : (
                <>
                    <div className="space-y-4">
                        {certifications.map((cert, index) => (
                            <Card
                                key={cert.id}
                                variant={expandedIndex === index ? "default" : "outlined"}
                                className={cn(
                                    "overflow-hidden transition-all duration-300",
                                    expandedIndex === index ? "shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800" : "hover:border-zinc-300 dark:hover:border-zinc-700"
                                )}
                            >
                                {/* Header */}
                                <div
                                    className={cn(
                                        "flex cursor-pointer items-center justify-between p-5 transition-colors",
                                        expandedIndex === index ? "bg-zinc-50/50 dark:bg-zinc-900/50" : "hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30"
                                    )}
                                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                >
                                    <div className="flex items-center gap-4">
                                        <GripVertical className="h-5 w-5 text-gray-300" />
                                        <div>
                                            <h3 className="font-display font-bold text-foreground mb-1">
                                                {cert.name || 'Untitled Certification'}
                                            </h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    {cert.issuer || 'Issuer'}
                                                </span>
                                                {cert.issueDate && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {cert.issueDate}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghostSubtle"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(index);
                                            }}
                                            className="text-gray-400 hover:text-red-500 rounded-full h-9 w-9"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <div className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                                            expandedIndex === index ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "text-zinc-400"
                                        )}>
                                            {expandedIndex === index ? (
                                                <ChevronUp className="h-5 w-5" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {expandedIndex === index && (
                                    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <FloatingLabelInput
                                                label="Certification Name"
                                                value={cert.name}
                                                onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                                                leftIcon={<Award className="h-4 w-4" />}
                                                placeholder="e.g. AWS Certified Solutions Architect"
                                            />
                                            <FloatingLabelInput
                                                label="Issuing Organization"
                                                value={cert.issuer}
                                                onChange={(e) => handleUpdate(index, 'issuer', e.target.value)}
                                                leftIcon={<Building2 className="h-4 w-4" />}
                                                placeholder="e.g. Amazon Web Services"
                                            />
                                        </div>

                                        <div className="grid gap-6 md:grid-cols-2">
                                            <MonthPicker
                                                label="Issue Date"
                                                value={cert.issueDate}
                                                onChange={(val) => handleUpdate(index, 'issueDate', val)}
                                                leftIcon={<Calendar className="h-4 w-4" />}
                                            />
                                            <MonthPicker
                                                label="Expiry Date (if applicable)"
                                                value={cert.expiryDate || ''}
                                                onChange={(val) => handleUpdate(index, 'expiryDate', val)}
                                                leftIcon={<Calendar className="h-4 w-4" />}
                                            />
                                        </div>

                                        <div className="grid gap-6 md:grid-cols-2">
                                            <FloatingLabelInput
                                                label="Credential ID"
                                                value={cert.credentialId || ''}
                                                onChange={(e) => handleUpdate(index, 'credentialId', e.target.value)}
                                                leftIcon={<Hash className="h-4 w-4" />}
                                                placeholder="e.g. ABC123XYZ"
                                            />
                                            <FloatingLabelInput
                                                label="Credential URL"
                                                value={cert.credentialUrl || ''}
                                                onChange={(e) => handleUpdate(index, 'credentialUrl', e.target.value)}
                                                leftIcon={<LinkIcon className="h-4 w-4" />}
                                                placeholder="e.g. https://credly.com/..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>

                    <Button
                        onClick={handleAdd}
                        variant="outline"
                        className="w-full h-12 rounded-xl border-dashed border-2 hover:bg-zinc-50/50 hover:border-black dark:hover:border-white transition-all font-bold"
                    >
                        <Plus className="mr-2 h-4 w-4 text-zinc-900 dark:text-white" />
                        Add Another Certification
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
