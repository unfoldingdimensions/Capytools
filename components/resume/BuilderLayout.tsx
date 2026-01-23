'use client';

import { ReactNode } from 'react';

interface BuilderLayoutProps {
    header: ReactNode;
    leftSidebar?: ReactNode;
    rightSidebar?: ReactNode;
    children: ReactNode;
}

export function BuilderLayout({ header, leftSidebar, rightSidebar, children }: BuilderLayoutProps) {
    return (
        <div className="min-h-screen bg-background dark:bg-gray-950">
            {header}
            <main className="max-w-[1600px] mx-auto px-4 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Left Sidebar - Navigation */}
                    {leftSidebar && (
                        <aside className="hidden lg:block w-72 sticky top-28 space-y-6">
                            {leftSidebar}
                        </aside>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 w-full min-w-0">
                        {children}
                    </div>

                    {/* Right Sidebar - Tools & Analysis */}
                    {rightSidebar && (
                        <aside className="w-full lg:w-80 lg:sticky lg:top-28 space-y-6">
                            {rightSidebar}
                        </aside>
                    )}
                </div>
            </main>
        </div>
    );
}
