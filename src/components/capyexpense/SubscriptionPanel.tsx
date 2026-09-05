import type { SubscriptionSummary } from "@/lib/capyexpense/aggregate";
import { formatDay, formatMoney } from "@/lib/capyexpense/format";
import { addDays } from "@/lib/capyexpense/dates";
import type { IsoDate } from "@/lib/capyexpense/types";
import { EmptyBody } from "./primitives";

/**
 * What you are committed to, and what renews next.
 *
 * No `<svg>` here on purpose: ranked rows with a percentage-width fill are one
 * line of CSS and do the job an SVG would do worse, with real text that selects,
 * wraps and reads out.
 */

/** A single line above this share of the total is the one worth a second look. */
const SCRUTINY_SHARE = 0.15;
const RENEWAL_WINDOW_DAYS = 60;
const SOON_DAYS = 7;

export function SubscriptionPanel({
  subs,
  now,
  currency,
  locale,
}: {
  subs: SubscriptionSummary;
  now: IsoDate;
  currency: string;
  locale?: string;
}) {
  const live = subs.lines.filter((l) => l.active);

  if (live.length === 0) {
    return (
      <EmptyBody
        title="Nothing marked as a subscription yet."
        body="Put “subscription” in the Type column and a cadence in Repeats, and this fills in."
      />
    );
  }

  const maxAnnual = Math.max(...live.map((l) => l.annualised));
  const horizon = addDays(now, RENEWAL_WINDOW_DAYS);
  const soon = addDays(now, SOON_DAYS);
  const upcoming = live
    .filter((l) => l.nextDue <= horizon)
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <p className="font-display text-4xl font-light leading-none tracking-tight text-foreground">
          {formatMoney(subs.annualCommitment, currency, locale)} a year
        </p>
        <p className="mt-2 font-mono text-xs tabular-nums text-muted-foreground">
          {formatMoney(subs.monthlyCommitment, currency, locale)} a month · {subs.activeCount} live
        </p>
        {/* An analyst will interrogate this number. Hand them the arithmetic
            before they have to ask for it. */}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Weekly ×52 · monthly ×12 · quarterly ×4. A run-rate, not what you have actually paid.
        </p>

        <dl className="mt-5 space-y-3">
          {live.map((l) => {
            const heavy = subs.annualCommitment > 0 && l.annualised / subs.annualCommitment > SCRUTINY_SHARE;
            return (
              <div key={l.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="truncate text-sm text-foreground">{l.label}</dt>
                  <dd className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatMoney(l.annualised, currency, locale)}
                  </dd>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, (l.annualised / maxAnnual) * 100)}%`,
                      backgroundColor: heavy ? "var(--clay)" : "var(--water)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </dl>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Next 60 days
        </p>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing due before {formatDay(horizon)}.
          </p>
        ) : (
          <ol className="mt-4 space-y-2.5">
            {upcoming.map((l) => (
              <li
                key={l.key}
                className={
                  l.nextDue <= soon
                    ? "flex items-baseline gap-3 border-l-2 border-[var(--clay)] pl-3"
                    : "flex items-baseline gap-3 border-l-2 border-transparent pl-3"
                }
              >
                <span className="w-[5.5ch] shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {formatDay(l.nextDue)}
                </span>
                <span className="flex-1 truncate text-sm text-foreground">{l.label}</span>
                <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  {l.interval}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-foreground">
                  {formatMoney(l.amount, currency, locale)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
