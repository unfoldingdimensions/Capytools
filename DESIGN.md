---
version: alpha
name: Capytools
description: Calm little tools — warm-minimal, sage-forward, quiet by default.
colors:
  primary: "#8e9b7e"
  secondary: "#5f7a72"
  tertiary: "#c07952"
  neutral: "#f9f9f7"
  ink: "#1a1a1a"
  card: "#ffffff"
  muted: "#f1efea"
  on-muted: "#6b6963"
  border: "#e7e4dd"
  input: "#e4e1d9"
  ring: "#8e9b7e"
  on-primary: "#141412"
  sage-deep: "#4a6741"
  sage-mid: "#7a8e6e"
  sage-tan: "#c2b2a3"
  gold: "#d9a441"
  destructive: "#b4432f"
typography:
  display-xl:
    fontFamily: Fraunces
    fontSize: 3.75rem
    fontWeight: 300
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  display-md:
    fontFamily: Fraunces
    fontSize: 1.5rem
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.5
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.6
  label-caps:
    fontFamily: Albert Sans
    fontSize: 0.6875rem
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.24em"
rounded:
  sm: 7px
  md: 12px
  lg: 26px
  xl: 22px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.sage-mid}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 12px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-hover:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
  eyebrow-label:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-muted}"
    typography: "{typography.label-caps}"
  input-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 12px
  input-well:
    backgroundColor: "{colors.input}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 12px
  divider:
    backgroundColor: "{colors.border}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  selection-fill:
    backgroundColor: "{colors.ring}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
  chart-series-deep:
    backgroundColor: "{colors.sage-deep}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
  chart-series-sand:
    backgroundColor: "{colors.sage-tan}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  milestone-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 12px
  alert-error:
    backgroundColor: "{colors.card}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.md}"
    padding: 12px
---

## Overview

