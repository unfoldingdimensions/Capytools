# CapyQR v2 — Implementation Plan (the free Must-add + Should-add batch)

*Prepared 2026-09-13 by a reviewer session, from the competitive evidence in
[`./competitor-survey.md`](./competitor-survey.md) (PR #20 — seven-site teardown) and
[`./miniqr-competitive-analysis.md`](./miniqr-competitive-analysis.md) (PR #19 — MiniQR deep-dive).
This document is a complete handoff: an agent session that has never seen this conversation
should be able to implement CapyQR v2 from it alone. Read §1–§3 before writing any code.
Line references are to `main` as of ba85e29 (the CapyQR code after the cd16351 certify fix).*

---

## 1. Mission & scope

**CapyQR v2** is the same tool (no. 7) made more correct, more useful and warmer — no
registration changes (no SUITE row, README, plate or renumber work; `tests/capyqr.test.ts`'s
registration block at lines 393–403 asserts SUITE length **8** and must keep passing):

1. **UTF-8 multibyte correctness** — today the engine's Byte mode truncates to Latin-1
   (`charCodeAt & 0xff`), so CJK, emoji and accented text silently mangle inside the engine.
   MiniQR shipped the fix; we close the gap.
2. **tel / geo / event payloads** — the three cheapest demand-backed schema additions (five of
   the eight surveyed competitors ship them). Plan v1's §10 v2 backlog, now scheduled.
3. **Frames + captions (richer v0)** — four frame shapes, frame color, caption text and
   position. The print use case (stickers, flyers, table tents) that Ente, MiniQR and QRCode
   Monkey all serve. Composes through the existing quiet-zone math and is **proved by the same
   in-tab scan** as everything else.
4. **Honest export spec line** — ECC, module count, quiet zone and output pixels printed beside
   the download; the measured file size reported after each export (measured, never estimated).
5. **Curated swatches + randomize** — house-token swatch rows beside the hex pickers, eyes
   color surfaced in Full mode, and a randomize button that only ever lands on guard-passing
   styles.
6. **The arm's-length hint** — one lowercase line under the preview.
7. **Simple/Full disclosure** — Card 2's density gets a two-state toggle; Simple is the default.

### In scope

Everything above, plus their tests. **Out of scope (do NOT build):** dynamic QR in any form
(redirect server, statistics, editability — permanently anti-ethos, see competitor-survey §2);
ASCII/TXT export, PDF/EPS, halftone image-QRs, a scanner mode, PWA/i18n (documented good-to-have
seams in the survey §4, all unbuilt); any paywall surface; localStorage persistence of anything
(including the Simple/Full preference — it is plain `useState` on purpose).

### Ethos invariants (hard, unchanged from v1)

Zero network calls at runtime; nothing written to storage; no cookies; logo uploads stay in
memory as object URLs; the engine loads client-side only (dynamic `import()`); exports go
through the composition/engine, **never the library's `download()`**; the proof chip certifies
only the pixels actually on screen.

---

## 2. Read these first

1. `AGENTS.md` (the Next.js warning + hydration guard), `.agents/rules/production-invariants.md`,
   `.agents/skills/capytools-dev/SKILL.md`, `DESIGN.md` (**Register** rule).
2. The v1 handoff: `./implementation-plan.md` — still accurate on payload schemas and the
   engine landmines (§3.2); this doc supersedes it for everything it specifies.
3. The current code, which is the base of all line references below:
   - `src/components/tool/CapyQR.tsx` (1003 lines) — constants 48–86, state 160–174, memos
     179–202, effects 206–253, `proof` stamp check 340, Card 1 348–579, Card 2 582–909,
     Card 3 912–1000.
   - `src/lib/capyqr/` — `types.ts`, `payloads.ts`, `matrix.ts`, `guards.ts`, `presets.ts`,
     `render.ts`, `verify.ts` (each specced in §3 below).
   - `tests/capyqr.test.ts` (409 lines) — nine describe blocks; the **jsQR-in-node pattern**
     lives at 326–391 (hand-rendered RGBA via `qrcode(0, "Q")` + `isDark`); every new test must
     follow that pure-logic, node-env, zero-network rule.
4. Reusable canvas/zip patterns (read, mirror, leave alone):
   `src/lib/capyresize/render.ts` — `canvas2d` 44–51, `toBlob` 53–61, `drawPaddedFrom` 136–150
   (pad-and-center composition), `encodeCanvas` 158–173 (JPEG paper-flatten at canvas level),
   `formatBytes` 226.

---

## 3. Verified technical facts (each drives a decision)

All verified 2026-09-13 against the installed packages and source.

**3.1 The engine bundles its own encoder.** qr-code-styling's dist inlines the whole
qrcode-generator encoder with its own `stringToBytes` closure (`charCodeAt & 0xff` — Latin-1
truncation). Overriding the standalone `qrcode-generator` module (v1.5.2, a direct dep) reaches
`matrix.ts` but **not** the engine. ⇒ The UTF-8 fix is payload-level pre-encoding (§4.1), not a
module override. MiniQR solved it the module-override way because they vendored and rewrote the
engine (`src/lib/qr-code/utf8.ts` in their repo); we don't vendor, so we pre-encode.

**3.2 jsQR decodes Byte mode as UTF-8.** The proof scan (`verifyPixels`, verify.ts:43–54) runs
real jsQR in node today (tests 326–391). The v2 round-trip test — encode multibyte → hand-render
→ `verifyPixels` → expect the **original** text back — pins the fix at the logic layer. The
physical-phone scan remains an owner smoke step (§8).

**3.3 `getRawData()` exports only the engine's own canvas.** Frames therefore need a
**composition canvas**: the engine renders the QR alone at `qrRect` size; a stage canvas at the
export size receives frame + QR + caption and becomes both the preview and the export source
(`canvas.toBlob`, pattern: capyresize `toBlob`/`encodeCanvas`). The engine's two-instance design
(canvas + offscreen svg, render.ts:110–143) is unchanged; only its `width/height/margin` become
frame-dependent.

**3.4 The proof stamp survives frame state changes for free.** `verify.of === engineOptions`
(CapyQR.tsx:340) compares memoized-object identity; a frame change alters the engine canvas size
⇒ a new `engineOptions` object ⇒ the stale proof hides until the rescan lands. Keep that
invariant: **`engineOptions` must be the single object identity that describes everything the
render depends on** (payload, size, style, quiet, logo, and now frame shape/color/label/position
through the layout).

**3.5 Current arities to respect or widen.** `logoAdvice(hasLogo, ecc)` (guards.ts:79–88 —
two args since cd16351; leave it); `svgExportBlocked(hasLogo)` (render.ts:46–48) widens to
`(hasLogo, hasFrame)`; `buildEngineOptions({value, size, style, quietPx, logoUrl})`
(render.ts:84–108, `imageOptions` pinned at 0.4 on line 106) keeps its signature — the caller
passes `qrSize` as `size` and the byte-string as `value`.

**3.6 `DEFAULT_STYLE` aliases `CAPY_PRESETS[0].style` by reference** (presets.ts:93) and the
preset active-check is `JSON.stringify(style) === JSON.stringify(preset.style)`
(CapyQR.tsx:587). ⇒ **Frame state lives OUTSIDE `QrStyleState`** (as its own `FrameState` in
component state), or presets would all need `frame: null` and the active-check would break.
Randomize must not touch frame state either.

**3.7 No storage exists in CapyQR** (grep-verified over `src/lib/capyqr/` + `CapyQR.tsx`).
Keep it that way; the Simple/Full preference is component state and resets on reload
deliberately.

---

## 4. The seven items, specified

### 4.1 UTF-8 multibyte correctness (must)

**New file `src/lib/capyqr/utf8.ts`:**

```ts
/**
 * UTF-8 bytes as a Latin-1 string — the engine's Byte mode eats exactly one
 * character per byte (charCodeAt & 0xff), so handing it the UTF-8 bytes *as a
 * string* is the only way multibyte text reaches a phone intact. ASCII input
 * is byte-identical and passes through unchanged.
 */
export function toEngineByteString(text: string): string;
```

Implementation: `new TextEncoder().encode(text)`, then chunked conversion —
`String.fromCharCode(...bytes.subarray(at, at + 0x8000))` in a loop (chunking because a spread
over a multi-thousand-element array can overflow the call stack; QR payloads max out at 2,953
bytes but the guard must not depend on that).

**Wiring — exactly two places:**
- `matrix.ts` `moduleCountFor` (lines 19–30): `qr.addData(toEngineByteString(value), "Byte")`.
  `capacityNote` and `versionForModuleCount` need no changes (they derive from the count).
- `render.ts` `buildEngineOptions` (line ~94): `data: toEngineByteString(value)`.

**What does NOT change:** `escapeWifiValue` and every schema builder operate on the *original*
text (escaping is schema-level, applied before encoding); the encoded-payload well in Card 1
keeps showing the original composed string; the proof chip keeps showing what decoded.

**Tests** (describe `"CapyQR utf8 bridge"`): `'é'` → a 2-char string whose charCodes are
`0xC3, 0xA9`; emoji (surrogate pair) → 4 bytes; ASCII passthrough identity; idempotence on
already-encoded input is NOT claimed (do not test that); `moduleCountFor("é".repeat(500))`
equals `moduleCountFor(toEngineByteString("é".repeat(500)))` and is strictly greater than the
Latin-1 count of the same input; and the jsQR round trip — extend the existing
`render(value, inverted)` helper (tests 338–360) to pass `toEngineByteString(value)` to
`addData`, then `verifyPixels` on a multibyte payload returns `{ ok: true, data: <original> }`.

### 4.2 tel / geo / event payloads (must)

**`types.ts`:** extend `PayloadKind` with `"tel" | "geo" | "event"` and `PayloadFields` with:

```ts
tel?: { phone: string };
geo?: { lat: string; long: string };
event?: { title: string; start: string; end: string; location?: string };
```

(`start`/`end` arrive as `datetime-local` strings — `"YYYY-MM-DDTHH:mm"`.)

**`payloads.ts`:** three private builders mirroring the existing style (trim → validate →
build, calm required-field errors that state the fix):

- `tel`: `tel:${digits-and-allowed-chars}` — strip all whitespace; refuse empty with
  `"a phone code needs a number — add who it dials."`. Do not validate country codes.
- `geo`: `geo:${lat},${long}` per RFC 5870 — both must parse as finite floats; latitude within
  ±90, longitude within ±180. Errors: `"a location code needs coordinates — add a latitude and
  longitude."` and `"those coordinates are out of range — latitude runs ±90, longitude ±180."`
- `event`: plain vEvent (no `BEGIN:VCALENDAR` wrapper — the form phones actually parse):

  ```
  BEGIN:VEVENT
  SUMMARY:<title>
  DTSTART:YYYYMMDDTHHMMSS
  DTEND:YYYYMMDDTHHMMSS
  LOCATION:<location>     ← only if non-empty
  END:VEVENT
  ```

  Datetimes: strip `-` and `:` from the datetime-local value → floating local time. A private
  `toIcalStamp(value: string): string | null` (pure, exported for tests) returns null for
  anything that is not a parseable datetime-local string. Errors: `"an event code needs a
  title — name what it is."`, `"an event code needs a start and an end — fill both times."`,
  `"the end is before the start — check the times."` Empty optional fields are omitted (vCard
  precedent, payloads.ts:38–45).

`buildPayload`'s switch (lines 85–102) is exhaustive with no default — TypeScript forces the
three new arms; the missing-subobject branches reuse the builder error strings.

**UI (Card 1):** three new `KINDS` entries — `"phone"`, `"location"`, `"event"` — with field
sets: tel = one Input (`capyqr-tel-phone`); geo = two Inputs lat/long (`capyqr-geo-*`,
`inputMode="decimal"`); event = title Input, start/end `type="datetime-local"`, location Input
(textarea not needed; `sm:col-span-2` for the pair). Follow the existing label/`htmlFor`/id
pattern (production-invariants §3).

**Tests:** schema goldens for all three (happy paths, optional-field omission), every
required-field error, geo range rejections, `toIcalStamp` table (valid, missing seconds
semantics, garbage → null), end-before-start refusal, and one multibyte golden (a location
named `café` inside an event's `LOCATION`).

### 4.3 Frames + captions, richer v0 (must)

**State** — outside `QrStyleState` (fact 3.6), in component state:

```ts
export interface FrameState {
  on: boolean;
  shape: "band" | "banner" | "card" | "tab";
  color: string;          // the frame band's fill
  label: string;          // caption text; "" = no caption
  position: "top" | "bottom";
}
// DEFAULT_FRAME: { on: false, shape: "band", color: "#f9f9f7", label: "SCAN ME", position: "bottom" }
```

**New pure module `src/lib/capyqr/frame.ts`:**

```ts
export type FrameShape = "band" | "banner" | "card" | "tab";
export interface FrameLayoutInput {
  size: number; moduleCount: number; quietModules: number;
  frame: FrameState; hasLabel: boolean;
}
export interface FrameLayout {
  qrSize: number;                     // the engine canvas's edge — the QR + its quiet margin
  qrX: number; qrY: number;           // where the engine canvas sits on the stage
  bandRects: { x: number; y: number; w: number; h: number; radius: number }[];
  caption: { x: number; y: number; maxWidth: number; fontSize: number } | null;
}
export function frameLayout(input: FrameLayoutInput): FrameLayout;
```

Shape geometry (all sizes scale off `size`, the export edge):

- **band** — frame-color fill across the whole stage; band thickness `size × 0.08` on the three
  label-less sides, `size × 0.15` on the caption side when a label is present. Caption centered
  in the caption band.
- **banner** — the code's background fills the stage; one frame-color band on the caption side
  only (`size × 0.16` with a label). No side bands.
- **card** — like band but the outer rect carries a `size × 0.06` corner radius (drawn as a
  rounded-rect path in compose), band thickness `size × 0.10`, caption band `size × 0.16`.
- **tab** — the code's background (or transparent, if bg is transparent) fills the stage; a
  frame-color ribbon `size × 0.12` tall, `size × 0.62` wide, centered on the caption side's
  edge. Caption inside the ribbon.

Invariants `frameLayout` must hold (and the tests assert): the QR canvas sits strictly inside
every band (`qrX ≥ bandLeft`, etc. — the engine's own quiet margin lives *inside* the canvas,
so the modules never touch the band); caption `maxWidth ≤ size − 2 × (size × 0.04)`; caption
`fontSize` starts at `size × 0.052` and the compose step shrinks it to fit `maxWidth` (measure
once via `ctx.measureText`, floor at `size × 0.03`, no wrapping — v0 captions are one line);
`moduleCount ≤ 0` or `size ≤ 0` yields a degenerate layout with `qrSize = size` and no bands
(defensive, mirrors `quietZonePx`'s zero-guards).

**Compose (browser-only, render.ts):** `composeStage(engine: HTMLCanvasElement, stage: HTMLCanvasElement, layout: FrameLayout, style: QrStyleState, frame: FrameState): void` —
fills bands, `drawImage(engine, qrX, qrY, qrSize, qrSize)`, then the caption: `font = 500
<fontSize>px "Plus Jakarta Sans", sans-serif` in the **foreground color** (solid → `fg.color`,
gradient → `fg.from`), behind a `document.fonts.ready` await (CapyOG precedent,
`src/lib/capyog/export.ts:75`). Reuse the `canvas2d`/`toBlob` idioms from capyresize
(render.ts:44–61) as local helpers — do not import across tools.

**Engine wiring:** `engineOptions.width/height = layout.qrSize` and
`quietPx = quietZonePx(layout.qrSize, moduleCount, quietModules)` (the memo chain becomes:
`layout` memo ← {size, moduleCount, quietModules, frame}; `engineOptions` ← {payload, layout,
style, logoUrl}; the stamp check at CapyQR.tsx:340 then covers frame changes automatically —
fact 3.4). When `frame.on` is false, `frameLayout` returns the identity layout (`qrSize = size`,
`qrX = qrY = 0`, no bands, no caption) and the whole path reduces to today's behavior — the
no-frame regression surface is the identity case.

**DOM restructure (Card 3, CapyQR.tsx:912–918):** `stageRef` keeps holding what is displayed
and scanned, but the engine mounts into a **separate hidden container ref** (visually hidden,
still in the DOM); the effect at 237–253 becomes: update engine → compose stage → read
`stageRef`'s canvas → verify. The composed stage keeps the existing `role="img"` +
aria-label ("live QR preview — the exact pixels that export").

**Export:** `exportStage(stage, format)` in render.ts — `toBlob` for png; jpeg fills paper
first when `jpegFillNeeded(style.bg)` (same rule as today); **`svgExportBlocked` widens to
`(hasLogo, hasFrame)`** and SVG is disabled with either, note copy: "SVG keeps vector purity —
export the framed version as PNG." (logo) / "…the framed version as PNG." (frame).
`handleDownload`/`handleCopy` switch from `engine.exportBlob(format)` to `exportStage(...)` —
PNG and copy both come from the composed pixels; the copy path stays PNG-only.

**Frame controls (Card 2, new section between logo and guards):** an on/off pill ("frame");
when on — four shape pills (band / banner / card / tab), a frame-color swatch row (background
palette, §4.5), position pills (top / bottom), and a caption Input (`capyqr-frame-label`,
placeholder "SCAN ME", maxlength 40). In Simple mode the section shows on/off + caption only;
shapes/colors/position are Full-mode.

**Guards:** unchanged — the frame sits outside the quiet zone, and caption contrast
(foreground on frame color) is the same pair the contrast guard already measures; add one
`logoAdvice`-style note only if testing proves it needed (do not preempt).

**Tests (frame.ts is pure — table-test it):** identity layout when off; per-shape geometry
tables (band rects, qr placement, caption rect present iff label non-empty); the inside-bands
invariant; degenerate input; `svgExportBlocked(true, false)`, `(false, true)`, `(true, true)`;
compose itself is browser-only and earns no node test (thin wrapper, v1 §9.6 precedent).

### 4.4 Honest export spec line (should)

**Pure helper** (matrix.ts, beside `capacityNote`):

```ts
export function exportSpecLine(input: {
  ecc: EccLevel; moduleCount: number; quietModules: number;
  quietPx: number; size: number; format: "png" | "jpeg" | "svg";
}): string;
```

→ `"error correction Q · 29 modules · quiet zone 4 (≈141 px) · 1024×1024 png"` — quiet-px
segment dropped when `quietModules === 0`, format shown via `fileExtensionFor`. Rendered under
the size/format row (Card 3, after the pills), muted, `aria-hidden` not needed (it is real
information; keep it read by AT).

**Measured size, not estimated:** `handleDownload` reports the actual blob in the status line —
"saved capyqr-wifi-1024.png (412 KB)" — via a small `formatKb(bytes)` helper (capyresize's
`formatBytes` at 226 is the shape; copy, don't import). No ZapQR-style `~210 KB` estimate: an
estimate can lie, a measurement can't. The stale-status guard (`status.file === downloadName`,
CapyQR.tsx:993–999) already covers this.

**Tests:** `exportSpecLine` goldens (with/without quiet, svg vs png, 0 modules edge).

### 4.5 Curated swatches + randomize (should)

**`presets.ts` additions:**

```ts
export const CODE_SWATCHES: string[];      // #1a1a1a, #4a6741, #5f7a72, #c07952, #d9a441, #7a8e6e
export const EYES_SWATCHES: string[];      // same tokens + null-equivalent "match code" handled in UI
export const BACKGROUND_SWATCHES: string[]; // #f9f9f7, #ffffff, #f1efea, #1e1e1e, #c07952, #dfe5d6
export function randomGuardPassingStyle(rng: () => number): QrStyleState;
```

`randomGuardPassingStyle` picks fg from `CODE_SWATCHES` and bg from `BACKGROUND_SWATCHES` with
`contrastRatio ≥ 4.5` enforced by rejection sampling (loop, max 40 tries, fall back to the sage
preset — a preset is always a valid answer), random dot/corner types from the existing
constants, `quietModules: 4`, `ecc: "Q"`, `cornerColor: null`. `rng` is injected
(`() => number`) so the property test is deterministic: for 200 seeded draws, every output
passes `contrastBand(contrastRatio(...)) === "ok"`, quiet 4, and is JSON-distinct enough to
cover ≥ 10 distinct fg/bg pairs (assert variety loosely — no flaky exact-set assertions).

**UI:** swatch buttons (small `size-6 rounded-full` circles with `aria-label` "code color
<hex>" etc.) rendered beside each `ColorField` — module color, background, and (Full mode only)
**eyes**, finally surfacing the existing-but-unset `cornerColor` field (QrStyleState line 28 —
the data has been there since v1 with no UI). A "randomize" pill sits beside the preset pills
(lucide `Dices` icon, `aria-label="Randomize style within the guards"`). Clicking a swatch sets
the exact state a preset pill would recognize (solid mode; if currently in gradient mode, a
swatch click switches fg to solid with that color — deliberate, matches how Ente's swatches
behave).

**Tests:** swatch arrays non-empty, hex-shaped, on the documented tokens; the randomize
property test above; `randomGuardPassingStyle` never touches frame state (frame lives outside
`QrStyleState` — fact 3.6 — so this is structural, but assert the returned style's keys anyway).

### 4.6 Arm's-length hint (should)

One line under the verify chip (Card 3), muted, lowercase:
`high contrast scans best — test at arm's length.`
It complements the chip (which proves *this* code; the hint reminds about *context* — glare,
distance, print size). No test beyond the copy-register convention (UI copy lowercase).

### 4.7 Simple/Full disclosure (should)

Card 2 gains a header control — two pills `simple` / `full` (`detail` state, default
**simple**; not persisted, fact 3.7):

- **simple:** presets + randomize · dot type · module color + swatches · background + swatches ·
  quiet zone + ECC · frame on/off + caption · logo · guards.
- **full:** everything above plus corner-square/corner-dot selects, eyes color swatches,
  gradient mode (the solid/gradient pills and gradient fields), transparent-bg toggle, frame
  shape/color/position.

Guards always render in both modes (they are the brand; hiding honesty in "full" would be the
wrong lesson). Section transitions need no animation beyond the house's existing motion tokens.

---

## 5. UI copy register (binding)

Per DESIGN.md **Register** and the v1 plan §7: headlines sentence-case; leads and UI copy
lowercase; no exclamation marks; warnings state the fix. New strings fixed here so the
implementer doesn't invent:

- Hint: `high contrast scans best — test at arm's length.`
- SVG notes: `SVG keeps vector purity — export the framed version as PNG.` and
  `SVG keeps vector purity — export the logo version as PNG.` (existing string kept)
- Detail labels: `simple` / `full` (pills); frame labels: `frame`, `band`, `banner`, `card`,
  `tab`, `caption`, `position`
- Randomize aria: `Randomize style within the guards`
- Status with size: `saved <name> (<n> KB).`
- Payload errors are fixed in §4.2 — reuse verbatim.

Never claim ISO compliance; the guards stay "rules of thumb"; the chip stays the only proof.

## 6. Test plan (tests/capyqr.test.ts only; node env, zero network)

New describe blocks: `"CapyQR utf8 bridge"` (§4.1), `"CapyQR payloads — phone, location, event"`
(§4.2), `"CapyQR frame layout"` (§4.3), `"CapyQR export spec line"` (§4.4),
`"CapyQR swatches + randomize"` (§4.5). Extend the proof-scan block's render helper for the
byte-string. Update: `buildEngineOptions` tests assert `data` is the byte-string (an ASCII case
stays identity, so most existing assertions hold — verify line by line); `svgExportBlocked`
arity updates its block (259). **Must stay green untouched:** the nine existing blocks'
remaining assertions, `tool-pages.test.tsx` (page shell unchanged — no new external hrefs, the
headline/lead/index literals don't move), `landing.test.tsx`, `security.test.ts`
(no-storage/no-network greps), `capyexpense-boundaries.test.ts`.

## 7. Definition of done

`npm test` green (expect ≥ 645 tests / 30 files), `npx tsc --noEmit` clean, `npx eslint` clean
on every touched file, `npm run build` green with `/capyqr` still prerendering **static**.
Manual smoke (prod server): multibyte payload (emoji + `é` in a Wi-Fi SSID) — the well shows the
original text, the chip decodes it back, the exported PNG re-decodes identically; a framed
`card` code with caption scans at arm's length and the chip certifies the composed pixels;
randomize never produces a clay guard line in 30 clicks; spec line matches the settings;
SVG disables with frame *and* with logo; devtools Network shows zero external requests across
compose→verify→export. **Owner steps:** the physical phone joins the multibyte Wi-Fi network
and scans a framed print.

## 8. Implementation slicing (for whoever executes)

Two sequential PRs off `main` — **never stacked** (owner rule):

- **PR A — the lib layer:** `utf8.ts`, payload types + builders, `frame.ts` layout math,
  swatches + `randomGuardPassingStyle`, `exportSpecLine`, and every test in §6 that touches
  them. Mergeable alone; nothing visual changes; the app cannot regress.
- **PR B — the editor:** `composeStage`, engine/stage DOM restructure, kind tabs + field sets,
  frame controls, swatch rows, detail toggle, spec line + status-KB, hint. Full DoD smoke.

## 9. Out-of-scope seams (documented, not built)

ASCII/TXT export · PDF/EPS vectors · halftone image-in-QR (QArt-style — the verify chip makes
*us* the only team that could ship it proven) · a separate scanner tool (CapyScan) · PWA ·
i18n · batch CSV→ZIP and saved brand kits (the Pro candidates, gated on traction per
competitor-survey §4's Pro table) · dynamic QR (never).

## 10. Sources

Evidence base: [`./competitor-survey.md`](./competitor-survey.md) (Ente, QArt Coder, QRcodly,
QRCode Monkey, ZapQR, FreeQRApp, 2QR — inspected 2026-09-13) and
[`./miniqr-competitive-analysis.md`](./miniqr-competitive-analysis.md) (MiniQR's UTF-8 fix at
`src/lib/qr-code/utf8.ts` in lyqht/mini-qr; the bundle-encoder fact verified against
qr-code-styling 1.9.2's dist). Engine landmines and payload schemas carry over from
[`./implementation-plan.md`](./implementation-plan.md) §3 with their original sources ledger.
