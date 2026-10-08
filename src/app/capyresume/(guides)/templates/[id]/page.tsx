import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tool/ToolPageShell";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlockView, previewPaperStyle } from "@/components/capyresume/BlockView";
import { DEMO_RESUME } from "@/lib/capyresume/demo";
import { composeDocument } from "@/lib/capyresume/document";
import {
  TEMPLATE_PAGE_COPY,
  templatePageTitle,
} from "@/lib/capyresume/seo/templates";
import { getTemplate, isTemplateId } from "@/lib/capyresume/templates";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** One static page per template; anything else is a 404 rather than a render. */
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
  const { id } = await params;
  if (!isTemplateId(id)) return {};
  const copy = TEMPLATE_PAGE_COPY[id];
  return {
    title: templatePageTitle(copy),
    description: copy.description,
    alternates: { canonical: `/capyresume/templates/${id}` },
  };
}

export default async function TemplatePage({ params }: PageProps) {
  const { id } = await params;
  if (!isTemplateId(id)) notFound();

  const copy = TEMPLATE_PAGE_COPY[id];
  const spec = getTemplate(id);
  // The same composer and preview components the editor uses, so the page
  // shows the real template rather than a screenshot that can go stale.
  const blocks = composeDocument(DEMO_RESUME, spec);

  return (
    <ToolPageShell
      tool="CapyResume"
      headline={[{ text: copy.heading, dot: true }]}
      lead={copy.intro}
      align="left"
    >
      <div className="mx-auto w-full max-w-3xl">
        <ul className="mt-6 space-y-2">
          {copy.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2 text-sm">
              <span aria-hidden="true" className="text-muted-foreground">
                ✓
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        {/* Paper: white stock and black ink regardless of the page's theme — this is the
          document as it will be exported, not a themed surface. */}
        <div
          className="mt-10 overflow-hidden rounded-md border border-border bg-white text-black shadow-sm"
          style={previewPaperStyle(spec)}
        >
          <div style={{ padding: "28pt 30pt" }}>
            {blocks.map((block, index) => (
              <BlockView key={index} block={block} spec={spec} />
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          The demo résumé, rendered in {copy.heading.toLowerCase()} — exactly
          what the builder exports.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/capyresume"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Build with this template
          </Link>
          <Link
            href="/capyresume/templates"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            All templates
          </Link>
        </div>
      </div>
    </ToolPageShell>
  );
}
