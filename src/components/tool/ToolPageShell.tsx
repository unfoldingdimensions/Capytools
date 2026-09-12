import Link from "next/link";
import { Fragment } from "react";

import { AmbientBackground } from "@/components/AmbientBackground";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";
import { cn } from "@/lib/utils";
// The whole editorial stylesheet, on every tool page — deliberately. Turbopack
// emits it into the same shared CSS chunk the landing already loads (~5KB
// gzipped of it), so a visitor arriving from the landing pays nothing, and
// splitting it per route would trade that cache hit for a second request.
import "@/components/landing/landing.css";

/**
 * The editorial chrome every tool page shares, in the landing's voice: a
 * hairline eyebrow, a display headline whose terminal period is the landing's
 * clay dot, a lead line, the stage itself, and a sign-off.
 *
 * The page runs the LANDING'S SURFACE ARC, not a flat sheet: the hero sits on
 * the cream canvas, the stage sits on a white band with hairline rules, and the
 * sign-off sits on the sage accent. That is the landing's cream → white band →
 * cream → ink slab → sage band rhythm, cut down to the three surfaces a tool
 * page has room for. Before this, all five tools were one uninterrupted cream
 * field from masthead to footer, so the only thing distinguishing them was the
 * widget in the middle.
 *
 * The tool itself is the single screen inside that band — pages may extend as
 * results render, but nothing editorial is added around them.
 */
export function ToolPageShell({
  tool,
  eyebrow,
  index,
  headline,
  lead,
  align = "center",
  large = false,
  entrance = true,
  children,
}: {
  /** Passed to the shared Header to highlight the nav pill. */
  tool: string;
  /** The AGENTS.md eyebrow contract: `Capy<Name> · tool no. X`. */
  eyebrow: string;
  /** Sign-off index meta, e.g. "Nº 01 / 05". */
  index: string;
  /**
   * Headline lines; `em` renders the italic emphasis line, `dot` swaps that
   * line's terminal period for the landing's clay `.lp-dot`.
   */
  headline: { text: string; em?: boolean; dot?: boolean }[];
  lead: string;
  /** Tool surface alignment: the four browser tools sit left, expense centers. */
  align?: "center" | "left";
  /** CapyExpense's oversized stacked display. */
  large?: boolean;
  /** Mount entrance on the tool surface; expense's chart entrance draws itself. */
  entrance?: boolean;
  children: React.ReactNode;
}) {
  const width = large ? "max-w-5xl" : "max-w-4xl";

  return (
    // No `bg-background` here on purpose: body already paints it, and an opaque
    // wrapper would cover the fixed ambient layer sitting at -z-10. `.lp`
    // activates the landing stylesheet's custom properties.
    <div className="lp flex min-h-dvh flex-col text-foreground">
      {/* The landing has always offered this; the tool pages put a six-item nav
          in front of the content and offered no way past it. */}
      <a className="lp-skip-link" href="#main">
        Skip to content
      </a>

      <AmbientBackground />
      <Header tool={tool} />

      <main id="main" className="flex w-full flex-1 flex-col">
        {/* Cover plate — the cream canvas, as the landing's hero has it. */}
        <section
          className={cn(
            "mx-auto flex w-full flex-col items-center px-6 text-center",
            width,
            large ? "pt-8 sm:pt-14" : "pt-5 sm:pt-8",
          )}
        >
          <Reveal>
            <p className="lp-label">{eyebrow}</p>
          </Reveal>

          <h1
            className={cn(
              "lp-display mt-6",
              large ? "lp-tool-display-lg" : "text-5xl sm:text-6xl",
            )}
          >
            {headline.map((segment, i) => (
              <Fragment key={segment.text}>
                {i > 0 && <br />}
                {segment.em ? (
                  <em>
                    <TextReveal text={segment.text} delay={i === 0 ? 0.1 : 0.32} />
                  </em>
                ) : (
                  <TextReveal text={segment.text} delay={i === 0 ? 0.1 : 0.32} />
                )}
                {segment.dot ? <span className="lp-dot">.</span> : null}
              </Fragment>
            ))}
          </h1>

          <Reveal delay={0.2}>
            <p className={cn("lp-lead mt-5 text-center", large && "lp-lead-lg")}>{lead}</p>
          </Reveal>
        </section>

        {/* The stage, on the band. */}
        <div className="lp-tool-band mt-9">
          <div className={cn("mx-auto w-full px-6 py-10 sm:py-14", width)}>
            {entrance ? (
              <Reveal delay={0.3} className={cn("w-full", align === "left" && "text-left")}>
                {children}
              </Reveal>
            ) : (
              // Expense's own entrance is the chart drawing itself; no container fade.
              <div className={cn("w-full", align === "left" && "text-left")}>{children}</div>
            )}
          </div>
        </div>

        {/* The closing accent, and where the sign-off lives. */}
        <div className="lp-tool-signoff">
          <div className={cn("lp-tool-foot mx-auto w-full px-6", width)}>
            <Link href="/" className="lp-read-more">
              ← back to the suite
            </Link>
            <span className="lp-tool-foot-ix">{index}</span>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
