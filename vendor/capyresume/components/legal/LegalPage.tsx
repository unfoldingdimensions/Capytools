/**
 * CapyResume — shared shell for the three legal pages.
 *
 * These pages previously leaned on Tailwind's `prose` classes, which were never wired up
 * (the typography plugin is not installed), so their styling was silently doing nothing.
 * Everything here is explicit for that reason.
 *
 * The footer that used to live at the bottom of this component sat inside `<main>`. The
 * site shell renders the real contentinfo now, so the licence line and the policy links
 * exist in exactly one place.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/site';

export function LegalPage({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-8">
        <Link href="/capyresume">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          back to the builder
        </Link>
      </Button>

      <header className="mb-12">
        <h1 className="font-display text-display-lg font-light">{title}</h1>
        <p className="mt-4 text-lead-lg text-muted-foreground">{lead}</p>
        <p className="eyebrow-micro mt-6">last updated: {SITE.legalUpdated}</p>
      </header>

      <div className="space-y-12">{children}</div>
    </article>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-title-md font-normal">{heading}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function LegalH3({ children }: { children: ReactNode }) {
  return <h3 className="text-body-md font-semibold text-foreground">{children}</h3>;
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="text-body-md leading-relaxed text-muted-foreground">{children}</p>;
}

export function LegalUL({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-6 text-body-md leading-relaxed text-muted-foreground">
      {children}
    </ul>
  );
}
