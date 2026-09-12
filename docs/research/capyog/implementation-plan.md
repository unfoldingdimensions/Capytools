# CapyOG (tool no. 6) — Implementation Plan

*Prepared 2026-09-05 by the orchestrator session. This document is a complete handoff: an agent
session that has never seen this conversation should be able to implement CapyOG from it alone.
Read §1–§4 before writing any code. Citation keys `[n]` resolve to
[`./sources.json`](./sources.json). Positioning research:
[`../expansion/roadmap.md`](../expansion/roadmap.md).*

*Updated 2026-09-13 at implementation time (PR #14): registration sections (§4, §8, §9.5) were
rewritten for the suite-registry structure (`SUITE` in `src/lib/capytools/suite.ts`) that
replaced the old `TOOLS` arrays, the mono font stack was corrected to Albert Sans, and the
Satori single-child `-webkit-box` constraint learned from the smoke test was recorded (§6.1).*

---

## 1. Mission & scope

**CapyOG** — "a card worth sharing." A 100%-client-side Open Graph / social card generator:

1. **Compose** — pick a template, a size preset, an accent, and type a few fields into a live
   preview that renders the card at its canonical pixel size (1200×630 …) scaled to fit, so
   **what you see is exactly what exports**.
2. **Export** — download PNG (1×/2×/3×) or JPEG, or copy the image straight to the clipboard for a
   paste into any composer. No server route, no upload, no storage.

This tool exists because every existing OG generator either uploads your text to a server, asks for
an account, or watermarks the free tier. CapyOG is the calm, private one — same engine philosophy as
CapyWrapped's cards, minus the GitHub data.

### In scope (v1)

- 4 templates (statement, quote, stat, announcement), data-driven template registry.
- 6 size presets (1200×630 link card, 1080×1080, 1080×1350, 1080×1920, 1280×720, 1000×1500) with
  per-platform notes from verified primary sources.
- Light/dark variant (follows site theme) × 4 accents (sage, clay, water, gold).
- Export: PNG 1×/2×/3×, JPEG with quality slider, copy-image-to-clipboard, `min-w-[84px]` buttons.
- Full tool registration per the Capytools recipe. **Tool no. 6.**
- A Satori-compatibility smoke test that keeps the card subset future-proof (§4, §9).

### Out of scope (v1 — do NOT build)

- **No server routes.** If you find yourself adding `src/app/api/...`, stop — scope violation.
- No share pages / OG route for generated cards (no storage exists to key them on; §10 backlog).
- No image uploads into the card (text-only cards in v1; image backgrounds are a pack candidate).
- No batch export, no paywall strings, no localStorage/sessionStorage of anything.
- No refactoring of CapyWrapped's `CardArt.tsx` — read it, mirror its conventions, leave it alone.

---

## 2. Read these first (repo law)

1. **`AGENTS.md`** — including the top warning: **this Next.js is not the Next.js in your training
   data.** Read the relevant guide in `node_modules/next/dist/docs/` before touching app-router
   code (metadata export shape, `"use client"` boundaries).
2. **`.agents/rules/production-invariants.md`** — §1 is binding for you: Satori CSS subset
   (`display: flex|block|contents|none|-webkit-box` only), **no Unicode glyphs as text in cards**
   (inline `<svg>` instead), font-weight parity. Plus the WCAG and layout rules.
3. **`.agents/skills/capytools-dev/SKILL.md`** — the tool recipe, design tokens, hydration guard.
4. **The reuse targets (read fully before designing):**
   - `src/components/card/CardArt.tsx` — the Satori-compatible card pattern: inline styles only,
     no Tailwind inside the card, `PALETTE` per variant, font stacks as constants, `CARD_WIDE`
     dimension map, data-URI SVG for any icon/glyph.
   - `src/components/card/CardScaled.tsx` — canonical-size render + `ResizeObserver` scale + the
     **offscreen full-size `captureRef` instance** used for exact-size capture. You will mirror
     this component; see §6.
   - `src/lib/card/export.ts` — `exportNodePng`, `capturePngBlob`, `copyText`, `canShareFiles`,
     `prefersNativeShare` are already generic and production-proven. Reuse them (§5.4).
   - `src/components/tool/CapyCreator.tsx` — three-card editor layout and form tone.
   - `src/app/capyimagine/page.tsx` — the page shell to copy.
   - `tests/og-render.test.tsx` — the real-Satori-render test pattern (font fetch helper) to mirror
     in §9.

**Ethos invariants (hard):** zero network calls at runtime; nothing written to storage; no cookies;
no accounts. The card never leaves the tab except as a download or clipboard paste the user
initiates. Hydration: controlled text inputs seeded from constants (no storage reads, no random in
initializers) — the standard pattern applies trivially here.

---

## 3. Verified technical facts (design constraints)

All verified 2026-09-05 against primary sources; ledger in `./sources.json`.

### 3.1 Platform size specs — with corrections to folklore

The social-card size advice on blogs is mostly wrong. Verified from the platforms themselves [1–9]:

| Preset | Size | Evidence |
|---|---|---|
| **Link card** (X · LinkedIn · Facebook · Discord · Slack · Bluesky) | **1200×630** | Facebook documents "at least 1200×630", 1.91:1, 8 MB max [3]. LinkedIn documents a **minimum** of 1200×627, 1.91:1 frame, center-crop [1][2]. X has **no official recommended size** — only bounds (min 300×157, max 4096×4096, <5 MB) and a 2:1 card that center-crops; the famous "1200×628" was **never an official X number** [4]. Discord [5], Slack [6] and Bluesky [9] publish **no pixel dimensions at all** — they scale whatever og:image they get. |
| **Square** | 1080×1080 | Instagram documents "at least 1080 px wide" with ratios 1.91:1–3:4 [7]; square is within range and the general-purpose default. |
| **Portrait** | 1080×1350 | IG 4:5, inside the documented 1.91:1–3:4 range [7]. |
| **Story** | 1080×1920 | IG Stories/Reels de-facto standard [7][8]. |
| **Wide 16:9** | 1280×720 | YouTube thumbnails: official rec is now **4K 3840×2160**, min width 640, **2 MB cap on mobile** (50 MB desktop) — so JPEG export matters here; 1280×720 stays the practical slide/doc size [10]. |
| **Pin** | 1000×1500 | Pinterest documents exactly this (2:3); taller pins get cut in feed [11]. |

**UI consequence:** preset labels carry the platform names, and a quiet per-preset note line states
the crop/limit facts above ("X crops to 2:1 · LinkedIn min 1200×627 · Facebook ≤ 8 MB"). Honest
calibration is brand.

### 3.2 Export stack — verified and already proven in this repo

- `html-to-image` ^1.11.13 is already a dependency. Confirmed API: `toPng`, `toJpeg`, `toBlob`,
  `toCanvas`, `toPixelData`, `toSvg`, `getFontEmbedCSS`; options include `width`, `height`,
  `pixelRatio`, `quality`, `backgroundColor`, `cacheBust`, `style`, `filter`,
  `preferredFontFormat`, `fontEmbedCSS`, `skipAutoScale` [12]. (`skipFonts` is **not** a documented
  option — do not use it.)
- Font embedding: the library finds `@font-face` rules, downloads the font files, base64-inlines
  them into the clone [12]. Because `next/font` self-hosts Fraunces/Jakarta/Plex as **same-origin**
  static assets, this works without CORS pain — empirically proven by CapyWrapped's shipping export
  pipeline (`await document.fonts.ready` then `toPng`). Keep the `document.fonts.ready` await.
- `toPng(node, { width, height, pixelRatio: 2, cacheBust: true })` at canonical CSS size produces a
  retina-clean 2400×1260 PNG — the exact pattern in `src/lib/card/export.ts:9`.
- **Capture the offscreen full-size node (`captureRef`), never the CSS-scaled preview** — that's how
  CardScaled guarantees preview == export pixels. Mirror this.
- JPEG: `toJpeg(node, { quality })` for the photo-heavy presets (16:9, pin) and the 2 MB mobile
  cap story [10][12]. PNG stays the default (alpha, crisp text).
- Clipboard: `ClipboardItem` with `image/png` + graceful text-only fallback — the exact
  production-tested pattern lives in `copyPost` (`src/lib/card/export.ts:47`); CapyOG copies
  **image only** (no share URL exists), so wrap `capturePngBlob` instead.
- Canvas-size safety: 1200×630 @3× = 3600×1890 ≈ 6.8 MP — inside every browser's canvas budget.
  1080×1920 @3× = 3240×5760 ≈ 18.7 MP — fine on desktop Chrome/Firefox; if `toPng` returns an
  empty/failed dataUrl on mobile, surface a calm "try 2×" note rather than an error.

### 3.3 Satori compatibility is a kept constraint, not a requirement

No OG route ships in v1, but the card subset stays Satori-compatible (inline styles only, display
subset, no Unicode glyphs, weights ≤ fetched set) so a future share route renders the same pixels.
The §9 Satori smoke test enforces this mechanically instead of on trust.

---

## 4. File map (everything you will create)

```
src/lib/capyog/
  types.ts       # OgTemplateId, OgAccent, OgCardData, OgSizePreset, ExportScale, ExportFormat
  sizes.ts       # SIZE_PRESETS registry (§5.1) + aspect labels + per-preset notes
  templates.ts   # TEMPLATE_PRESETS registry (§5.2): field schema per template (the pack seam)
  themes.ts      # ACCENTS × variants → card style tokens (§5.3, mirrors CardArt PALETTE values)
  export.ts      # thin wrappers: buildFileName, exportCard (png/jpeg, scale), copyCardImage
  demo.ts        # DEMO_CARD fixture (idle state, repo pattern: DEMO_STATS)
src/components/card/og/
  OgCard.tsx     # the Satori-compatible renderer, template-switched (§6.1)
  OgScaled.tsx   # canonical render + scale + offscreen captureRef (§6.2, mirror of CardScaled)
src/components/tool/CapyOG.tsx    # the editor (three cards per house style)
src/app/capyog/page.tsx
tests/capyog.test.ts
tests/capyog-render.test.tsx      # Satori smoke (§9)
```

Register via the **suite registry**: append a `SuiteTool` row to `SUITE` in
`src/lib/capytools/suite.ts` (`name: "CapyOG"`, `short: "OG"`, `href: "/capyog"`,
`cat: "browser"`, `plate: { src: "/plates/lab-6.webp", width: 896, height: 1200 }`). The
masthead's switcher, the landing's Labs catalog, the footer, the notes page, the sitemap and
every count ("Nº 06", "Six") all derive from that one row — nothing else carries a tool list.
Then: add `"lab-6"` to `PLATES` in `src/lib/capytools/landing.ts` and ship
`public/plates/lab-6.webp` (896×1200; `tests/landing.test.tsx` enforces the asset), add a
numbered README section, update the README's first-line count ("Five so far." → "Six so
far.") and mirror that string in `landing.ts`'s `COLOPHON.quote` (the sync test asserts the
two stay verbatim-equal), and bump the five existing tool pages' sign-off `index`
denominators (`Nº 0X / 05` → `/ 06`) together with their rows in `tests/tool-pages.test.tsx`.

