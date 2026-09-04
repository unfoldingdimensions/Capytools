# CapyStrip (tool no. 4) — Implementation Plan

*Prepared 2026-09-05 by the orchestrator session. This document is a complete handoff: an agent
session that has never seen this conversation should be able to implement CapyStrip from it alone.
Read §1–§3 before writing any code. Citation keys `[n]` resolve to
[`./sources.json`](./sources.json). Positioning research lives in
[`../expansion/roadmap.md`](../expansion/roadmap.md).*

---

## 1. Mission & scope

**CapyStrip** — "your photos talk. this one helps them forget." A 100%-client-side photo metadata
viewer and stripper:

1. **Drop / paste a photo** → a card reports everything the file carries: GPS coordinates, device
   make/model/serials, timestamps, editing software, and AI-generation signals (IPTC
   digital-source-type, Stable Diffusion prompts, C2PA content credentials).
2. **Download the clean copy** — the image is decoded and re-encoded from scratch via canvas, so no
   metadata survives. The tool **re-scans its own output** and shows a "verified clean" chip.

Positioning (from the expansion research): the GPS-leak fear is the hook [1], every existing
competitor's entire marketing is the privacy claim we get for free [2][3][4], and mainstream outlets
now warn users off upload-based tools [5]. "Your files never leave your browser" is the product.

### In scope (v1)

- Viewer + stripper for **JPEG, PNG, WebP** (clean + full report), **HEIC/AVIF** (full report,
  clean where the browser can decode), **TIFF** (report only — browsers can't decode TIFF).
- Drag & drop, file picker, **clipboard paste** (screenshot → paste is a delight moment).
- GPS card with decimal + DMS + user-initiated "open in OpenStreetMap" link.
- AI signals: IPTC `DigitalSourceType` labels, A1111/ComfyUI/NovelAI prompt chunks, C2PA presence.
- Clean-copy verification re-scan, before/after byte sizes, honest per-browser fallback notes.
- Full tool registration (landing, header, README, tests) per the Capytools recipe.

### Out of scope (v1 — do NOT build)

- **No server routes.** CapyWrapped needs CORS proxies; CapyStrip needs nothing. If you find
  yourself adding `src/app/api/...`, stop — that's a scope violation.
- No batch mode. Keep the core a pure `cleanOne()` function so a future Pro (one-time license) batch
  mode is a UI loop later — the seam is §8.3, not a feature.
- No C2PA manifest *parsing* (presence detection only), no video metadata, no share cards / OG
  routes, no localStorage persistence of anything.

---

## 2. Read these first (repo law)

1. **`AGENTS.md`** — including the top warning: **this Next.js is not the Next.js in your training
   data.** Read the relevant guide in `node_modules/next/dist/docs/` before touching app-router
   code (metadata export shape, `"use client"` boundaries, params-as-Promises).
2. **`.agents/rules/production-invariants.md`** — Satori subset (n/a here, no card art), storage &
   hydration rules, WCAG rules, `scroll-mt-24` on scroll targets, `min-w-[84px]` on toggling
   Copy/Download buttons.
3. **`.agents/skills/capytools-dev/SKILL.md`** — the tool recipe, design tokens, hydration guard.
4. **Template files** — page shell: `src/app/capyimagine/page.tsx`; three-card layout & tone:
   `src/components/tool/CapyCreator.tsx`; error card: `src/components/tool/ErrorCard.tsx`;
   loader: `src/components/tool/TerminalLoader.tsx`; shared bits: `src/components/mascot/*`,
   `src/components/Reveal.tsx`, `src/components/AmbientBackground.tsx`.

**Ethos invariants (hard):** zero network calls at runtime; nothing written to storage; no cookies;
no accounts; all parsing/cleaning in-browser; external links (maps) are plain user-initiated
anchors. Any `fetch`, `localStorage`, or `sessionStorage` in this tool is a bug.

**Hydration invariant:** never read files/storage/random in `useState` initializers. Follow the
`useCallback` + `useEffect` (+ `eslint-disable react-hooks/set-state-in-effect`) pattern. Not much
storage exists here anyway — file work starts from user events.

---

## 3. Verified technical facts (design constraints)

All of the following were verified 2026-09-05; the implementing agent can trust them and re-check
details via the sources ledger.

### 3.1 Parsing: exifr ^7.1.3 (MIT) — the only new dependency

- Supported: JPEG, PNG, TIFF, HEIC, AVIF (PNG support since 6.x, AVIF 6.3+). **Not WebP** — WebP
  gets the §6.2 fallback path [6].
- Confirmed option names for `exifr.parse(file, opts)`: segment flags `tiff`, `xmp`, `icc`, `iptc`,
  `jfif`, `ihdr`; TIFF blocks `ifd0` (alias `image`), `ifd1`, `exif`, `gps`, `interop`;
  `makerNote`/`userComment` (leave off); filters `pick`/`skip`; formatters `translateKeys`,
  `translateValues`, `reviveValues`, `sanitize`, `mergeOutput`, `silentErrors` [6].
- Shortcut: `exifr.gps(file)` → `{ latitude, longitude }` decimal — use it for the GPS card rather
  than reverse-engineering DMS arrays from `parse()`.
- Bundles: `full` ≈ 22 KB gzipped (covers jpg/heic/tif/png), `lite` ≈ 12 KB (no PNG). **Use full.**
- Webpack quirk: exifr's main entry dynamically imports `fs` (it's isomorphic). Next 16 dev runs
  `next dev --webpack`. **Prescribed fix: import the prebundled browser build directly —
  `import exifr from "exifr/dist/full.esm.mjs"`** — which avoids the `fs` path entirely. If
  TypeScript can't resolve that subpath, add a one-line ambient declaration in
  `src/types/exifr-full.d.ts` (`declare module "exifr/dist/full.esm.mjs" { ... }`) re-exporting the
  shapes you use. Confirm `npx tsc --noEmit` and a dev-server boot before proceeding.

