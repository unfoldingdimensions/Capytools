import { UploadCloud, Save, Layout, Download } from 'lucide-react';
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
                <div className="mb-16 text-center">
                    <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tight mb-4">
                        A Frictionless Workflow.
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        From upload to export, every step is optimized for efficiency.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden lg:block absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent -z-10" />

                    {steps.map((step, index) => (
                        <div key={index} className="relative group bg-background md:bg-transparent rounded-2xl p-6 md:p-0 border md:border-0 border-border">
                            <div className="w-24 h-24 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-center mb-6 text-foreground group-hover:scale-105 transition-transform duration-300 mx-auto md:mx-0 z-10 relative">
                                <step.icon size={32} strokeWidth={1.5} />
                                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-sm font-bold shadow-md">
                                    {index + 1}
                                </div>
                            </div>

                            <h3 className="text-xl font-display font-medium mb-3 text-center md:text-left">{step.title}</h3>
                            <p className="text-muted-foreground leading-normal text-center md:text-left text-sm md:text-base">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-lg hover:shadow-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                        Try It Yourself
                    </Button>
                </div>
            </div>
        </section>
    );
}
