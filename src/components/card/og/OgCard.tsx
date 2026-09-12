import type { CSSProperties } from "react";

import { accentTokens } from "@/lib/capyog/themes";
import type { OgAccent, OgCardData, OgTemplateId, OgVariant } from "@/lib/capyog/types";

/**
 * The CapyOG card — canonical, runtime-agnostic source of truth, the same
 * pattern CardArt uses: ONLY inline styles, font stacks as constants, and any
 * glyph as an inline `<svg>`, so the on-page preview, the html-to-image export
 * and a future Satori OG route all render pixel-identically.
 *
 * Satori subset discipline (production-invariants §1): display is flex /
 * block / -webkit-box only, no Unicode glyphs as text (the quote mark is a
 * path), and only weights CardArt already uses (300/400/500). Type sizes and
 * spacing scale off the preset's shorter edge, so every frame from 1200×630
 * to 1000×1500 contains its content without clipping.
 */
export function OgCard({
  data,
  template,
  accent,
  variant,
  width,
  height,
}: {
  data: OgCardData;
  template: OgTemplateId;
  accent: OgAccent;
  variant: OgVariant;
  width: number;
  height: number;
}) {
  const c = accentTokens(accent, variant);
  const unit = Math.min(width, height);
  const pad = Math.round(unit * 0.06);

  const eyebrow: CSSProperties = {
    fontFamily: FONT_MONO,
    fontSize: Math.max(10, Math.round(unit * 0.022)),
    letterSpacing: "0.24em",
    textTransform: "uppercase",
    color: c.accent,
  };
  const attribution: CSSProperties = {
    fontFamily: FONT_MONO,
    fontSize: Math.max(10, Math.round(unit * 0.024)),
    letterSpacing: "0.06em",
    color: c.muted,
  };

  return (
    <div
      style={{
        width,
        height,
        boxSizing: "border-box",
        background: c.bg,
        color: c.ink,
        fontFamily: FONT_SANS,
        padding: pad,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      {template === "statement" && (
        <Statement c={c} data={data} eyebrow={eyebrow} attribution={attribution} unit={unit} />
      )}
      {template === "quote" && <Quote c={c} data={data} attribution={attribution} unit={unit} />}
      {template === "stat" && (
        <Stat c={c} data={data} eyebrow={{ ...eyebrow, color: c.muted }} unit={unit} />
      )}
      {template === "announcement" && (
        <Announcement c={c} data={data} attribution={attribution} unit={unit} />
      )}
    </div>
  );
}

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Plus Jakarta Sans', system-ui, sans-serif";
const FONT_MONO = "'Albert Sans', 'Plus Jakarta Sans', system-ui, sans-serif";

type Tokens = ReturnType<typeof accentTokens>;

/** Display title: the plain segment clamped to two lines, the italic one on
 *  its own line — the house headline pattern. Each block carries exactly one
 *  child: Satori allows `-webkit-box` clamping only on single-child nodes. */
function Title({
  c,
  data,
  size,
  clamp = 2,
}: {
  c: Tokens;
  data: OgCardData;
  size: number;
  clamp?: number;
}) {
  if (!data.title && !data.titleEm) return null;
  const type: CSSProperties = {
    fontFamily: FONT_DISPLAY,
    fontWeight: 300,
    fontSize: size,
    lineHeight: 1.04,
    letterSpacing: "-0.02em",
    color: c.ink,
    wordBreak: "break-word",
  };
  return (
    <>
      {data.title ? (
        <div
          style={{
            ...type,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: clamp,
          }}
        >
          {data.title}
        </div>
      ) : null}
      {data.titleEm ? (
        <div
          style={{
            ...type,
            fontStyle: "italic",
            fontWeight: 400,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 1,
          }}
        >
          {data.titleEm}
        </div>
      ) : null}
    </>
  );
}

function Statement({
  c,
  data,
  eyebrow,
  attribution,
  unit,
}: {
  c: Tokens;
  data: OgCardData;
  eyebrow: CSSProperties;
  attribution: CSSProperties;
  unit: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      {data.eyebrow ? (
        <div style={{ ...eyebrow, marginBottom: Math.round(unit * 0.035) }}>{data.eyebrow}</div>
      ) : null}
      <Title c={c} data={data} size={Math.round(unit * 0.105)} />
      <div
        style={{
          width: Math.round(unit * 0.12),
          height: Math.max(2, Math.round(unit * 0.006)),
          background: c.accent,
          marginTop: Math.round(unit * 0.04),
          marginBottom: Math.round(unit * 0.035),
        }}
      />
      {data.attribution ? <div style={attribution}>{data.attribution}</div> : null}
    </div>
  );
}

function Quote({
  c,
  data,
  attribution,
  unit,
}: {
  c: Tokens;
  data: OgCardData;
  attribution: CSSProperties;
  unit: number;
}) {
  const mark = Math.round(unit * 0.09);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      {/* The quotation mark is a path, never a Unicode glyph (invariants §1). */}
      <svg
        viewBox="0 0 24 24"
        width={mark}
        height={mark}
        fill={c.accent}
        style={{ display: "flex" }}
        aria-hidden
      >
        <path d="M9.6 6C6.5 6 4 8.5 4 11.6c0 3 2.4 5.4 5.4 5.4.4 0 .8 0 1.2-.1-.6 1.7-2 3-3.8 3.6l.6 1.5c3.9-1.1 6.6-4.7 6.6-9v-1.2C14 8.2 12.1 6 9.6 6zm9.2 0c-3.1 0-5.6 2.5-5.6 5.6 0 3 2.4 5.4 5.4 5.4.4 0 .8 0 1.2-.1-.6 1.7-2 3-3.8 3.6l.6 1.5c3.9-1.1 6.6-4.7 6.6-9v-1.2C23.2 8.2 21.3 6 18.8 6z" />
      </svg>
      {data.big ? (
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: Math.round(unit * 0.082),
            lineHeight: 1.14,
            color: c.ink,
            wordBreak: "break-word",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 4,
            marginTop: Math.round(unit * 0.03),
          }}
        >
          {data.big}
        </div>
      ) : null}
      {data.attribution ? (
        <div style={{ ...attribution, marginTop: Math.round(unit * 0.04) }}>
          {data.attribution}
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  c,
  data,
  eyebrow,
  unit,
}: {
  c: Tokens;
  data: OgCardData;
  eyebrow: CSSProperties;
  unit: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      {data.eyebrow ? (
        <div style={{ ...eyebrow, marginBottom: Math.round(unit * 0.03) }}>{data.eyebrow}</div>
      ) : null}
      {data.big ? (
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 300,
            fontSize: Math.round(unit * 0.22),
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            color: c.ink,
          }}
        >
          {data.big}
        </div>
      ) : null}
      {data.title ? (
        <div
          style={{
            fontFamily: FONT_SANS,
            fontWeight: 500,
            fontSize: Math.round(unit * 0.042),
            lineHeight: 1.2,
            color: c.ink,
            marginTop: Math.round(unit * 0.025),
          }}
        >
          {data.title}
        </div>
      ) : null}
      {data.subtitle ? (
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: Math.round(unit * 0.028),
            lineHeight: 1.35,
            color: c.muted,
            marginTop: Math.round(unit * 0.015),
          }}
        >
          {data.subtitle}
        </div>
      ) : null}
    </div>
  );
}

function Announcement({
  c,
  data,
  attribution,
  unit,
}: {
  c: Tokens;
  data: OgCardData;
  attribution: CSSProperties;
  unit: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      {data.tag ? (
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: Math.max(10, Math.round(unit * 0.024)),
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: c.accentInk,
            background: c.accent,
            borderRadius: 999,
            padding: `${Math.max(4, Math.round(unit * 0.012))}px ${Math.round(
              unit * 0.026,
            )}px`,
            marginBottom: Math.round(unit * 0.04),
          }}
        >
          {data.tag}
        </div>
      ) : null}
      <Title c={c} data={data} size={Math.round(unit * 0.095)} />
      {data.subtitle ? (
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: Math.round(unit * 0.03),
            lineHeight: 1.35,
            color: c.muted,
            marginTop: Math.round(unit * 0.025),
          }}
        >
          {data.subtitle}
        </div>
      ) : null}
      {data.attribution ? (
        <div style={{ ...attribution, marginTop: Math.round(unit * 0.035) }}>
          {data.attribution}
        </div>
      ) : null}
    </div>
  );
}
