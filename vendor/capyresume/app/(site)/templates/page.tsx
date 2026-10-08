import type { Metadata } from 'next';
import Link from 'next/link';

import { TEMPLATE_PAGE_COPY } from '@/lib/capyresume/seo/templates';
import { TEMPLATE_LIST, isPackUnlocked } from '@/lib/capyresume/templates';

export const metadata: Metadata = {
  title: 'Resume templates | CapyResume',
  description:
    'Six single-column resume templates — classic, compact, serif, air, executive and journal — each one free to use and export without a watermark.',
  alternates: { canonical: '/templates' },
};

/** The hub the showcase pages hang off, so no page is reachable only by URL. */
export default function TemplatesIndexPage() {
  const visible = TEMPLATE_LIST.filter((spec) => isPackUnlocked(spec.pack));

  return (
    <section className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="font-display text-3xl font-semibold">Resume templates</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Every template here is a single column of plain text — no tables, no multi-column layouts,
        nothing set into an image. Pick one, write, export. The PDF, DOCX and JSON are yours to keep
        either way.
      </p>

      <ul className="mt-8 space-y-4">
        {visible.map((spec) => {
          const copy = TEMPLATE_PAGE_COPY[spec.id];
          return (
            <li key={spec.id} className="rounded-md border border-border p-4">
              <Link
                href={`/templates/${spec.id}`}
                className="font-display text-lg font-semibold hover:underline"
              >
                {copy.heading}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
            </li>
          );
        })}
      </ul>

      <div className="mt-8">
        <Link
          href="/capyresume"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          open the builder
        </Link>
      </div>
    </section>
  );
}
