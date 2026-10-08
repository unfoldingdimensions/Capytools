import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tool/ToolPageShell";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { COUNTRY_PAGES } from "@/lib/capyresume/seo/countries";

export const metadata: Metadata = {
  title: "Free CV builder, by country | CapyResume",
  description:
    "The same free builder, set up for the country you are applying in: A4 and a CV in the UK, Letter and a resume in the US. No signup, no watermark.",
  alternates: { canonical: "/capyresume/free-cv-builder" },
};

/**
 * The country index: the twelve country pages, each labelled with the paper size its
 * copy actually asserts. Nothing here claims anything about visas, parsing or what any
 * hiring system will do with the document.
 */
export default function FreeCvBuilderIndexPage() {
  return (
    <ToolPageShell
      tool="CapyResume"
      headline={[
        { text: "A free CV builder," },
        { text: "country by country", em: true, dot: true },
      ]}
      lead={
        "the document changes name and paper size depending on where you are applying — a CV on A4 in the UK, a resume on Letter in the US. pick your country and the builder sets the page for you."
      }
      align="left"
    >
      <div className="mx-auto w-full max-w-5xl">
        <ul className="mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COUNTRY_PAGES.map((page) => (
            <li key={page.slug} className="flex">
              <div className="flex h-full w-full flex-col rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary">
                <h2 className="font-display text-lg font-light">
                  <Link
                    href={`/capyresume/free-cv-builder/${page.slug}`}
                    className="hover:underline"
                  >
                    {page.heading}
                  </Link>
                </h2>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">
                  {page.description}
                </p>
                <p className="mt-4">
                  <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[13px] text-muted-foreground">
                    {page.paper === "A4" ? "A4" : "US letter"}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/capyresume">open the builder</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/capyresume/resume-templates">
              browse by role instead
            </Link>
          </Button>
        </div>
      </div>
    </ToolPageShell>
  );
}
