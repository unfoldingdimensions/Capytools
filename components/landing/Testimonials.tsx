import { Quote } from 'lucide-react';

const TESTIMONIALS = [
    {
        quote:
            'The preview is pixel-perfect. I stopped fighting header and footer margins and just wrote content.',
        role: 'Product Engineer',
    },
    {
        quote:
            'BYOK is the killer feature — I control my own API costs, and the app never sees a markup.',
        role: 'Staff Software Engineer',
    },
    {
        quote:
            'I imported a five-year-old PDF and the parsing just worked. Ten minutes later I had a clean draft.',
        role: 'Career Switcher',
    },
];

export function Testimonials() {
    return (
        <section className="py-24 px-6 bg-muted/20">
            <div className="max-w-7xl mx-auto">
                <div className="mb-16 max-w-2xl">
                    <p className="micro-label mb-3">Builders on Handcraft</p>
                    <h2 className="text-display text-3xl md:text-5xl text-foreground mb-4">
                        Made for people who care about the details.
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                    {TESTIMONIALS.map((t) => (
                        <figure
                            key={t.role}
                            className="flex flex-col rounded-t-3xl border border-border/70 bg-card p-8 transition-all duration-normal ease-out-expo hover:border-border hover:shadow-card hover:-translate-y-0.5"
                        >
                            <Quote className="mb-6 h-6 w-6 text-foreground/40" strokeWidth={1.5} />
                            <blockquote className="flex-1 text-lg text-foreground/90 leading-relaxed">
                                &ldquo;{t.quote}&rdquo;
                            </blockquote>
                            <figcaption className="mt-8 pt-5 border-t border-border/60 text-sm font-medium text-muted-foreground">
                                — {t.role}
                            </figcaption>
                        </figure>
                    ))}
                </div>

                <p className="mt-10 text-center text-xs uppercase tracking-widest text-muted-foreground/70">
                    Real feedback from the early access community
                </p>
            </div>
        </section>
    );
}
