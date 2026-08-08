import { UploadCloud, Save, Layout, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function WorkflowSection() {
    const steps = [
        {
            icon: UploadCloud,
            title: 'Import & Parse',
            description: 'Upload your old PDF/DOCX. Our AI extracts data in seconds, populating your profile instantly.',
        },
        {
            icon: Save,
            title: 'Save Now, Finish Later',
            description: 'Permissive validation lets you save incomplete drafts. Never lose progress because of a missing date.',
        },
        {
            icon: Layout,
            title: 'Live Premium Preview',
            description: 'A high-fidelity rendering engine. What you see on screen is exactly what the PDF looks like.',
        },
        {
            icon: Download,
            title: 'Universal Export',
            description: 'One-click download in professional PDF and editable DOCX formats. No watermarks.',
        },
    ];

    return (
        <section className="py-24 px-6 bg-background">
            <div className="max-w-7xl mx-auto">
                <div className="mb-16 max-w-2xl">
                    <p className="micro-label mb-3">How it works</p>
                    <h2 className="text-display text-3xl md:text-5xl text-foreground mb-4">
                        A frictionless workflow.
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        From upload to export, every step is optimized for efficiency.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-t-3xl border border-border/70 bg-border/50 md:bg-transparent">
                    {steps.map((step, index) => (
                        <div
                            key={step.title}
                            className="group relative flex flex-col gap-6 bg-card p-8 transition-all duration-normal ease-out-expo hover:bg-muted/30"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground transition-transform duration-normal ease-out-expo group-hover:scale-105">
                                    <step.icon size={22} strokeWidth={1.5} />
                                </div>
                                <span className="font-display text-5xl font-semibold tracking-tight text-foreground/10">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                            </div>
                            <div>
                                <h3 className="font-display text-xl font-medium tracking-tight text-foreground mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed md:text-base">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 flex flex-col items-center gap-4">
                    <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-card hover:shadow-pop" asChild>
                        <Link href="/sign-up">Try It Yourself</Link>
                    </Button>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground/70">
                        Free to start · No credit card required
                    </p>
                </div>
            </div>
        </section>
    );
}
