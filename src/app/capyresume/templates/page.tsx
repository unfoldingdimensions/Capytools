import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tool/ToolPageShell";
import Link from "next/link";

import { TEMPLATE_PAGE_COPY } from "@/lib/capyresume/seo/templates";
import { TEMPLATE_LIST, isPackUnlocked } from "@/lib/capyresume/templates";

export const metadata: Metadata = {
  title: "Resume templates | CapyResume",
  description:
    "Six single-column resume templates — classic, compact, serif, air, executive and journal — each one free to use and export without a watermark.",
  alternates: { canonical: "/capyresume/templates" },
};

/** The hub the showcase pages hang off, so no page is reachable only by URL. */
export default function TemplatesIndexPage() {
  const visible = TEMPLATE_LIST.filter((spec) => isPackUnlocked(spec.pack));

  return (
    <ToolPageShell
      tool="CapyResume"
      headline={[
        { text: "Resume" },
        { text: "templates", em: true, dot: true },
      ]}
      lead={
        "Every template here is a single column of plain text — no tables, no multi-column layouts, nothing set into an image. Pick one, write, export. The PDF, DOCX and JSON are yours to keep either way."
      }
      align="left"
    >
      <div className="mx-auto w-full max-w-3xl">
        <ul className="mt-8 space-y-4">
          {visible.map((spec) => {
            const copy = TEMPLATE_PAGE_COPY[spec.id];
            return (
              <li
                key={spec.id}
                className="rounded-2xl border border-border p-4"
              >
                <Link
                  href={`/capyresume/templates/${spec.id}`}
                  className="font-display text-lg font-light hover:underline"
                >
                  {copy.heading}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {copy.description}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-8">
          <Link
            href="/capyresume"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            open the builder
          </Link>
        </div>
      </div>
    </ToolPageShell>
  );
}
