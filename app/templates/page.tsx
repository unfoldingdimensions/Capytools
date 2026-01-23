'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Sparkles, Layout, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TEMPLATES = [
    {
        id: 'modern-indigo',
        name: 'Modern Indigo',
        description: 'Clean, professional design with a subtle sidebar for key information.',
        category: 'Professional',
        image: '/templates/modern-indigo.png',
        featured: true,
    },
    {
        id: 'sleek-dark',
        name: 'Obsidian Night',
        description: 'High-impact dark mode template for creative and technical leaders.',
        category: 'Creative',
        image: '/templates/sleek-dark.png',
        featured: false,
    },
    {
        id: 'minimalist-pro',
        name: 'Executive Minimal',
        description: 'Maximum legibility and ATS compatibility. Pure focus on your results.',
        category: 'ATS-Friendly',
        image: '/templates/minimalist-pro.png',
        featured: false,
    }
];

export default function TemplatesPage() {
    const router = useRouter();
    const [selectedTemplate, setSelectedTemplate] = useState('modern-indigo');
    const [previewTemplate, setPreviewTemplate] = useState<typeof TEMPLATES[0] | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('selectedTemplate');
        if (saved) {
            setSelectedTemplate(saved);
        }
    }, []);

    const handleApplyTemplate = (id: string) => {
        setSelectedTemplate(id);
        localStorage.setItem('selectedTemplate', id);

        // Smart redirection: check if there's a last active resume
        const lastActiveResumeId = localStorage.getItem('lastActiveResumeId');
        if (lastActiveResumeId) {
            router.push(`/resume/${lastActiveResumeId}`);
        } else {
            router.push('/dashboard');
        }
    };

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
                            <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white">Resume Templates</h1>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Select your design</p>
                        </div>
                    </div>
                    <Link href="/dashboard">
                        <Button variant="gradient" className="rounded-full shadow-lg shadow-brand-200">
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <Badge variant="brand" shape="pill" className="mb-4">Premium Gallery</Badge>
                    <h2 className="text-4xl md:text-5xl font-display font-black text-gray-900 dark:text-white mb-6 tracking-tight">
                        Choose a template that <span className="text-brand-600">stands out.</span>
                    </h2>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Our templates are crafted by recruitment experts and professional designers to ensure your resume gets through ATS and catches the eye of hiring managers.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {TEMPLATES.map((template) => (
                        <Card
                            key={template.id}
                            className={`group relative overflow-hidden border border-black/[0.08] dark:border-white/[0.1] shadow-swiss transition-all duration-500 hover:-translate-y-2 hover:shadow-swiss-hover ${selectedTemplate === template.id ? 'ring-2 ring-brand-600' : ''
                                }`}
                        >
                            <div className="aspect-[3/4] relative bg-gray-100 overflow-hidden">
                                <div className="w-full h-full bg-gray-100 relative">
                                    <img
                                        src={template.image}
                                        alt={template.name}
                                        className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                                        onError={(e) => {
                                            // Fallback if image fails to load
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement?.querySelector('.fallback')?.classList.remove('hidden');
                                        }}
                                    />
                                    <div className="fallback hidden absolute inset-0 flex items-center justify-center bg-gray-200">
                                        <div className="text-gray-400 uppercase font-bold tracking-widest text-xs px-4 text-center">
                                            Preview: {template.name}
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute inset-0 bg-gray-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                    <Button
                                        variant="secondary"
                                        className="rounded-full font-bold shadow-xl"
                                        onClick={() => handleApplyTemplate(template.id)}
                                    >
                                        {selectedTemplate === template.id ? 'Applied' : 'Use Template'}
                                    </Button>
                                </div>

                                {template.featured && (
                                    <Badge className="absolute top-4 right-4 bg-brand-600 text-white border-none shadow-lg">
                                        Popular
                                    </Badge>
                                )}
                            </div>

                            <div className="p-6 bg-white dark:bg-gray-900">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{template.name}</h3>
                                    <Badge variant="outline" size="xs">{template.category}</Badge>
                                </div>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                    {template.description}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghostSubtle"
                                        size="sm"
                                        className="flex-1 rounded-xl"
                                        onClick={() => setPreviewTemplate(template)}
                                    >
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Preview
                                    </Button>
                                    <Button
                                        variant="ghostSubtle"
                                        size="icon"
                                        className="h-9 w-9 rounded-xl"
                                        onClick={() => window.open(template.image, '_blank')}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {selectedTemplate === template.id && (
                                <div className="absolute top-4 left-4 h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in-50 duration-300">
                                    <Check className="h-4 w-4" />
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                <div className="mt-20 p-12 rounded-[40px] bg-white dark:bg-gray-900 text-center border border-black/[0.08] dark:border-white/[0.08] border-dashed shadow-swiss">
                    <div className="h-16 w-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 text-brand-600 dark:text-brand-400">
                        <Layout className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">Want a custom design?</h3>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">Our design team is working on 20+ more templates. Stay tuned for the next drop!</p>
                    <Button variant="outline" className="rounded-full px-8">Join the Wishlist</Button>
                </div>
            </main>

            {/* Preview Modal */}
            {previewTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-2">
                        <div className="absolute top-4 right-4 z-10">
                            <Button
                                variant="secondary"
                                size="icon"
                                className="rounded-full shadow-lg h-10 w-10 bg-white/90 backdrop-blur hover:bg-white"
                                onClick={() => setPreviewTemplate(null)}
                            >
                                <ChevronLeft className="h-5 w-5 rotate-180" /> {/* Using rotate for X-like feel or just import X */}
                            </Button>
                        </div>
                        <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-gray-100">
                            <img
                                src={previewTemplate.image}
                                alt={previewTemplate.name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="p-6 flex items-center justify-between bg-white dark:bg-gray-900">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{previewTemplate.name}</h3>
                                <p className="text-gray-500 dark:text-gray-400">{previewTemplate.description}</p>
                            </div>
                            <Button
                                variant="gradient"
                                size="lg"
                                className="rounded-full shadow-lg shadow-brand-500/20 px-8"
                                onClick={() => {
                                    handleApplyTemplate(previewTemplate.id);
                                    setPreviewTemplate(null);
                                }}
                            >
                                Use This Template
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
