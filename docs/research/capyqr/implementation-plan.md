# CapyQR (tool no. 7) — Implementation Plan

*Prepared 2026-09-13 by the orchestrator session. This document is a complete handoff: an agent
session that has never seen this conversation should be able to implement CapyQR from it alone.
Read §1–§4 before writing any code. Citation keys `[n]` resolve to
[`./sources.json`](./sources.json). Positioning research:
[`../expansion/roadmap.md`](../expansion/roadmap.md).*

---

## 1. Mission & scope

**CapyQR** — "a code worth scanning." A 100%-client-side styled QR generator:

1. **Compose** — pick a payload type (link/text, Wi-Fi, contact, email), style the code (dot
   shapes, colors, gradients, logo), and watch a live preview.
2. **Trust it** — the tool *scans its own output in-tab* (jsQR over the rendered canvas) and shows
   a "verified scannable" chip with the decoded payload, plus honest guards: contrast ratio,
   quiet-zone size in modules, and data-capacity fit. This is CapyStrip's prove-it ethos applied
   to QR: styled codes fail silently in the wild, so we prove each one before you export it.
3. **Export** — PNG / JPEG at 512–2048 px via `getRawData`, SVG for the vector case. No server,
   no upload, no storage.

### In scope (v1)

- Payload types: **Link & text**, **Wi-Fi** (with spec-exact escaping), **Contact** (vCard 3.0),
  **Email** (mailto with subject/body).
- Styling: dot type (6 values), corner-square/corner-dot types and colors, solid or gradient
  (linear/radial) module colors, background color, quiet-zone slider (0–6 modules), ECC level
  (auto-raised to H when a logo is present), center logo upload.
- 4–6 "Capy" one-click brand presets (house palette) as starting points.
- Export: PNG + JPEG (512 / 1024 / 2048 px), SVG (reliable only without a logo — §3.2), with a
  live "verified scannable" loop on the preview canvas.
- Guards (all pure functions): WCAG-style contrast ratio between modules and background with a
  warn threshold; quiet-zone computed in *modules* (not pixels); payload capacity check; logo
  size-vs-ECC safety note.
- Full registration per the current SUITE workflow (§8) — **tool no. 7**, including the renumber
  chore and the plate asset.

### Out of scope (v1 — do NOT build)

- **No server routes.** Dynamic/analytics QR codes require a redirect server — permanently
  anti-ethos for this suite; if you find yourself adding `src/app/api/...`, stop.
- No batch/CSV→ZIP export, no user-saved presets in localStorage — both are the documented Pro
  seam (§10); leave them unbuilt.
- No SMS/`SMSTO:`/tel/geo payloads (SMSTO has no official spec [8]; add later if demanded).
- No caption/frame designer ("SCAN ME" strips) — template-pack seam for later.
- No MECARD toggle (vCard 3.0 only in v1 — see §3.4), no vCard advanced fields (addresses,
  photos, multiple phones).
- No refactors of other tools or the shell. Read them, mirror them, leave them alone.

---

## 2. Read these first (repo law)

1. **`AGENTS.md`** — including the top warning: **this Next.js is not the Next.js in your training
   data.** Read the relevant guide in `node_modules/next/dist/docs/` before app-router code.
2. **`.agents/rules/production-invariants.md`** — storage/hydration, WCAG, layout rules (the
   Satori section applies only if you touch card art; CapyQR has no Satori surface).
3. **`.agents/skills/capytools-dev/SKILL.md`** — design tokens, hydration guard, tool recipe.
4. **`CONTRIBUTING.md`** and **`DESIGN.md`** — the house rules, and the copy **Register** rule:
   headlines sentence-case, leads and UI copy lowercase.
5. **The registration source of truth: `src/lib/capytools/suite.ts`** — read the file's own
   docstring; every list on the site derives from `SUITE`. One row + one page + one plate adds a
   tool. Note `suiteNumber()`, `SUITE_INDEX`, `pad2` helpers exist.
