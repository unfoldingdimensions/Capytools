'use client';

import { ReactNode } from 'react';

interface BuilderLayoutProps {
    header: ReactNode;
    sidebar: ReactNode;
    children: ReactNode;
}

export function BuilderLayout({ header, sidebar, children }: BuilderLayoutProps) {
    return (
        <div className="min-h-screen bg-background dark:bg-gray-950">
            {header}
            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Sidebar Navigation - Detached & Transparent */}
                    <aside className="w-full lg:w-72 lg:sticky lg:top-28 space-y-6">
                        {sidebar}
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 w-full max-w-4xl">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
