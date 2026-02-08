'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal/Modal';
import { ModalHeader, ModalTitle } from '@/components/ui/modal/ModalHeader';
import { BookOpen, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionVerbSelectorProps {
    onSelect?: (verb: string) => void;
}

const ACTION_VERBS = {
    'Leadership': ['Orchestrated', 'Spearheaded', 'Directed', 'Mobilized', 'Mentored', 'Delegated', 'Executed', 'Chaired', 'Oversaw', 'Pioneered'],
    'Communication': ['Negotiated', 'Advocated', 'Articulated', 'Presented', 'Persuaded', 'Clarified', 'Mediated', 'Publicized', 'Authored', 'Briefed'],
    'Technical': ['Engineered', 'Architected', 'Deployed', 'Optimized', 'Automated', 'Refactored', 'Debugged', 'Implemented', 'Standardized', 'Migrated'],
    'Analysis': ['Forecasted', 'Diagnosed', 'Quantified', 'Evaluated', 'Audited', 'Investigated', 'Modeled', 'Extracted', 'Identified', 'Calculated'],
    'Creativity': ['Conceptualized', 'Designed', 'Revitalized', 'Curated', 'Drafted', 'Innovated', 'Visualized', 'Customized', 'Fashioned', 'Illustrated'],
    'Results': ['Accelerated', 'Boosted', 'Generated', 'Maximized', 'Outperformed', 'Secured', 'Yielded', 'Expanded', 'Reduced', 'Saved'],
};

export function ActionVerbSelector({ onSelect }: ActionVerbSelectorProps) {
    const [copiedVerb, setCopiedVerb] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('Leadership');
    const [isOpen, setIsOpen] = useState(false);

    const handleCopy = (verb: string) => {
        navigator.clipboard.writeText(verb);
        setCopiedVerb(verb);
        if (onSelect) onSelect(verb);
        setTimeout(() => setCopiedVerb(null), 1500);
    };

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setIsOpen(true)}
            >
                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                Action Verbs
            </Button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                size="lg"
                contentClassName="p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col"
            >
                <ModalHeader className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                    <ModalTitle className="flex items-center gap-2 text-lg font-bold font-display">
                        <BookOpen className="h-5 w-5 text-brand-600" />
                        Power Action Verbs
                    </ModalTitle>
                    <p className="text-sm text-muted-foreground">
                        Start every bullet point with a strong verb to impress ATS and recruiters.
                    </p>
                </ModalHeader>

                <div className="flex flex-1 overflow-hidden h-[450px] bg-white dark:bg-zinc-900">
                    {/* Sidebar Categories */}
                    <div className="w-48 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 space-y-1 overflow-y-auto">
                        {Object.keys(ACTION_VERBS).map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={cn(
                                    "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                                    activeCategory === category && "bg-white dark:bg-zinc-800 text-brand-600 shadow-sm border border-zinc-200 dark:border-zinc-700 font-bold"
                                )}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {/* Verbs Grid */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-bold text-foreground">{activeCategory} Verbs</h3>
                            <span className="text-xs text-muted-foreground">Click to copy</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {ACTION_VERBS[activeCategory as keyof typeof ACTION_VERBS].map((verb) => (
                                <button
                                    key={verb}
                                    onClick={() => handleCopy(verb)}
                                    className="group relative flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-950/10 transition-all text-left bg-white dark:bg-zinc-900/50"
                                >
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-brand-700 dark:group-hover:text-brand-400">
                                        {verb}
                                    </span>
                                    {copiedVerb === verb ? (
                                        <Check className="h-4 w-4 text-green-500 animate-in zoom-in" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}
