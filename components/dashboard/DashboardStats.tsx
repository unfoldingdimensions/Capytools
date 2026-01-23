'use client';

import { FileText, TrendingUp, Zap, Upload } from 'lucide-react';

interface DashboardStatsProps {
    resumeCount: number;
    uploadCount: number;
}

export function DashboardStats({ resumeCount, uploadCount }: DashboardStatsProps) {
    const stats = [
        { label: 'Total Resumes', value: resumeCount, icon: FileText },
        { label: 'ATS Score Avg', value: '--', icon: TrendingUp },
        { label: 'Tailored Roles', value: '0', icon: Zap },
        { label: 'Total Uploads', value: uploadCount, icon: Upload }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, i) => (
                <div key={i} className="group relative p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-black/[0.08] dark:border-white/[0.08] shadow-swiss transition-all hover:border-black/20 dark:hover:border-white/20 hover:shadow-swiss-hover hover:-translate-y-1">
                    <div className="mb-4 text-muted-foreground group-hover:text-foreground transition-colors">
                        <stat.icon className="h-6 w-6" />
                    </div>
                    <div className="absolute bottom-6 left-6">
                        <p className="text-3xl font-display font-medium text-foreground mb-1">{stat.value}</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                    </div>
                    <div className="h-24" /> {/* Spacer for absolute positioning */}
                </div>
            ))}
        </div>
    );
}
