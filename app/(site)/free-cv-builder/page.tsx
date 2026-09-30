import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { COUNTRY_PAGES } from '@/lib/capyresume/seo/countries';

export const metadata: Metadata = {
  title: 'Free CV builder, by country | CapyResume',
  description:
    'The same free builder, set up for the country you are applying in: A4 and a CV in the UK, Letter and a resume in the US. No signup, no watermark.',
  alternates: { canonical: '/free-cv-builder' },
};

/**
 * The country index: the twelve country pages, each labelled with the paper size its
 * copy actually asserts. Nothing here claims anything about visas, parsing or what any
 * hiring system will do with the document.
 */
export default function FreeCvBuilderIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="max-w-3xl font-display text-display-lg font-light">
        A free CV builder, country by country
      </h1>
      <p className="mt-5 max-w-2xl text-lead-lg text-muted-foreground">
        the document changes name and paper size depending on where you are applying — a CV on A4 in
        the UK, a resume on Letter in the US. pick your country and the builder sets the page for
        you.
      </p>

      <ul className="mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COUNTRY_PAGES.map((page) => (
          <li key={page.slug} className="flex">
            <Card hover className="flex h-full w-full flex-col p-6">
              <CardTitle as="h2">
                <Link href={`/free-cv-builder/${page.slug}`} className="hover:underline">
                  {page.heading}
                </Link>
              </CardTitle>
              <CardDescription className="mt-3 flex-1">{page.description}</CardDescription>
              <p className="mt-4">
                <Badge variant="outline">{page.paper === 'A4' ? 'A4' : 'US letter'}</Badge>
              </p>
            </Card>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href="/capyresume">open the builder</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/resume-templates">browse by role instead</Link>
        </Button>
      </div>
    </div>
  );
}
