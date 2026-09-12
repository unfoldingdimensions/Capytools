# CapyResize (tool no. 8) — Implementation Plan

*Prepared 2026-09-13 by the orchestrator session. This document is a complete handoff: an agent
session that has never seen this conversation should be able to implement CapyResize from it alone.
Read §1–§4 before writing any code. Citation keys `[n]` resolve to
[`./sources.json`](./sources.json). Positioning research:
[`../expansion/roadmap.md`](../expansion/roadmap.md).*

---

## 1. Mission & scope

**CapyResize** — "every size it needs to be." A 100%-client-side image resizer, format converter,
and favicon/app-icon pack generator, in **one tool with two stages** (this is the expansion
roadmap's single candidate "CapyResize / CapyFavicon"; the split into two registered tools is a
documented option in §10, not v1):

1. **Resize & convert** — drop a photo, set a target width (aspect-locked), pick an output format,
   download. Progressive-halving downscale (not a naive one-pass `drawImage`), honest
   before/after byte counts, EXIF orientation applied automatically.
2. **Favicon pack** — drop one square-ish image, get a ZIP with every icon a modern site needs
   (ICO, apple-touch, PWA 192/512 + maskable, manifest, copy-paste `<head>` snippet), each traced
   to a primary source, plus a 16/32 px live preview strip — the "does my logo survive a tab
   icon?" proof moment.

The privacy claim is the product: TinyPNG-class demand [14], but the incumbents upload your files.
Ours never leave the tab.

### In scope (v1)

- **Stage A (Resize & convert):** input JPEG/PNG/WebP/GIF(first frame)/BMP/AVIF; output
  PNG/JPEG/WebP; target width with aspect lock; JPEG/WebP quality slider; JPEG alpha-flatten onto
  a picked background; before/after bytes + savings %.
- **Stage B (Favicon pack):** one image in → `favicon.ico` (16+32+48, PNG-encoded frames) +
  `apple-touch-icon.png` (180, opaque, square corners) + `icon-192.png` + `icon-512.png` +
  `icon-maskable-512.png` (opaque, art inside the 40%-radius safe zone) +
  `manifest.webmanifest` (editable name/short_name) + `html-snippet.txt` + `favicon.svg`
  passthrough when the input *is* SVG. ZIP via `client-zip`.
- ICO container written by hand (~40 lines, pure function, golden-byte tests) — no dependency.
- Live previews at real sizes (16/32 px strip in Stage B; the actual output image in Stage A).
- Full SUITE registration — **tool no. 8**, including the renumber chore and the plate asset.

### Out of scope (v1 — do NOT build)

- **No server routes.** If you find yourself adding `src/app/api/...`, stop — scope violation.
- No multi-file batch queue (the documented Pro seam — single-input only; Stage B's many *outputs*
  from one input is fine, a queue of many *inputs* is not).
- No crop/rotate/flip editors, no watermarking, no PDF, no AVIF output (no browser encodes it [3]).
- No ICO from non-square sources beyond automatic center-crop; no animated output.
- No localStorage/sessionStorage of anything; no refactors of other tools or the shell.

---

## 2. Read these first (repo law)

1. **`AGENTS.md`** — including the top warning: **this Next.js is not the Next.js in your training
   data.** Read the relevant guide in `node_modules/next/dist/docs/` before app-router code.
2. **`.agents/rules/production-invariants.md`** — storage/hydration, WCAG, layout rules.
3. **`.agents/skills/capytools-dev/SKILL.md`**, **`CONTRIBUTING.md`**, **`DESIGN.md`** (copy
   **Register**: headline sentence-case, lead + UI copy lowercase).
4. **`src/lib/capytools/suite.ts`** — the registration source of truth (read its docstring; note
   `suiteNumber`, `SUITE_INDEX`, `pad2`).
5. **The freshest exemplars:** `src/app/capyqr/page.tsx` (ToolPageShell usage) and
   `src/components/tool/CapyQR.tsx` + `src/lib/capyqr/` (current lib/component layering,
   client-only module loading, guard-strip UI pattern). Mirror these, don't invent.
