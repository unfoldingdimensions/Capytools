'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { AISettings } from '@/components/dashboard/AISettings';

export function DashboardHeader() {
    return (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="flex items-center gap-2 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-none group-hover:scale-110 transition-transform">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-display font-medium tracking-tight text-foreground">Handcraft</span>
                    </Link>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                        <Link href="/templates" className="hover:text-foreground transition-colors">Templates</Link>
                        <Link href="/career-advice" className="hover:text-foreground transition-colors">Career Advice</Link>
                    </div>
                    <div className="h-6 w-[1px] bg-border" />
                    <div className="flex items-center gap-4">
                        <AISettings />
                        <ThemeToggle />
                        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
                    </div>
                </div>
            </div>
        </header>
    );
}