**Dependency changes: none.** Everything needed is already installed.

### ⚠️ Parallel-session note (registration commits) — resolved

When this plan was written, a CapyStrip session held uncommitted edits in the registration
files. CapyStrip has since shipped (tool no. 4) and registration lives in `suite.ts`, so the
conflict window is gone. The standing rule remains: check `git status` before committing and
never commit another session's uncommitted work inside your files.

---

## 5. Data layer (`src/lib/capyog/`)

### 5.1 `sizes.ts`

```ts
export interface OgSizePreset {
  id: string;                 // "link" | "square" | "portrait" | "story" | "wide" | "pin"
  label: string;              // "Link card"
  platforms: string;          // "X · LinkedIn · Facebook · Discord · Slack"
  width: number; height: number;
  note: string;               // the honest crop/limit line from §3.1
}
export const SIZE_PRESETS: OgSizePreset[];   // 6 entries, link = default
export const DEFAULT_SIZE_ID = "link";
```

### 5.2 `templates.ts` — the pack seam

```ts
export type OgTemplateId = "statement" | "quote" | "stat" | "announcement";
export type OgFieldKey = "eyebrow" | "title" | "titleEm" | "subtitle" | "big" | "attribution" | "tag";
export const TEMPLATE_PRESETS: Record<OgTemplateId, {
  id: OgTemplateId; name: string; line: string;
  fields: OgFieldKey[];        // which inputs the editor shows, in order
}>;
export const DEFAULT_TEMPLATE_ID: OgTemplateId = "statement";
```