6. **`tests/tool-pages.test.tsx`** — the shell contract (eyebrow, one h1, clay dot, back link,
   skip link, **zero external hrefs on tool pages**, sentence-case headline / lowercase lead,
   corner marks). **You will edit this file** (§8.4).
7. **`tests/security.test.ts`** — repo-wide storage/network guard; keep it green.

**Ethos invariants (hard):** zero network calls at runtime; nothing written to storage; object
URLs revoked on replace/unmount; the standard hydration pattern (nothing storage/random in state
initializers). File work starts from user events only.

---

## 3. Verified technical facts (design constraints)

All verified 2026-09-13 against primary sources; ledger in `./sources.json`.

### 3.1 Decode & encode matrix (2026 browsers)

- **Decode** (via `HTMLImageElement` + `drawImage`): JPEG, PNG, WebP (Safari 14+), GIF, BMP, ICO,
  SVG all universal; AVIF Chrome 85/Firefox 93/Safari 16.1+ [1]. **Animated GIF = first frame by
  spec** ("the user agent must use the default image of the animation") [2] — surface a note when
  the input is animated GIF ("first frame used").
- **Encode** (`toBlob`/`convertToBlob`): PNG + JPEG universal; **WebP encodes in Chrome/Edge/
  Firefox only — Safari (desktop + iOS) still silently falls back to PNG in 2026**, and the spec
  mandates the silent fallback ("if the given format is not supported… exported as image/png") [3].
  Detect with `blob.type === "image/webp"` after encoding and surface an honest note.
  **AVIF: no browser encodes it** (inferred from the spec/MDN enumerations — flagged) [3].
- `OffscreenCanvas` + `convertToBlob`: Safari 16.4+ [4]. You don't need OffscreenCanvas for v1 —
  a plain canvas per output is fine.

### 3.2 Orientation & downscale quality

- **EXIF orientation is handled by the platform**: `image-orientation: from-image` is the CSS
  initial value and Baseline since April 2020; `createImageBitmap`'s default is also `from-image`.
  **Omit orientation options entirely** — the literal `"from-image"` string is only accepted
  Chrome 112+/Firefox 111+/Safari 16+, and older browsers already apply the default behavior [5].
- **One-pass large-ratio `drawImage` downscale is cross-browser-inconsistent**: `ctx.
  imageSmoothingQuality` is not implemented in Firefox; `createImageBitmap` `resizeQuality: "high"`
  is Chromium/Safari-old/Firefox-149+ (weeks old) and implementation-defined [6]. The portable,
  dependency-free answer is **progressive halving** (repeated ~50% steps, then one fractional
  final step, `imageSmoothingEnabled = true` throughout) — a community technique with no primary
  spec (flagged); it is what production tools ship, and it makes output deterministic enough
  across browsers [6]. Do not add `pica` in v1 (noted in §10 for icon-grade sharpness later).

### 3.3 Canvas limits & the by-design avoidance

Community-measured ceilings (canvas-size project — flagged, no vendor documentation exists):
iOS area cap **16.7 M px** with an effective 4096 px/side; desktop Chrome area 268 M px; failures
are **silent** — `toBlob` resolves `null`, `toDataURL` returns `"data:,"` [7].

**The design dodges most of this:** never create a source-sized canvas. Decode into an
`HTMLImageElement` and draw **directly from the `<img>` to the output-sized canvas** (`drawImage
(img, 0, 0, outW, outH)` — also faster and cheaper on memory; for halving, intermediate canvases
are at most half the previous step, starting from the source only once). Still guard: reject
outputs above 8192 px/side or 16.7 M px with a calm message, and treat `toBlob → null` as a
typed error with a "try a smaller size" note [7].

### 3.4 ZIP: `client-zip` ^2.5.0 (MIT, ~2.6 KB gzipped, active 2026)

