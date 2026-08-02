'use client';

import { AuthButtons } from '@/components/landing/AuthButtons';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function StickyCTA() {
    const [isVisible, setIsVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (dismissed) return;

            const scrolledPastHero = window.scrollY > 500;
            // Hide when the user is near the footer so it doesn't cover the final CTA.
            const nearBottom =
                window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 600;

            setIsVisible(scrolledPastHero && !nearBottom);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [dismissed]);

    if (!isVisible) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-in slide-in-from-bottom duration-300"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="relative mx-auto max-w-md bg-background/85 backdrop-blur-lg border-t border-border px-4 pt-3">
                <button
                    type="button"
                    onClick={() => {
                        setDismissed(true);
                        setIsVisible(false);
                    }}
                    className="absolute top-2 right-3 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="h-4 w-4" />
                </button>
                <div className="flex items-center justify-between gap-4 pb-3 pr-10">
                    <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Ready?</p>
                        <p className="font-display font-bold text-sm">Build your resume free.</p>
                    </div>
                    <AuthButtons
                        className="h-10 px-6 rounded-full text-sm shadow-md"
                        textSignedOut="Start Building"
                    />
                </div>
            </div>
        </div>
    );
}
