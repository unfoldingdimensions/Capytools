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
 * clay dot, a lead line, and a sign-off row ("back to the suite" + index).
 *
 * The tool itself mounts as the single screen below the header block — pages
 * may extend as results render, but nothing editorial is added around them.
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
  return (
    // No `bg-background` here on purpose: body already paints it, and an opaque
    // wrapper would cover the fixed ambient layer sitting at -z-10. `.lp`
    // activates the landing stylesheet's custom properties.
    <div className="lp flex min-h-dvh flex-col text-foreground">
      <AmbientBackground />
      <Header tool={tool} />

      <main
        className={cn(
          "mx-auto flex w-full flex-1 flex-col items-center px-6 pb-20",
          large ? "max-w-5xl" : "max-w-4xl",
        )}
      >
        <section
          className={cn(
            "flex w-full flex-col items-center text-center",
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

        {entrance ? (
          <Reveal delay={0.3} className={cn("mt-9 w-full", align === "left" && "text-left")}>
            {children}
          </Reveal>
        ) : (
          // Expense's own entrance is the chart drawing itself; no container fade.
          <div className={cn("mt-9 w-full", align === "left" && "text-left")}>{children}</div>
        )}

        <div className="lp-tool-foot w-full">
          <Link href="/" className="lp-read-more">
            ← back to the suite
          </Link>
          <span className="lp-tool-foot-ix">{index}</span>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
