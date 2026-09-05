import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Delta } from "@/lib/capyexpense/compare";
import { formatPct } from "@/lib/capyexpense/format";

/**
 * Shared dashboard furniture.
 *
 * Everything in `src/components/capyexpense/` is pure and prop-fed: no `next/*`,
 * no `@tauri-apps/*`, no storage, no `Date.now()`. These components render in
 * the Next marketing page AND inside the Tauri app's separate Vite bundle, and
 * `tests/capyexpense-boundaries.test.ts` fails the build if that slips.
 */

/** The house numbered stage card, as used by CapyStrip and CapyCreator. */
export function ChartCard({
  index,
  title,
  caption,
  span = 1,
  children,
  details,
}: {
  index: string;
  title: string;
  caption?: string;
  span?: 1 | 2;
  children: ReactNode;
  details?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm",
        span === 2 && "lg:col-span-2",
      )}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {index} · {title}
      </span>
      {caption ? <p className="mt-2 text-sm text-muted-foreground">{caption}</p> : null}
      <div className="mt-5 flex-1">{children}</div>
      {details}
    </section>
  );
}

/**
 * The accessible representation of a chart, and a perfectly good one for
 * everyone else too. A native `<details>` needs no accordion primitive — the
 * repo has none installed, and the platform already does this.
 */
export function ChartDetails({ label, rows }: { label: string; rows: [string, string][] }) {
  if (rows.length === 0) return null;
  return (
    <details className="group mt-4 border-t border-border/70 pt-3">
      <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground">
        {label}
        <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
      </summary>
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
        {rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="truncate text-muted-foreground">{term}</dt>
            <dd className="text-right font-mono tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function EmptyBody({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/30 px-6 py-8 text-center">
      <p className="font-display text-lg font-light text-foreground">{title}</p>
      {body ? <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * Direction, never judgement.
 *
 * Down is sage and up is clay because those are the palette's calm and alert
 * tones — NOT green and red, which the palette does not have and which would
 * congratulate someone for spending less of their own money. The copy says what
 * moved and lets the reader decide whether that was good.
 */
export function DeltaPill({ delta, locale }: { delta: Delta; locale?: string }) {
  if (delta.direction === "unknown") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {delta.previous === null ? "No earlier period" : "No spend last period"}
      </span>
    );
  }

  const arrow = delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→";
  const tone =
    delta.direction === "up"
      ? "text-[var(--clay)]"
      : delta.direction === "down"
        ? "text-[var(--sage-deep)]"
        : "text-muted-foreground";

  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <span className={cn("font-mono text-[11px] tabular-nums", tone)}>
        {arrow} {delta.direction === "flat" ? "About the same" : formatPct(delta.ratio, locale)}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">{delta.label}</span>
    </span>
  );
}

export function StatTile({
  index,
  label,
  value,
  sub,
  delta,
  locale,
}: {
  index: string;
  label: string;
  value: string;
  sub?: string;
  delta?: Delta;
  locale?: string;
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-sm">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {index} · {label}
      </span>
      <p className="mt-3 font-display text-3xl font-light leading-none tracking-tight text-foreground">
        {value}
      </p>
      {sub ? <p className="mt-2 text-xs text-muted-foreground">{sub}</p> : null}
      {delta ? (
        <div className="mt-2.5">
          <DeltaPill delta={delta} locale={locale} />
        </div>
      ) : null}
    </div>
  );
}
