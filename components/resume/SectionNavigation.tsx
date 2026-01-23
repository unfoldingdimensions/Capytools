"use client";

import React from 'react';
import { cn } from '@/lib/utils/cn';
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
        <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
                const isActive = activeSection === item.id;
                const isCompleted = completedSections.includes(item.id);
                const Icon = item.icon;

                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                            "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
                            isActive
                                ? "bg-brand-50 text-brand-700 shadow-sm shadow-brand-100/50"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        )}
                    >
                        <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            isActive
                                ? "bg-brand-600 text-white"
                                : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                        )}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-left">{item.label}</span>
                        {isCompleted && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                        {isActive && (
                            <div className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                        )}
                    </button>
                );
            })}
        </nav>
    );
}