### 3.2 Browser capability matrix (drives every fallback)

| Capability | Chrome/Edge | Firefox | Safari | Consequence |
|---|---|---|---|---|
| `<img>`/canvas decode: JPEG/PNG/WebP | ✅ | ✅ | ✅ | cleanable everywhere |
| Decode: AVIF | ✅ | ✅ | ✅ | report + clean |
| Decode: HEIC | ❌ | ❌ | ✅ (Safari 17+ on macOS Sonoma / iOS 17+) [7] | report everywhere; clean on Safari only |
| Decode: TIFF | ❌ | ❌ | ❌ | report only |
| Encode JPEG/PNG via canvas | ✅ | ✅ | ✅ | fine |
| **Encode WebP via `toBlob`/`toDataURL`** | ✅ | ✅ | **❌ — silently falls back to PNG/JPEG** [8] | must feature-detect (§6.2) |
| Encode AVIF via canvas | ❌ anywhere | ❌ | ❌ | AVIF cleans to PNG/JPEG with a note |
| `DecompressionStream("deflate")` | ✅ 80+ | ✅ 113+ | ✅ 16.4+ (~90% global) [9] | use for PNG `zTXt`; guard with a friendly degrade |
| EXIF orientation applied to `<img>` → `drawImage` | ✅ (Chrome 81+) | ✅ | ✅ (13.4+) [6] | orientation is handled by drawing via `<img>`; don't hand-rotate |

**Orientation rule:** decode with `HTMLImageElement` + `img.decode()`, then `drawImage`. Browsers
apply EXIF orientation to `<img>` pixels by default (per spec `image-orientation: from-image` is the
default; `createImageBitmap`'s `from-image` is also now the default, but the `<img>` path has the
longest, least bug-ridden cross-browser record). Never read pixels via `createImageBitmap(...,
{ imageOrientation: "none" })`.

