"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { User, Briefcase, GraduationCap, Code, Star, Award, CheckCircle2 } from 'lucide-react';

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
}

const navItems: NavItem[] = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'experience', label: 'Work Experience', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'projects', label: 'Projects', icon: Code },
    { id: 'skills', label: 'Skills', icon: Star },
    { id: 'certifications', label: 'Certifications', icon: Award },
];

interface SectionNavigationProps {
    activeSection: string;
    setActiveSection: (id: string) => void;
    completedSections?: string[];
}

export function SectionNavigation({ activeSection, setActiveSection, completedSections = [] }: SectionNavigationProps) {
    return (
        <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 lg:gap-1 pb-4 lg:pb-0 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
            {navItems.map((item) => {
                const isActive = activeSection === item.id;
                const isCompleted = completedSections.includes(item.id);
                const Icon = item.icon;

                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                            "group flex items-center gap-3 px-5 py-3 rounded-full transition-all duration-300 text-sm font-medium whitespace-nowrap shrink-0",
                            isActive
                                ? "bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-gray-200 dark:shadow-none lg:translate-x-1"
                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                        )}
                    >
                        <Icon className={cn("h-4 w-4", isActive ? "text-white dark:text-black" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300")} />
                        <span className="text-left">{item.label}</span>
                        {isCompleted && (
                            <CheckCircle2 className={cn("h-4 w-4", isActive ? "text-white/50 dark:text-black/50" : "text-zinc-900 dark:text-zinc-100")} />
                        )}
                        {isActive && (
                            <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-black ml-auto lg:ml-0" />
                        )}
                    </button>
                );
            })}
        </nav>
    );
}
