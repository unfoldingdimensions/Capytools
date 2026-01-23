'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ListChecks, Wand2 } from 'lucide-react';
import { AIActionButtons } from './AIActionButtons';
import { AIService } from '@/lib/services/ai.service';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { cn } from '@/lib/utils/cn';

interface BulletPointEditorProps {
    bullets: string[];
    onChange: (bullets: string[]) => void;
    context: {
        role?: string;
        company?: string;
    };
}

export function BulletPointEditor({
    bullets,
    onChange,
    context,
}: BulletPointEditorProps) {
    const [loading, setLoading] = useState<string | null>(null);

    // Modal states
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ show: false, title: '', message: '', onConfirm: () => { } });

    const [alertModal, setAlertModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
    }>({ show: false, title: '', message: '', type: 'info' });

    const handleAddBullet = () => {
        onChange([...bullets, '']);
    };

    const handleUpdateBullet = (index: number, value: string) => {
        const newBullets = [...bullets];
        newBullets[index] = value;
        onChange(newBullets);
    };

    const handleDeleteBullet = (index: number) => {
        onChange(bullets.filter((_, i) => i !== index));
    };

    const handleCheckGrammar = async (index: number) => {
        const bullet = bullets[index];
        if (!bullet || bullet.trim().length === 0) return;

        setLoading(`grammar-${index}`);
        try {
            const result = await AIService.checkGrammar(bullet);

            if (result.hasErrors) {
                setConfirmModal({
                    show: true,
                    title: 'Grammar & Tone Improvement',
                    message: `We found some potential improvements:\n\n"${result.correctedText}"\n\nWould you like to apply these changes?`,
                    onConfirm: () => {
                        handleUpdateBullet(index, result.correctedText);
                        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => { } });
                    },
                });
            } else {
                setAlertModal({
                    show: true,
                    title: 'Looking Good!',
                    message: 'AI analyzed your bullet point and it looks professionally written.',
                    type: 'success'
                });
            }
        } catch (error) {
            setAlertModal({
                show: true,
                title: 'AI Analysis Failed',
                message: 'We couldn\'t analyze this bullet point right now. Please try again.',
                type: 'error'
            });
        } finally {
            setLoading(null);
        }
    };

    const handleImproveBullet = async (index: number) => {
        const bullet = bullets[index];
        if (!bullet || bullet.trim().length === 0) return;

        setLoading(`improve-${index}`);
        try {
            const improvedText = await AIService.improveBulletPoint(bullet, { role: context.role });

            setConfirmModal({
                show: true,
                title: 'Impact-Focused Improvement',
                message: `AI Suggestion (more impact-oriented):\n\n"${improvedText}"\n\nReplace your current version?`,
                onConfirm: () => {
                    handleUpdateBullet(index, improvedText);
                    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => { } });
                },
            });
        } catch (error) {
            setAlertModal({
                show: true,
                title: 'Improvement Failed',
                message: 'Failed to generate improvement suggestion. Please try again.',
                type: 'error'
            });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-brand-600" />
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Achievements & Impact</label>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="ghostSubtle"
                    onClick={handleAddBullet}
                    className="h-8 rounded-full text-brand-700 hover:bg-brand-50"
                >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Achievement
                </Button>
            </div>

            <div className="space-y-4">
                {bullets.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50 group cursor-pointer hover:border-brand-200 transition-colors"
                        onClick={handleAddBullet}
                    >
                        <Wand2 className="h-8 w-8 text-gray-200 group-hover:text-brand-300 transition-colors mb-2" />
                        <p className="text-sm text-gray-400 font-medium">Click to add your first achievement</p>
                    </div>
                ) : (
                    bullets.map((bullet, index) => (
                        <div
                            key={index}
                            className={cn(
                                "group relative rounded-2xl border border-gray-100 bg-white p-4 transition-all duration-200",
                                "hover:border-brand-200 hover:shadow-md hover:shadow-brand-500/5"
                            )}
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <div className="mt-2.5 h-1.5 w-1.5 rounded-full bg-brand-400 shrink-0" />
                                <Textarea
                                    value={bullet}
                                    onChange={(e) => handleUpdateBullet(index, e.target.value)}
                                    placeholder="e.g. Led a team of 5 to deliver a 20% increase in system performance..."
                                    className="flex-1 min-h-[60px] border-none bg-transparent p-0 focus-visible:ring-0 text-gray-700 placeholder:text-gray-300 resize-none leading-relaxed"
                                />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteBullet(index)}
                                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">AI Power Tools</span>
                                <AIActionButtons
                                    onCheckGrammar={() => handleCheckGrammar(index)}
                                    onImprove={() => handleImproveBullet(index)}
                                    loadingType={loading}
                                    identifiers={{
                                        grammar: `grammar-${index}`,
                                        improve: `improve-${index}`
                                    }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmDialog
                isOpen={confirmModal.show}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: () => { } })}
            />

            <AlertDialog
                isOpen={alertModal.show}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={() => setAlertModal({ ...alertModal, show: false })}
            />
        </div>
    );
}
