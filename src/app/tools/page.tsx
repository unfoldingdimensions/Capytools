import type { Metadata } from "next";

import "@/components/landing/landing.css";
import { AmbientBackground } from "@/components/AmbientBackground";
import { CapyArt } from "@/components/mascot/CapyArt";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { ToolsGrid } from "@/components/tools/ToolsGrid";
import { OG_DEFAULTS } from "@/lib/capytools/og";
import { SUITE, SUITE_WORD, SUITE_WORD_CAP, countByCategory } from "@/lib/capytools/suite";

const title = "All Tools — every Capytools tool on one page";
const description = `All ${SUITE_WORD} Capytools tools, with one line on what each one does and a search that finds the right one. Every browser tool runs in your own tab and keeps nothing.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/tools" },
  openGraph: { ...OG_DEFAULTS, title, description, url: `${OG_DEFAULTS.url}tools` },
  twitter: { card: "summary_large_image", title, description, images: OG_DEFAULTS.images.map((i) => i.url) },
};

/**
 * The index the suite did not have.
 *
 * The landing's Labs catalog is the showcase — plates, filters, an entrance
 * per card. This is the plain list for someone who already knows they want a
 * tool and wants to find it in one look, so it carries no imagery and one
 * search box. Both derive from `SUITE`, so neither can fall behind the other.
 */
export default function ToolsPage() {
  const browser = countByCategory("browser");

  return (
    <div className="lp flex min-h-dvh flex-col text-foreground">
      <a className="lp-skip-link" href="#main">
        Skip to content
      </a>

      <AmbientBackground />
      <Header tool="All Tools" />

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-6 pb-24 pt-16">
        <span className="lp-label">All Tools · The suite</span>
        <h1 className="lp-display mt-6 text-5xl sm:text-6xl">
          Every tool, <em>one page</em>
          <span className="lp-dot">.</span>
        </h1>
        <p className="lp-lead mt-6 max-w-[52ch]">
          {SUITE_WORD_CAP} of them. {browser} run entirely in your browser and
          keep nothing — no signup, no cookies, no server. The one documented
          exception is CapyExpense, which lives on your own disk instead.
        </p>

        <CapyArt pose="awake" className="mt-10 w-24" />

        <div className="lp-divider mt-12" aria-hidden="true" />

        <ToolsGrid />

        <p className="mt-14 text-sm text-muted-foreground">
          {SUITE.length} tools and counting. Release notes for each one live on{" "}
          <a
            href="/notes"
            className="underline decoration-border underline-offset-4 transition-colors hover:text-primary"
          >
            the notes page
          </a>
          .
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
