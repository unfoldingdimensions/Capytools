'use client';

import { useState } from 'react';
import { Sparkles, Wand2, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AIEngineSection() {
    const [isImproved, setIsImproved] = useState(false);

    return (
        <section className="py-24 px-6 border-b border-border overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="mb-20 text-center max-w-3xl mx-auto">
                    <Badge variant="secondary" className="mb-6 bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700">Core Engine</Badge>
                    <h2 className="text-display text-4xl md:text-5xl font-medium mb-6">
                        Intelligent Content Generation.
                    </h2>
                    <p className="text-xl text-muted-foreground text-pretty">
                        We don&apos;t just format your resume. We engineer it to beat ATS filters and impress human recruiters.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-16 items-center">

                    {/* Left Column: Features List */}
                    <div className="space-y-12">
                        <div className="flex gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                <Wand2 className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                            </div>
                            <div>
                                <h3 className="text-xl font-display font-medium mb-2">Dynamic Section Tailoring</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Paste a job description and watch our engine automatically adapt your work history and skills grid to match the requirements.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                <Sparkles className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                            </div>
                            <div>
                                <h3 className="text-xl font-display font-medium mb-2">Professional Summary Generation</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Generate impactful, industry-specific summaries in one click. No more writer&apos;s block.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                            </div>
                            <div>
                                <h3 className="text-xl font-display font-medium mb-2">Real-time Grammar & Tone</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    A built-in &ldquo;Professional Tone&rdquo; validator ensures you sound like an expert, flagging passive voice and weak verbs instantly.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Interactive Demo */}
                    <div className="relative">
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-zinc-100 dark:bg-zinc-800 rounded-full blur-3xl opacity-50" />

                        <div className="relative bg-card border border-border rounded-t-3xl shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                    <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                    <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                </div>
                                <div className="flex bg-background rounded-full p-1 border border-border">
                                    <button
                                        onClick={() => setIsImproved(false)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!isImproved ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900' : 'text-muted-foreground hover:bg-muted'}`}
                                    >
                                        Original
                                    </button>
                                    <button
                                        onClick={() => setIsImproved(true)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${isImproved ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900' : 'text-muted-foreground hover:bg-muted'}`}
                                    >
                                        AI Enhanced
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 min-h-[300px] flex items-center">
                                <div className="space-y-6 w-full">
                                    {!isImproved ? (
                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                                <div className="mt-1">
                                                    <div className="w-2 h-2 rounded-full bg-zinc-400" />
                                                </div>
                                                <div>
                                                    <p className="text-lg text-foreground mb-2">&ldquo;Responsible for managing the team and talking to clients about project updates.&rdquo;</p>
                                                    <div className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-1 rounded">
                                                        <span>Weak Passive Voice</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="absolute -top-3 -right-3 animate-bounce">
                                                <div className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                                                    +45% Impact
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                                                <div className="mt-1">
                                                    <CheckCircle2 className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                                                </div>
                                                <div>
                                                    <p className="text-lg text-foreground mb-2">
                                                        &ldquo;Orchestrated a cross-functional team of 10, facilitating weekly stakeholder communications that improved project transparency metrics by 40%.&rdquo;
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <div className="inline-flex items-center gap-2 text-xs font-medium text-zinc-900 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 px-2 py-1 rounded">
                                                            <span>Strong Action Verbs</span>
                                                        </div>
                                                        <div className="inline-flex items-center gap-2 text-xs font-medium text-zinc-900 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 px-2 py-1 rounded">
                                                            <span>Quantifiable Metrics</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-center pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsImproved(!isImproved)}
                                            className="group hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                            <RefreshCw className={`mr-2 h-4 w-4 transition-transform ${isImproved ? 'rotate-180' : ''}`} />
                                            {isImproved ? 'See Original' : 'Enhance with AI'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
