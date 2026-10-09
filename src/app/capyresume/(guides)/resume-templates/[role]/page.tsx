import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tool/ToolPageShell";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ROLE_TEMPLATE_SUGGESTIONS,
  rolePage,
} from "@/lib/capyresume/seo/roles";
import { TEMPLATE_PAGE_COPY } from "@/lib/capyresume/seo/templates";
import { getTemplate, isTemplateId } from "@/lib/capyresume/templates";

interface PageProps {
  params: Promise<{ role: string }>;
}

/**
 * Rendered on request, not prerendered from a params list. Capytools runs on
 * OpenNext with no incremental cache (open-next.config.ts), and prerendered
 * dynamic-route pages are served from that cache: with dynamicParams = false
 * every one of them answered 404 or 500 on Cloudflare while `next start`
 * served them fine. An unknown slug still 404s through notFound() below.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { role } = await params;
  const copy = rolePage(role);
  if (!copy) return {};
  return {
    title: `${copy.heading} | CapyResume`,
    description: copy.description,
    alternates: { canonical: `/capyresume/resume-templates/${role}` },
  };
}

export default async function RolePage({ params }: PageProps) {
  const { role } = await params;
  const copy = rolePage(role);
  if (!copy) notFound();

  const suggested = (ROLE_TEMPLATE_SUGGESTIONS[copy.slug] ?? []).filter(
    isTemplateId,
  );

  return (
    <ToolPageShell
      tool="CapyResume"
      headline={[{ text: copy.heading, dot: true }]}
      lead={copy.intro}
      align="left"
    >
      <div className="mx-auto w-full max-w-3xl">
        <h2 className="mt-10 font-display text-xl font-light">
          Start from one of these
        </h2>
        <ul className="mt-4 space-y-4">
          {suggested.map((id) => {
            const page = TEMPLATE_PAGE_COPY[id];
            const spec = getTemplate(id);
            return (
              <li key={id} className="rounded-2xl border border-border p-4">
                <Link
                  href={`/capyresume/templates/${id}`}
                  className="font-display text-lg font-light hover:underline"
                >
                  {page.heading}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {spec.fontFamily}, {spec.fontSize}pt,{" "}
                  {spec.headingCase === "upper" ? "capital" : "title-case"}{" "}
                  headings — {page.description}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/capyresume"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Open the builder
          </Link>
          <Link
            href="/capyresume/templates"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            All templates
          </Link>
          <Link
            href="/capyresume/ats-resume-format"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            How the format works
          </Link>
        </div>
      </div>
    </ToolPageShell>
  );
}
