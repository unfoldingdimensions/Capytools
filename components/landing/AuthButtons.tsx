'use client';

import { useAuth, SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AuthButtonsProps {
    className?: string;
    size?: "default" | "sm" | "lg" | "icon" | "xl";
    textSignedOut?: string;
    textSignedIn?: string;
}

export function AuthButtons({
    className,
    size = "xl",
    textSignedOut = "Get Started",
    textSignedIn = "Go to Dashboard"
}: AuthButtonsProps) {
    const { isSignedIn, isLoaded } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Signed-in users (once auth state resolves) go to the dashboard.
    // Everyone else gets the sign-up CTA immediately — it does not depend
    // on Clerk's auth state, so we render it enabled on first paint instead
    // of a disabled skeleton that silently swallows clicks.
    const showDashboard = mounted && isLoaded && isSignedIn;

    if (showDashboard) {
        return (
            <Link href="/dashboard">
                <Button
                    size={size}
                    className={cn("bg-foreground text-background hover:bg-foreground/90 transition-all", className)}
                >
                    {textSignedIn} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </Link>
        );
    }

    return (
        <SignUpButton mode="modal">
            <Button
                size={size}
                className={cn("bg-foreground text-background hover:bg-foreground/90 transition-all", className)}
            >
                {textSignedOut} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        </SignUpButton>
    );
}
