'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, BookOpen, TrendingUp, Target, MessageSquare } from 'lucide-react';
import Link from 'next/link';

const ARTICLES = [
    {
        title: 'How to Beat the ATS in 2026',
        description: 'Learn the latest techniques to ensure your resume gets past the screening software.',
        category: 'Resume Strategy',
        readTime: '5 min read',
        icon: Target,
        color: 'text-foreground',
        bg: 'bg-secondary'
    },
    {
        title: 'Mastering the AI Interview',
        description: 'A comprehensive guide on how to prepare for and excel in AI-driven interviews.',
        category: 'Interview Prep',
        readTime: '8 min read',
        icon: MessageSquare,
        color: 'text-foreground',
        bg: 'bg-secondary'
    },
    {
        title: 'Top 10 High-Growth Skills for Q1',
        description: 'See which skills are currently most in-demand across major industries.',
        category: 'Career Growth',
        readTime: '6 min read',
        icon: TrendingUp,
        color: 'text-brand-600',
        bg: 'bg-brand-50'
    }
];

export default function CareerAdvicePage() {
    return (
        <div className="min-h-screen bg-[#FDFDFF] dark:bg-gray-950">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghostSubtle" size="icon" className="rounded-full">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white">Career Advice</h1>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Expert insights & resources</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <Badge variant="brand" shape="pill" className="mb-4 px-4 py-1.5 bg-brand-50 text-brand-700">Expert Insights</Badge>
                    <h2 className="text-4xl md:text-5xl font-display font-black text-gray-900 dark:text-white mb-6 tracking-tight">
                        Navigate your career with <span className="text-brand-600">confidence.</span>
                    </h2>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Actionable advice from recruiting experts and industry leaders to help you land your dream job.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {ARTICLES.map((article, index) => (
                        <Card key={index} className="p-8 border border-black/[0.08] dark:border-white/[0.08] shadow-swiss bg-white dark:bg-gray-900 hover:shadow-swiss-hover hover:-translate-y-1 transition-all duration-300 flex flex-col">
                            <div className={`mb-6 h-14 w-14 rounded-2xl ${article.bg} dark:bg-opacity-20 ${article.color} dark:text-opacity-90 flex items-center justify-center`}>
                                <article.icon className="h-7 w-7" />
                            </div>
                            <Badge variant="outline" size="xs" className="mb-4 w-fit dark:border-gray-700 dark:text-gray-300">{article.category}</Badge>
                            <h3 className="text-xl font-display font-bold text-gray-900 dark:text-gray-50 mb-3 leading-tight">{article.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-1 line-clamp-3">
                                {article.description}
                            </p>
                            <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{article.readTime}</span>
                                <Button variant="ghostSubtle" size="sm" className="font-bold">Read More</Button>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Newsletter Box */}
                <div className="rounded-t-4xl bg-gradient-to-br from-gray-900 to-black p-12 text-center text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 -m-8 h-48 w-48 bg-white/5 blur-3xl rounded-full" />
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-6" />
                        <h3 className="text-3xl font-display font-bold mb-4">Never miss an insight.</h3>
                        <p className="text-gray-400 mb-8">Join 10,000+ professionals receiving weekly career tips directly in their inbox.</p>
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                            <input
                                type="email"
                                placeholder="Enter your email..."
                                className="h-12 w-full sm:w-72 rounded-xl bg-white/10 border border-white/20 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium"
                            />
                            <Button variant="brand" size="xl" className="w-full sm:w-auto px-8 rounded-xl h-12 shadow-xl shadow-black/20 bg-white text-black hover:bg-gray-200">
                                Subscribe Now
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