Template sketches (tune typography, keep the skeleton):

- **statement** — eyebrow (mono, uppercase, tracking) · big display title (`title` + italic
  `titleEm` segment, 2-line clamp) · accent rule · attribution row (mono handle).
- **quote** — oversized quotation mark as inline SVG (never a Unicode glyph) · `big` body italic ·
  `attribution` mono line.
- **stat** — giant tabular number (`big`) · label (`title`) · caption (`subtitle`) · eyebrow.
- **announcement** — `tag` pill (accent fill, dark ink text) · title · subtitle · eyebrow/date-ish
  `attribution`.

Data-driven registry on purpose: future template packs (Gumroad) are new registry entries, not new
code paths. That is the monetization seam — document it, don't build paywall strings.

### 5.3 `themes.ts`

`type OgAccent = "sage" | "clay" | "water" | "gold"` and `OgVariant = "light" | "dark"`. Export
`accentTokens(accent, variant)` → `{ bg, ink, muted, border, accent, accentInk, track }` using the
same hex values as CardArt's `PALETTE` for coherence (light bg `#ffffff`, dark bg `#1e1e1e`; accents
from `globals.css` tokens: sage `#8e9b7e`/`#9aab8d`, clay `#c07952`/`#d68f66`, water `#5f7a72`/
`#7fa9a3`, gold `#d9a441`/`#e3b25e`). `accentInk` is always the dark ink (`#141412`) — **never
white-on-accent** (WCAG invariant).