**Metadata-stripping guarantee:** a canvas bitmap has no metadata — anything drawn through canvas
and re-encoded comes out clean (no EXIF APP1, no XMP, no PNG tEXt/iTXt/zTXt, no ICC, no C2PA). The
re-scan verification (§6.4) exists to *prove* it to the user, not to fix anything.

**Known honest cost:** canvas re-encode drops the ICC color profile, so wide-gamut (Display P3)
photos may shift slightly. When `icc` is detected in the source, show a one-line calm note on the
clean card ("color profile flattened to sRGB"). Do not try to copy profiles — that would reintroduce
metadata.

### 3.3 AI-generation signals (what to look for, and where)

| Signal | Where it lives | How to detect |
|---|---|---|
| IPTC AI declaration | XMP `Iptc4xmpExt:DigitalSourceType` | exifr `xmp: true`; label via §7 table. Canonical vocabulary: `trainedAlgorithmicMedia`, `compositeWithTrainedAlgorithmicMedia`, `algorithmicMedia`, `compositeSynthetic`, `digitalCapture`, `minorHumanEdits`, `majorHumanEdits`, `screenCapture`, `digitalArt` [10][11] |
| Stable Diffusion (A1111) prompt | PNG `tEXt` chunk, key **`parameters`** — value layout: prompt line 1, `Negative prompt:` line, then `Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: …, Model: …` [12] | custom PNG chunk walker (§5.3); exifr does **not** read text chunks [6] |
| ComfyUI / NovelAI | PNG text chunks `prompt` / `workflow` (JSON), `Comment`, `Software: NovelAI`, `Source`, `Title: AI generated image` [12] | same walker; render as "carries a generation recipe" without dumping raw JSON |
| C2PA / Content Credentials | JPEG: **APP11** (`0xFFEB`) segments carrying JUMBF; PNG: **`caBX`** ancillary chunk; WebP: RIFF chunk tagged `c2pa` [13] | presence-only byte scan (§5.4). Report "content credentials present" — parsing claims is out of scope |
| Photoshop/AI lineage | XMP `photoshop:DocumentAncestors`, `xmpMM:DerivedFrom`, `xmp:CreatorTool` | exifr `xmp: true` + marker scan fallback |
| Generic tool fingerprints | ASCII strings in the file (`Midjourney`, `Firefly`, `DALL·E`, `StableDiffusion`, `NovelAI`…) | raw marker scan (§5.4) — keep the list tight to avoid false positives |

### 3.4 exifr does NOT read PNG text chunks — confirmed [6]

So the A1111 `parameters` prompt (the single most requested "PNG info" feature in the AI community
[12]) requires our own ~60-line chunk walker. That walker is also how we detect `caBX`. The PNG
chunk format is trivial: 8-byte signature, then `[4-byte length][4-byte type][data][4-byte CRC]`
repeated.

---

## 4. File map (everything you will create)

```
src/lib/capystrip/
  types.ts      # ImageKind, RawMetadata, MetadataField, MetadataReport, CleanResult, CleanOptions
  detect.ts     # magic-byte sniffing → ImageKind
  png.ts        # PNG chunk walker + text chunk reader (tEXt/iTXt/zTXt) + caBX find
  parse.ts      # exifr + png + c2pa + marker scan → RawMetadata
  report.ts     # RawMetadata → MetadataReport (fields, categories, critical flags, verdict, AI signals)
  clean.ts      # decode → draw → encode → verify → CleanResult
  format.ts     # dmsToDecimal, formatExposure, formatBytes, digitalSourceLabel, gpsDmsLabel (pure)
  demo.ts       # DEMO_REPORT for the idle state (repo pattern: DEMO_STATS)
src/components/tool/CapyStrip.tsx
src/app/capystrip/page.tsx
tests/capystrip.test.ts
```

Register in: `src/app/page.tsx` (`TOOLS` array + the hero count sentence — grep "Three of them" and
make it "Four"), `src/components/header.tsx` (`TOOLS` nav — label `Strip`), `README.md` (numbered
tool section). **Tool no. 4.**

