import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tool/ToolPageShell";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROLE_PAGES } from "@/lib/capyresume/seo/roles";

export const metadata: Metadata = {
  title: "Resume templates by role | CapyResume",
  description:
    "Role-specific resume templates sharing one single-column layout. What changes between them is what the reader looks for first.",
  alternates: { canonical: "/capyresume/resume-templates" },
};

/**
 * The role index. Without it the twelve role pages would be reachable only from the
 * sitemap — a crawler path, not a navigation one. Every card is generated from the same
 * copy the child page uses, so the two can never disagree.
 */
export default function ResumeTemplatesIndexPage() {
  return (
    <ToolPageShell
      tool="CapyResume"
      headline={[
        { text: "Resume templates" },
        { text: "by role", em: true, dot: true },
      ]}
      lead={
        "Every page below starts from the same single column, built the way parsers read best. What changes is what a reader looks for first — a licence for nursing, key stages for teaching, a stack for engineering."
      }
      align="left"
    >
      <div className="mx-auto w-full max-w-5xl">
        <ul className="mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_PAGES.map((page) => (
            <li key={page.slug} className="flex">
              <div className="flex h-full w-full flex-col rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary">
                <h2 className="font-display text-lg font-light">
                  <Link
                    href={`/capyresume/resume-templates/${page.slug}`}
                    className="hover:underline"
                  >
                    {page.heading}
                  </Link>
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {page.description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/capyresume">Open the builder</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/capyresume/ats-resume-format">
              Read the ATS format guide
            </Link>
          </Button>
        </div>
      </div>
    </ToolPageShell>
  );
}