Calm little tools. Everything runs 100% in-browser (the documented exception
is CapyExpense, a Tauri desktop app that writes only the user's own files on
the user's own disk). No signup, no cookies, no telemetry, no server. The UI
should feel like it has already arrived and is just settling in — slow,
deliberate, never snappy.

Dark mode is class-based (`.dark` on `<html>`, via next-themes). Light values
above are normative; dark lifts sage to `#9aab8d`, canvas drops to `#121212`,
cards to `#1e1e1e`, water to `#7fa9a3`, clay to `#d68f66`, gold to `#e3b25e`.
Never use a `prefers-color-scheme` query for washes — it would darken the page
for a visitor who chose light.

Motion language (see `src/lib/capytools/motion.ts`): expo-out entrances
(`cubic-bezier(0.16,1,0.3,1)`), 600ms panel entrances, 900ms hero reveals,
350ms hovers, 100ms stagger gaps, 250ms fades. Ambient washes drift on
infinitely alternating loops, out of phase. Every motion dies under
`prefers-reduced-motion`.

## Colors

- **Primary / sage ({colors.primary}):** Does the heavy lifting — buttons,
  rings, focus, selected states. Dark text (`{colors.on-primary}`) sits on it,
  never white, for WCAG AA.
- **Secondary / water ({colors.secondary}):** The data signal — sparklines,
  links, secondary accents. Lifted to `#7fa9a3` in dark.
- **Tertiary / warm clay ({colors.tertiary}):** Celebration and peak accents
  only — required-field markers, alerts, the single loudest moment on a chart.
  Sparing by design.
- **Neutral / cream ({colors.neutral}):** Page canvas in light. Warm charcoal
  `#121212` in dark.
- **Ink ({colors.ink}):** Core text. `body` renders at weight 500 because Plus
  Jakarta runs lighter than Inter at the same weight.
- **Card ({colors.card}) / muted ({colors.muted}):** Card surfaces are pure
  white (light) / `#1e1e1e` (dark); inset wells and secondary fills are muted.
- **Borders ({colors.border}) / inputs ({colors.input}):** Whisper-warm
  borders, slightly darker input edges. Never pure gray.
- **Gold ({colors.gold}):** Rare — the single yearly moment (milestones,
  sparkles). If everything is gold, nothing is.
- **Language ramp:** `{colors.sage-deep}` → `{colors.primary}` →
  `{colors.sage-mid}` → `{colors.sage-tan}` for chart series 1–3; clay then
  gold close series 4–5.
- **Destructive ({colors.destructive}):** Errors only, at 10–20% tinted
  backgrounds, never solid.

## Typography

Fraunces (serif, light) for titles only — `font-display`, `font-light`, italic
`<em>` for the emphasis word ("made *quiet*"). Plus Jakarta Sans for all UI
at base weight 500. Albert Sans (a geometric sans, serving as the
`font-mono` label voice) for eyebrows, code, and tags, always uppercase with
`tracking-[0.24em]`.

- `display-xl` — landing hero (`text-5xl sm:text-6xl`), tight leading 1.04.
- `display-md` — tool card titles (`text-2xl`), normal weight.
- `body-md` / `body-sm` — descriptions and UI text, relaxed leading.
- `label-caps` — tool eyebrows at 11px (`Capy<Name> · tool no. X`), card
  eyebrows at 10px. Same style, one step smaller.

Headings `h1–h4` default to weight 700 unless a display style overrides them.

## Layout

4px baseline scale: `xs` intra-chip gaps, `md` (16px) intra-component,
`lg` (24px) inter-component, `xl` (48px) section breaks.

- Landing column: `max-w-5xl`, centered, `px-6`, `pb-20`. Tool grid:
  `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`, stagger 100ms per card.
- Header row: `max-w-4xl`, `px-6 py-5`, sticky with `bg-background/80`
  backdrop blur.
- Tool pages: `AmbientBackground` + `CapyMark` on every page; body paints the
  canvas (no opaque wrapper over the fixed `-z-10` ambient layer).
- Browser chrome is themed too: sage-tinted `::selection`, sage
  `:focus-visible` ring (2px, 2px offset), thin tinted scrollbars.
- Theme flips interpolate color properties over 150ms (`ease-out`); never
  transition `all`.

## Elevation & Depth

Almost flat. Cards rest at `shadow-sm` on a 1px warm border; hover lifts to
`-translate-y-0.5` + `shadow-md` over 350ms expo-out. No large shadows, no
glow except the ambient background washes (compositor-only radial gradients,
never `filter: blur()`). Sticky header flattens to opaque during view
transitions so blurred text never pulses mid-wipe.

## Shapes

- Main cards: `rounded-3xl` (`{rounded.lg}`).
- Inset wells: `rounded-2xl` (`{rounded.xl}`).
- Pills and buttons: `rounded-full` (`{rounded.full}`); shadcn buttons use
  `rounded-4xl` from the same family.
- Small inputs/labels: `rounded-md` (`{rounded.md}`).
- Focus rings resolve to a 2px rounding regardless of shape.

## Components

- `button-primary` is the single high-emphasis action per screen: sage fill,
  dark-ink text, full-round, `h-9 px-3`. Hover deepens toward
  `button-primary-hover`, active nudges `translate-y-px`. Variants `outline`,
  `secondary`, `ghost`, `destructive` (tinted, never solid), `link` exist in
  `src/components/ui/button.tsx` — reach for them before inventing a style.
- `card` is the default grouped-content surface: white card, ink text,
  `rounded-3xl`, `p-6`, `border-border`. `card-hover` adds the standard lift.
- `eyebrow-label` is the tool identifier,
  `font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground`.
- `input-field` is the default form surface: card fill, ink text, `rounded-md`.
- Shared desktop-tool UI (`src/components/capyexpense/`) imports no `next/*`,
  no `motion`, no storage — it renders in both the Next site and the separate
  Vite bundle (`tests/capyexpense-boundaries.test.ts` enforces this).
- Client hydration: read `localStorage` / random seeds on mount via the
  `useCallback` + `useEffect` hydrate pattern (see AGENTS.md §3) — never
  during render.

## Do's and Don'ts

- **Do** use token references (`{colors.primary}`) in components, never
  re-typed hex. Single-source the palette.
- **Do** keep one high-emphasis action per screen; everything else is
  outline, ghost, or link.
- **Do** give every tool page `AmbientBackground` + `CapyMark`, and every new
  tool a `Capy<Name>` name, `tool no. X` eyebrow, page, component, and test.
- **Do** write component variants as sibling keys (`card-hover`), never nested
  (`card.hover`).
- **Do** quote hex colors and `letterSpacing` values in YAML front matter.
- **Don't** introduce colors outside the palette — extend the palette first.
- **Don't** put white text on sage, clay, or gold — use dark ink.
- **Don't** use clay or gold for routine UI; they are celebration accents.
- **Don't** animate layout properties or use `transition-all` for color-only
  changes; don't add `motion` or storage imports to shared desktop-tool UI.
- **Don't** store anything outside `localStorage`, and never API keys anywhere
  else. Desktop tools state their own promise ("stored on your machine, never
  ours"), never "nothing stored".
