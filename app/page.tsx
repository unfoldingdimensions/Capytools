import { FileText, Download, Upload, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/* 
  SWISS MODERN LANDING PAGE
  Concept: High contrast, strict grid, heavy typography, minimal decoration.
*/

export default function HomePage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">

            {/* HERO SECTION */}
            <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 px-6 border-b border-border">
                <div className="max-w-7xl mx-auto">
                    <div className="max-w-4xl">
                        <Badge variant="outline" className="mb-8 rounded-full px-4 py-1 text-sm border-foreground/20 text-foreground font-medium uppercase tracking-wider">
                            v2.0 Now Available
                        </Badge>
                        <h1 className="text-6xl md:text-8xl font-display font-medium tracking-tight leading-[0.9] text-foreground mb-8">
                            Everything you <br />
                            <span className="text-muted-foreground">need to get hired.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed mb-12">
                            Powerful tools to build, optimize, and export your resume.
                            No fluff, just results.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                            <SignedOut>
                                <SignUpButton mode="modal">
                                    <Button size="xl" className="h-14 px-8 rounded-full text-lg bg-foreground text-background hover:bg-foreground/90 transition-all">
                                        Get Started <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </SignUpButton>
                            </SignedOut>
                            <SignedIn>
                                <Link href="/dashboard">
                                    <Button size="xl" className="h-14 px-8 rounded-full text-lg bg-foreground text-background hover:bg-foreground/90 transition-all">
                                        Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                            </SignedIn>

                            <Button variant="ghost" size="xl" className="h-14 px-8 rounded-full text-lg hover:bg-muted">
                                View Templates
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* BENTO GRID FEATURES */}
            <section className="py-24 px-4 md:px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-16">
                        <h2 className="text-3xl font-display font-medium mb-4">Core Capabilities</h2>
                        <p className="text-muted-foreground">Designed for efficiency and precision.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">

                        {/* CARD 1: Large - Resume Builder */}
                        <div className="group md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-900 border border-black/[0.08] dark:border-white/[0.08] p-8 md:p-12 transition-all shadow-sm hover:shadow-swiss-hover hover:-translate-y-1">
                            <div className="absolute top-8 right-8 p-4 bg-white dark:bg-black rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-500">
                                <FileText className="h-8 w-8 text-foreground" />
                            </div>
                            <div className="flex flex-col justify-end h-full">
                                <h3 className="text-3xl font-display font-medium mb-4">Smart Builder</h3>
                                <p className="text-lg text-muted-foreground max-w-md">
                                    Create professional resumes from scratch with our intuitive, AI-guided form builder. Real-time preview as you type.
                                </p>
                            </div>
                        </div>

                        {/* CARD 2: Vertical - Export */}
                        <div className="group md:col-span-1 md:row-span-2 relative overflow-hidden rounded-[2.5rem] bg-black text-white dark:bg-white dark:text-black p-8 md:p-12 transition-transform hover:-translate-y-1 duration-500">
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white/20 dark:bg-black/10 backdrop-blur mb-8">
                                        <Download className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-3xl font-display font-medium mb-4">Export</h3>
                                </div>
                                <div>
                                    <p className="text-lg opacity-80 mb-8">
                                        Download in ATS-friendly PDF or editable Word (DOCX) formats.
                                    </p>
                                    <div className="flex gap-3">
                                        <Badge variant="outline" className="border-white/30 text-white dark:border-black/30 dark:text-black uppercase tracking-wider">PDF</Badge>
                                        <Badge variant="outline" className="border-white/30 text-white dark:border-black/30 dark:text-black uppercase tracking-wider">DOCX</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CARD 3: Small - Import */}
                        <div className="group relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-900 border border-black/[0.08] dark:border-white/[0.08] p-8 transition-all shadow-sm hover:shadow-swiss-hover hover:-translate-y-1">
                            <Upload className="h-8 w-8 mb-6 text-foreground" />
                            <h3 className="text-xl font-display font-medium mb-2">Instant Import</h3>
                            <p className="text-muted-foreground">Upload existing resumes to extract data automatically.</p>
                        </div>

                        {/* CARD 4: Small - AI */}
                        <div className="group relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-900 border border-black/[0.08] dark:border-white/[0.08] p-8 transition-all shadow-sm hover:shadow-swiss-hover hover:-translate-y-1">
                            <Sparkles className="h-8 w-8 mb-6 text-foreground" />
                            <h3 className="text-xl font-display font-medium mb-2">AI Enhancement</h3>
                            <p className="text-muted-foreground">Smart suggestions for bullet points and summaries.</p>
                        </div>

                        {/* CARD 5: Wide - Analytics */}
                        <div className="group md:col-span-3 lg:col-span-3 relative overflow-hidden rounded-[2.5rem] border border-black/[0.08] dark:border-white/[0.08] p-8 md:p-12 bg-white dark:bg-gray-900 shadow-sm hover:shadow-swiss-hover transition-all">
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div>
                                    <div className="flex gap-2 mb-6">
                                        <Badge variant="secondary" className="bg-background shadow-sm">ATS Matcher</Badge>
                                        <Badge variant="secondary" className="bg-background shadow-sm">Role Analyzer</Badge>
                                    </div>
                                    <h3 className="text-4xl font-display font-medium mb-6">Beat the bots.</h3>
                                    <p className="text-xl text-muted-foreground mb-8">
                                        Our analysis tools accept job descriptions and verify your resume matches the keywords and skills required.
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            <span>Real-time compatibility scoring</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            <span>Keyword extraction & gap analysis</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative">
                                    {/* Abstract UI representation */}
                                    <div className="bg-background rounded-xl border border-border mt-8 md:mt-0 p-6 shadow-xl rotate-1 group-hover:rotate-0 transition-transform duration-500">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="font-bold">Match Score</div>
                                            <div className="text-green-500 font-bold text-xl">92%</div>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
                                            <div className="h-full bg-green-500 w-[92%]" />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="h-8 bg-muted/50 rounded-md w-full" />
                                            <div className="h-8 bg-muted/50 rounded-md w-3/4" />
                                            <div className="h-8 bg-muted/50 rounded-md w-5/6" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* BOLD CTA */}
            <section className="py-32 px-6 border-t border-border">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-5xl md:text-7xl font-display font-medium tracking-tight mb-12">
                        Your career. <br />
                        <span className="text-muted-foreground">Next level.</span>
                    </h2>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <SignedOut>
                            <SignUpButton mode="modal">
                                <Button size="xl" className="h-16 px-10 rounded-full text-xl bg-foreground text-background hover:bg-foreground/90 transition-all shadow-2xl hover:shadow-xl hover:-translate-y-1">
                                    Start Building Free
                                </Button>
                            </SignUpButton>
                        </SignedOut>
                        <SignedIn>
                            <Link href="/dashboard">
                                <Button size="xl" className="h-16 px-10 rounded-full text-xl bg-foreground text-background hover:bg-foreground/90 transition-all shadow-2xl hover:shadow-xl hover:-translate-y-1">
                                    Go to Dashboard
                                </Button>
                            </Link>
                        </SignedIn>
                        <p className="mt-6 text-sm text-muted-foreground uppercase tracking-widest font-medium">
                            No credit card required
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
