import { Zap, Key, LayoutTemplate } from 'lucide-react';

interface FeatureCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    className?: string;
}

function FeatureCard({ icon: Icon, title, description, className = '' }: FeatureCardProps) {
    return (
        <div className={`group relative p-8 rounded-3xl border border-border bg-card hover:bg-muted/30 transition-all duration-300 hover:-translate-y-1 ${className}`}>
            <div className="absolute top-8 right-8 p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 group-hover:scale-110 transition-transform duration-500">
                <Icon className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
            </div>
            <div className="mt-8">
                <h3 className="text-xl font-display font-medium mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

export function FeatureGrid() {
    return (
        <section id="features" className="py-24 px-6 bg-muted/20">
            <div className="max-w-7xl mx-auto">
                <div className="mb-16 max-w-2xl">
                    <h2 className="text-3xl md:text-4xl font-display font-medium mb-4">Built for Power Users.</h2>
                    <p className="text-lg text-muted-foreground">
                        We stripped away the fluff to give you raw speed and total control.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <FeatureCard
                        icon={Key}
                        title="Bring Your Own Key (BYOK)"
                        description="Connect your own OpenAI or Anthropic API keys. Pay only for what you use, with zero markup on token costs. Full transparency."
                    />
                    <FeatureCard
                        icon={Zap}
                        title="Lightning Fast Processing"
                        description="Engineered for speed. We use high-performance models like glm-4-flash for instant suggestions with zero UI lag."
                    />
                    <FeatureCard
                        icon={LayoutTemplate}
                        title="Smart Defaults"
                        description="Don't waste time configuring. Our sensible, data-backed presets get you 80% of the way there in seconds."
                    />
                </div>
            </div>
        </section>
    );
}
