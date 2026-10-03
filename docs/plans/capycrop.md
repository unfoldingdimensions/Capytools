# CapyCrop — crop & split, as a mode of CapyResize — implementation plan

*Prepared 2026-10-04 for an implementing agent that has not seen the conversation that produced it. Read
§0–§3 before writing code. Citation keys `[n]` resolve to [`capycrop.sources.json`](./capycrop.sources.json).
Repo facts were read from `main` on 2026-10-04.*

*Supersedes the 2026-09-21 research plan (`docs/research/capycrop/implementation-plan.md`, gitignored, local
to the owner's machine), which defaulted to a standalone tool. **Owner decision 2026-10-04: CapyCrop is not a
new tool — it ships as a third mode inside CapyResize.** Where the two disagree, this file wins.*

---

## 0. Handoff summary

**What:** a **"crop & split"** mode in CapyResize (`/capyresize`), beside the existing *resize & convert* and
*favicon pack* modes. Drop an image; crop it to a social ratio or freely; optionally mask it to a circle or
rounded square; or **split** one image into a carousel (N slices) or a profile grid (N×M tiles). Export one
image, or a ZIP of the tiles. Nothing is uploaded and no network request carries the image.

**Why inside CapyResize:** it is the same job family (change the shape of an image), the same pipeline (decode
→ canvas → honest encode), and it keeps the suite from fragmenting into near-duplicate tools. The cost — no
dedicated `/capycrop` page for search — is mitigated with metadata, keywords and a deep link (§8).

**Owner decisions (2026-10-04) — do not re-litigate:**

| # | Decision |
|---|---|
| D1 | **No new `SUITE` row, no tool number, no new page, no plate.** CapyResize gains a third mode. The suite count stays eleven (plus whatever CapyBg/CapyStamp add). |
| D2 | The mode is labelled **"crop & split"** in the UI. "CapyCrop" is the planning name only — it must not appear in product copy. |
| D3 | The plan lives in tracked `docs/plans/`. |

**Design choices this plan makes:**

- **No new dependency.** Canvas 2D, plus CapyResize's existing `decodeImage`, `encodeCanvas`, `zipPack` and
  byte helpers. No crop library (`react-easy-crop`, `cropperjs`): the crop box is ~200 lines of pointer and
  keyboard handling, and a library would bring its own a11y and styling to fight.
- **New code in new files.** `CapyResize.tsx` is already 788 lines; the crop mode is its own component and its
  own `lib` folder, wired in with a few lines (§4). **Exported helpers in `src/lib/capyresize/render.ts` keep
  their signatures** — CapyStamp (being built in parallel) imports them.
- **Single image in, v1.** Batch crop is a later seam (§12). The splitter's multi-tile output is not "batch" —
  it is one image becoming many.

---

## 1. Scope

### In v1

- **Ratios:** presets as a radio group with plain labels —
  **1:1** square · **4:5** portrait post · **3:4** profile grid · **9:16** story/reel · **16:9** wide ·
  **2:1** link card · **3:2** photo · **free** (with an aspect-lock toggle). Each preset shows its pixel
  target where one is conventional (e.g. 4:5 → 1080×1350, 3:4 → 1080×1440) [1].
- **Crop box:** drag to move, handles to resize (aspect-locked when a ratio is set), keyboard: arrows move,
  Shift+arrows move faster, Alt/Option+arrows resize; double-click/Enter resets to the largest centred fit.
  Rule-of-thirds guides while dragging.
- **Mask:** none · circle · rounded square (radius slider). Masked output is transparent → PNG (or WebP) only;
  choosing JPEG flattens onto a picked colour with an honest note.
- **Split:**
  - **Carousel** — N slices left-to-right (2–10), each at the chosen ratio (1:1, 4:5 or 3:4), from a wide
    image: the "seamless panorama" carousel.
  - **Grid** — columns × rows (columns 1–5, rows 1–5), tiles at 1:1 or 3:4. Instagram's profile grid is
    three columns at 3:4 since 2025 [1]; that is the default grid preset.
  - Optional **gutter** (a gap of N px between tiles, cut away) — off by default; with it off, tiles are
    **gapless** (the seamless-grid promise).
  - **Post order:** tiles are numbered in the order to **post** them (for a profile grid that is
    bottom-right first, because the newest post appears top-left) — filenames carry that order (§5.4).
- **Output size:** export at native resolution of the crop, or "fit to N px" on the long edge (reusing the
  progressive-halving resizer CapyResize already has). Format PNG/JPEG/WebP, quality slider, honest bytes.
- **Download:** one image directly; tiles as one ZIP (`zipPack`) plus per-tile links.
- **Deep link:** `/capyresize#crop` opens straight into the mode (fragment, so nothing reaches the server).

### Not in v1 — do not build

- No route, no upload, no third-party request.
- No content-aware / "smart" crop, no face detection, no upscaling, no AI anything.
- No batch crop (many images → one ratio) — §12.
- No collage editor, no text, no rotation/straighten (straighten is a later candidate, §12).
- No standalone page, `SUITE` row, plate, README tool section or count change (D1).

---

## 2. Read these first

1. **`AGENTS.md`** — Next.js 16 warning, the hydration pattern (§3), the Cloudflare Workers rules (§6).
2. **`CONTRIBUTING.md`** — conventions. Note: "Adding a tool" does **not** apply (no new tool).
3. **`PRODUCT.md`**, **`DESIGN.md`** (type ramp 10/11/12/13/14/15/16/18/21/26 px, radii 6/12/16/24/full).
4. **`.agents/rules/production-invariants.md`** — hydration and WCAG.
5. **The code you are extending:**
   - `src/components/tool/CapyResize.tsx` — the mode switch (`stage` state, `StageId`, the `Pill` row at
     "Stage resize and convert" / "Stage favicon pack"), the shared decoded image, error handling, the result
     card.
   - `src/lib/capyresize/types.ts` — `StageId = "resize" | "favicon"` (add `"crop"`), `OutputFormat`,
     `PackFiles`.
   - `src/lib/capyresize/render.ts` — `decodeImage`, `drawResized` (progressive halving), `encodeCanvas`,
     `zipPack`, `isWebpFallback`, `outputRefused`, `MAX_OUTPUT_SIDE`, `MAX_OUTPUT_PIXELS`, `formatBytes`,
     `savingsPercent`, `extensionFor`. **Import; do not change signatures.**
   - `src/lib/capyresize/steps.ts` — the halving step planner (reuse for "fit to N px").
   - `tests/capyresize.test.ts` — the existing suite to extend.
6. **Patterns elsewhere:** CapyQR (`src/components/tool/CapyQR.tsx`) for 13px sentence-case pills, named
   swatches, undo/reset; `src/lib/capytools/handoff.ts` for fragment parsing (`#crop`); `tests/share.test.ts`
   for privacy phrasing.

**Invariants:** no `useState` initializer reads of storage or `location.hash` (hydrate in an effect); never fork
markup on `prefers-reduced-motion`; one sage primary per screen; 44px touch targets on coarse pointers (crop
handles included — give them a 44px invisible hit area); text ≥4.5:1; one focus treatment.

---

## 3. Technical facts and traps

### 3.1 Stack

Canvas 2D only; `client-zip` (already a dependency) through `zipPack`'s lazy import. Decode with
`decodeImage` — it uses the `<img>` path, so the browser applies EXIF orientation; it flags animated GIFs (the
first frame is used — say so in a note, as CapyResize already does).

### 3.2 Coordinates — one source of truth

Store the crop **in source-image pixels** (oriented natural size), never in screen pixels. The on-screen box is
a projection (`scale = displayWidth / naturalWidth`). Pointer deltas convert to source pixels, are clamped to the
image, and snap to integers. This is what makes the export match the preview exactly and keeps a resize of the
window from moving the crop.

### 3.3 The splitter's rounding policy — decide once, test hard

Split widths rarely divide evenly (3000 px into 7 slices). Policy: **integer tile boundaries computed as
`round(i * width / n)`** for i = 0…n — so tiles differ by at most 1 px, the sum of tile widths equals the
cropped width **exactly**, and there are **no gaps or overlaps** when the gutter is off. With a gutter, the
gutter width is removed between tiles and the remainder is distributed the same way. Every tile is then scaled
to the target ratio size if "fit to N px" is set — after the cut, never before.

For a carousel at ratio R with N slices, the crop region's ratio is `N × R` (e.g. 3 × 4:5 = 12:5), so the
crop box is locked to `N × R`; for a grid of C × R tiles at tile ratio T, the box ratio is
`(C × T_w) : (R × T_h)`. Lock the box accordingly when the split is on.

### 3.4 Masks and formats

- Circle/rounded masks need alpha. PNG and WebP keep it; **JPEG cannot** — flatten onto a colour (default white,
  picker offered) and add the note *"JPEG has no transparency, so the corners are filled with white."*
- `encodeCanvas` already flattens JPEG (`{ flatten }`); `isWebpFallback` detects Safari's silent WebP→PNG swap
  — surface its note.
- Mask + split together is allowed (each tile masked) but rarely wanted: put mask under "more" when split is on.

### 3.5 Size limits

- Reuse `outputRefused(w, h)` / `MAX_OUTPUT_PIXELS` for every output canvas; a refused tile fails with a reason
  rather than crashing the run. The source is already decoded by CapyResize's flow.

### 3.6 Copy

"Nothing uploaded" / "your image never leaves this tab". Don't name Instagram as an endorsement — describe
ratios by use ("profile grid 3:4", "portrait post 4:5"); naming the platform in a preset label as a *use* is
fine. No competitor names.

---

## 4. File map

```
docs/plans/capycrop.md                     this plan
docs/plans/capycrop.sources.json           citations
src/lib/capyresize/crop/
  types.ts       Ratio, RatioPreset, CropRect, MaskSpec, SplitSpec (none|carousel|grid), CropOutput, TileResult
  presets.ts     the ratio presets with labels and conventional pixel targets (pure data)
  geometry.ts    fitRatio, clampRect, moveRect, resizeRect (aspect-locked), boxRatioForSplit,
                 tileRects (the rounding policy), postOrder, thirdsGuides   — all PURE
  render.ts      drawCrop / drawTile / applyMask on canvas (browser)
  crop.ts        cropOne(decoded, rect, mask, output) → result;
                 splitOne(decoded, rect, split, mask, output) → TileResult[]      (the seam)
  names.ts       tile filenames in post order, ZIP name (pure)
src/components/tool/capyresize/CropStage.tsx     the mode's controls + crop box + results
src/components/tool/capyresize/CropBox.tsx       pointer/keyboard crop box (a11y-complete)
tests/capyresize-crop.test.ts
```

**Edits to existing files (keep them small):**

- `src/lib/capyresize/types.ts` — `StageId = "resize" | "favicon" | "crop"`.
- `src/components/tool/CapyResize.tsx` — a third `Pill` ("crop & split", label "Stage crop and split"),
  render `<CropStage decoded={decoded} … />` when `stage === "crop"`, and a hydrate effect that reads
  `location.hash === "#crop"` once to select the mode (then leave the hash alone, or scrub it like
  `handoff.ts` does — pick one and test it).
- `src/app/capyresize/page.tsx` — metadata title/description (§8.1).
- `src/lib/capytools/suite.ts` — **edit the existing CapyResize row only** (§8.2).
- `README.md` — extend the existing **"## 8. CapyResize"** section with a bullet (§8.3). Do not touch the
  first-line count.

---

## 5. Core pipeline

### 5.1 Types and the seam

```ts
export interface CropRect { x: number; y: number; w: number; h: number }      // source pixels, integers
export type MaskSpec = { kind: "none" } | { kind: "circle" } | { kind: "rounded"; radius: number };
export type SplitSpec =
  | { kind: "none" }
  | { kind: "carousel"; slices: number; tileRatio: Ratio; gutter: number }
  | { kind: "grid"; cols: number; rows: number; tileRatio: Ratio; gutter: number };
export interface CropOutput { format: OutputFormat; quality: number; fitLongEdge?: number; flatten?: string }
export interface TileResult {
  name: string; index: number; postOrder: number; blob: Blob; mimeType: string;
  width: number; height: number; bytes: number; notes: string[];
}
export function cropOne(d: DecodedImage, rect: CropRect, mask: MaskSpec, out: CropOutput): Promise<TileResult>;
export function splitOne(d: DecodedImage, rect: CropRect, split: SplitSpec, mask: MaskSpec, out: CropOutput): Promise<TileResult[]>;
```

`cropOne`/`splitOne` are per-image and pure of UI — the seam for a future batch (§12).

### 5.2 Geometry (pure, the heart of the tests)

- `fitRatio(w, h, ratio)` — the largest centred rect at `ratio` inside w×h, integer-snapped.
- `resizeRect(rect, handle, dx, dy, ratio | null, bounds)` — aspect-locked when a ratio is set; never smaller
  than a minimum (e.g. 16 px); never outside bounds.
- `boxRatioForSplit(split)` — §3.3.
- `tileRects(rect, split)` — §3.3 rounding; returns rects in **visual** order.
- `postOrder(split, index)` — carousel: left→right; grid: the order to post so the grid reads correctly
  (newest top-left ⇒ post the bottom-right tile first, row by row).

### 5.3 Render and encode

Draw the source region with `drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh)`; when `fitLongEdge` shrinks it,
route through `drawResized` (progressive halving) so fine detail survives, as CapyResize does. Apply the mask
with a clip path (circle / rounded rect) before drawing. Encode with `encodeCanvas`; real bytes; notes for
fallbacks. Process tiles **one at a time** (draw → encode → keep the `Blob` → release the canvas) — a 5×5 grid
of a 50 MP photo must not hold 25 canvases.

### 5.4 Names

- Single crop: `<base>-<ratio>.<ext>` (e.g. `holiday-4x5.jpg`), `-circle` suffix for a circle mask.
- Tiles: `<base>-post-01-of-09.<ext>` … numbered in **post order**, zero-padded; the ZIP is
  `<base>-grid-3x3.zip` or `<base>-carousel-5.zip`. A `README.txt` in the ZIP is **not** needed; the
  numbering is self-explanatory.

---

## 6. UI spec — the "crop & split" mode

It lives in CapyResize's existing three-card layout; only the controls and result card change when the mode is
selected. Match the existing modes' visual language exactly.

**Controls (CapyResize's settings card when `stage === "crop"`):**
- Ratio radio group (pills, 13px sentence case, CapyQR style) with the presets of §1; the selected preset shows
  its conventional pixel size.
- Free-crop aspect lock toggle (only for "free").
- **Split:** none / carousel / grid. Carousel: slices stepper (2–10), tile ratio (1:1 · 4:5 · 3:4).
  Grid: columns and rows steppers, tile ratio (1:1 · 3:4); a **"profile grid 3×3"** quick preset.
  Gutter toggle + px input.
- **Mask:** none / circle / rounded (+ radius).
- Output: native or fit-to-long-edge (presets 1080 / 1440 / 2048 / custom), format, quality.
- Undo / reset.

**Crop box (the preview card):**
- The image with a dimmed outside region, the box with 8 handles (44px hit areas on touch), thirds guides while
  dragging, and — when split is on — the tile lines **numbered in post order**.
- `CropBox` is a focusable `role="group"` with an `aria-label` and live readout ("crop 2400 × 3000 at 0, 420");
  keyboard per §1. All drags use pointer events with capture; no mouse-only code.
- Live, honest readout under the box: crop size in px, tile size, tile count.

**Result:**
- **Crop / Split** — the one sage primary, full width, 44px. Then a results grid of thumbnails in post order
  with per-tile size and a download link, totals, notes, **Download ZIP** (or the single file).
- Results region `aria-live="polite"`, `scroll-mt-24`. Phone: reuse the existing CapyResize result placement;
  if CapyResize gains CapyQR's bottom dock later, the crop mode should use it too — not required here.

**States:** no image (CapyResize's existing empty/demo state), image loaded, cropping, done, a refused tile
("tile 7 is larger than this browser can draw — fit to a smaller long edge"), GIF first-frame note.

---

## 7. Performance

No new bundle cost outside the mode: `CropStage` can be `next/dynamic`-loaded when the mode is first selected
(optional — measure; the code is small). `client-zip` stays lazy. Pointer moves are rAF-throttled; the preview is
display-size, the export full-size.

---

## 8. Copy, metadata and discoverability

### 8.1 `src/app/capyresize/page.tsx`

```ts
title: "CapyResize — resize, crop, convert & favicon pack, in your browser",
description:
  "Resize, crop to any social ratio, split one image into a carousel or grid, convert between PNG, JPEG and WebP, or make a favicon pack. 100% in your browser — files are never uploaded.",
```

Keep the existing headline ("Every size it needs to be") — it already fits. Update the `lead` to mention cropping:
`"resize, crop, split, convert and favicon-pack images in your browser. all local."`

### 8.2 The existing CapyResize row in `suite.ts` (edit, don't add)

- `line`: `"Resize, crop, split, convert and favicon-pack, entirely in-tab."`
- `blurb`: extend to mention crop & split in one clause (keep it one sentence of similar length).
- `keywords`: **add** `"crop"`, `"cropper"`, `"aspect ratio"`, `"circle crop"`, `"avatar"`, `"instagram grid"`,
  `"carousel"`, `"grid splitter"`, `"panorama"`. `/tools` search reads these (`ToolsGrid` haystack).
- Do not change `name`, `href`, `short`, `badge`, `cat`, `plate`, or the row's position.

### 8.3 `README.md` — "## 8. CapyResize"

Add one bullet after "Resize & convert":
`- **Crop & split**: crop to a social ratio or freely, circle or rounded masks, or split one image into a seamless carousel or a profile grid — tiles numbered in the order to post them, delivered as a ZIP.`
Update the opening sentence if it says "either … or" (it now has three modes). The first-line suite count is
**unchanged**.

### 8.4 Deep link

`/capyresize#crop` selects the mode. Link to it from `/notes` or the CapyResize blurb only if natural; no new
page. Future SEO pages (e.g. a static explainer for the grid splitter) are backlog (§12).

### 8.5 Coordination with in-flight work

- **CapyStamp** imports `decodeImage`, `encodeCanvas`, `zipPack` from `src/lib/capyresize/render.ts` — do not
  change their signatures or behaviour. If you must add a helper, add a new export.
- **CapyBg** and **CapyStamp** add rows to `suite.ts` and sections to `README.md`; this work edits the existing
  CapyResize row and §8 only, so conflicts should be small. Rebase on `main` before opening the PR and run the
  whole suite.

---

## 9. Tests (vitest, node, no network)

`tests/capyresize-crop.test.ts`
1. **geometry — fitRatio:** wide, tall, exact-ratio, 1-px-off sources; integer output; centred.
2. **geometry — resizeRect:** aspect lock holds for every handle; min size; never escapes bounds; free mode.
3. **geometry — tileRects:** carousel 3/5/7 slices of 3000 px and of an odd width (e.g. 2999): **sum of widths
   equals the crop width, no gaps, no overlaps, max−min ≤ 1 px**; grid 3×3 and 3×4 likewise on both axes;
   gutter on removes exactly the gutter between tiles.
4. **geometry — boxRatioForSplit:** carousel 3 × 4:5 → 12:5; grid 3×3 at 3:4 → 9:12 (3:4 overall); grid 3×3
   at 1:1 → 1:1.
5. **geometry — postOrder:** 3×3 grid posts bottom-right first and ends top-left; carousel left→right.
6. **names:** post-order numbering, zero padding, ratio slug (`4x5`), mask suffix, ZIP names, odd basenames.
7. **presets:** every preset has a label and a positive ratio; 3:4 and 4:5 carry 1080×1440 and 1080×1350.
8. **Mode wiring:** `StageId` includes `"crop"`; CapyResize page markup contains the "crop & split" pill;
   metadata title/description mention cropping and keep "100% in your browser".
9. **Boundaries:** no `fetch(` in `src/lib/capyresize/crop/` or the new components; no new dependency.

Existing `tests/capyresize.test.ts`, `tests/tool-pages.test.tsx` and `tests/tools-page.test.tsx` must stay
green (the CapyResize row's keywords change — check `/tools` search tests still pass, and add one that "crop"
finds CapyResize).

Prove each new test fails when its code is broken.

---

## 10. Definition of done

- `npm run test` (all green), `npm run lint`, `npx tsc --noEmit`, `npm run build`; judge with
  `npm run build && npx next start`, never `next dev`.
- Browser checks, evidence in the PR:
  - A 4:5 crop of a phone photo (portrait **and** landscape EXIF) exports at the exact rect, matching the preview.
  - A 3×3 profile-grid split at 3:4: 9 tiles, gapless when reassembled (overlay them, or check that tile widths
    and heights sum to the crop exactly), numbered in post order, in one ZIP.
  - A 5-slice panorama carousel at 4:5 from a wide image.
  - A circle mask → transparent PNG; the same as JPEG → flattened with the note.
  - Keyboard-only: select the mode, move and resize the box, run the split, download.
  - Touch at 375×812: handles usable (44px hit areas), no horizontal overflow; reduced motion on: nothing hidden.
  - `/capyresize#crop` opens in the mode; the hash does not reach the server (it never does — just confirm the
    mode selects).
  - Network panel during a split: **no request carries image data** (only same-origin JS chunks).
  - The existing resize and favicon modes still work unchanged.
- After merge: CI deploy + `scripts/smoke.mjs` green.

---

## 11. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Off-by-one seams in a "seamless" grid | The §3.3 rounding policy and its tests; the reassembly check in §10. |
| R2 | Crop box a11y is easy to get half-right | Keyboard spec in §1, focusable group with a live readout, 44px hit areas, test with keyboard only. |
| R3 | EXIF orientation | `decodeImage`'s `<img>` path; test a rotated phone JPEG in both orientations. |
| R4 | `CapyResize.tsx` grows unmanageable | Crop UI lives in its own components; the parent gains a pill, a render branch and a hash effect. |
| R5 | Conflicts with CapyStamp/CapyBg | §8.5. |
| R6 | Platform ratios change | Presets are data in one file with dated sources; update the file, not the logic. |

---

## 12. Backlog — not v1

- **Batch crop** — many images to one ratio, behind the same cap and seam rules as CapyStamp's batch
  (`FREE_BATCH_LIMIT` is CapyStamp's constant; decide then whether to share it).
- Straighten/rotate; flip.
- Per-platform export packs (crop + resize to every common size in one ZIP).
- A static explainer page for the grid splitter if search data shows demand for a dedicated URL.
- Feed into CapyStamp (crop, then watermark) — a "send to" hand-off via the fragment pattern.

---

## 13. Suggested PR sequence

1. **Geometry + engine** — `src/lib/capyresize/crop/*` with `tests/capyresize-crop.test.ts`. No UI, no shared
   file edits beyond `StageId`.
2. **Mode UI + copy** — `CropStage`, `CropBox`, the CapyResize wiring, page metadata, the `SUITE` row edit, the
   README bullet; definition-of-done evidence in the PR body.
3. **Polish** — run `/impeccable critique` on `/capyresize` (all three modes) and fix what it finds.

Conventional Commits (scope `capyresize`); CI green; **merging deploys — the owner merges every PR.**

---

## 14. Sources

See [`capycrop.sources.json`](./capycrop.sources.json): [1] Instagram profile grid 3:4 / feed sizes ·
[2] repo CapyResize code read 2026-10-04.
