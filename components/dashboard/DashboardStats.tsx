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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-16">
            {stats.map((stat, i) => (
                <div
                    key={i}
                    className="group rounded-t-3xl border border-border/70 bg-card p-6 transition-all duration-normal ease-out-expo hover:border-border hover:shadow-card hover:-translate-y-0.5"
                >
                    <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground transition-transform duration-normal ease-out-expo group-hover:scale-105">
                        <stat.icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <p className="font-display text-4xl font-semibold tracking-tight text-foreground">{stat.value}</p>
                    <p className="micro-label mt-2">{stat.label}</p>
                </div>
            ))}
        </div>
    );
}