Add dependency: `npm i exifr` (pin `^7.1.3`). Nothing else — no zip lib, no map tiles, no
DecompressionStream polyfill (graceful degrade instead).

---

## 5. Parsing pipeline (`parse.ts` + helpers)

### 5.1 `detect.ts` — sniff, don't trust extensions

```ts
export type ImageKind = "jpeg" | "png" | "webp" | "heic" | "avif" | "tiff" | "unknown";
export async function sniffImageKind(file: Blob): Promise<ImageKind>;
```

Magic bytes (read first 16 bytes of `await file.arrayBuffer()`):
- JPEG: `FF D8 FF` · PNG: `89 50 4E 47 0D 0A 1A 0A` · TIFF: `49 49 2A 00` or `4D 4D 00 2A`
- WebP: `RIFF` at 0..4 and `WEBP` at 8..12
- ISOBMFF family: `ftyp` at 4..8, then brand at 8..12: `heic|heix|hevc|hevx|heim|hevm|hevs|mif1|msf1` →
  heic; `avif|avis` → avif.

### 5.2 exifr pass (JPEG, PNG, HEIC, AVIF, TIFF)

```ts
const EXIFR_OPTIONS = {
  tiff: true, xmp: true, icc: true, iptc: true, jfif: true, ihdr: true,
  ifd0: true, ifd1: true, exif: true, gps: true, interop: false,
  makerNote: false, userComment: true,          // UserComment is a privacy field; surface it
  translateKeys: true, translateValues: true, reviveValues: true,
  sanitize: true, mergeOutput: true, silentErrors: true,
};
const merged = await exifr.parse(file, EXIFR_OPTIONS);   // Record<string, unknown> | undefined
const gps = await exifr.gps(file).catch(() => null);      // { latitude, longitude } | null
const iccPresent = /* re-run tiny parse with { icc: true, pick: [...], ... } if mergeOutput hides it
                     — simplest: treat parsed ICC keys OR a raw APP2 (`45 78 69 66`… no: `49 43 43_`)
                     scan as present */;
```

Note: `ifd1` gives the embedded thumbnail (report "carries a hidden thumbnail"). `userComment: true`
because emoji-journal UserComments are a classic leak (and exifr skips it by default).

### 5.3 `png.ts` — chunk walker (exifr can't do this)

```ts
export interface PngChunk { type: string; data: Uint8Array; }
export function walkPngChunks(bytes: Uint8Array): PngChunk[];           // stops at IEND
export async function readPngText(bytes: Uint8Array): Promise<PngTextChunk[]>;
// PngTextChunk = { key: string; value: string; chunk: "tEXt" | "iTXt" | "zTXt" }
export function findPngChunk(bytes: Uint8Array, type: string): PngChunk | null;  // "caBX"
```

- `tEXt`: `key\0` + latin1 text. `zTXt`: `key\0` + compression-method byte (0=deflate/zlib) +
  zlib stream → inflate with `new DecompressionStream("deflate")` (guarded: if unavailable, value =
  `"(compressed text — your browser can't inflate it, but the clean copy still removes it)"`).
  `iTXt`: `key\0` + flags(2) + `language\0` + `translated\0` + text (deflate when flag bit 3 set).
- Surface the interesting keys, don't dump everything: `parameters`, `prompt`, `workflow`,
  `Comment`, `Software`, `Source`, `Title`, `Description`, `XML:com.adobe.xmp`.
- Parse the A1111 `parameters` value into `{ prompt, negativePrompt, settings }` with a small
  pure function `parseA1111Parameters(value)` (line 1 = prompt; line starting `Negative prompt:` =
  negative; last line of `Key: value, …` = settings) — this is what makes the AI-signal card feel
  magical [12].

### 5.4 C2PA + marker scan (raw bytes, cheap)

