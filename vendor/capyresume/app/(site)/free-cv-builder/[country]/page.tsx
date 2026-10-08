import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { COUNTRY_PAGES, countryPage } from '@/lib/capyresume/seo/countries';

interface PageProps {
  params: Promise<{ country: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return COUNTRY_PAGES.map((page) => ({ country: page.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params;
  const copy = countryPage(country);
  if (!copy) return {};
  return {
    title: `${copy.heading} | CapyResume`,
    description: copy.description,
    alternates: { canonical: `/free-cv-builder/${country}` },
  };
}

export default async function CountryPage({ params }: PageProps) {
  const { country } = await params;
  const copy = countryPage(country);
  if (!copy) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Free CV builder
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold">{copy.heading}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{copy.intro}</p>

      <ul className="mt-6 space-y-2">
        <li className="flex gap-2 text-sm">
          <span aria-hidden="true" className="text-muted-foreground">
            ✓
          </span>
          <span>
            Page set to <strong className="text-foreground">{copy.paper}</strong> — the paper this
            country prints on (switchable to the other size at any time).
          </span>
        </li>
        <li className="flex gap-2 text-sm">
          <span aria-hidden="true" className="text-muted-foreground">
            ✓
          </span>
          <span>One column, no tables, nothing set into an image.</span>
        </li>
        <li className="flex gap-2 text-sm">
          <span aria-hidden="true" className="text-muted-foreground">
            ✓
          </span>
          <span>PDF, DOCX and JSON export — free, unwatermarked, unlimited.</span>
        </li>
        <li className="flex gap-2 text-sm">
          <span aria-hidden="true" className="text-muted-foreground">
            ✓
          </span>
          <span>No account, no upload: what you type stays in this browser.</span>
        </li>
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/capyresume"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          start writing
        </Link>
        <Link
          href="/templates"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
        >
          All templates
        </Link>
        <Link
          href="/ats-resume-format"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
        >
          How the format works
        </Link>
      </div>
    </article>
  );
}