`downloadZip(files).blob()` where `files` is an array of `{ name, lastModified, input }` and
`input` is a `Blob`/`Uint8Array` [8]. It is **STORE-only (no compression)** — exactly right here:
PNGs are already compressed, and ICO/manifest/text are tiny. (fflate 0.8.3 is the fallback pick
only if you ever need real compression; JSZip 3.10.2 is the heavy one — not used.)

### 3.5 JPEG quality & byte accounting

`toBlob(cb, "image/jpeg", quality)` — quality 0–1, universal since Chrome 50/Firefox 25/Safari 11;
PNG ignores it; out-of-range values silently use the browser default [9]. `blob.size` is the
output byte count for the savings display [10]. Note: JPEG *encode* size is not deterministic
across browsers — never promise a byte count before encoding; always show the encoded result.

### 3.6 Favicon pack — the traced spec set

Every file in the ZIP traces to a primary source [11–15]:

| File | Spec | Source trace |
|---|---|---|
| `favicon.ico` — 16, 32, 48 px frames, **PNG-encoded** | ICO: 6-byte ICONDIR (`reserved=0, type=1, count`), then 16-byte ICONDIRENTRY per frame (`bWidth`/`bHeight` bytes, **0 means 256**, `bColorCount=0`, `bReserved=0`, `wPlanes=0 or 1`, `wBitCount`, `dwBytesInRes`, `dwImageOffset` — all little-endian). PNG-in-ICO confirmed since Windows Vista; "Microsoft recommends… stored in PNG" [12] | [12][13] |
| `apple-touch-icon.png` — **180×180**, square corners, opaque | Apple's selection rule makes one 180 file cover all devices ("the most appropriate size… is used"; larger downscale); iOS applies its own mask — do NOT pre-round (HIG-sourced, quote-unverified — flagged) [13] | [13] |
| `icon-192.png`, `icon-512.png` | Chrome install criteria verbatim: "must include a 192px and a 512px icon". The old 36/48/72/96/144 ladder is dead — no current source requires it | [14] |
| `icon-maskable-512.png` — **separate file**, opaque bg, art inside the central circle of radius **40%** of icon size | W3C manifest spec safe-zone wording; web.dev: never combine `"any maskable"` ("adds unnecessary padding") — a separate entry with `"purpose": "maskable"` | [14][15] |
| `manifest.webmanifest` | name, short_name, start_url `/`, display `standalone`, icons array with `sizes` + `type` on every entry (+ maskable entry) | [14] |
| `html-snippet.txt` | the exact 4-line block below | [13][14][16] |
| `favicon.svg` | passthrough only when the input is SVG (raster→vector is out of scope) | [16] |

The exact `<head>` snippet shipped in `html-snippet.txt` (every line independently traced;
`sizes="32x32"` on the ICO link is community-sourced — it stops Chrome downloading both files
[16]):

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

Cruft explicitly **not** generated: `msapplication-TileImage`/`browserconfig.xml` (archived IE9-era
Microsoft doc; no current Edge/Windows requirement) [17], `mask-icon` (Safari 12+ uses the regular
favicon) [16], `rel="shortcut icon"` (never a valid relation) [16], `theme-color` (out of scope).

