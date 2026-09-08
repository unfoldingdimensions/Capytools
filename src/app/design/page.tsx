import type { Metadata } from "next";
import "@/components/landing/landing.css";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { TransitionLink } from "@/components/TransitionLink";

export const metadata: Metadata = {
  title: "Design notes — Capytools",
  description:
    "The Capytools design system: warm-minimal, sage-forward, quiet by default. Color, typography, motion, and the house rules.",
};

const COLORS = [
  { name: "Cream", hex: "#f9f9f7", role: "canvas", css: "var(--background)" },
  { name: "Ink", hex: "#1a1a1a", role: "type", css: "var(--foreground)" },
  { name: "Sage", hex: "#8e9b7e", role: "primary", css: "var(--primary)" },
  { name: "Water", hex: "#5f7a72", role: "data signal", css: "var(--water)" },
  { name: "Clay", hex: "#c07952", role: "celebration", css: "var(--clay)" },
  { name: "Gold", hex: "#d9a441", role: "milestones", css: "var(--gold)" },
];

const VOICES = [
  {
    name: "Fraunces",
    role: "Display",
    note: "Serif, light, for titles only — italic <em> carries the emphasis word.",
    className: "font-display font-light text-4xl",
  },
  {
    name: "Plus Jakarta Sans",
    role: "UI",
    note: "All interface text at weight 500 — it runs lighter than Inter at the same weight.",
    className: "font-sans font-medium text-xl",
  },
  {
    name: "Albert Sans",
    role: "Labels",
    note: "Eyebrows, tags and code, uppercase with 0.24em tracking. The quiet technician.",
    className: "font-mono text-sm uppercase tracking-[0.24em]",
  },
];

export default function DesignNotesPage() {
  return (
    // No `bg-background`: the body paints the canvas over the fixed ambient layer.
    <div className="lp flex min-h-dvh flex-col text-foreground">
      <AmbientBackground />
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-16">
        <span className="lp-label">Design notes · Colophon</span>
        <h1 className="lp-display mt-6 text-5xl sm:text-6xl">
          Calm, <em>by design</em>
          <span className="lp-dot">.</span>
        </h1>
        <p className="lp-lead mt-6 max-w-[42ch]">
          Everything on this site is drawn from one small token sheet. These
          notes are the same spec the code reads — kept honest by living next
          to it.
        </p>

        <div className="lp-divider mt-14" aria-hidden="true" />

        <section className="mt-12">
          <span className="lp-label">Foundations</span>
          <h2 className="font-display mt-4 text-3xl font-light">
            The architecture is the privacy policy.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Browser tools execute 100% in your tab and store nothing. The one
            documented exception is CapyExpense, a desktop app that writes only
            to your own disk. No signup, no cookies, no telemetry, no server —
            the constraints are the aesthetic.
          </p>
        </section>

        <section className="mt-12">
          <span className="lp-label">Color</span>
          <h2 className="font-display mt-4 text-3xl font-light">
            Sage does the work; clay and gold celebrate.
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {COLORS.map((color) => (
              <div key={color.name} className="flex items-center gap-3">
                <span
                  className="inline-block size-10 shrink-0 rounded-full border border-border"
                  style={{ background: color.css }}
                  aria-hidden="true"
                />
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{color.name}</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {color.hex} · {color.role}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">
            Dark ink sits on sage, never white. Clay appears once per view, at
            most; if everything is gold, nothing is.
          </p>
        </section>

        <section className="mt-12">
          <span className="lp-label">Typography</span>
          <h2 className="font-display mt-4 text-3xl font-light">
            Three voices, never a fourth.
          </h2>
          <div className="mt-8 space-y-8">
            {VOICES.map((voice) => (
              <div key={voice.name}>
                <span className={voice.className}>{voice.name}</span>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  <b className="font-semibold text-foreground">{voice.role}.</b>{" "}
                  {voice.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <span className="lp-label">Motion</span>
          <h2 className="font-display mt-4 text-3xl font-light">
            Slow, deliberate, never snappy.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Entrances settle with an expo-out curve — 600ms panels, 900ms hero
            reveals, 350ms hovers, 100ms stagger gaps. Ambient washes drift on
            infinite alternating loops, out of phase. Every motion dies under{" "}
            <code className="lp-code-inline">prefers-reduced-motion</code>.
          </p>
        </section>

        <div className="lp-divider mt-14" aria-hidden="true" />

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
          <TransitionLink href="/" className="lp-read-more">
            ← Back to the landing
          </TransitionLink>
          <TransitionLink href="/license" className="lp-read-more">
            MIT License
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