```ts
export function scanMarkers(bytes: Uint8Array): { c2pa: C2paPresence; markers: string[] };
// C2paPresence = "app11" | "caBX" | "riff" | null
```

- Decode bytes as latin1 (`String.fromCharCode` in 64 KB slices; scan first 3 MB + last 1 MB —
  manifests and prompts live near the head; keep it O(n), no regex backtracking).
- C2PA: JPEG → `FF EB` APP11 marker containing `JP`/`jumb`/`c2pa` [13]; PNG → `caBX` via the chunk
  walker [13]; WebP → `c2pa` inside the RIFF container [13].
- Marker list (exact strings, case-sensitive-ish; deliberately NOT generic words like "prompt" or
  "AI"): `trainedAlgorithmicMedia`, `compositeWithTrainedAlgorithmicMedia`, `algorithmicMedia`,
  `compositeSynthetic`, `c2pa`, `jumb`, `contentauth`, `DocumentAncestors`, `DerivedFrom`,
  `Negative prompt:`, `Steps:`, `Sampler:`, `Midjourney`, `NovelAI`, `Firefly`, `DALL`, `Stable
  Diffusion` (also match `StableDiffusion`), `runwayml`, `Sora`.
- Each hit becomes evidence for a friendly `aiSignals` sentence in the report (§5.6 table).

### 5.5 `parse.ts` orchestrator

```ts
export async function readRawMetadata(file: Blob): Promise<RawMetadata>;
// RawMetadata = { kind, fileName, byteSize, exif?: Record<string, unknown>,
//   xmp?: Record<string, unknown>, pngText?: PngTextChunk[],
//   gps?: { latitude: number; longitude: number } | null,
//   iccPresent: boolean, thumbnailPresent: boolean, c2pa, markers }
```

Every sub-read is individually `try/catch`-ed — a broken EXIF block must never kill the report.

### 5.6 `report.ts` — normalize into fields

```ts
export type FieldCategory = "privacy" | "camera" | "time" | "software_ai" | "technical";
export interface MetadataField { id: string; label: string; value: string; category: FieldCategory; critical: boolean; }
export interface MetadataReport {
  fileName: string; kind: ImageKind;
  fields: MetadataField[];
  gps?: { latitude: number; longitude: number } | null;
  aiSignals: string[];                 // e.g. "declared AI-generated (IPTC source type)"
  chattyCount: number;                 // count of critical fields
  verdict: "chatty" | "quiet" | "muted" | "blank";   // >=1 critical / metadata but none critical / fields exist but all blank-valued / nothing
  byteSize: number;
}
export function buildReport(raw: RawMetadata, fileName: string): MetadataReport;
```

Field mapping (exifr `translateKeys` output names → label, category, critical):

| Key(s) | Label | Category | Critical |
|---|---|---|---|
| `GPSLatitude/GPSLongitude` (via `exifr.gps`) | "Location" | privacy | ✅ |
| `GPSAltitude`, `GPSImgDirection` | "Altitude" / "Compass direction" | privacy | ✅ |
| `Make`, `Model`, `BodySerialNumber`, `LensMake`, `LensModel`, `LensSerialNumber` | "Camera", "Body serial", … | privacy | ✅ (serials) / model = ✅ |
| `DateTimeOriginal`, `CreateDate`, `ModifyDate`, `OffsetTime`, `GPSTimeStamp` | "Taken at", … | time | time = ✅ when GPS present, else ⬜ |
| `Artist`, `By-line`, `Copyright`, `Credit`, `UserComment`, `ImageUniqueID` | "Author", "Copyright", "Comment", "Unique ID" | privacy | ✅ |
| `Software`, XMP `CreatorTool` | "Software" | software_ai | ⬜ |
| XMP `DigitalSourceType` | "AI source declaration" | software_ai | ✅ (label per §7) |
| XMP `DocumentAncestors`, `DerivedFrom` | "Editing lineage" | software_ai | ✅ |
| PNG `parameters` | "Generation prompt" (+negative +settings) | software_ai | ✅ |
| PNG `prompt`/`workflow`/`Comment`(NovelAI) | "Generation recipe" | software_ai | ✅ |
| C2PA presence | "Content credentials (C2PA)" | software_ai | ✅ (as a signal) |
| `ExposureTime`, `FNumber`, `ISO`, `FocalLength`, `FocalLengthIn35mmFormat`, `Flash`, `WhiteBalance`, `MeteringMode`, `ExposureBiasValue`, `Orientation` | camera settings labels | camera | ⬜ |
| `ExifImageWidth/Height`, IHDR dims, `PhotometricInterpretation`, ICC name | "Dimensions", "Color profile" | technical | ⬜ |
| `ifd1` present | "Hidden thumbnail" | technical | ⬜ |

