'use client';

import Link from 'next/link';
import { SignUpButton, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function StartBuildingButton() {
    const { isSignedIn, isLoaded } = useUser();

    // Show nothing while loading
    if (!isLoaded) {
        return (
            <Button
                disabled
                size="xl"
                className="rounded-lg px-8 py-4 text-lg font-medium opacity-50"
            >
                <Sparkles className="mr-2 h-5 w-5" />
                Start Building for Free
            </Button>
        );
    }

    // If signed in, show dashboard link
    if (isSignedIn) {
        return (
            <Link href="/dashboard" passHref legacyBehavior>
                <Button
                    asChild
                    size="xl"
                    className="rounded-lg px-8 py-4 text-lg font-medium"
                >
                    <a className="inline-flex items-center">
                        <Sparkles className="mr-2 h-5 w-5" />
                        Go to Dashboard
                    </a>
                </Button>
            </Link>
        );
    }

    // If not signed in, show sign up button
    return (
        <SignUpButton mode="modal">
            <Button
                size="xl"
                className="rounded-lg px-8 py-4 text-lg font-medium"
            >
                <Sparkles className="mr-2 h-5 w-5" />
                Start Building for Free
            </Button>
        </SignUpButton>
    );
}