6. **The freshest exemplar: `src/app/capyog/page.tsx` + `src/components/tool/CapyOG.tsx`** — the
   `ToolPageShell` pattern (`tool`, `eyebrow`, `index`, `headline[]` with `em`/`dot` segments,
   lowercase `lead`), and the current three-card editor style.
7. **`tests/tool-pages.test.tsx`** — the shell contract your new page must satisfy (eyebrow, one
   h1, clay dot, back link, skip link, no external hrefs on tool pages, sentence-case headline /
   lowercase lead, corner marks). **You will edit this file** (§8.4).
8. **`tests/security.test.ts`** — repo-wide storage/network pattern guard; keep it green.
9. Shared bits you may reuse: `src/components/tool/ErrorCard.tsx`, `src/lib/capytools/motion.ts`,
   `src/lib/utils.ts` (`cn`, `SITE_URL`).

**Ethos invariants (hard):** zero network calls at runtime; nothing written to storage; no
cookies. Logo uploads stay in memory as object URLs (revoked on replace/unmount). The standard
hydration pattern applies: nothing storage/random in state initializers; the QR component mounts
client-side only (§3.5).

---

## 3. Verified technical facts (design constraints)

All verified 2026-09-13 against primary sources; ledger in `./sources.json`.

### 3.1 Rendering engine: `qr-code-styling` ^1.9.2 (MIT; sole dep `qrcode-generator` ^1.4.4)

Confirmed options surface [1][2]:

- Top level: `width`, `height` (px), `type: 'canvas' | 'svg'`, `data`, `image` (logo URL),
  `margin` (**pixels** — not modules, see §3.3), `qrOptions: { typeNumber (0=auto), mode
  ('Numeric'|'Alphanumeric'|'Byte'|'Kanji'), errorCorrectionLevel ('L'|'M'|'Q'|'H', default 'Q') }`.
- `dotsOptions`: `color`, `gradient`, `roundSize`, and `type` — exactly
  `'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded'`.
- `cornersSquareOptions` / `cornersDotOptions`: `color`, `gradient`, `type` (corner values include
  `'dot' | 'square' | 'extra-rounded' | 'rounded' | 'classy' …`).
- `backgroundOptions`: `color` (`'transparent'` allowed) or `gradient`.
- Gradient shape (all four groups): `{ type: 'linear' | 'radial', rotation: radians,
  colorStops: [{ offset: 0–1, color }] }`.
