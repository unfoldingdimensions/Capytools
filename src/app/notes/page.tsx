import type { Metadata } from "next";
import "@/components/landing/landing.css";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { EXTERNAL } from "@/lib/capytools/landing";
import { TransitionLink } from "@/components/TransitionLink";

export const metadata: Metadata = {
  title: "Notes — Capytools",
  description:
    "Project notes for Capytools: the suite, the house rules, how to report an issue, and the colophon.",
};

const TOOLS = [
  { no: "Nº 01", name: "CapyWrapped", href: "/capywrapped", line: "Your GitHub year in a calm little card." },
  { no: "Nº 02", name: "CapyImagine", href: "/capyimagine", line: "Random image and video prompts, in your engine's dialect." },
  { no: "Nº 03", name: "CapyCreator", href: "/capycreator", line: "Model-aware prompt engineering, flash to frontier." },
  { no: "Nº 04", name: "CapyStrip", href: "/capystrip", line: "Photos talk; this helps them forget." },
  { no: "Nº 05", name: "CapyExpense", href: "/capyexpense", line: "The desktop one — writes only to your own disk." },
];

const RULES = [
  { num: "01", title: "Arrive", copy: "No account, no cookie banner, no onboarding tour." },
  { num: "02", title: "Compute", copy: "Every byte is processed in your browser." },
  { num: "03", title: "Forget", copy: "The suite forgets you the moment the tab closes." },
  { num: "04", title: "Keep", copy: "Download the file. Desktop tools keep it on your disk." },
];

export default function NotesPage() {
  return (
    <div className="lp flex min-h-dvh flex-col text-foreground">
      <AmbientBackground />
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-16">
        <span className="lp-label">Notes · The project</span>
        <h1 className="lp-display mt-6 text-5xl sm:text-6xl">
          A home for <em>small, quiet tools</em>
          <span className="lp-dot">.</span>
        </h1>
        <p className="lp-lead mt-6 max-w-[42ch]">
          Five of them so far. All run in your browser and keep nothing — the
          one documented exception is CapyExpense, which lives on your disk
          instead.
        </p>

        <div className="lp-divider mt-14" aria-hidden="true" />

        <section className="mt-12">
          <span className="lp-label">The suite</span>
          <ul className="mt-6 divide-y divide-border">
            {TOOLS.map((tool) => (
              <li key={tool.name}>
                <TransitionLink
                  href={tool.href}
                  className="flex items-baseline gap-4 py-4 transition-colors hover:text-primary"
                >
                  <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                    {tool.no}
                  </span>
                  <span className="font-display text-xl font-normal">{tool.name}</span>
                  <span className="ml-auto hidden text-right text-sm text-muted-foreground sm:block">
                    {tool.line}
                  </span>
                </TransitionLink>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <span className="lp-label">House rules</span>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {RULES.map((rule) => (
              <div key={rule.num} className="lp-card">
                <div className="lp-card-num">
                  {rule.num}
                  <span className="lp-card-tag">{rule.title}</span>
                </div>
                <p>{rule.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12" id="issues">
          <span className="lp-label">Found a bug?</span>
          <h2 className="font-display mt-4 text-3xl font-light">
            Open an issue <em>— quietly</em>
            <span className="lp-dot">.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Capytools is open source (Apache-2.0). If something breaks, the fastest
            fix is an issue with the tool name and what you expected:{" "}
            <a
              href={EXTERNAL.issues}
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-border underline-offset-4 transition-colors hover:text-primary"
            >
              github.com/unfoldingdimensions/Capytools/issues
            </a>
            . The repo lives at{" "}
            <a
              href={EXTERNAL.repo}
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-border underline-offset-4 transition-colors hover:text-primary"
            >
              github.com/unfoldingdimensions/Capytools
            </a>
            .
          </p>
        </section>

        <section className="mt-12">
          <span className="lp-label">Colophon</span>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Built as a Next.js app, deployed on Vercel, Apache-2.0-licensed, version
            0.1.0. Set in Fraunces, Plus Jakarta Sans and Albert Sans. The
            editorial collage plates were generated from{" "}
            <TransitionLink href="/design" className="underline decoration-border underline-offset-4">
              the design notes
            </TransitionLink>
            .
          </p>
        </section>

        <div className="lp-divider mt-14" aria-hidden="true" />

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
          <TransitionLink href="/" className="lp-read-more">
            ← Back to the landing
          </TransitionLink>
          <TransitionLink href="/design" className="lp-read-more">
            Design notes
          </TransitionLink>
          <TransitionLink href="/license" className="lp-read-more">
            Apache License
          </TransitionLink>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
