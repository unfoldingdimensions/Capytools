"use client";

/**
 * Check mode — WCAG 2.x and APCA 0.1.9 on any two colours, side by side.
 *
 * The labelling is binding (DESIGN.md Register + plan §7): WCAG is "the
 * conformance standard"; APCA is guidance, "a candidate, not a standard".
 * Nothing here claims the tool itself is compliant — verdicts belong to a
 * pair, never to this page.
 */

import { useCallback, useMemo, useState } from "react";

import { StageCard } from "@/components/stage-card";
import { checkPair, type CheckResult } from "@/lib/capytone/check";
import type { MoodPalette } from "@/lib/capytone/types";

import { ColorPick, Pill, labelClass } from "./controls";

const ROLES = ["ink", "bg", "mid", "accent", "surface"] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABELS: Record<Role, string> = {
  ink: "ink",
  bg: "field",
  mid: "mid",
  accent: "accent",
  surface: "surface",
};

/** 21 → "21:1"; anything else keeps two decimals. */
function formatRatio(ratio: number): string {
  return `${Number.isInteger(ratio) ? ratio : ratio.toFixed(2)}:1`;
}

const APCA_BAND_LABELS: Record<CheckResult["apcaBand"], string> = {
  "preferred-body": "preferred body text (75+)",
  "body-min": "body text minimum (60+)",
  large: "large text minimum (45+)",
  "text-min": "any text minimum (30+)",
  "non-text": "non-text only (15+)",
  none: "below the guidance floor",
};

function Verdict({ label, pass }: { label: string; pass: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${
          pass
            ? "border-primary/30 bg-primary/10 text-foreground"
            : "border-[var(--clay)]/30 bg-[var(--clay)]/10 text-[var(--clay)]"
        }`}
      >
        {pass ? "pass" : "fail"}
      </span>
    </li>
  );
}

/** A palette role, as a swatch button that loads into one slot. */
function RoleSwatch({
  palette,
  role,
  onLoad,
}: {
  palette: MoodPalette;
  role: Role;
  onLoad: (hex: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onLoad(palette[role])}
      aria-label={`Load the card's ${ROLE_LABELS[role]} colour (${palette[role]})`}
      className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
    >
      <span
        aria-hidden
        className="size-3 rounded-full border border-border"
        style={{ backgroundColor: palette[role] }}
      />
      {ROLE_LABELS[role]}
    </button>
  );
}

export function CheckMode({ palette }: { palette: MoodPalette | null }) {
  // Mounted only after a mode switch (client-only), so seeding the pair
  // from the current card is a plain initialiser — no hydration concerns.
  const [fg, setFg] = useState(palette?.ink ?? "#1a1a1a");
  const [bg, setBg] = useState(palette?.bg ?? "#f9f9f7");

  const result = useMemo(() => checkPair(fg, bg), [fg, bg]);
  const swap = useCallback(() => {
    setFg(bg);
    setBg(fg);
  }, [fg, bg]);

  return (
    <>
      <StageCard index="01" title="The pair">
        <p className="mt-4 text-sm text-muted-foreground">
          any two colours — the card’s own roles are one tap away. the ratio
          says what the standard asks for; the lc value says what eyes tend
          to need. they disagree sometimes; that is the point of showing both.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <ColorPick id="capytone-check-fg" label="text colour" value={fg} onChange={setFg} />
          <ColorPick id="capytone-check-bg" label="background" value={bg} onChange={setBg} />
          <div className="flex flex-wrap items-center gap-3">
            <Pill active={false} onClick={swap} label="Swap text and background">
              swap ⇅
            </Pill>
            {palette ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className={labelClass}>from the card</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {ROLES.map((role) => (
                    <RoleSwatch key={role} palette={palette} role={role} onLoad={setFg} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </StageCard>

      <StageCard index="02" title="The verdicts">
        {result ? (
          <div className="mt-1 grid gap-4 sm:grid-cols-2">
            {/* WCAG 2.x — the conformance standard. */}
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className={labelClass}>wcag 2.x — the conformance standard</p>
              <p className="mt-3 font-display text-4xl font-light tabular-nums">
                {formatRatio(result.wcagRatio)}
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                <Verdict label="AA · normal text (4.5:1)" pass={result.wcag.aaNormal} />
                <Verdict label="AA · large text (3:1)" pass={result.wcag.aaLarge} />
                <Verdict label="AAA · normal text (7:1)" pass={result.wcag.aaaNormal} />
                <Verdict label="AAA · large text (4.5:1)" pass={result.wcag.aaaLarge} />
              </ul>
            </div>

            {/* APCA — guidance, a candidate, not a standard. */}
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className={labelClass}>apca 0.1.9 lc — guidance — candidate, not a standard</p>
              <p className="mt-3 font-display text-4xl font-light tabular-nums">
                Lc {result.apcaLc < 0 ? "−" : ""}
                {Math.abs(result.apcaLc).toFixed(1)}
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">{APCA_BAND_LABELS[result.apcaBand]}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {result.apcaLc < 0
                  ? "negative — light text on a dark ground."
                  : "positive — dark text on a light ground."}{" "}
                polarity matters: swapping the pair changes the number, honestly.
              </p>
            </div>

            {/* The pair, worn. Large text on the second line — the size
                the WCAG large-text threshold begins at. */}
            <div className="rounded-2xl border border-border/70 p-4 sm:col-span-2" style={{ backgroundColor: bg }}>
              <p className="text-base" style={{ color: fg }}>
                the rain kept the evening soft.
              </p>
              <p className="mt-1 text-2xl font-semibold" style={{ color: fg }}>
                the rain kept the evening soft.
              </p>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            one of those colours won’t parse — fix it above and the verdicts return.
          </p>
        )}
      </StageCard>
    </>
  );
}