- `imageOptions`: `hideBackgroundDots` (default true), `imageSize` (default 0.4 — README says
  don't exceed 0.5), `margin`, `crossOrigin`.
- Methods: `append(container)`, `update(partialOptions)` (clears + re-appends the node), and
  **`getRawData(extension)` → `Promise<Blob | null>` in the browser**. `applyExtension(fn)` exists
  for SVG post-processing. It does **not** use shadow DOM (verified in source) [2].

### 3.2 Known engine landmines (each one drives a plan decision)

1. **Never call `download()`.** Open issue #321 (Jun 2026): `download()` emits JPEG regardless of
   the requested extension [3]. Always export via `getRawData(ext)` + your own anchor/Blob
   handling.
2. **SVG + logo is unreliable by the library's own README**: the embedded image is saved as a URL
   "and some svg applications will not render url images for security reasons" [1] (issues #13,
   #80, #163). Decision: SVG export is offered **without a logo** (pure vector). When a logo is
   set, the SVG option is disabled with a one-line honest note ("SVG keeps vector purity — export
   the logo version as PNG").
3. **`update()` clears and re-appends** (flicker reported in #279) [3]. Mitigate: debounce style
   updates (~120 ms) into one `update()` call; never destroy/recreate the instance on style
   changes.
4. **SSR crash**: the library touches browser globals at import time (`self is not defined` is
   widely reported) [4]. Load it **client-side only**: `dynamic(() => import(...), { ssr: false })`
   or a mount-time module import inside the `"use client"` component. Verify with a dev-server
   hard refresh of `/capyqr` before committing.
5. **WebP export**: not Safari-safe (Safari silently falls back to PNG) — the same 2026 gap
   documented for canvas `toBlob` [5]. Decision: PNG + JPEG + SVG only. JPEG requires a
   non-transparent background — if background is `transparent`, JPEG export fills the variant's
   paper color and says so.

### 3.3 Quiet zone is the classic styled-QR failure — compute it in modules

ISO/IEC 18004 requires a **4-module quiet zone** on all sides [6]. The library's `margin` is in
**pixels**, so the tool must convert: `marginPx = quietModules × (canvasSize / moduleCount)`.
`moduleCount` is not exposed by qr-code-styling, which is why `qrcode-generator` ^1.4.4 becomes a
**direct** dependency (it is already in the tree via the engine): build a throwaway
`qrcode(0, 'M')` instance with the same payload to read `getModuleCount()` (typically 25–41 for
real-world payloads). Default the slider to 4 modules; warn below 2; display the computed px in
the UI so the number is honest. Sizing guard: moduleCount grows with payload length — at 2048 px a
v5 code (37 modules) has ~55 px/module; fine.

### 3.4 Payload schemas (ZXing wiki is the de-facto spec)

All payloads are UTF-8 byte mode (`mode: 'Byte'`) [7]:

- **Wi-Fi**: `WIFI:T:<type>;S:<ssid>;P:<password>;H:<true|false>;;` — `T` ∈ `WEP | WPA |
  WPA2-EAP | nopass` (yes, `WPA2-EAP` is the wiki spelling; `nopass` omits `P`). **Escaping:
  `\`, `;`, `,`, `"` and `:` are escaped with a backslash** — e.g. SSID `foo;bar"baz` →
  `foo\;bar\"baz` [7]. Field order free; `H:true` = hidden network. iOS 11+/Android parse this
  natively [7].
- **Contact**: vCard 3.0 — `BEGIN:VCARD\nVERSION:3.0\nN:<last>;<first>;;;\nFN:<full>\nORG:…\nTEL:…\nEMAIL:…\nURL:…\nEND:VCARD`
  (omit empty fields). MECARD is more compact but vCard is the expressive default; the ZXing wiki
  documents both without a reliability ranking [7] — do not claim one in UI copy.
- **Email**: `mailto:<address>?subject=<enc>&body=<enc>` (URI-encode query values) [7].
- **Link & text**: raw string; if it starts with a scheme leave it, else it's plain text.
- Empty-required-field handling: Wi-Fi needs `S`; email needs the address; contact needs `FN` or
  `N`. The builder returns a typed error instead of encoding an invalid payload.

### 3.5 Scannability verification: jsQR ^1.4.0 (Apache-2.0, ~46 KB gzipped)

`jsQR(imageData.data, width, height, { inversionAttempts: "attemptBoth" })` → `null` or
`{ data, version, location, … }`; input is exactly `canvas.getContext('2d').getImageData(...).data`
[9]. It is frozen (v1.4.0, 2021) but stable and dependency-free — fine for a verifier. The
"verified scannable" loop: render → `getImageData` → decode → chip shows **"verified scannable —
decoded: <first 40 chars>"**. Two honest wrinkles to surface, not hide:

- If a styled variant (dots/classy) fails while `square` passes, that is a *real* scannability
  warning — show it ("this style decoded slowly/not at all in the in-tab scan — consider higher
  contrast or a calmer dot style"). jsQR has no primary-source claim about styled codes [9], so
  the in-tab result is our ground truth.
- `attemptBoth` costs ~50% perf [9] — irrelevant at 1024 px, keep it for inverted-code support.

### 3.6 Scannability numbers for the guard functions

- ECC codeword recovery: **L ~7%, M ~15%, Q ~25%, H ~30%** (ZXing source, citing ISO/IEC
  18004 §6.5.1; DENSO WAVE confirms M/Q) [10].
- Logo safety: community consensus, no ISO number — logo ≤ ~30% of area with ECC H
  (qr-code-styling's own README anchors `imageSize` 0.4, "not recommended over 0.5") [1][11].
  Guard: `imageSize > 0.4` or ECC < H with a logo ⇒ warning line.
- Contrast: no ISO threshold exists [11]. Guard: compute the WCAG-style relative-luminance ratio
  between module color and background; warn < 3:1 ("phones may hesitate"), hard-warn < 2:1. Label
  it as a heuristic in the UI ("rule of thumb, not a spec") — honesty is brand.

### 3.7 Export safety numbers

PNG/JPEG canvas exports are universal; WebP is not (§3.2.5) [5]. iOS canvas ceiling ≈ 16.7 M px —
2048×2048 = 4.2 M px is safe; do not offer 4096 [12]. `getRawData('svg')` returns an SVG Blob you
download via object URL (revoke after) [1][2].

---

## 4. File map (everything you will create or touch)

```
src/lib/capyqr/
  types.ts       # PayloadKind, PayloadFields, QrStyleState, GuardResult, VerifyResult
  payloads.ts    # buildPayload(kind, fields) + escapeWifiValue + vCard/mailto builders (pure)
  matrix.ts      # moduleCountFor(data, ecLevel) via qrcode-generator (pure, isomorphic)
  guards.ts      # contrastRatio(hexA, hexB), warnBand(ratio), quietZonePx(sizePx, moduleCount, modules),
                 # logoAdvice(imageSize, ec, hasLogo)  (pure)
  presets.ts     # CAPY_PRESETS: 5 brand starting points (sage/water/clay/gold/mono)
  render.ts      # browser-only: createQr(container, options), updateQr, exportBlob(qr, ext)
                 # (canvas instance + offscreen svg instance for SVG export; NEVER download())
  verify.ts      # verifyCanvas(canvas) → { ok, data } via jsQR (browser-only, thin)
src/components/tool/CapyQR.tsx    # the editor; loads qr-code-styling client-side only
src/app/capyqr/page.tsx           # ToolPageShell — tool no. 7
public/plates/lab-7.webp          # 896×1200 plate (§8.2)
tests/capyqr.test.ts              # pure-logic suite (§9)
```

Registration touches (§8): `src/lib/capytools/suite.ts`, `README.md`,
`tests/tool-pages.test.tsx`, and the six existing pages' `index="Nº 0X / 06"` literals.

**Dependency changes (the only allowed ones):** `npm i qr-code-styling@^1.9.2 qrcode-generator@^1.4.4 jsqr@^1.4.0`.
`qrcode-generator` is already a transitive dep — this pins it as direct. Nothing else.

---

## 5. Data layer (`src/lib/capyqr/`)

### 5.1 `types.ts`

```ts
export type PayloadKind = "link" | "wifi" | "contact" | "email";
export interface PayloadFields {
  link?: { text: string };
  wifi?: { ssid: string; password: string; encryption: "WPA" | "WEP" | "nopass"; hidden: boolean };
  contact?: { first: string; last: string; org?: string; phone?: string; email?: string; url?: string };
  email?: { to: string; subject?: string; body?: string };
}
export type EccLevel = "L" | "M" | "Q" | "H";
export interface QrStyleState {
  dotType: "square" | "rounded" | "dots" | "classy" | "classy-rounded" | "extra-rounded";
  cornerSquareType: "square" | "dot" | "extra-rounded";
  cornerDotType: "square" | "dot";
  fg: { mode: "solid"; color: string } | { mode: "gradient"; gradientType: "linear" | "radial"; from: string; to: string; rotation: number };
  bg: string;                    // hex, or "transparent"
  quietModules: number;          // 0–6, default 4
  ecc: EccLevel;                 // default "Q"; auto "H" with logo (override warns)
  cornerColor: string | null;    // null = follow fg
}
```

### 5.2 `payloads.ts` (pure — the most-tested file)

```ts
export function buildPayload(kind: PayloadKind, fields: PayloadFields): { ok: true; value: string } | { ok: false; error: string };
export function escapeWifiValue(raw: string): string;   // \  ;  ,  :  "  →  \\  \;  \,  \:  \"
```

Golden cases to encode as tests: SSID `foo;bar"baz\` → `foo\;bar\"baz\\`; hidden WPA network
string; vCard with only FN+TEL (no empty lines); mailto with encoded subject/body; every
required-field error message. **Escaping applies to SSID and password only** (per the wiki's
MECARD-style note [7]).

### 5.3 `matrix.ts`

```ts
export function moduleCountFor(value: string, ec: EccLevel): number | null;
// qrcode(0, ec) + addData(value, 'Byte') + make() in try/catch → getModuleCount(); null = too much data
```

Also export `capacityNote(value, ec)` — the friendly "about N modules wide; v<version>" line.
qrcode-generator throws on overflow — catch it and hand the UI a calm "this much data needs a
quieter style or shorter text" message.

### 5.4 `guards.ts` (pure)

- `contrastRatio(hexA, hexB)` — standard WCAG relative-luminance math; parse 3/6-digit hex.
- `contrastBand(ratio)` → `"ok" | "soft" (<3:1) | "hard" (<2:1)` with UI copy strings.
- `quietZonePx(sizePx, moduleCount, quietModules)` and `quietBand(quietModules)` →
  `"ok" (≥4) | "soft" (2–3) | "hard" (<2)`.
- `logoAdvice(hasLogo, imageSize, ecc)` → array of note strings (auto-H happened / over 0.4 /
  ECC below H with a logo).

### 5.5 `presets.ts`

`CAPY_PRESETS`: five `QrStyleState` starting points on house tokens — Sage (sage `#8e9b7e` on
cream `#f9f9f7`), Water, Clay, Gold on charcoal `#1e1e1e`, and Mono (ink on white). Keep each
preset scannable by construction (contrast ≥ 4.5:1, quiet 4).

### 5.6 `render.ts` (browser-only — every function guards `typeof window`)

```ts
export async function createQrEngine(): Promise<QrEngine>;
// dynamic import("qr-code-styling") inside the function — dodges the SSR self-crash (§3.2.4)
export interface QrEngine {
  mount(container: HTMLElement): void;
  update(options: QrOptions): void;          // single debounced update() — §3.2.3
  exportBlob(ext: "png" | "jpeg" | "svg"): Promise<Blob | null>;   // getRawData ONLY — never download()
}
```

- The mounted instance is `type: "canvas"` at the export size (see §6 sizing); for SVG export,
  keep a second offscreen instance with `type: "svg"` and mirror options into both on update.
- `exportBlob('jpeg')` with transparent bg → fill the paper color first (note surfaced by caller).
- Gradient translation: `{ mode: "gradient" }` → `{ gradient: { type, rotation,
  colorStops: [{ offset: 0, color: from }, { offset: 1, color: to }] } }`.

### 5.7 `verify.ts`

```ts
export function verifyCanvas(canvas: HTMLCanvasElement): { ok: true; data: string } | { ok: false };
// jsQR(ctx.getImageData(...).data, w, h, { inversionAttempts: "attemptBoth" })
```

---

## 6. The editor (`CapyQR.tsx`) — three cards, house style

**Card 1 — "The payload."** Kind tabs (Link & text / Wi-Fi / Contact / Email) → the fields for
that kind (controlled inputs, `htmlFor`/`id` pairs per the invariants). Live "encoded payload"
mono well showing the exact string being encoded (this is where Wi-Fi escaping visibly works —
and it doubles as the decoded-payload reference for §5.7's verify chip).

**Card 2 — "The style."** Capy preset chips · dot type select · corner selects · color mode
(solid/gradient + pickers) · background picker (+ "transparent") · quiet-zone slider in *modules*
with the computed px shown · ECC select (auto-switches to H on logo upload, with an honest note) ·
logo upload (→ object URL, `imageOptions: { hideBackgroundDots: true, imageSize: 0.4 }`, revoke
on replace/unmount) · guard strip: three quiet lines (contrast band, quiet-zone band, logo
advice) — warnings in clay, never color-alone.

**Card 3 — "The code."** Preview (the engine's canvas, CSS-scaled to fit; the *canvas itself* is
at export size so preview == export pixels — the CardScaled principle) · the **verify chip**:
"verified scannable — decoded: <prefix>" or the styled-code warning from §3.5 · export row: size
pills (512/1024/2048), format pills (PNG/JPEG/SVG — SVG disabled-with-note when a logo is set),
Download (`min-w-[84px]`, filename `capyqr-<kind>-<size>.<ext>`), Copy image (`min-w-[84px]`,
ClipboardItem image/png with text-only fallback message, mirroring `src/lib/card/export.ts`'s
pattern) · `aria-live="polite"` status line.

Page (`page.tsx`) — `ToolPageShell` exactly like `src/app/capyog/page.tsx`:
`tool="CapyQR"`, `eyebrow="CapyQR · tool no. 7"`, `index="Nº 07 / 07"`, headline sentence-case
with an `em` segment + `dot` (e.g. "A code worth *scanning*."), `lead` lowercase ("styled wi-fi,
contact and link codes, composed and proof-scanned in your browser. all local."). Metadata:

```ts
export const metadata = {
  title: "CapyQR — styled QR code generator (Wi-Fi, vCard, colors, logo)",
  description:
    "Design a QR code with your colors, shapes and logo — then watch the tool scan its own output before you export PNG, JPEG or SVG. 100% in your browser, nothing uploaded.",
};
```

Errors reuse `ErrorCard`. Debounce engine updates (~120 ms). Memory hygiene: revoke object URLs
(logo, exports) in cleanup paths.

---

## 7. UI copy register (binding)

Per `DESIGN.md` "Register" and `tests/tool-pages.test.tsx`: headline starts uppercase; lead and
UI copy start lowercase; no exclamation marks; warnings state the fix, not the failure
("bump contrast above 3:1 — phones hesitate below that"). Never claim ISO compliance, never rank
vCard vs MECARD reliability, never say "works with every scanner" — the verify chip says what *we*
proved, in-tab.

---

## 8. Registration (the current SUITE workflow) + renumber chore

1. **`src/lib/capytools/suite.ts`** — append the 7th row:
   ```ts
   {
     name: "CapyQR", short: "QR", href: "/capyqr", cat: "browser", badge: "QR", year: "2026",
     blurb: "Styled QR codes that prove they scan — payloads, colors, a logo, and an in-tab decoder before you export.",
     note: "Proof-scanned",
     line: "Styled QR codes, proven scannable in-tab.",
     plate: { src: "/plates/lab-7.webp", width: 896, height: 1200 },
   }
   ```
   (Tune the copy to the house voice; keep the fields' roles from the docstring.)
2. **Plate** — create `public/plates/lab-7.webp` at **896×1200**: a product shot of the tool's own
   output (the demo QR styled with the Sage preset, on the cream canvas with the corner-mark
   framing the landing uses). Match the tone of `lab-6.webp`; export from the tool or compose in
   the editor — no external stock.
3. **`src/app/capyqr/page.tsx`** — per §6.
4. **Renumber chore (mechanical, do not skip):** every existing page passes a hardcoded
   `index="Nº 0X / 06"`. Grep `"/ 06"` across `src/app/` and `tests/` and update all six pages
   **and** the `tool-pages.test.tsx` table to `"/ 07"` (CapyExpense stays no. 5 even though it is
   "coming soon" — the numbering is positional in SUITE). This mirrors the `a2ce3fc` "renumber"
   precedent. Also grep for hardcoded count words ("six tools" etc.) anywhere copy counts the
   suite — suite-derived helpers (`SUITE_WORD`, `SUITE_INDEX`) already handle most surfaces.
5. **`tests/tool-pages.test.tsx`** — add the CapyQR row (`"CapyQR · tool no. 7"`, a headline
   fragment, `"Nº 07 / 07"`). Your page carries **zero external hrefs** (default branch of the
   external-href test) — the maps-style exemption CapyStrip has does not apply here.
6. **`README.md`** — add `## 7. CapyQR` following the existing tool sections' voice.
7. **`CONTRIBUTING.md`** — only if it contains a per-tool inventory (check; don't restructure).

---

## 9. Test plan (`tests/capyqr.test.ts` — pure logic, node env, zero network)

1. **payloads.ts** — Wi-Fi escaping goldens (§5.2); all four kinds' happy paths; every
   required-field error; hidden-network and nopass variants; mailto encoding.
2. **matrix.ts** — `moduleCountFor` grows with payload length; stable for identical input; returns
   `null` (not throw) on oversized data (a ~3 KB string forces overflow at low ECC).
3. **guards.ts** — `contrastRatio` goldens (black/white = 21, sage `#8e9b7e` vs cream
   `#f9f9f7` ≈ 2.6 → `"hard"`; ink `#1a1a1a` vs white > 12 → `"ok"`); quiet-zone bands; all
   `logoAdvice` branches.
4. **presets.ts** — every Capy preset passes its own guard set (contrast ≥ 4.5:1, quiet 4) —
   presets that don't scan are a bug by construction.
5. **types/registration parity** — assert the SUITE row exists with `href: "/capyqr"` at index 6
   (7th), and that `src/app/capyqr/page.tsx` exists and exports metadata with the expected title.
   Keep `tests/tool-pages.test.tsx` (§8.5) green — it covers the shell contract.
6. **No browser-API tests.** `render.ts`/`verify.ts` are thin browser-only wrappers; their logic
   branches (jpeg-fill, svg-no-logo) are decision helpers factored pure and table-tested.

**Definition of done:** `npm test` green (all existing tests incl. `tool-pages`, `security`,
`landing`, `design-scale`, `motion-tokens` still pass), `npx tsc --noEmit` clean, `npx eslint`
clean on new files, and a manual smoke: Wi-Fi payload with `;:"\` in the SSID scans from a real
phone and joins the network; logo upload auto-raises ECC to H; a dots-style low-contrast code
triggers the contrast warning and the verify chip reports it; SVG export disables with the logo
set and works without; devtools Network shows zero requests across compose→verify→export; hard
refresh of `/capyqr` shows no SSR crash (§3.2.4).

---

## 10. Out-of-scope backlog (seams, documented not built)

- **Batch CSV→ZIP** + **saved brand kits** (localStorage preferences) — the one-time-Pro seam;
  `buildPayload`/`presets` are already pure loops-ready.
- **Frame/caption designer** ("SCAN ME" strips, quiet-zone captions) — template-pack seam.
- **Payload types v2**: `SMSTO:`/tel/geo (SMSTO lacks a spec [8] — needs a wild-format decision),
  MECARD compact toggle, multiple-contact sheets.
- **Custom module art** (capybara-shaped modules via `applyExtension` or a custom canvas renderer
  on the qrcode-generator matrix) — the "CapyQR but make it a capybara" viral feature; only after
  the verify loop proves the shapes still decode.
- Derive page `index` literals from `SUITE`/`suiteNumber()` to retire the renumber chore —
  propose to the orchestrator instead of doing it in this session.

---

## 11. Sources (keys → `./sources.json`)

[1] qr-code-styling README (options surface, `imageSize` guidance, SVG-image caveat) · [2] QRCodeStyling
source (`append`/`update`/`getRawData`, no shadow DOM, types entry) · [3] GitHub issues #321
(`download()` JPEG bug), #279 (update flicker) + release dates · [4] SSR `self is not defined`
reports · [5] Safari WebP-encode gap + canvas `toBlob` fallback behavior · [6] ISO/IEC 18004
quiet zone (spec page + confirmations) · [7] ZXing wiki Barcode-Contents (Wi-Fi format + escaping,
vCard/MECARD, mailto/tel/sms/geo, "Android, iOS 11+") · [8] ZXing wiki note: SMSTO has no official
spec · [9] jsQR repo/registry/bundlephobia (API, Apache-2.0, 46 KB gz, `inversionAttempts` cost) ·
[10] ZXing `ErrorCorrectionLevel` source (L/M/Q/H ≈ 7/15/25/30%, citing ISO 18004 §6.5.1; DENSO
WAVE confirmation) · [11] community logo-size/contrast guidance (labeled consensus, not spec) ·
[12] iOS ~16.7 M px canvas ceiling report.
