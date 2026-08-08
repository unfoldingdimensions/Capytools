import { Zap, Key, LayoutTemplate, FileDown, ShieldCheck, Cpu } from 'lucide-react';

interface FeatureCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    className?: string;
    horizontal?: boolean;
}

function FeatureCard({ icon: Icon, title, description, className = '', horizontal = false }: FeatureCardProps) {
    return (
        <div
            className={`group relative flex ${horizontal ? 'flex-col sm:flex-row sm:items-start sm:justify-between gap-6' : 'flex-col justify-between gap-6'} rounded-t-3xl border border-border/70 bg-card p-8 transition-all duration-normal ease-out-expo hover:border-border hover:shadow-card hover:-translate-y-0.5 ${className}`}
        >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground transition-transform duration-normal ease-out-expo group-hover:scale-105">
                <Icon className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div>
                <h3 className="font-display text-xl font-medium tracking-tight text-foreground mb-2">{title}</h3>
                <p className="max-w-md text-muted-foreground leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

export function FeatureGrid() {
    return (
        <section id="features" className="py-24 px-6 bg-muted/20">
            <div className="max-w-7xl mx-auto">
                <div className="mb-16 max-w-2xl">
                    <p className="micro-label mb-3">Why Handcraft</p>
                    <h2 className="text-display text-3xl md:text-5xl text-foreground mb-4">
                        Built for Power Users.
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        We stripped away the fluff to give you raw speed and total control.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                    {/* Row 1: wide feature + single feature */}
                    <div id="byok" className="md:col-span-2 scroll-mt-24">
                        <FeatureCard
                            icon={Key}
                            title="Bring Your Own Key (BYOK)"
                            description="Connect your own OpenAI, Gemini, or OpenRouter keys. Pay only for what you use, with zero markup on token costs. Full transparency."
                            className="h-full"
                            horizontal
                        />
                    </div>
                    <FeatureCard
                        icon={Zap}
                        title="Lightning Fast"
                        description="High-performance models like glm-4-flash deliver instant suggestions with zero UI lag."
                    />

                    {/* Row 2: single feature + capabilities tile */}
                    <FeatureCard
                        icon={LayoutTemplate}
                        title="Smart Defaults"
                        description="Don't waste time configuring. Sensible, data-backed presets get you 80% of the way in seconds."
                    />
                    <div className="md:col-span-2 rounded-t-3xl border border-border/70 bg-card p-8 transition-all duration-normal ease-out-expo hover:border-border hover:shadow-card hover:-translate-y-0.5">
                        <p className="micro-label mb-6">Out of the box</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {[
                                { icon: FileDown, label: 'PDF + DOCX', value: 'Two export formats' },
                                { icon: ShieldCheck, label: 'No watermarks', value: 'Your resume, yours' },
                                { icon: Cpu, label: 'BYOK ready', value: 'Free forever' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-start gap-3">
                                    <item.icon className="mt-0.5 h-5 w-5 text-foreground" strokeWidth={1.5} />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                                        <p className="text-sm text-muted-foreground">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
