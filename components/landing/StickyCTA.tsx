'use client';

import { AuthButtons } from '@/components/landing/AuthButtons';
import { useEffect, useState } from 'react';

export function StickyCTA() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Show when user scrolls past hero (approx 500px)
            if (window.scrollY > 500) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border z-50 md:hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
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
    );
}
