import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ROLE_TEMPLATE_SUGGESTIONS, ROLE_PAGES, rolePage } from '@/lib/capyresume/seo/roles';
import { TEMPLATE_PAGE_COPY } from '@/lib/capyresume/seo/templates';
import { getTemplate, isTemplateId } from '@/lib/capyresume/templates';

interface PageProps {
  params: Promise<{ role: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return ROLE_PAGES.map((page) => ({ role: page.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { role } = await params;
  const copy = rolePage(role);
  if (!copy) return {};
  return {
    title: `${copy.heading} | CapyResume`,
    description: copy.description,
    alternates: { canonical: `/resume-templates/${role}` },
  };
}

export default async function RolePage({ params }: PageProps) {
  const { role } = await params;
  const copy = rolePage(role);
  if (!copy) notFound();

  const suggested = (ROLE_TEMPLATE_SUGGESTIONS[copy.slug] ?? []).filter(isTemplateId);

  return (
    <article className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Resume template for your role
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold">{copy.heading}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{copy.intro}</p>

      <h2 className="mt-10 font-display text-xl font-semibold">Start from one of these</h2>
      <ul className="mt-4 space-y-4">
        {suggested.map((id) => {
          const page = TEMPLATE_PAGE_COPY[id];
          const spec = getTemplate(id);
          return (
            <li key={id} className="rounded-md border border-border p-4">
              <Link
                href={`/templates/${id}`}
                className="font-display text-lg font-semibold hover:underline"
              >
                {page.heading}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {spec.fontFamily}, {spec.fontSize}pt,{' '}
                {spec.headingCase === 'upper' ? 'capital' : 'title-case'} headings —{' '}
                {page.description}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/capyresume"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Open the builder
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
