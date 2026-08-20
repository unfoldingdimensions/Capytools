import { formatNumber } from "@/lib/capytools/demo";
import {
  buildSparkline,
  capyMarkDataUri,
  SPARK,
  sparklineDataUri,
} from "@/lib/capytools/sparkline";
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
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }} // Satori: element child
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 500,
          fontSize: square ? 36 : 28,
          lineHeight: 1.15,
          color: c.ink,
          fontVariantNumeric: "tabular-nums",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: square ? 8 : 5,
          fontSize: square ? 13 : 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: c.muted,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/**
 * The GitHub Wrapped card — canonical, runtime-agnostic source of truth.
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
  sparkline?: (series: number[], width: number, height: number) => ReactNode;
}) {
  const c = PALETTE[variant];
  const { width, height } = CARD_WIDE[format];
  const square = format === "square";
  const year = new Date().getFullYear();

  const pad = square ? 64 : 54;
  const sparkW = width - pad * 2;
  const sparkH = square ? 296 : 130;
  // Series and ticks are both computed at fetch time and arrive pre-aligned.
  // Deriving either here would read the clock during render, which desyncs the
  // server and client and fails hydration.
  const series = stats.activity.chartSeries;
  const ticks = stats.activity.monthTicks;

  // The guide only makes sense where the peak names a month total.
  const peak = stats.activity.peak;
  const spark = sparklineDataUri(series, c.water, c.clay, sparkW, sparkH, peak !== null);
  // The peak sits at the top of the plot band by definition, so the label goes
  // just below its dotted line. Same geometry as the SVG, which is drawn 1:1.
  const peakY = buildSparkline(series, sparkW, sparkH).peakY;
  const mark = capyMarkDataUri(c.mark);

  // Tick labels are positioned in absolute px, not with a percentage transform:
  // Satori (the OG renderer) rejects `transform: none` outright and only accepts
  // absolute lengths in translate, so any transform here breaks the OG image.
  // All labels are 3-char mono, so one measured width centres them all.
  const tickFont = square ? 14 : 11.5;
  const tickW = 3 * tickFont * (0.6 + 0.08); // mono advance + letter-spacing
  // Match the sparkline's horizontal inset so labels sit under their own point.
  const tickLeft = (x: number) =>
    Math.round(
      Math.max(0, Math.min(sparkW - tickW, SPARK.halo + x * (sparkW - 2 * SPARK.halo) - tickW / 2)),
    );

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
        textAlign: "center",
        padding: square ? pad : `40px ${pad}px ${pad}px`,
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
          fontSize: square ? 17 : 13.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: c.muted,
        }}
      >
        <span>{`GitHub Wrapped · ${year}`}</span>
        <span>{`@${stats.username}`}</span>
      </div>
      <div style={{ height: 1, background: c.border, marginTop: square ? 18 : 12 }} />

      {/* numeral */}
      <div
        style={{
          marginTop: square ? 64 : 14,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 300,
            fontSize: square ? 140 : 72,
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
            color: c.ink,
          }}
        >
          {formatNumber(stats.totalStars)}
        </div>
        <div style={{ marginTop: square ? 8 : 4, fontSize: square ? 19 : 14.5, color: c.muted }}>
          {`stars earned across ${formatNumber(stats.totalRepos)} repos`}
        </div>
      </div>

      {/* sparkline: live animated slot on-page, static data-URI <img> for export/OG */}
      <div
        style={{
          marginTop: square ? 36 : 18,
          height: sparkH,
          width: sparkW,
          display: "flex",
          position: "relative",
        }}
      >
        {stats.activity.empty ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              fontSize: square ? 19 : 15,
              color: c.softMuted,
            }}
          >
            no activity in the last 12 months
          </div>
        ) : sparkline ? (
          sparkline(series, sparkW, sparkH)
        ) : spark ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={spark} alt="" width={sparkW} height={sparkH} />
        ) : null}

        {/* The peak's value as real text, not SVG <text>: Satori rasterises the
            sparkline as an image, where the card's fonts are unavailable. */}
        {peak && !stats.activity.empty && (
          <span
            style={{
              position: "absolute",
              left: 0,
              top: Math.round(peakY) + 7,
              fontFamily: FONT_MONO,
              fontSize: square ? 14 : 11.5,
              letterSpacing: "0.04em",
              color: c.clay,
              whiteSpace: "nowrap",
            }}
          >
            {`${formatNumber(peak.value)} ${
              peak.value === 1 ? "contribution" : "contributions"
            } in ${peak.label}`}
          </span>
        )}
      </div>

      {/* timeline months */}
      <div
        style={{
          marginTop: square ? 12 : 6,
          position: "relative",
          display: "flex", // Satori requires explicit display on multi-child divs
          height: square ? 20 : 15,
          width: "100%",
        }}
      >
        {ticks.map((t) => (
          /* A 12-month window legitimately repeats a month name, so key on both. */
          <span
            key={`${t.label}-${t.x}`}
            style={{
              position: "absolute",
              left: tickLeft(t.x),
              fontFamily: FONT_MONO,
              fontSize: tickFont,
              letterSpacing: "0.08em",
              color: c.muted,
            }}
          >
            {t.label}
          </span>
        ))}
      </div>

      {/* stat grid */}
      <div
        style={{
          marginTop: square ? 48 : 20,
          borderTop: `1px solid ${c.border}`,
          paddingTop: square ? 22 : 22,
          display: "flex",
          gap: square ? 20 : 16,
        }}
      >
        <StatCell square={square} c={c} label="Stars" value={formatNumber(stats.totalStars)} />
        <StatCell square={square} c={c} label="Repos" value={formatNumber(stats.totalRepos)} />
        <StatCell
          square={square}
          c={c}
          label="Busiest Day"
          value={stats.activity.busiestWeekday}
        />
        <StatCell square={square} c={c} label="Contributions · Public" value={formatNumber(stats.activity.count)} />
      </div>

      {/* bottom section: top 3 languages + top repo + watermark */}
      <div
        style={{
          marginTop: square ? 48 : 30,
          display: "flex",
          alignItems: "stretch",
          justifyContent: "space-between",
          gap: square ? 28 : 20,
          borderTop: `1px solid ${c.border}`,
          paddingTop: square ? 24 : 20,
        }}
      >
        {/* Top 3 Languages */}
        <div style={{ flex: 1.4, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: square ? 9 : 10 }}>
          {(stats.topLanguages.slice(0, 3) as LanguageShare[]).map((lang) => (
            <div key={lang.name} style={{ display: "flex", alignItems: "center", gap: square ? 12 : 8 }}>
              <span
                style={{
                  width: square ? 100 : 88,
                  textAlign: "right",
                  fontSize: square ? 16 : 13,
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
                  height: square ? 8 : 6,
                  background: c.track,
                  overflow: "hidden",
                  display: "flex",
                  borderRadius: 3,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, lang.percent)}%`,
                    background: c.bar,
                    borderRadius: 3,
                  }}
                />
              </div>
              <span
                style={{
                  width: square ? 54 : 40,
                  textAlign: "right",
                  fontFamily: FONT_MONO,
                  fontSize: square ? 14 : 11.5,
                  fontVariantNumeric: "tabular-nums",
                  color: c.muted,
                }}
              >
                {`${lang.percent}%`}
              </span>
            </div>
          ))}
        </div>

        {/* Top Repo - Featured Card Box */}
        {stats.topRepo && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: square ? "10px 16px" : "12px 16px",
              background: c.track,
              borderRadius: 8,
              border: `1px solid ${c.border}`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: square ? 11 : 9.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: c.softMuted,
              }}
            >
              Top Repo
            </div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 500,
                fontSize: square ? 19 : 15,
                lineHeight: 1.2,
                color: c.ink,
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {stats.topRepo.name}
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: square ? 13 : 11,
                color: c.clay,
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                gap: 4,
                whiteSpace: "nowrap",
              }}
            >
              <span>★</span>
              <span>{`${formatNumber(stats.topRepo.stars)} stars`}</span>
            </div>
          </div>
        )}

        {/* Watermark + CapyMark */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mark}
            alt=""
            style={{
              width: square ? 46 : 36,
              height: square ? 34 : 26,
              objectFit: "contain",
            }}
          />
          <span
            style={{
              fontFamily: FONT_MONO,
              fontWeight: 500,
              fontSize: square ? 12.5 : 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: c.softMuted,
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
