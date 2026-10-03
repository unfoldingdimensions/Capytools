# CapyStamp — implementation plan

*Prepared 2026-10-03 for an implementing agent that has not seen the conversation that produced it. Read
§0–§3 before writing code. Citation keys `[n]` resolve to
[`capystamp.sources.json`](./capystamp.sources.json). Repo facts were read from `main` on 2026-10-03.*

*Supersedes the 2026-09-21 research plan (`docs/research/capystamp/implementation-plan.md`, gitignored, local
to the owner's machine). The big change: **batch is free in v1**, with a cap (owner decision, 2026-10-03).
Where the two disagree, this file wins.*

---

## 0. Handoff summary

**What:** CapyStamp — a watermarker that runs entirely in the browser. Drop one photo or a batch, design a
text or logo mark once, see it live, and download the stamped images (one file, or a ZIP for a batch). Nothing
is uploaded, and the tool makes **no network request with the visitor's data** — no model, no API, nothing.

**Why:** watermarking is a permanent creator and seller need. The incumbents process server-side (iLoveIMG
"batch watermark your images online, easy and free"; Fotor "upload up to 50") [1][2]. Proton already markets a
private, browser-based batch watermarker [3], so privacy alone is not the whole wedge: craft is — a WYSIWYG
preview that *is* the export, careful placement that holds across mixed aspect ratios, and Capytools' calm.

**Owner decisions (2026-10-03) — do not re-litigate:**

| # | Decision |
|---|---|
| D1 | Name **CapyStamp**, route **`/capystamp`**, tool no. **13**. CapyBg is being built in parallel as tool no. 12 and merges first; CapyStamp appends after it (§8.4 covers merge coordination). |
| D2 | **Free batch, capped:** up to **20 images per run** (`FREE_BATCH_LIMIT`, one constant), processed one at a time, out as a ZIP. A future Pro tier may raise the cap; **no Pro, upsell or paywall copy in v1.** |
| D3 | The plan lives in tracked `docs/plans/` so any agent can read it. |

**Design choices this plan makes (reasoned below):**

- **No new dependencies.** Canvas 2D for drawing; reuse CapyResize's `decodeImage`, `encodeCanvas`,
  `zipPack` and the honest-bytes helpers by importing them — **do not** move or refactor them (another agent is
  working in parallel; shared-file churn means merge conflicts).
- A watermark is specified **relative to the image** (size as a fraction of the short side, position as an
  anchor plus a fractional offset), so one design lands correctly on portrait, landscape and square images in
  the same batch.

---

## 1. Scope

### In v1

- **Input:** drop, pick or paste one image or many (JPEG, PNG, WebP, AVIF, GIF first frame). Up to
  `FREE_BATCH_LIMIT` (20) per run. EXIF orientation honoured.
- **Text mark:** text, font (the three house faces + system sans/serif/mono), weight, size, colour, opacity,
  rotation, letter spacing, and an optional **legibility halo** (soft shadow or thin outline) for busy photos.
- **Logo mark:** PNG, SVG or WebP; scale, opacity, rotation. Aspect kept.
- **Placement:** 9-point anchor grid **plus** free drag on the preview (stored as a fractional offset);
  **tiling** — none, grid, or diagonal — with a gap control.
- **Preview:** live, on the currently selected image, at a canonical display size; the export is drawn by the
  **same function** at full size (WYSIWYG).
- **Batch:** a thumbnail strip of the queued images; click to preview any one; one design applies to all.
  Per-file status (queued / stamping / done / failed with reason); a failure never aborts the run.
- **Output:** PNG / JPEG / WebP, quality slider (JPEG/WebP), honest before/after bytes per file and in total.
  One image → direct download; several → **one ZIP** (`client-zip`, already a dependency), plus per-file
  download links.
- **Presets:** save, apply and delete named designs in `localStorage` (settings only — **never** image or logo
  bytes).
- Full registration per CONTRIBUTING "Adding a tool" (§8).

### Not in v1 — do not build

- No route, no upload, no third-party request, no analytics. If you add a `fetch`, stop and re-read §3.4.
- No PDF watermarking (needs a maintained PDF writer — §12). No video. No invisible/steganographic marks.
- **No watermark removal** — a different, abuse-adjacent tool.
- No per-image overrides inside a batch (one design for the run). No saved logo library, no brand kits — those
  are future Pro seams (§12).
- No "Pro", "upgrade" or "unlock" strings anywhere.

---

## 2. Read these first

1. **`AGENTS.md`** — the Next.js 16 warning (read `node_modules/next/dist/docs/` before app-router code), the
   hydration pattern (§3), and the Cloudflare Workers rules (§6).
2. **`CONTRIBUTING.md` → "Adding a tool"**. **Stale line:** the eyebrow is now **derived** by `ToolPageShell`
   from the tool's position in `SUITE` — do **not** pass `eyebrow` and do not type the tool number anywhere.
   (`.agents/skills/capytools-dev/SKILL.md` §1 repeats the stale instruction — ignore it.)
3. **`PRODUCT.md`** (open and local; "show, don't claim"; every promise scoped truthfully) and **`DESIGN.md`**
   (tokens, type ramp 10/11/12/13/14/15/16/18/21/26 px, radii 6/12/16/24/full).
4. **`.agents/rules/production-invariants.md`** — storage and hydration, WCAG.
5. **Templates — copy the patterns, import the helpers:**
   - Page: `src/app/capyresize/page.tsx` (`toolMetadata()` + `ToolPageShell`).
   - Tool layout: `src/components/tool/CapyQR.tsx` — `StageCard`s, the sticky result column at `lg`, the phone
     **download dock** portalled to `document.body`, named colour swatches (`SWATCH_NAMES` in
     `src/lib/capyqr/presets.ts`), the 13px pill style, undo/reset.
   - Image I/O: `src/lib/capyresize/render.ts` — `decodeImage(file)` (object URL → `<img>` → `decode()`, so
     the browser applies EXIF orientation; sniffs the kind; flags animated GIFs), `encodeCanvas(canvas, format,
     quality, { flatten })`, `zipPack(files)` (lazy `import("client-zip")`, STORE-only), `isWebpFallback`,
     `outputRefused`, `MAX_OUTPUT_PIXELS`, `formatBytes`, `savingsPercent`, `extensionFor`.
   - Drop/paste: `src/components/tool/CapyStrip.tsx`.
   - Shared UI: `src/components/stage-card.tsx` (`StageCard`, `StageChip`, `STAGE_TONE`),
     `src/components/tool/ErrorCard.tsx`, `src/components/Reveal.tsx`.
   - Storage example: `src/lib/capytools/llm.ts` — read in a hydrate effect, **validate on the way out of
     storage**, swallow quota/disabled-storage errors.
6. **`tests/share.test.ts`** — phrasing rules for privacy copy.

**Invariants that are easy to break here:**

- **Hydration:** never read `localStorage` (presets) in a `useState` initializer — use the `useCallback` +
  `useEffect` hydrate pattern (AGENTS.md §3). Server markup must not depend on stored presets.
- **Reduced motion:** never render different markup for `prefers-reduced-motion`; reveals use `data-reveal` and
  zero the transition (PR #58 — forking the markup blanked the landing).
- One sage primary per screen; 44px touch targets on coarse pointers; text ≥4.5:1; one focus treatment.

---

## 3. Technical facts and traps

### 3.1 Stack

- **Canvas 2D only. No new runtime dependency.** `client-zip` is already in `package.json` and is reached
  through `zipPack`'s dynamic import, so it costs nothing until a batch is zipped.
- Decode with `decodeImage` (CapyResize). It throws `DecodeFailedError` on bad input; a canvas the browser
  refuses throws `CanvasRefusedError` — map both to per-file failure reasons.

### 3.2 The #1 silent bug — font readiness

Canvas text uses whatever font is loaded **at the moment of drawing**. If the face isn't ready, the preview
paints a fallback and the export may differ. Before the first preview and before a batch run:

```ts
await document.fonts.load(`${weight} 64px ${family}`);
```

**House faces come from `next/font`** (`src/app/layout.tsx`: Plus Jakarta Sans → `--font-sans`, Fraunces →
`--font-display`, Albert Sans → `--font-mono`). Their real family names are generated, so read them at runtime:
`getComputedStyle(document.documentElement).getPropertyValue("--font-display")` → a family list; use it as-is
in `ctx.font`. Parse/format helpers are pure and tested. Only the weights `next/font` actually loads are
available — offer those, not a free weight slider. System faces (`system-ui`, `Georgia`/`serif`,
`ui-monospace`) need no loading.

### 3.3 Geometry that survives a mixed batch

A design is stored relative to each image, never in pixels:

- `size` — fraction of the image's **short side** (0.02–0.5). Text: the font size. Logo: its longer side.
- `anchor` — one of 9 points (`tl … br`) with `offset` as a fraction of width/height (drag writes the offset).
- `rotation` in degrees around the mark's centre; `opacity` 0.05–1.
- `tiling` — `none` | `grid` | `diagonal`, with `gap` as a fraction of the mark's own size.
- **Safe margin:** keep untiled marks inside a margin (e.g. 3% of the short side) unless the visitor drags
  past it.

Pure helpers — `markBox(imageW, imageH, spec, measured)`, `anchorPoint(…)`, `tilePositions(…)` — are the
heart of the tests: the same spec must land proportionally on 4000×3000, 3000×4000 and 1080×1080.

### 3.4 Network promise

- The only requests after page load are the page's **own JS chunks** (the lazy `client-zip` chunk). **No
  request ever carries an image, a logo, or anything derived from them.** A boundary test enforces "no `fetch(`"
  in `src/lib/capystamp/` and `CapyStamp.tsx`.
- Copy: "your photos never leave this tab" / "nothing uploaded". Don't write "offline" unless you have verified
  the page works offline after load (it may — but prove it before you print it).
- A watermark is a deterrent, not protection: **no DRM-implying copy** ("protect your photos forever" is out;
  "put your mark on it" is in).
- Don't name competitors in product copy.

### 3.5 Batch memory and pacing

- **One image in memory at a time:** decode → draw → encode → push the `Blob` into the result list → release
  the decoded image and canvas → next. Never hold N decoded bitmaps.
- Yield between files (`await` a `setTimeout(0)` or `scheduler.yield()` when present) so the UI updates and
  stays responsive. A 20-photo run of 12 MP images is fine on the main thread with this pacing; **no worker is
  needed in v1** (canvas in a worker means `OffscreenCanvas` and a different decode path — not worth it yet).
- Results are `Blob`s; the ZIP is built once at the end with `zipPack`. Revoke every object URL you create.
- **Over the cap:** queue the first 20 in drop order and say plainly what happened — *"CapyStamp does 20 images
  at a time; the first 20 are queued. Drop the rest after this run."* Not an upsell.
- Files over `MAX_OUTPUT_PIXELS` / refused canvases fail **that file** with a reason; the run continues.

### 3.6 Logo specifics

- PNG/WebP via `decodeImage`. **SVG** drawn through `<img>` needs intrinsic dimensions: if the SVG has no
  `width`/`height` (only a `viewBox`), its natural size may be 0 or 300×150 — detect and rasterise at a size
  derived from the viewBox. Test with both kinds.
- The logo lives in memory for the session only; presets never store it (they store "logo: none/re-pick").

---

## 4. File map

```
docs/plans/capystamp.md              this plan
docs/plans/capystamp.sources.json    citations
src/lib/capystamp/
  types.ts      StampSpec (TextMark | LogoMark), Anchor, Tiling, OutputOptions, StampResult, QueueItem
  spec.ts       defaults, clamps, validate(), serialise()/parse() for presets (pure)
  geometry.ts   markBox, anchorPoint, tilePositions, safe margin (pure)
  fonts.ts      house-face family resolution + font string building + ensureFontLoaded() (pure + browser)
  render.ts     drawStamp(ctx, image, spec, logo?) — the single drawing function for preview AND export
  stamp.ts      stampOne(file, spec, output, logo?) → StampResult   (the per-file seam)
  batch.ts      runBatch(files, spec, output, logo?, onItem) — sequential queue, cap, per-file errors (logic pure-testable with a fake stampOne)
  names.ts      output filename + de-duplication + ZIP name (pure)
  presets.ts    localStorage read/validate/write, max 12 presets, key "capystamp:presets:v1"
  demo.ts       DEMO spec + demo image for the idle state (no network)
src/components/tool/CapyStamp.tsx
src/app/capystamp/page.tsx
public/plates/lab-13.webp            896×1200 lab plate (owner-supplied image, §8.3)
tests/capystamp.test.ts
tests/capystamp-boundaries.test.ts
```

---

## 5. Core pipeline

### 5.1 Types and the seam

```ts
export type Anchor = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
export interface MarkCommon {
  size: number; opacity: number; rotation: number;
  anchor: Anchor; offset: { x: number; y: number };
  tiling: "none" | "grid" | "diagonal"; gap: number;
}
export interface TextMark extends MarkCommon {
  kind: "text"; text: string; font: FontChoice; weight: number;
  colour: string; letterSpacing: number; halo: "none" | "shadow" | "outline";
}
export interface LogoMark extends MarkCommon { kind: "logo" }
export type StampSpec = TextMark | LogoMark;
export interface OutputOptions { format: "png" | "jpeg" | "webp"; quality: number }
export interface StampResult {
  name: string; blob: Blob; mimeType: string;
  width: number; height: number; bytesBefore: number; bytesAfter: number;
  notes: string[];   // honest fallbacks: WebP→PNG swap, first GIF frame only, …
}
export function stampOne(file: File, spec: StampSpec, output: OutputOptions, logo?: HTMLImageElement): Promise<StampResult>;
```

`stampOne` is the seam for any future Pro feature: the batch is already a loop over it.

### 5.2 `drawStamp` — one drawing function

`drawStamp(ctx, source, spec, logo?)` draws the source at its natural (oriented) size, then the mark(s) at the
positions `geometry.ts` computes, with `globalAlpha`, rotation about the mark centre, letter spacing
(`ctx.letterSpacing` where supported; otherwise draw per glyph — pick one and test the measurement), and the
halo. The preview calls it on a scaled canvas; the export calls it at full size. **There is no second renderer.**

### 5.3 Encode

`encodeCanvas` from CapyResize, then `isWebpFallback(requested, blob.type)` → note
*"your browser saved PNG — it can't encode WebP"*. JPEG flattens onto white (or the image's own background —
JPEG has no alpha). Report real byte counts; never estimate.

### 5.4 Batch

`runBatch` walks the queue in order, calls `stampOne` per file, reports `onItem(index, status, result | error)`,
yields between files, and never throws for one file's failure. Cancel stops after the current file and keeps the
finished ones. At the end: one result → offer direct download; several → `zipPack` and offer the ZIP plus
per-file links. Names come from `names.ts`: `<base>-stamped.<ext>`, de-duplicated (`photo-stamped.jpg`,
`photo-stamped-2.jpg`), ZIP named `capystamp-<n>-images.zip`.

### 5.5 Presets

`presets.ts` mirrors `llm.ts`: read in the hydrate effect, `parse()` every entry on the way **out** of storage
(drop malformed ones silently), cap at 12, swallow storage errors (private mode works, just without presets).
A preset stores the spec minus any logo; applying a logo preset prompts to pick the logo again.

---

## 6. UI spec — `CapyStamp.tsx`

Three `StageCard`s; at `lg` the preview card is a sticky right column; on phones a bottom download dock
portalled to `document.body` (CapyQR's pattern, `inert` while the results are in view).

**Card 01 · The photos**
- Dashed `rounded-3xl` dropzone: click, drag-and-drop (multiple), paste. Copy: "drop photos — up to 20 at a
  time".
- Idle: the demo image with the demo mark and a "demo" chip.
- When files are queued: a horizontally scrolling **thumbnail strip** (keyboard-navigable list; the selected one
  drives the preview), count "7 photos · 18.4 MB", remove-one and clear-all.

**Card 02 · The mark** (controls, in sentence-case 13px pills like CapyQR)
- Text / Logo switch.
- Text: field, font pills (Sans · Serif · Mono + the three house faces, named in plain words), weight,
  colour (named swatches + picker), letter spacing, halo (none / shadow / outline).
- Logo: pick a file; size; the logo's own preview.
- Common: size, opacity, rotation (with a "reset to 0°" button), the **9-point anchor picker** (a radio group
  with real labels — "top left" … "bottom right" — never colour alone), tiling (none/grid/diagonal) + gap.
- Undo / reset to defaults; presets row (save as…, apply, delete).

**Card 03 · The preview and output**
- Live preview of the selected image; drag the mark to set the offset (pointer + arrow keys for nudging,
  Shift for bigger steps). A thin safe-margin guide shows while dragging.
- Format (PNG / JPEG / WebP), quality slider for JPEG/WebP.
- **Stamp** (single image: "Stamp & download"; batch: "Stamp 7 photos") — the one sage primary, full width,
  44px. During a run: progress ("4 of 7"), per-file status in the strip, Cancel.
- After: totals (before → after bytes), notes, "Download ZIP" (or the single file), per-file links.

**States:** empty, demo, queued, running, done, partial failure ("6 stamped, 1 couldn't be read — it's an
HEIC; export it as JPEG"), all-failed, over-cap notice. Results region `aria-live="polite"`, `scroll-mt-24`.

### 6.1 Page

```tsx
export const metadata = toolMetadata("CapyStamp", {
  title: "CapyStamp — watermark photos in your browser",
  description:
    "Add a text or logo watermark to one photo or twenty, with full control over placement, size, opacity and tiling. 100% in your browser — your photos are never uploaded.",
});

<ToolPageShell
  tool="CapyStamp"
  headline={[{ text: "Put your" }, { text: "mark on it", em: true, dot: true }]}
  lead="watermark one photo or a whole batch, in your browser. nothing uploaded."
  align="left"
>
  <CapyStamp />
</ToolPageShell>
```

---

## 7. Performance

- Nothing heavy on load: `client-zip` is lazy (via `zipPack`); no other new code paths outside the page.
- Preview redraws are throttled to animation frames while dragging or sliding; the preview canvas is display
  size, not full size.
- Targets to measure and record in the PR: a 20 × 12 MP JPEG batch completes without the tab freezing
  (UI keeps updating between files) on a mid-range laptop; peak memory stays near one decoded image.

---

## 8. Registration and copy

### 8.1 `SUITE` row (`src/lib/capytools/suite.ts`, appended **after CapyBg** — position 13)

```ts
{
  name: "CapyStamp",
  short: "Stamp",
  href: "/capystamp",
  cat: "browser",
  badge: "Stamp",
  appCategory: "MultimediaApplication",
  blurb:
    "Put your mark on one photo or twenty — text or a logo, placed once and carried across every shape of image, tiled if you like. The photos never leave your tab.",
  note: "watermarks",
  line: "Watermark one photo or a whole batch, in your browser.",
  keywords: ["watermark", "add watermark", "logo watermark", "batch watermark",
             "copyright", "stamp photos", "brand photos", "no upload"],
  plate: { src: "/plates/lab-13.webp", width: 896, height: 1200 },
},
```

### 8.2 The rest of the recipe

1. `PLATES` in `src/lib/capytools/landing.ts` gains `"lab-13"`.
2. `README.md`: a **"## 13. CapyStamp"** section; first line becomes **"…Thirteen so far. Twelve run in your
   browser and keep nothing; one lives on your desktop and keeps your files there."** Verbatim-identical in
   `README.md`, `COLOPHON.quote` (`landing.ts`) and `package.json` `description` (tests assert the trio, and
   `tests/landing.test.tsx` asserts the README section headings — add `## 13. CapyStamp`).
3. `tests/tool-pages.test.tsx`: add the CapyStamp row; every `Nº NN / 12` becomes `/ 13`.
4. Everything else (masthead, footer, `/tools`, `/notes`, sitemap, `llms.txt`, counts, the landing's
   `11/12 in-tab` stat → `12/13`) derives from `SUITE`. Fix any test that hard-codes a count to derive it.

### 8.3 Lab plate — owner dependency

`public/plates/lab-13.webp`, 896×1200, an object still-life in the lab-plate style (see `lab-1…lab-11`),
**no baked-in text**. Image generation is the owner's step; until it exists the asset test fails. Never reuse
another tool's plate as a placeholder; flag it in the PR.

### 8.4 Merge coordination with CapyBg (in flight)

CapyBg (plan: `docs/plans/capybg.md`) also edits `suite.ts`, `landing.ts` (`PLATES`), `README.md`,
`package.json`, and `tests/tool-pages.test.tsx`.

- **Default order: CapyBg merges first.** Build CapyStamp on a branch from `main`; before opening the
  registration PR (§14 PR 2), rebase onto `main`. Expect conflicts in exactly those five files: keep **both**
  rows/sections, CapyStamp after CapyBg, and re-derive the counts above (thirteen, `/ 13`, `12/13`).
- **If CapyStamp is ready before CapyBg has merged:** finish PR 1 (engine, which touches none of those files),
  and hold PR 2 until CapyBg lands — or ask the owner whether CapyStamp should merge as tool no. 12 (then the
  numbers above drop by one, and CapyBg's agent rebases). Do not guess.
- After any rebase, run the **whole** suite — the count trio and tool-pages denominators are cross-asserted.

---

## 9. Tests (vitest, node environment, no network)

`tests/capystamp.test.ts`
1. **geometry.ts** — anchor points for all 9 anchors; fractional offset maps proportionally across 4000×3000,
   3000×4000, 1080×1080; safe-margin clamp; `tilePositions` covers the image (grid and diagonal) with the
   configured gap and no runaway counts on tiny marks (cap the tile count).
2. **spec.ts** — defaults validate; clamps (size, opacity, rotation wrap); `parse(serialise(x))` round-trips;
   malformed input rejected.
3. **fonts.ts** — family-list parsing from a `next/font` variable value; font string building (`weight size
   family`); unknown choice → safe fallback.
4. **batch.ts** — with a fake `stampOne`: respects order; stops at `FREE_BATCH_LIMIT` and reports the overflow;
   a thrown file is marked failed and the run continues; cancel keeps finished results.
5. **names.ts** — `<base>-stamped.<ext>`, de-duplication, extension per format, ZIP name, odd names (no
   extension, dots, unicode).
6. **presets.ts** — round-trip; malformed entries dropped on read; cap of 12; logo never serialised.
7. **Page metadata** — title contains "CapyStamp"; description contains "100% in your browser".

`tests/capystamp-boundaries.test.ts`
1. No `fetch(` in `src/lib/capystamp/` or `src/components/tool/CapyStamp.tsx`.
2. No new dependency: `package.json` dependencies unchanged by this PR except what the plan allows (none).
3. `FREE_BATCH_LIMIT` is defined once and used by both the UI copy and `batch.ts`.
4. No "Pro", "upgrade", "unlock" strings in CapyStamp sources.

Prove each new test fails when the code it guards is broken (break it, see red, restore).

---

## 10. Definition of done

- `npm run test` (all green, including pre-existing), `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Judge in a production build (`npm run build && npx next start`), not `next dev`.
- Browser checks, with evidence in the PR:
  - A text mark: the exported file matches the preview (overlay the two or compare screenshots).
  - A house font on first load: the preview never shows a fallback face (hard reload with cache disabled).
  - A batch of 20 mixed portrait/landscape/square photos: the mark lands proportionally on all; ZIP opens; names
    de-duplicated; UI stays responsive during the run.
  - 21 files dropped: 20 queued, the honest notice shows.
  - An HEIC or corrupt file in a batch: that file fails with a reason; the others finish.
  - SVG logo with only a `viewBox`, and a transparent PNG logo.
  - WebP in Safari: the swap note appears if Safari saves PNG.
  - Presets survive a reload; private window still works without them.
  - **Network panel during a run: no request carries image data** (only same-origin JS chunks) — screenshot it.
  - 375×812 with touch: no horizontal overflow, 44px targets, dock works; reduced motion on: nothing hidden.
- After merge: CI deploy + `scripts/smoke.mjs` green (it walks every `SUITE` page).

---

## 11. Risks and open questions (with defaults)

| # | Risk | Default / mitigation |
|---|---|---|
| R1 | Font readiness → preview/export mismatch | `document.fonts.load` before preview and batch; test the helper; manual hard-reload check. |
| R2 | `ctx.letterSpacing` support varies | Feature-detect; fall back to per-glyph drawing; measure with the same method you draw with. |
| R3 | SVG logos without intrinsic size | viewBox-derived rasterisation; test both shapes. |
| R4 | Memory on phones with large batches | One image at a time; refuse oversize per file; the cap of 20. |
| R5 | Legibility over busy photos | The halo option; never claim the mark is unremovable. |
| R6 | Merge collision with CapyBg | §8.4. |
| R7 | The cap feels arbitrary | It is one constant; copy explains it plainly; revisit with real use. |

---

## 12. Backlog — not v1

- **Pro seams** (behind the monetisation platform, `docs/research/monetisation/implementation-plan.md`):
  raise the batch cap, saved logo library, brand kits (logo + fonts + colours), per-image overrides.
- **PDF watermarking** — needs a maintained PDF writer (`pdf-lib` has had no push since 2024-07-17 [4]).
- Text from EXIF (date, camera) and `©` + year helpers; corner-padding presets for marketplaces.
- Programmatic SEO pages ("watermark real-estate photos", "watermark Etsy listings") once the tool proves out.

---

## 13. Out of scope for this plan

Desktop variant: none planned — watermarking does not need native power.

---

## 14. Suggested PR sequence

1. **Engine** — `types`, `spec`, `geometry`, `fonts`, `render`, `stamp`, `batch`, `names`, `presets`,
   `demo`, with `tests/capystamp.test.ts` and the boundaries test. Touches no shared registration file — can
   merge any time.
2. **Tool + registration** — `CapyStamp.tsx`, the page, the `SUITE` row and the recipe (§8), after rebasing on
   `main` per §8.4; definition-of-done evidence in the PR body; plate flagged if missing.
3. **Polish** — run `/impeccable critique` on `/capystamp` and fix what it finds.

Conventional Commits; CI green; **merging deploys — the owner merges every PR.**

---

## 15. Sources

See [`capystamp.sources.json`](./capystamp.sources.json): [1] iLoveIMG · [2] Fotor · [3] Proton ·
[4] pdf-lib activity · [5] repo helpers and fonts.
