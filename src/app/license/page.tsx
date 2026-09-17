import type { Metadata } from "next";
import "@/components/landing/landing.css";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { TransitionLink } from "@/components/TransitionLink";
import { LICENSE_TEXT } from "@/lib/capytools/license-text";

export const metadata: Metadata = {
  title: "Apache License 2.0 — Capytools",
  description:
    "Capytools is Apache-2.0 licensed. Use it, fork it, ship it — just keep the notice.",
};

/**
 * One canonical text, no drift — but generated at build time rather than read
 * at runtime. `readFileSync(process.cwd() + "/LICENSE")` at module scope is
 * evaluated when the worker imports this route, and Workers has no
 * filesystem: the page 500d with ENOENT /bundle/LICENSE. scripts/
 * generate-license-text.mjs runs on `prebuild` and emits the module below
 * straight from the repo's LICENSE.
 */

export default function LicensePage() {
  return (
    <div className="lp flex min-h-dvh flex-col text-foreground">
      <a className="lp-skip-link" href="#main">
        Skip to content
      </a>

      <AmbientBackground />
      <Header />

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-16">
        <span className="lp-label">License · Apache 2.0</span>
        <h1 className="lp-display mt-6 text-5xl sm:text-6xl">
          Free as in <em>calm</em>
          <span className="lp-dot">.</span>
        </h1>
        <p className="lp-lead mt-6 max-w-[42ch]">
          Capytools is Apache-2.0 licensed. Use it, fork it, ship it — just
          keep the notice. The full text, for the lawyers:
        </p>

        <div className="lp-divider mt-14" aria-hidden="true" />

        <div className="lp-card mt-10 whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
          {LICENSE_TEXT}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3">
          <TransitionLink href="/" className="lp-read-more">
            ← Back to the landing
          </TransitionLink>
          <TransitionLink href="/design" className="lp-read-more">
            Design notes
          </TransitionLink>
          <TransitionLink href="/notes" className="lp-read-more">
            Project notes
          </TransitionLink>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
