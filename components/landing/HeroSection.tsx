import { Button } from '@/components/ui/button';
import { AuthButtons } from '@/components/landing/AuthButtons';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function HeroSection() {
    return (
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                <div className="max-w-2xl">
                    <Badge variant="outline" className="mb-6 rounded-full px-4 py-1 text-sm border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 font-medium">
                        v2.0 Now Available
                    </Badge>

                    <h1 className="text-5xl md:text-7xl font-display font-medium tracking-tight leading-[1.1] text-foreground mb-6">
                        Stop Wrestling with Formatting. <br />
                        <span className="text-zinc-500 dark:text-zinc-400">Start Winning Interviews.</span>
                    </h1>

                    <p className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-lg">
                        The first AI resume builder designed for professionals who want total control.
                        Bring your own API keys, parse existing resumes in seconds, and export high-fidelity PDFs.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <AuthButtons
                            className="h-14 px-8 rounded-full text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                            textSignedOut="Build Your Resume Now (Free)"
                        />
                        <Button
                            variant="outline"
                            size="xl"
                            className="h-14 px-8 rounded-full text-lg border-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            asChild
                        >
                            <a href="#features">How BYOK Works</a>
                        </Button>
                    </div>

                    <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium">
                                    {String.fromCharCode(64 + i)}
                                </div>
                            ))}
                        </div>
                        <p>Trusted by professionals from top tech companies</p>
                    </div>
                </div>

                {/* Visual Mockup - Preview vs Editor */}
                <div className="relative group perspective-1000">
                    <div className="absolute inset-0 bg-gradient-to-tr from-zinc-200 to-zinc-400/20 dark:from-zinc-800 dark:to-zinc-700/20 rounded-[2rem] blur-3xl opacity-50 -z-10 transform rotate-3 scale-110" />

                    <div className="relative bg-background border border-border shadow-2xl rounded-[2rem] p-4 md:p-6 overflow-hidden transform group-hover:rotate-1 transition-transform duration-700 ease-out-expo">
                        <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                            </div>
                            <div className="text-xs font-mono text-muted-foreground">handcraft-resume-v2.pdf</div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 h-[400px]">
                            {/* Editor Side */}
                            <div className="space-y-4 font-mono text-sm opacity-60">
                                <div className="h-4 bg-muted w-3/4 rounded" />
                                <div className="space-y-2">
                                    <div className="h-3 bg-muted w-full rounded" />
                                    <div className="h-3 bg-muted w-5/6 rounded" />
                                    <div className="h-3 bg-muted w-4/5 rounded" />
                                </div>
                                <div className="h-4 bg-muted w-1/2 rounded mt-6" />
                                <div className="space-y-2">
                                    <div className="h-3 bg-muted w-full rounded" />
                                    <div className="h-3 bg-muted w-11/12 rounded" />
                                </div>

                                {/* Floating AI Suggestion */}
                                <div className="absolute top-1/3 left-10 right-1/2 p-4 bg-background border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-xl z-20 animate-float">
                                    <div className="flex gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                                            <FileText size={14} />
                                        </div>
                                        <span className="text-xs font-bold text-foreground">AI Suggestion</span>
                                    </div>
                                    <p className="text-xs text-foreground/80">
                                        "Led cross-functional team" → "Orchestrated 12-person agile team delivering..."
                                    </p>
                                    <div className="mt-2 flex gap-2">
                                        <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full w-3/4 bg-zinc-900 dark:bg-zinc-100" />
                                        </div>
                                        <span className="text-[10px] text-foreground font-bold">Stronger</span>
                                    </div>
                                </div>
                            </div>

                            {/* Preview Side */}
                            <div className="bg-white text-black p-6 rounded-xl shadow-inner text-[8px] leading-relaxed overflow-hidden">
                                <div className="text-xl font-bold mb-1">Alex Designer</div>
                                <div className="text-gray-500 mb-4">Senior Product Designer</div>

                                <div className="font-bold border-b border-gray-200 pb-1 mb-2">EXPERIENCE</div>
                                <div className="mb-2">
                                    <div className="font-bold flex justify-between">
                                        <span>TechCorp Inc.</span>
                                        <span>2020 - Present</span>
                                    </div>
                                    <div className="italic mb-1">Senior UX Designer</div>
                                    <ul className="list-disc pl-3 text-gray-600 space-y-1">
                                        <li>Spearheaded redesign of core product interface, increasing user engagement by 45% within Q1.</li>
                                        <li>Orchestrated 12-person agile team delivering critical mobile features ahead of schedule.</li>
                                        <li>Implemented new design system reducing development handoff time by 30%.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