### 5.4 `export.ts` — thin wrappers over the shared layer

```ts
export function buildFileName(t: { template: string; width: number; height: number; scale: number; format: "png" | "jpeg" }): string;
// e.g. "capyog-statement-1200x630@2x.png"

export async function exportCard(node: HTMLElement, opts: { width; height; scale: ExportScale; format: "png" | "jpeg"; quality?: number; }): Promise<void>;
// png → toPng({ width, height, pixelRatio: scale, cacheBust: true })
// jpeg → toJpeg({ ..., quality: quality ?? 0.92, backgroundColor: <variant bg> })  (JPEG has no alpha)
// both: await document.fonts.ready first; trigger the download anchor like exportNodePng does.

export async function copyCardImage(node: HTMLElement, width: number, height: number): Promise<boolean>;
// capturePngBlob + ClipboardItem image/png; false → caller shows the text-only fallback message.
```

**One tiny shared-lib change (allowed, non-breaking):** add an optional `pixelRatio` field to
`exportNodePng`'s opts in `src/lib/card/export.ts` (default `2` — existing Wrapped call sites
unchanged). If you'd rather not touch the shared file, implement `exportCard` standalone with
`toPng`/`toJpeg` directly — equally fine. Do not refactor anything else in `export.ts`.

### 5.5 `demo.ts`

`DEMO_CARD: OgCardData` — a plausible, brand-flavored fixture (e.g. eyebrow "CAPYTOOLS · TOOL NO. 6",
title "Make the internet a little", titleEm "calmer", attribution "@capytools"). Seeds the
editor defaults so the preview is never empty.

---

## 6. Card rendering (`src/components/card/og/`)

### 6.1 `OgCard.tsx`

Props: `{ data: OgCardData; template: OgTemplateId; accent: OgAccent; variant: OgVariant; width: number; height: number }`. Rules (lifted from CardArt):

- Inline styles only — **no Tailwind classes inside the card** (Satori subset + export parity).
- Font stacks as constants, mirroring CardArt's current constants: `'Fraunces', Georgia, serif` /
  `'Plus Jakarta Sans', system-ui, sans-serif` / `'Albert Sans', 'Plus Jakarta Sans', system-ui,
  sans-serif` (the label voice moved IBM Plex Mono → Albert Sans on 2026-09-09; the `--font-mono`
  token kept its name).