SVG-favicon browser reality: Chrome 80+/Firefox 41+/**Safari 26+** — ~91.6% global, which is why
the pack ships both ICO and (when available) SVG, and why the snippet keeps the ICO line first [16].

### 3.7 Maskable art math (pure function)

Safe zone = circle of radius `0.4 × size` centered. For the 512 maskable: art scaled to fit a
**409 px box** (80%) centered on an opaque background (user-picked, default sampled from the
input's corner pixel — pure `sampleCornerColor(imageData)`). The 80% fit is the community
restatement of the 40%-radius rule — the rule itself is spec [15].

---

## 4. File map (everything you will create or touch)

```
src/lib/capyresize/
  types.ts       # StageId, InputKind, OutputFormat, ResizeRequest, ResizeResult, PackFiles, GuardNote
  sniff.ts       # decode-kind sniff by magic bytes + reported type; isAnimatedGif hint (pure)
  steps.ts       # halveSteps(srcW, srcH, outW, outH) → intermediate sizes; fitBox(); aspect math (pure)
  ico.ts         # buildIco(frames: { size: number; png: Uint8Array }[]) → Uint8Array (pure, little-endian)
  pack.ts        # PACK_SPECS: the file manifest of §3.6 as data (name, size, purpose) + headSnippet
                 # + buildManifest(name, shortName) (pure)
  render.ts      # browser-only: decodeImage(file) → HTMLImageElement (+dims), drawResized(img, steps,
                 # out) → canvas, encodeCanvas(canvas, format, quality, {flatten}) → Blob (null → typed
                 # error), zipPack(files: PackFiles) via client-zip, sampleCornerColor, maskableCanvas
  demo.ts        # DEMO state (a tiny generated-on-canvas capybara-ish placeholder is NOT wanted —
                 # ship a static demo state description + "drop a file to start" idle, mirroring
                 # CapyQR's idle posture)
src/components/tool/CapyResize.tsx # the editor (two-stage tabs)
src/app/capyresize/page.tsx        # ToolPageShell — tool no. 8
public/plates/lab-8.webp           # 896×1200 plate (§8.2)
tests/capyresize.test.ts           # pure-logic suite (§9)
```

Registration touches (§8): `src/lib/capytools/suite.ts`, `README.md`,
`tests/tool-pages.test.tsx`, the seven existing pages' `index="Nº 0X / 07"` literals.

**Dependency changes (the only allowed one):** `npm i client-zip@^2.5.0`. The ICO writer is
hand-rolled (§3.6). Nothing else.

### ⚠️ Branch & parallel-session note

The repo has been landing one tool per feature branch (`feat/capyqr` is current as of this plan).
Before committing: `git branch --show-current` + `git status`. If shared files (`suite.ts`,
`README.md`, `tests/tool-pages.test.tsx`, existing pages) carry uncommitted edits from another
session, commit only **your** files and stop before shared-file registration — report and await
orchestrator sequencing. Never revert or bundle someone else's edits.

---

## 5. Data layer (`src/lib/capyresize/`)

### 5.1 `steps.ts` (pure — heavily tested)

```ts
export function halveSteps(srcW: number, srcH: number, outW: number, outH: number): Array<{ w: number; h: number }>;
// [src] → repeated ~50% steps while the current width > 2× target → one final exact step.
// Rounding: each intermediate = max(1, round(current/2)); the FINAL entry is exactly (outW, outH).
export function fitWithin(srcW: number, srcH: number, maxW?: number, maxH?: number): { w: number; h: number };
export function scaleToWidth(srcW: number, srcH: number, width: number): { w: number; h: number };
export function centerSquare(w: number, h: number): { size: number; sx: number; sy: number };
// sx/sy = source-crop offset for a centered square crop (favicon stage)
```

Upscale policy: if `outW > srcW`, skip halving (single smoothing step) and warn once ("this grows
the image — pixels get softer, not sharper").

### 5.2 `ico.ts` (pure, byte-exact)

```ts
export function buildIco(frames: Array<{ size: number; png: Uint8Array }>): Uint8Array;
// ICONDIR (LE): u16 reserved=0, u16 type=1, u16 count
// per frame ICONDIRENTRY (LE): u8 width (size===256?0:size), u8 height (same), u8 colorCount=0,
//   u8 reserved=0, u16 planes=1, u16 bitCount=32, u32 bytesInRes=png.length, u32 imageOffset
// then the PNG payloads contiguous in frame order.
```

Test with golden bytes: build a 2-frame ICO from fixture PNG byte arrays and assert the exact
header/directory hex layout (offsets computed by hand in the test).

### 5.3 `pack.ts` (pure)

```ts
export interface PackSpec { file: string; size: number; purpose: "any" | "maskable"; opaque: boolean }
export const PACK_SPECS: PackSpec[];    // apple 180, icon-192, icon-512, icon-maskable-512 (80% art box)
export const ICO_SIZES = [16, 32, 48] as const;
export function buildManifest(name: string, shortName: string): string;   // exact JSON of §3.6
export const HEAD_SNIPPET = `...`;                                        // exact 4 lines of §3.6
export function maskableBox(size: number): number;                        // round(size * 0.8) — the art box
```

### 5.4 `render.ts` (browser-only; every fn guards `typeof window`)

```ts
export async function decodeImage(file: Blob): Promise<{ img: HTMLImageElement; width: number; height: number; kind: string }>;
// createObjectURL → new Image() → decode() → revoke in finally. decode() rejection → typed error
// (CMYK JPEG / AVIF-on-old-Safari / corrupt file) with a calm note; report-only is NOT a thing here —
// if it can't decode, CapyResize can't help; the error card says so plainly.
export function drawResized(img: HTMLImageElement, steps: Array<{w:number;h:number}>): HTMLCanvasElement;
// progressive halving (§3.2): intermediate canvases, imageSmoothingEnabled=true, final exact step
export function drawSquareFrom(img: HTMLImageElement, sx: number, sy: number, size: number, outSize: number): HTMLCanvasElement;
export async function encodeCanvas(canvas: HTMLCanvasElement, format: "png" | "jpeg" | "webp", quality: number, opts?: { flatten?: string }): Promise<Blob>;
// jpeg: fill flatten color FIRST (default "#ffffff"), then draw; webp: assert blob.type === "image/webp"
// after toBlob (Safari silent-PNG rule §3.1) — on mismatch return the PNG blob flagged as fallback
// null blob → throw typed CanvasRefusedError ("try a smaller size")
export async function zipPack(files: Array<{ name: string; blob: Blob }>): Promise<Blob>;
// client-zip downloadZip(files.map(f => ({ name: f.name, lastModified: Date.now(), input: f.blob }))).blob()
export function sampleCornerColor(img: HTMLImageElement): string;   // 4-corner median → hex
```

---

## 6. The editor (`CapyResize.tsx`) — two-stage tabs, house style

**Stage tabs** at the top of Card 1 ("Resize & convert" / "Favicon pack") — pill toggle like
CapyOG's format pills.

**Card 1 — "The drop."** Dropzone (click/drag/paste, mirroring CapyStrip's input plumbing). On
drop: sniff + decode with an honest loader ("reading → decoding → measuring"). Idle = empty-state
copy ("drop an image — nothing uploads"), no fake demo image (a placeholder bitmap would be a lie
about sizes; the house pattern here is CapyQR's quiet idle).

**Card 2 — "The dial."** *Resize & convert:* target width input (aspect-locked height shown) ·
format pills (PNG/JPEG/WebP; WebP carries its Safari note inline [3]) · quality slider
(JPEG/WebP only, 0.50–1.00, default 0.85) · flatten color picker (JPEG only; labeled "JPEG has no
transparency — this fills the background") · upscale warning when applicable. *Favicon pack:*
site name + short name inputs (feed `buildManifest`) · background color for opaque icons
(default = sampled corner) · pad toggle for apple-touch (default on — ~6% padding, community
convention, labeled as such [13]) · guard strip: "input is N×M — it will be center-cropped
square" note when non-square.

**Card 3 — "The proof."** *Resize & convert:* the output preview at real size (CSS-capped) ·
dimensions + `formatBytes(before) → formatBytes(after)` + savings % ("42% smaller") — TinyPNG
language, honest only after encoding (§3.5) · Download (`min-w-[84px]`, filename
`<name>-<width>w.<ext>`). *Favicon pack:* the 16/32/96 px preview strip at true pixel sizes (the
"survives the tab" moment) · file list of what's in the ZIP · Download ZIP (`min-w-[84px]`,
`favicon-pack.zip`) · `html-snippet.txt` contents shown in a mono well with Copy (`min-w-[84px]`)
· `aria-live="polite"` status line throughout.

Errors reuse `ErrorCard`. Memory hygiene: revoke every object URL; keep at most the latest output
set (a new drop replaces it).

### 6.1 Page metadata

```ts
export const metadata = {
  title: "CapyResize — image resizer, converter & favicon pack generator",
  description:
    "Resize and convert images (PNG, JPEG, WebP) with quality you can see, or drop one logo and get every favicon and app icon your site needs in a ZIP. 100% in your browser — files are never uploaded.",
};
```

Page shell: `ToolPageShell` exactly like `src/app/capyqr/page.tsx` — `tool="CapyResize"`,
`eyebrow="CapyResize · tool no. 8"`, `index="Nº 08 / 08"`, sentence-case headline with `em`
segment + `dot` (e.g. "Every size it *needs to be*."), lowercase lead ("resize, convert and
favicon-pack images in your browser. all local.").

---

## 7. UI copy register (binding)

Per `DESIGN.md` and `tests/tool-pages.test.tsx`: headline uppercase-start, lead/UI lowercase-start;
no exclamation marks; savings numbers only after real encoding; WebP-on-Safari and animated-GIF
notes state what actually happened, never a spec lecture; no "optimized like TinyPNG" comparisons
in copy — say "smaller, visibly" and show the bytes.

---

## 8. Registration (SUITE workflow) + renumber chore

1. **`src/lib/capytools/suite.ts`** — append the 8th row:
   ```ts
   {
     name: "CapyResize", short: "Resize", href: "/capyresize", cat: "browser", badge: "Resize",
     year: "2026",
     blurb: "Resize, convert and favicon-pack without uploading — progressive-halving quality, honest byte counts, and a 16-pixel proof strip before you ship.",
     note: "Bytes, proven",
     line: "Resize, convert and favicon-pack, entirely in-tab.",
     plate: { src: "/plates/lab-8.webp", width: 896, height: 1200 },
   }
   ```
   (Tune copy to house voice; field roles per the suite.ts docstring.)
2. **Plate** — `public/plates/lab-8.webp`, **896×1200**: a product shot of the tool's own surface
   (e.g. the proof strip with a rendered icon at 16/32 px beside the byte-count line, on the cream
   canvas with corner marks). Match `lab-7.webp`'s tone. No stock imagery.
3. **`src/app/capyresize/page.tsx`** — per §6.1.
4. **Renumber chore (mechanical, do not skip):** grep `"/ 07"` across `src/app/` and `tests/` —
   update all **seven** existing pages' `index="Nº 0X / 07"` literals and the
   `tests/tool-pages.test.tsx` table to `"/ 08"` (CapyExpense stays no. 5 — numbering is
   positional in SUITE). Also grep for hardcoded suite-count words ("seven" in copy) — most
   surfaces derive from `SUITE_*` helpers already.
5. **`tests/tool-pages.test.tsx`** — add the CapyResize row (`"CapyResize · tool no. 8"`, a
   headline fragment, `"Nº 08 / 08"`). The page carries **zero external hrefs** (default branch
   of the external-href test).
6. **`README.md`** — add `## 8. CapyResize` following the existing sections' voice.

---

## 9. Test plan (`tests/capyresize.test.ts` — pure logic, node env, zero network)

1. **steps.ts** — `halveSteps` goldens: 4000×3000 → 500 (steps 2000→1000→500); 1024 → 1000
   (no halving, single final step); upscale case flags warn; `fitWithin`/`scaleToWidth` aspect
   math; `centerSquare` offsets (portrait 600×900 → crop 600×600 at sy=150).
2. **ico.ts** — golden-byte test: 2-frame ICO from fixture PNGs; assert ICONDIR bytes, both
   ICONDIRENTRY records (width bytes, sizes, offsets), contiguous payloads, total length.
3. **pack.ts** — `PACK_SPECS` completeness vs §3.6 (5 raster files + manifest + snippet + ico);
   `buildManifest` JSON parses and carries `sizes`+`type` on every icon, maskable entry separate
   with `"purpose": "maskable"`; `HEAD_SNIPPET` is exactly the 4 lines; `maskableBox(512) === 410`.
4. **sniff.ts** — magic-byte fixtures: JPEG/PNG/GIF/WebP/BMP/AVIF/unknown; animated-GIF hint.
5. **types/registration parity** — SUITE row 8 exists with `href: "/capyresize"`; page exports
   the expected metadata title. `tests/tool-pages.test.tsx` covers the shell contract — keep it
   green.
6. **No canvas tests in node.** `render.ts` branches (webp silent-fallback flag, jpeg flatten,
   null-blob error) are decision helpers factored pure and table-tested; the browser fns stay thin.

**Definition of done:** `npm test` green (all existing tests incl. `tool-pages`, `security`,
`landing`, `design-scale` still pass), `npx tsc --noEmit` clean, `npx eslint` clean on new files,
and a manual smoke: a 4000 px JPEG resizes to 500 px with visible-quality check against a
one-pass downscale (should look cleaner on fine lines); WebP export in Safari (or DevTools
device-emulation) shows the honest fallback note; an animated GIF takes its first frame with the
note; favicon ZIP extracts cleanly — drop the files on a static page and check the tab icon,
iOS home-screen add, and Chrome Lighthouse installability (192/512 + manifest all pass); the
16 px preview strip reflects the real 16 px file; devtools Network shows zero requests across a
full drop→export flow.

---

## 10. Out-of-scope backlog (seams, documented not built)

- **Batch queue** (many inputs → per-input settings → ZIP): the one-time-Pro seam. `steps.ts`,
  `render.ts` and `zipPack` are already per-file loops-ready.
- **Split into two registered tools** (CapyResize + CapyFavicon, nos. 8+9): separate SEO pages
  for "image resizer" vs "favicon generator" keywords. Stage B is deliberately self-contained
  (`pack.ts` + the favicon half of the editor) so the split is a page+row extraction, not a
  rewrite. Decide after Stage A+B land and traffic data exists.
- **pica** (Lanczos in workers) for icon-grade sharpness / deterministic cross-browser output —
  only if the halving path proves insufficient on real photos.
- **Output size presets row** (1920/1280/640 multi-export) — sits naturally on the batch seam.
- **ICO preview in-tab** (parse our own ICO back and render the frames) — the CapyStrip-style
  prove-it loop for Stage B; jsQR-style, add after v1 feedback.
- Derive page `index` literals from `SUITE`/`suiteNumber()` to retire the renumber chore —
  propose to the orchestrator; don't do it in this session.

---

## 11. Sources (keys → `./sources.json`)

[1] MDN image formats guide (decode matrix, WebP/AVIF versions) · [2] HTML spec — animated image
first frame on canvas · [3] MDN `toBlob`/`convertToBlob` (silent PNG fallback; webp support table;
quality param; AVIF-encode absence inference flagged) · [4] MDN bcd OffscreenCanvas (Safari 16.4+) ·
[5] MDN `image-orientation` + `createImageBitmap` (from-image default; literal value versions) ·
[6] MDN bcd `resizeQuality`/`imageSmoothingQuality` (Firefox gaps; pica comparison) ·
[7] canvas-size measured limits (iOS 16.7 M px / 4096 per side; silent failure modes — community-
measured, flagged) · [8] client-zip README (downloadZip/makeZip, input shapes, STORE-only,
2.6 KB gz) · [9] MDN toBlob quality param compat · [10] MDN Blob.size · [11] web.dev install
criteria ("must include a 192px and a 512px icon") + MDN manifest icons reference · [12] Wikipedia
ICO (ICONDIR/ICONDIRENTRY layout, PNG-in-ICO since Vista, Microsoft PNG recommendation) ·
[13] Apple Safari Web Content Guide (180×180, selection rule) + HIG app icons (mask — flagged) ·
[14] web.dev maskable-icon guidance (40% safe zone; "any maskable" warning) · [15] W3C manifest
spec safe-zone wording · [16] caniuse link-icon-svg (Safari 26) + Evil Martians favicon article
(2026 edition — head snippet, sizes="32x32" trick, cruft list; community advice flagged as such) ·
[17] Microsoft archived IE9 pinned-site metadata (tiles deprecated-by-default).
