import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tool/ToolPageShell";
import Link from "next/link";
import { notFound } from "next/navigation";

import { countryPage } from "@/lib/capyresume/seo/countries";

interface PageProps {
  params: Promise<{ country: string }>;
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
  const { country } = await params;
  const copy = countryPage(country);
  if (!copy) return {};
  return {
    title: `${copy.heading} | CapyResume`,
    description: copy.description,
    alternates: { canonical: `/capyresume/free-cv-builder/${country}` },
  };
}

export default async function CountryPage({ params }: PageProps) {
  const { country } = await params;
  const copy = countryPage(country);
  if (!copy) notFound();

  return (
    <ToolPageShell
      tool="CapyResume"
      headline={[{ text: copy.heading, dot: true }]}
      lead={copy.intro}
      align="left"
    >
      <div className="mx-auto w-full max-w-3xl">
        <ul className="mt-6 space-y-2">
          <li className="flex gap-2 text-sm">
            <span aria-hidden="true" className="text-muted-foreground">
              ✓
            </span>
            <span>
              Page set to{" "}
              <strong className="text-foreground">{copy.paper}</strong> — the
              paper this country prints on (switchable to the other size at any
              time).
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
            <span>
              PDF, DOCX and JSON export — free, unwatermarked, unlimited.
            </span>
          </li>
          <li className="flex gap-2 text-sm">
            <span aria-hidden="true" className="text-muted-foreground">
              ✓
            </span>
            <span>
              No account, no upload: what you type stays in this browser.
            </span>
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/capyresume"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Start writing
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
