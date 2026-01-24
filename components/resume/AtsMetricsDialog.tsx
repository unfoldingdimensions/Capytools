'use client';

import { Modal } from '@/components/ui/modal/Modal';
import { ModalHeader, ModalTitle } from '@/components/ui/modal/ModalHeader';
import { CheckCircle2, Info } from 'lucide-react';

interface AtsMetricsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const metrics = [
    {
        title: 'Contact Information',
        points: 27,
        rules: [
            'Full name listed (10 pts)',
            'Valid email address (10 pts)',
            'Phone number provided (5 pts)',
            'Location (City, State) included (2 pts)'
        ]
    },
    {
        title: 'Core Resume Sections',
        points: 30,
        rules: [
            'Work experience section exists (15 pts)',
            'Skills section populated (10 pts)',
            'Education or certifications listed (5 pts)'
        ]
    },
    {
        title: 'Content Quality',
        points: 33,
        rules: [
            'Company names & titles (3 pts each)',
            'Bullet points for roles (3 pts each)',
            'Length (< 3 lines) (1 pt each)',
            'Action verb usage (1 pt each)'
        ]
    },
    {
        title: 'Role Optimization',
        points: 10,
        rules: [
            'Keyword match > 50% (10 pts)',
            'Relevant terminology usage'
        ]
    }
];

export function AtsMetricsDialog({ isOpen, onClose }: AtsMetricsDialogProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            contentClassName="p-0 overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-swiss animate-in fade-in zoom-in-95 duration-300"
        >
            <ModalHeader className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <ModalTitle className="flex items-center gap-3 text-xl font-bold font-display tracking-tight">
                    <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Info className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                    </div>
                    ATS Compliance Algorithm
                </ModalTitle>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Our scanner evaluates your resume against industry-standard ATS parsing rules.
                    A score of 100/100 ensures maximum readability for automated systems.
                </p>
            </ModalHeader>

            <div className="px-8 py-6 space-y-8 max-h-[60vh] overflow-y-auto bg-white dark:bg-zinc-950/50">
                {metrics.map((metric, idx) => (
                    <div key={idx} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                            <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 font-display">
                                {metric.title}
                            </h3>
                            <span className="text-[10px] font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                {metric.points} Points Max
                            </span>
                        </div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                            {metric.rules.map((rule, ridx) => (
                                <li key={ridx} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                    <CheckCircle2 className="h-4 w-4 text-zinc-900 dark:text-white shrink-0 mt-0.5" />
                                    <span className="leading-tight font-medium">{rule}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

                <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition-all hover:border-zinc-400 dark:hover:border-zinc-700">
                    <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-sm">
                            <Info className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-widest mb-1 font-display">Expert Recommendation</p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Even with a perfect score, tailoring is key. Ensure your "Critical Keywords" count matches the Job Description for the highest search ranking.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end p-6 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <button
                    onClick={onClose}
                    className="px-8 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-sm font-bold shadow-lg shadow-zinc-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all btn-press"
                >
                    Dismiss
                </button>
            </div>
        </Modal>
    );
}