- Only font weights CardArt already uses (400/500) — no new weight without adding it to any future
  Satori font loader.
- Any icon/quote-glyph is an inline `<svg viewBox fill="currentColor" style={{ display: "flex" }}>`.
- Title clamps at 2 lines; long words wrap via `wordBreak: "break-word"`; the layout must fully
  contain content at every size preset (check the 1080×1920 tall frame and the 1000×1500 pin).
- `-webkit-box` line-clamp containers must hold **exactly one child** — Satori rejects a
  `-webkit-box` div with multiple children (verified 2026-09-13 by the Satori smoke). Render the
  italic `titleEm` segment as its own block line (the house headline pattern), not as an inline
  `<span>` inside the clamped title.
- Padding scales with the preset's shorter edge (~6%), not fixed px.

### 6.2 `OgScaled.tsx` — mirror CardScaled, parameterized

Same architecture as `src/components/card/CardScaled.tsx`: measure container → `scale =
min(cw/artW, maxH/artH)` via `ResizeObserver` → visible instance renders at `width×height` with
`transform: scale()`; a second **offscreen full-size instance** (fixed, left: −100000, aria-hidden)
exposes the `captureRef` for exact-size export. Differences from CardScaled: dimensions come from
the selected preset (not a `wide|square` union), no drift/morph animation (this is a workbench, not
a showcase), and the visible instance loses the elevation shadow (a generator preview should read
flat — the export has no shadow either).

---

## 7. UI spec (`CapyOG.tsx` + page)

House-style three cards, following `CapyCreator.tsx` tone:

**Card 1 — "The composition."** Template select (with one-line `line` description) · size select
(platforms + honest note rendered under the select) · accent pills · variant follows site theme
(`useIsDark`) · the editor fields declared by the active template's schema (mono eyebrow, display
title with separate *italic segment* input, body, attribution, tag) · everything controlled state,
defaults from `DEMO_CARD`.

