import type { ToolGuide } from "@/lib/capytools/guides";
import { cn } from "@/lib/utils";

/**
 * The guide under a tool: how-to steps, what it does, and an FAQ. Server
 * rendered so a crawler reads it without running the widget above. The FAQ is
 * native `<details>` — its answers stay in the HTML whether or not they are
 * open.
 */
export function ToolGuideSection({ guide, width }: { guide: ToolGuide; width: string }) {
  return (
    <section
      aria-labelledby="tool-guide"
      className={cn("mx-auto w-full px-6 pt-4 pb-16 text-left sm:pb-20", width)}
    >
      <p className="lp-label">The guide</p>
      <h2 id="tool-guide" className="lp-display mt-4 text-3xl sm:text-4xl">
        {guide.heading}
      </h2>

      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {guide.steps.map((step, i) => (
          <li key={step} className="rounded-2xl border border-border bg-card p-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Step {i + 1}
            </span>
            <p className="mt-2 text-[15px] leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>

      {/* `grid gap`, not `space-y`: landing.css resets `p` margins at higher
          specificity than Tailwind's :where() spacing, which collapsed it. */}
      <div className="mt-12 grid max-w-2xl gap-4 text-[15px] leading-relaxed text-foreground/85">
        {guide.about.map((para) => (
          <p key={para}>{para}</p>
        ))}
      </div>

      <h3 className="lp-display mt-14 text-2xl">Questions</h3>
      <div className="mt-5 max-w-2xl divide-y divide-border border-y border-border">
        {guide.faq.map(({ q, a }) => (
          <details key={q} className="group py-4">
            <summary className="cursor-pointer list-none font-medium marker:hidden">
              <span className="flex items-baseline justify-between gap-4">
                {q}
                <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-[15px] leading-relaxed text-foreground/85">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
