/**
 * CapyResume — shared shell for the three legal pages.
 *
 * These pages previously leaned on Tailwind's `prose` classes, which were never
 * wired up (the typography plugin is not installed), so their styling was
 * silently doing nothing. Everything here is explicit for that reason.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/site';

type PolicyId = 'privacy' | 'terms' | 'cookies';

const POLICIES: readonly { id: PolicyId; href: string; label: string }[] = [
  { id: 'privacy', href: '/privacy', label: 'Privacy Policy' },
  { id: 'terms', href: '/terms', label: 'Terms of Service' },
  { id: 'cookies', href: '/cookies', label: 'Cookie Policy' },
];

export function LegalPage({
  current,
  title,
  lead,
  children,
}: {
  current: PolicyId;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/capyresume">
          <Button variant="ghost" className="-ml-4 mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to the builder
          </Button>
        </Link>

        <header className="mb-12">
          <h1 className="mb-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {title}
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">{lead}</p>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: {SITE.legalUpdated}</p>
        </header>

        <div className="space-y-12">{children}</div>

        <footer className="mt-16 border-t border-border pt-8 text-sm text-muted-foreground">
          <p className="leading-relaxed">
            {SITE.name} is free and open source under the{' '}
            <a
              className="underline underline-offset-4"
              href={SITE.licenseUrl}
              rel="noreferrer"
              target="_blank"
            >
              {SITE.license}
            </a>{' '}
            licence. Found something wrong on this page?{' '}
            <a
              className="underline underline-offset-4"
              href={SITE.issues}
              rel="noreferrer"
              target="_blank"
            >
              Open an issue
            </a>
            .
          </p>
          <nav aria-label="Other policies" className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {POLICIES.filter((policy) => policy.id !== current).map((policy) => (
              <Link key={policy.id} href={policy.href} className="underline underline-offset-4">
                {policy.label}
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl font-bold text-foreground">{heading}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function LegalH3({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-lg font-semibold text-foreground">{children}</h3>;
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-muted-foreground">{children}</p>;
}

export function LegalUL({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">{children}</ul>
  );
}
