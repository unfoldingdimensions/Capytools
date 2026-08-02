'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function EfficiencyMetric() {
    const [isVisible, setIsVisible] = useState(false);

    // Simple intersection observer effect simulation for "enter animation"
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <section className="py-24 px-6 bg-muted/10 border-t border-border">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tight mb-6">
                        Efficiency, Quantified.
                    </h2>
                    <p className="text-xl text-muted-foreground mb-8">
                        Stop spending 3 hours on a single resume. Our power users cut formatting time by 90%, giving them back time to network and prep for interviews.
                    </p>

                    <div className="flex gap-8">
                        <div>
                            <div className="text-4xl font-bold font-display text-zinc-900 dark:text-zinc-100 mb-1">90%</div>
                            <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Faster formatting</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold font-display text-zinc-900 dark:text-zinc-100 mb-1">0%</div>
                            <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Subscription Fees</div>
                        </div>
                    </div>
                </div>

                {/* Infographic Chart */}
                <div className="bg-card border border-border rounded-t-3xl p-8 shadow-sm">
                    <h3 className="text-lg font-medium mb-8 flex items-center gap-2">
                        <span className="w-2 h-6 bg-zinc-900 dark:bg-zinc-100 rounded-full"></span>
                        Time per Application
                    </h3>

                    <div className="space-y-6">
                        {/* Manual Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-muted-foreground">Standard Manual Entry</span>
                                <span className="font-mono text-muted-foreground">~120 mins</span>
                            </div>
                            <div className="h-12 bg-muted/40 rounded-xl relative overflow-hidden w-full">
                                <motion.div
                                    className="absolute top-0 left-0 h-full bg-slate-400/20"
                                    initial={{ width: 0 }}
                                    animate={{ width: isVisible ? '100%' : 0 }}
                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                />
                                <div className="absolute inset-0 flex items-center px-4 opacity-50 text-xs">Formatted manually in generic editor</div>
                            </div>
                        </div>

                        {/* AI Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-foreground">With Handcraft Resume AI</span>
                                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">~12 mins</span>
                            </div>
                            <div className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl relative overflow-hidden w-[10%] min-w-[120px]">
                                <motion.div
                                    className="absolute top-0 left-0 h-full bg-zinc-900 dark:bg-zinc-100"
                                    initial={{ width: 0 }}
                                    animate={{ width: isVisible ? '100%' : 0 }}
                                    transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                                />
                                <div className="absolute inset-0 flex items-center justify-end px-4 text-xs font-bold text-white dark:text-zinc-900 z-10">
                                    10x Faster
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground">
                        *Based on internal testing comparing manual formatting vs AI parsing workflow.
                    </div>
                </div>
            </div>
        </section>
    );
}