Formatting helpers (`format.ts`, all pure): `formatExposure(0.004)` → `"1/250 s"`;
`dmsToDecimal([deg,min,sec], ref)`; `formatGpsDms(lat)` → `40° 44′ 54.4″ N`;
`formatBytes`; `digitalSourceLabel(value)` (§7); `friendlyDate`.

**Verdict copy** (calm, on-brand; tune wording but keep the 4-level shape):
- `chatty` → "This photo has a lot to say." · `quiet` → "A few quiet details." ·
  `muted` → "Barely a whisper." · `blank` → "This photo keeps its secrets."

---

## 6. Cleaning pipeline (`clean.ts`)

### 6.1 Core signature — keep it pure so batch-Pro is a later UI loop

```ts
export interface CleanOptions { quality?: number; }        // JPEG only; default 0.92
export interface CleanResult {
  blob: Blob; mimeType: string;
  width: number; height: number;
  bytesBefore: number; bytesAfter: number;
  verified: boolean;                    // re-scan (§6.4) found nothing
  notes: string[];                      // honest fallback notes (§6.2 table)
}
export async function cleanImage(file: Blob, raw: RawMetadata, options?: CleanOptions): Promise<CleanResult>;
```

### 6.2 Encode matrix (this is the heart of the tool)

| Source | Primary output | Fallback | Note appended to `notes` |
|---|---|---|---|
| JPEG | `image/jpeg` (quality slider 0.50–1.00) | — | — |
| PNG | `image/png` (alpha preserved) | — | — |
| WebP | `image/webp` — **feature-detect**: `canvas.toDataURL("image/webp").startsWith("data:image/webp")`, else the browser silently wrote PNG [8] | PNG | "This browser can't export WebP — saved as PNG instead." |
| AVIF | no browser encodes AVIF → PNG (lossless default) or JPEG | — | "AVIF export isn't available in browsers — saved as PNG." |
| HEIC | decode only on Safari 17+ [7] | — | decode failure → return `null` + reason; UI switches to report-only mode with a calm card ("Safari can redraw HEIC; this browser can only read its papers.") |
| TIFF | never decodable | — | report-only mode from the start |

Steps: `img = new Image(); img.src = URL.createObjectURL(file); await img.decode();` → draw at
natural (oriented) size on a 2D canvas → `canvas.toBlob(...)` (await the callback) →
`URL.revokeObjectURL`. Guard: if `img.decode()` rejects (CMYK JPEG, corrupt file, HEIC outside
Safari), throw a typed `CleanUnsupportedError` — the report is still shown (exifr worked).
Dimension guard: if width or height > 8192, still attempt, but on `toBlob` returning null append a
note suggesting the photo is unusually large.

### 6.3 Verification re-scan (the trust moment)

Run `readRawMetadata` on the **output blob**; expect: no exif/xmp/pngText, `c2pa: null`,
`markers: []` (a fresh canvas JPEG may contain the literal string `JFIF` — that's a container tag,
not a marker; exclude it from the scan list). `verified: true` only when the rescan is empty.
UI chip: "re-scanned — clean."

### 6.4 Memory hygiene

