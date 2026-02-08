'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function SkipLink() {
    return (
        <Button
            asChild
            variant="default"
            className={cn(
                'fixed left-4 top-4 z-[100] -translate-y-[150%] transition-transform focus:translate-y-0'
            )}
        >
            <a href="#main-content">Skip to content</a>
        </Button>
    );
}
