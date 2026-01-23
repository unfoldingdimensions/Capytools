'use client';

import Link from 'next/link';
import { SignUpButton, useUser } from '@clerk/nextjs';
import { Sparkles } from 'lucide-react';

export function StartBuildingButton() {
    const { isSignedIn, isLoaded } = useUser();

    // Show nothing while loading
    if (!isLoaded) {
        return (
            <button
                disabled
                className="inline-flex items-center rounded-lg bg-blue-600 px-8 py-4 text-lg font-medium text-white opacity-50"
            >
                <Sparkles className="mr-2 h-5 w-5" />
                Start Building for Free
            </button>
        );
    }

    // If signed in, show dashboard link
    if (isSignedIn) {
        return (
            <Link
                href="/dashboard"
                className="inline-flex items-center rounded-lg bg-blue-600 px-8 py-4 text-lg font-medium text-white transition-colors hover:bg-blue-700"
            >
                <Sparkles className="mr-2 h-5 w-5" />
                Go to Dashboard
            </Link>
        );
    }

    // If not signed in, show sign up button
    return (
        <SignUpButton mode="modal">
            <button className="inline-flex items-center rounded-lg bg-blue-600 px-8 py-4 text-lg font-medium text-white transition-colors hover:bg-blue-700">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Building for Free
            </button>
        </SignUpButton>
    );
}