Revoke every object URL in a `finally`. No caches. Concurrent drops: process one file at a time;
new drop replaces the old (store only the latest `CleanupFn`).

---

## 7. IPTC digital-source-type labels (`format.ts`)

| Coded term | Label shown |
|---|---|
| `trainedAlgorithmicMedia` | "Made with generative AI (model trained on sampled content)" |
| `compositeWithTrainedAlgorithmicMedia` | "Composite that includes generative AI" |
| `algorithmicMedia` | "Made algorithmically (not AI-trained)" |
| `compositeSynthetic` | "Composite of synthetic sources" |
| `digitalCapture` | "Digital camera capture" |
| `minorHumanEdits` / `majorHumanEdits` | "Camera capture, minor/major edits" |
| `screenCapture` / `digitalArt` / `data` | "Screen capture" / "Digital art" / "Data" |
| anything else non-empty | show raw value |

Canonical vocabulary source: IPTC Digital Source Type NewsCodes [10][11].

---

## 8. UI spec (`CapyStrip.tsx`, three cards per house style)

Card 1 — **"The drop."** Dropzone (full-width `rounded-3xl` dashed border): click, drag & drop, or
paste (`paste` listener on window while mounted — screenshots are a first-class input).
Accepts `image/*`; sniffs kind; runs `readRawMetadata` with an honest `TerminalLoader`
("reading bytes → walking EXIF → scanning for AI fingerprints"). Idle state renders `DEMO_REPORT`
with a "demo" eyebrow (repo pattern: `DEMO_STATS`).

Card 2 — **"The report."** Verdict line (§5.6) + fields grouped by category; `critical: true`
fields get a clay pill ("sensitive") — never color alone (WCAG). GPS gets its own mini-card:
decimal, DMS, and an `<a href="https://www.openstreetmap.org/?mlat=..&mlon=..#map=15/../..">`
(user-initiated; plain anchor, `rel="noopener noreferrer"`; style `text-foreground
hover:text-primary transition-colors` — **never `text-primary` static**). AI signals render as a
short list under a "what it confesses" heading. "Copy report as JSON" button (`min-w-[84px]`).
A11y: results container `aria-live="polite"`; category headings real headings.

Card 3 — **"The clean copy."** Only for cleanable kinds (JPEG/PNG/WebP/AVIF, HEIC-on-Safari):
preview thumbnail (`<img>` of the cleaned blob URL), format + before/after sizes
(`formatBytes`), quality slider (JPEG only, `0.50–1.00`, default `0.92`), Download button
(`min-w-[84px]`, filename `clean-<original-name>`), and the "re-scanned — clean" chip. ICC note and
fallback notes from §6.2 rendered as quiet lines. Everything silent about network because there is
none — if you feel the urge to write "no upload", check `tests/share.test.ts` copy rules first
(avoid "no tracking" claims verbatim; keep it plain: "your photo never leaves this tab").

Errors reuse `ErrorCard` with a napping capybara. `scroll-mt-24` on all three card sections.
`AmbientBackground` + `CapyMark` on the page. Follow the exact page shell of
`src/app/capyimagine/page.tsx` (eyebrow **`CapyStrip · tool no. 4`**; italic punchline heading;
lowercase "all local." subtitle).

### 8.1 Page metadata

```ts
export const metadata = {
  title: "CapyStrip — remove photo metadata (EXIF) in your browser",
  description:
    "See the GPS, device and AI fingerprints hiding in your photos, then download a clean copy. 100% in your browser — files are never uploaded.",
};
```

Targets the demand keywords from the expansion research: "remove exif data", "photo metadata
viewer", "strip gps from photos".

### 8.2 Demo fixture

`demo.ts` ships a hand-made `DEMO_REPORT` (fake camera "Capyber-shot DSC-H300", a plausible GPS fix
near the Madrid capybara-free zone, one A1111 prompt signal) so the idle card teaches the tool.

### 8.3 The Pro seam (document, don't build)