**Card 2 — "The preview."** `OgScaled` with the live data · under it, the export row: format pills
(PNG / JPEG), scale pills (1× / 2× / 3×, default 2×), quality slider (JPEG only, 0.50–1.00), then
Download (`min-w-[84px]`), Copy image (`min-w-[84px]`, "Copied!" state). `aria-live="polite"` status
line for copy/fallback outcomes (reuse CardComposer's honest copy: "Your browser blocked the image
copy."). Filename from `buildFileName`.

**Card 3 — "The checklist."** A short static, friendly list of what to do with the file — paste the
image into the post composer (X intent URLs can't carry images — cite `postToX`'s comment), keep
Facebook ≤ 8 MB, LinkedIn needs ≥1200×627, Pinterest crops >2:3. This is the SEO/demand copy doing
double duty as help text.

Page shell: copy `src/app/capyimagine/page.tsx` exactly — eyebrow **`CapyOG · tool no. 6`**, Fraunces
heading with italic punchline ("a card worth *sharing*."), lowercase subtitle "og images & social
cards, composed in your browser. all local.". Metadata:

```ts
export const metadata = {
  title: "CapyOG — free OG image & social card generator (1200×630)",
  description:
    "Compose Open Graph and social cards for X, LinkedIn, Facebook, Discord, Instagram and Pinterest — then download PNG/JPEG or copy to clipboard. 100% in your browser, nothing uploaded.",
};
```

`AmbientBackground` + `CapyMark` on the page; `scroll-mt-24` on card sections; `ErrorCard` only if
you add a failure path (export failure → inline note is enough).

---

## 8. Registration recipe (suite registry)

1. Append the `SuiteTool` row to `SUITE` in `src/lib/capytools/suite.ts` — `href: "/capyog"`,
   `short: "OG"`, `cat: "browser"`, plate `/plates/lab-6.webp` (896×1200). The header nav,
   landing catalog/footer/counts, notes page, sitemap and hero copy all derive from it; add
   `"lab-6"` to `PLATES` in `src/lib/capytools/landing.ts` and ship the asset (the
   asset-existence test fails otherwise).
2. `README.md` — numbered tool section ("## 6. CapyOG", match the existing entries' voice) and
   the first-line count ("Six so far."), mirrored verbatim into `COLOPHON.quote` in
   `src/lib/capytools/landing.ts` so the sync test stays green.
3. Sign-off indexes — bump the five existing tool pages' `index` denominators (`Nº 0X / 05` →
   `/ 06`) and the matching rows in `tests/tool-pages.test.tsx`; add CapyOG's own rows.
4. Respect the parallel-session rule in §4 for committing shared registration files.

---

## 9. Test plan (vitest; `tests/capyog.test.ts` + `tests/capyog-render.test.tsx`)

1. **sizes.ts** — 6 presets, unique ids, positive ints, `link` is 1200×630 and the default, every
   preset has a non-empty `note`.
2. **templates.ts** — every declared field key is a valid `OgFieldKey`; `DEMO_CARD` satisfies every
   template's schema (no missing fields); default template exists in the registry.
3. **themes.ts** — all 4 accents × 2 variants resolve; accent values match the design tokens;
   `accentInk` is always the dark ink (assert `#141412`) for every accent/variant pair.
4. **export.ts** — `buildFileName` golden cases (`png`/`jpeg`, scale 1–3); the format→function
   mapping helper is pure and table-tested (png→toPng options shape incl. `pixelRatio`; jpeg→
   `quality` + `backgroundColor`). No DOM in these tests.
5. **Registration parity** — assert `/capyog` is the sixth row of `SUITE` in
   `src/lib/capytools/suite.ts` (the header and landing derive from it), and that `README.md`
   carries "## 6. CapyOG" and the "Six so far" count (cheap import or text assertions).
6. **Satori smoke** (`tests/capyog-render.test.tsx`) — mirror `tests/og-render.test.tsx`'s font
   loader; render each of the 4 templates at 1200×630 through `next/og` `ImageResponse` with a
   representative `OgCardData` and assert non-empty PNG bytes. This mechanically enforces the
   Satori subset on every future template.

**Definition of done:** `npm test` green (all existing tests still pass), `npx tsc --noEmit` clean,
`npx eslint` clean on new files, and a manual smoke: preview matches the downloaded PNG at 2×,
theme toggle flips the card, all 4 templates × 6 presets render without clipping (check story and
pin), copy-image pastes into a chat app, JPEG export honors the quality slider, devtools Network
shows zero requests during a full compose→export flow.

---

## 10. Out-of-scope backlog (later sessions, not this one)

- **Template packs** (Gumroad): the `TEMPLATE_PRESETS` registry is the seam — packs are data.
- **Share pages / OG route** for generated cards: needs a URL- or hash-encoded card scheme
  (base64 URL length limits ~2 KB are the constraint) + a new generic `/api/og/route` — design
  first, and mind the Satori invariants that this plan already enforces.
- **Image layers** (logo upload, background photo) — canvas draw + `filter`-safe export; watch the
  data-URI size limits html-to-image warns about [12].
- **Generalize the share layer**: lift Wrapped's `shareLine`-shaped helpers into a generic
  `shareCard(node, { text, size })` in `src/lib/card/export.ts` once a second tool actually needs
  share intents.
- Batch export (zip) — only meaningful once template packs exist.

---

## 11. Sources (keys → `./sources.json`)

[1] LinkedIn help a521928 (1200×627 min, 5 MB) · [2] LinkedIn help a525301 (1.91:1 crop frame) ·
[3] Facebook sharing docs (1200×630, 1.91:1, 8 MB) · [4] X dev forum / docs.x.com (2:1 card,
300×157 min, 4096 max; no official recommended px) · [5] Discord message-embed docs (no pixel spec) ·
[6] Slack unfurling docs (no pixel spec) · [7] Instagram help (≥1080 px, 1.91:1–3:4) ·
[8] Instagram Reels help · [9] Bluesky posts docs (no thumb spec) · [10] YouTube thumbnail help
(4K rec, 2 MB mobile) · [11] Pinterest product specs (1000×1500, 2:3) · [12] html-to-image README
(API options, font inlining) · [13] next/font docs (self-hosted same-origin fonts — also empirically
proven by the repo's own Wrapped export pipeline).
