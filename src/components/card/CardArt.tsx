import { formatNumber } from "@/lib/capytools/demo";
import { activityMonthTicks, capyMarkDataUri, sparklineDataUri } from "@/lib/capytools/sparkline";
import type { ReactNode } from "react";
import type { LanguageShare, WrappedStats } from "@/lib/github/types";

export type CardVariant = "light" | "dark";
export type CardFormat = "wide" | "square";

const PALETTE: Record<CardVariant, Record<string, string>> = {
  light: {
    bg: "#ffffff",
    ink: "#1a1a1a",
    muted: "#6f6c66",
    softMuted: "#8a877f",
    border: "#e7e4dd",
    water: "#5f7a72",
    clay: "#c07952",
    bar: "#7a8e6e",
    track: "rgba(26,26,26,0.05)",
    mark: "rgba(26,26,26,0.45)",
  },
  dark: {
    bg: "#1e1e1e",
    ink: "#e8e6e2",
    muted: "#a09e98",
    softMuted: "#8d8a83",
    border: "#2e2d2a",
    water: "#7fa9a3",
    clay: "#d68f66",
    bar: "#9aab8d",
    track: "rgba(255,255,255,0.06)",
    mark: "rgba(232,230,226,0.5)",
  },
};

export const CARD_WIDE: Record<CardFormat, { width: number; height: number }> = {
  wide: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
};

/** Public accessor so dependent components (e.g. the live sparkline) can read a variant's palette. */
export function cardPalette(variant: CardVariant): Record<string, string> {
  return PALETTE[variant];
}

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Plus Jakarta Sans', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";

function StatCell({
  c,
  label,
  value,
  square,
}: {
  c: Record<string, string>;
  label: string;
  value: string;
  square: boolean;
}) {
  return (
    <div
      style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }} // Satori: element child
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 500,
          fontSize: square ? 42 : 34,
          lineHeight: 1,
          color: c.ink,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: square ? 10 : 6,
          fontSize: square ? 14 : 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: c.muted,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/**
 * The Cappy Wrapped card — canonical, runtime-agnostic source of truth.
 * Uses ONLY inline styles + data-URI <img> SVGs so the on-page preview, the
 * PNG export (html-to-image) and the dynamic OG image (Satori) all render
 * pixel-identically. Layout is tuned so the wide 1200×630 canvas fully
 * contains every section (no bottom clipping).
 */
export function CardArt({
  stats,
  variant = "light",
  format = "wide",
  sparkline,
}: {
  stats: WrappedStats;
  variant?: CardVariant;
  format?: CardFormat;
  sparkline?: ReactNode;
}) {
  const c = PALETTE[variant];
  const { width, height } = CARD_WIDE[format];
  const square = format === "square";
  const year = new Date().getFullYear();

  const spark = sparklineDataUri(stats.activity.dailySeries, c.water, c.clay);
  const mark = capyMarkDataUri(c.mark);
  const ticks = activityMonthTicks();

  return (
    <div
      style={{
        width,
        height,
        boxSizing: "border-box",
        background: c.bg,
        color: c.ink,
        fontFamily: FONT_SANS,
        fontWeight: 500,
        padding: square ? 72 : 46,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* masthead */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: FONT_MONO,
          fontSize: square ? 18 : 14,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: c.muted,
        }}
      >
        <span>{`Cappy Wrapped · ${year}`}</span>
        <span>{`@${stats.username}`}</span>
      </div>
      <div style={{ height: 1, background: c.border, marginTop: square ? 22 : 14 }} />

      {/* numeral */}
      <div
        style={{
          marginTop: square ? 56 : 22,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 300,
            fontSize: square ? 216 : 126,
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
            color: c.ink,
          }}
        >
          {formatNumber(stats.totalStars)}
        </div>
        <div style={{ marginTop: square ? 14 : 8, fontSize: square ? 24 : 17, color: c.muted }}>
          {`stars earned across ${formatNumber(stats.totalRepos)} repos, all time`}
        </div>
      </div>

      {/* sparkline: live animated slot on-page, static data-URI <img> for export/OG */}
      <div style={{ marginTop: square ? 60 : 24, height: square ? 190 : 64, width: "100%" }}>
        {sparkline ? (
          sparkline
        ) : spark ? (
          <img src={spark} alt="" style={{ width: "100%", height: "100%" }} />
        ) : null}
      </div>

      {/* timeline months */}
      {ticks.length > 0 && (
        <div
          style={{
            marginTop: square ? 16 : 12,
            position: "relative",
            height: square ? 22 : 16,
            width: "100%",
          }}
        >
          {ticks.map((t) => (
            <span
              key={t.label}
              style={{
                position: "absolute",
                left: `${t.x * 100}%`,
                transform:
                  t.x <= 0.02 ? "none" : t.x >= 0.98 ? "translateX(-100%)" : "translateX(-50%)",
                fontFamily: FONT_MONO,
                fontSize: square ? 15 : 12.5,
                letterSpacing: "0.08em",
                color: c.muted,
              }}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}

      {/* stat grid */}
      <div
        style={{
          marginTop: square ? 56 : 20,
          borderTop: `1px solid ${c.border}`,
          paddingTop: square ? 34 : 18,
          display: "flex",
          gap: square ? 24 : 20,
        }}
      >
        <StatCell square={square} c={c} label="Stars" value={formatNumber(stats.totalStars)} />
        <StatCell square={square} c={c} label="Repos" value={formatNumber(stats.totalRepos)} />
        <StatCell square={square} c={c} label="Years" value={String(stats.yearsActive)} />
        <StatCell square={square} c={c} label="Activity · 90d" value={formatNumber(stats.activity.count)} />
      </div>

      {/* language bars + watermark */}
      <div
        style={{
          marginTop: square ? 56 : "auto",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          borderTop: `1px solid ${c.border}`,
          paddingTop: square ? 40 : 20,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: square ? 22 : 12 }}>
          {(stats.topLanguages as LanguageShare[]).map((lang) => (
            <div key={lang.name} style={{ display: "flex", alignItems: "center", gap: square ? 16 : 12 }}>
              <span
                style={{
                  width: square ? 130 : 88,
                  fontSize: square ? 22 : 16,
                  color: c.muted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {lang.name}
              </span>
              <div
                style={{
                  flex: 1,
                  height: square ? 16 : 10,
                  background: c.track,
                  overflow: "hidden",
                  display: "flex", // Satori: any div with an element child needs display
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, lang.percent)}%`,
                    background: c.bar,
                  }}
                />
              </div>
              <span
                style={{
                  width: square ? 70 : 52,
                  textAlign: "right",
                  fontFamily: FONT_MONO,
                  fontSize: square ? 20 : 15,
                  fontVariantNumeric: "tabular-nums",
                  color: c.muted,
                }}
              >
                {`${lang.percent}%`}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <img
            src={mark}
            alt=""
            style={{
              width: square ? 78 : 60,
              height: square ? 58 : 45,
              objectFit: "contain",
            }}
          />
          <span
            style={{
              fontFamily: FONT_MONO,
              fontWeight: 500,
              fontSize: square ? 18 : 15,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: c.muted,
              whiteSpace: "nowrap",
            }}
          >
            {`made with Capytools · @Ubendev`}
          </span>
        </div>
      </div>
    </div>
  );
}