`cleanImage(file, raw, opts)` is a pure per-file function with zero UI coupling. The future batch
mode is `for (file of files) await cleanImage(...)` behind a one-time license gate. Leave it at
that. No license-key code, no paywall copy, no "Pro" strings in v1.

---

## 9. Test plan (`tests/capystrip.test.ts`, vitest, node env, zero network)

1. **detect.ts** — hand-built `Uint8Array` fixtures: JPEG `FF D8 FF…`, PNG signature, `RIFF….WEBP`,
   `ftypheic`, `ftypavif`, TIFF II*/MM*, garbage → `unknown`.
2. **png.ts** — assemble a minimal PNG (signature + IHDR + `tEXt` parameters + `zTXt` inflated
   case + `caBX` + IEND) with a tiny builder helper in the test; assert walker output, text values,
   A1111 parse (`parseA1111Parameters` splits prompt / `Negative prompt:` / `Steps: 20, Sampler:
   Euler a, …`), `findPngChunk(bytes, "caBX")`. Guard the `zTXt` test with
   `typeof DecompressionStream !== "undefined"` (Node 18+ has it; skip gracefully otherwise).
3. **scanMarkers** — latin1 corpus containing `trainedAlgorithmicMedia`, `c2pa`, `Midjourney`,
   `JFIF` → hits reported, `JFIF` ignored, no false positive from the word "prompt" alone.
4. **format.ts** — `formatExposure(0.004) === "1/250 s"`, `dmsToDecimal` round-trips, DMS labels,
   `digitalSourceLabel` table coverage, `formatBytes`.
5. **report.ts** — feed a mocked `RawMetadata` (GPS + serials + DigitalSourceType + A1111 text +
   C2PA) → correct categories, critical flags, `aiSignals` sentences, verdict `chatty`; a
   metadata-free input → `blank`.
6. **clean.ts** (logic only, no canvas in node): the WebP fallback decision helper and the
   note-generation branches are factored into pure functions (`decideOutputMime(kind, webpEncodeOk)`
   → `{ mimeType, note? }`) so they're testable without a browser. **Do not** attempt canvas tests.
7. Registration parity — assert `/capystrip` appears in `TOOLS` of `src/app/page.tsx` and
   `src/components/header.tsx` (mirror `tests/components.test.tsx` style if it does similar).

**Definition of done:** `npm test` green (all existing 122+ tests still pass), `npx tsc --noEmit`
clean, `npx eslint` clean on new files, and a manual browser smoke: phone-JPEG drop shows GPS +
serials and yields a verified-clean download; an A1111 PNG shows the prompt; HEIC in Chrome shows
the report + calm "can't redraw here" card; a screenshot paste works.

---

## 10. Out-of-scope backlog (for later sessions, not this one)

- Batch mode + one-time Pro license gate (§8.3 seam).
- Shareable "metadata card" OG images (needs a new generic `/api/og` design — Satori invariants in
  `.agents/rules/production-invariants.md` apply).
- C2PA claim-level parsing (validator/signature display), XMP full tree view, video/HEVC metadata.
- Programmatic SEO child pages ("remove gps from iphone photos") — after the collection grows.

---

## 11. Sources (keys → `./sources.json`)

[1] VerExif GPS-leak hook · [2] exifremover.com · [3] PrivacyStrip · [4] Scanly · [5] How-To Geek on
iLovePDF · [6] exifr README (formats, options, bundles, autorotation) · [7] WebKit — Safari 17 HEIC
support · [8] Safari `toBlob` WebP silent-fallback reports (r/webdev 2026; MDN compat note) ·
[9] caniuse/MDN DecompressionStream (Safari 16.4+) · [10] IPTC Digital Source Type NewsCodes ·
[11] IPTC AI-metadata guidance announcement · [12] A1111 wiki / community docs — `parameters` tEXt
chunk format · [13] C2PA Technical Specification v2.4 (APP11, PNG `caBX`, WebP container).
