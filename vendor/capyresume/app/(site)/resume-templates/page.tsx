import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { ROLE_PAGES } from '@/lib/capyresume/seo/roles';

export const metadata: Metadata = {
  title: 'Resume templates by role | CapyResume',
  description:
    'Role-specific resume templates sharing one single-column layout. What changes between them is what the reader looks for first.',
  alternates: { canonical: '/resume-templates' },
};

/**
 * The role index. Without it the twelve role pages would be reachable only from the
 * sitemap — a crawler path, not a navigation one. Every card is generated from the same
 * copy the child page uses, so the two can never disagree.
 */
export default function ResumeTemplatesIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="max-w-3xl font-display text-display-lg font-light">
        Resume templates by role
      </h1>
      <p className="mt-5 max-w-2xl text-lead-lg text-muted-foreground">
        every page below starts from the same single column, built the way parsers read best. what
        changes is what a reader looks for first — a licence for nursing, key stages for teaching, a
        stack for engineering.
      </p>

      <ul className="mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROLE_PAGES.map((page) => (
          <li key={page.slug} className="flex">
            <Card hover className="flex h-full w-full flex-col p-6">
              <CardTitle as="h2">
                <Link href={`/resume-templates/${page.slug}`} className="hover:underline">
                  {page.heading}
                </Link>
              </CardTitle>
              <CardDescription className="mt-3">{page.description}</CardDescription>
            </Card>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href="/capyresume">open the builder</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/ats-resume-format">read the ats format guide</Link>
        </Button>
      </div>
    </div>
  );
}
