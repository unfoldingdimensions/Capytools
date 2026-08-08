'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type BillingPeriod = 'monthly' | 'yearly';

interface Plan {
    name: string;
    tagline: string;
    monthly: number | null;
    yearly: number | null;
    cta: string;
    href: string;
    popular?: boolean;
    features: string[];
}

const PLANS: Plan[] = [
    {
        name: 'Free',
        tagline: 'Everything you need to ship a clean resume.',
        monthly: 0,
        yearly: 0,
        cta: 'Start free',
        href: '/sign-up',
        features: [
            '3 active resumes',
            '3 AI credits / month',
            'Bring your own key (BYOK)',
            'PDF export, no watermarks',
        ],
    },
    {
        name: 'Pro',
        tagline: 'For serious job seekers who want every edge.',
        monthly: 12,
        yearly: 99,
        cta: 'Get started',
        href: '/sign-up',
        popular: true,
        features: [
            'Unlimited resumes',
            'Unlimited AI (BYOK)',
            'All templates + custom theme',
            'DOCX + ATS-optimized export',
            'Priority support',
        ],
    },
    {
        name: 'Business',
        tagline: 'For teams, career coaches, and power users.',
        monthly: 29,
        yearly: 249,
        cta: 'Contact us',
        href: 'mailto:legal@handcraftresume.com?subject=Business%20plan%20inquiry',
        features: [
            'Everything in Pro',
            'Team workspaces & seats',
            'Custom branding',
            'API access',
        ],
    },
];

export function PricingSection() {
    const [billing, setBilling] = useState<BillingPeriod>('monthly');

    return (
        <section id="pricing" className="py-24 px-6 bg-background border-t border-border relative overflow-hidden">
            <div className="grid-overlay" />
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="mb-16 max-w-2xl">
                    <p className="micro-label mb-3">Pricing</p>
                    <h2 className="text-display text-3xl md:text-5xl text-foreground mb-4">
                        Start free. Upgrade when it matters.
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        No lock-in. Bring your own keys and the AI features stay free forever.
                    </p>
                </div>

                {/* Billing toggle */}
                <div className="mb-12 inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
                    {(['monthly', 'yearly'] as const).map((period) => (
                        <button
                            key={period}
                            type="button"
                            onClick={() => setBilling(period)}
                            className={cn(
                                'rounded-full px-5 py-2 text-sm font-medium capitalize transition-all duration-fast ease-out-expo',
                                billing === period
                                    ? 'bg-foreground text-background shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {period}
                            {period === 'yearly' && (
                                <span className="ml-1.5 text-xs font-semibold opacity-70">Save ~30%</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="grid md:grid-cols-3 gap-5 items-stretch">
                    {PLANS.map((plan) => {
                        const amount = billing === 'monthly' ? plan.monthly : plan.yearly;
                        const period = billing === 'monthly' ? 'month' : 'year';
                        const yearlySavings =
                            billing === 'yearly' &&
                            plan.monthly !== null &&
                            plan.monthly > 0 &&
                            plan.yearly !== null
                                ? Math.round((1 - plan.yearly / (plan.monthly * 12)) * 100)
                                : null;

                        return (
                            <div
                                key={plan.name}
                                className={cn(
                                    'relative flex flex-col rounded-t-3xl border bg-card p-8 transition-all duration-normal ease-out-expo hover:-translate-y-1 hover:shadow-card',
                                    plan.popular
                                        ? 'border-foreground ring-2 ring-foreground'
                                        : 'border-border/70 hover:border-border'
                                )}
                            >
                                {plan.popular && (
                                    <span className="absolute -top-3 left-8 rounded-full bg-foreground px-3 py-1 text-xs font-semibold uppercase tracking-wider text-background">
                                        Popular
                                    </span>
                                )}

                                <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                                    {plan.name}
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground leading-relaxed min-h-[2.5rem]">
                                    {plan.tagline}
                                </p>

                                <div className="mt-6 flex items-baseline gap-1.5">
                                    <span className="font-display text-5xl font-semibold tracking-tight text-foreground">
                                        ${amount}
                                    </span>
                                    <span className="text-sm text-muted-foreground">/ {period}</span>
                                    {yearlySavings !== null && (
                                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                                            Save {yearlySavings}%
                                        </span>
                                    )}
                                </div>

                                <Link
                                    href={plan.href}
                                    className={cn(
                                        'mt-8 inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold transition-all duration-fast ease-out-expo',
                                        plan.popular
                                            ? 'bg-foreground text-background hover:bg-foreground/90'
                                            : 'border border-border bg-muted/40 text-foreground hover:bg-muted/70'
                                    )}
                                >
                                    {plan.cta}
                                </Link>

                                <ul className="mt-8 space-y-3 border-t border-border/60 pt-6">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3 text-sm text-foreground/90">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" strokeWidth={2} />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                <p className="mt-10 text-center text-sm text-muted-foreground">
                    Billing is rolling out soon — every paid tier is free to try today.
                </p>
            </div>
        </section>
    );
}
