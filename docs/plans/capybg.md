# CapyBg — implementation plan

*Prepared 2026-10-03 for an implementing agent that has not seen the conversation that produced it. Read
§0–§3 before writing code. Citation keys `[n]` resolve to [`capybg.sources.json`](./capybg.sources.json).
Every number marked **verified** was fetched from its primary source on 2026-10-03; re-check anything you
build on if this plan is more than a few weeks old.*

*Supersedes the 2026-09-21 CapyCut plan (`docs/research/capycut/implementation-plan.md`, gitignored, local to
the owner's machine). The tool was renamed **CapyCut → CapyBg** by the owner on 2026-10-03. Where the two
disagree, this file wins; the old one is background reading only.*

---

## 0. Handoff summary

**What:** CapyBg — a background remover that runs entirely in the visitor's browser tab. Drop, paste or pick a
photo; an on-device segmentation model cuts the subject out; download a transparent PNG, or the subject
flattened onto a colour. The photo is never uploaded. The only bytes the tool ever fetches are the model and
the runtime, from capytools.app itself.

**Why now:** remove.bg — 80,364,063 visits/mo — retires its standalone site on **1 December 2026, 09:00 CET**,
moving into Canva [1][2]. Every incumbent processes server-side and meters its free tier. "Your photo never
leaves this tab, and there is no credit counter" is the wedge. Aim to ship well before 1 December.

**Owner decisions (2026-10-03) — do not re-litigate:**

| # | Decision |
|---|---|
| D1 | Name **CapyBg**, route **`/capybg`**, tool no. **12** (the next free slot — re-check `SUITE` at start). |
| D2 | **Two models, additive.** Default: **MODNet** (people, 6.3 MiB). Opt-in: **BiRefNet_lite fp16** ("any subject", 109.2 MiB, one-time download). Never replace the light default with the heavy one. |
| D3 | The plan lives in tracked `docs/plans/` so any agent — worktree or cloud — can read it. |
| D4 | The desktop app is **Phase 2** (§13) — specced here, **not** part of the v1 handoff. |
| D5 | The committed queue in `docs/research/expansion/roadmap.md` (Shot → Diff → Cron → Invoice → …) is **overridden for this tool**: CapyBg goes first because of the 1 December date. |

**Design choices this plan makes (reasoned below, change only with cause):**

- Models and the ORT runtime are **self-hosted static assets**, fetched at **build time** from pinned
  revisions, **SHA-256-verified**, and **sharded under 24 MiB** to fit Cloudflare's 25 MiB per-file cap (§3.3).
  No R2 bucket, no Worker route, no third-party CDN at runtime, no model binaries in git.
- **Capability-split runtime:** WebGPU browsers load `onnxruntime-web/webgpu`; everyone else loads
  `onnxruntime-web/wasm` (single-threaded) (§3.2).
- The opt-in BiRefNet model is offered **only on the WebGPU path** (§3.4).
- Inference runs in a **module Web Worker** so a multi-second CPU run never freezes the page (§5.4).

---

## 1. Scope

### In v1

- Input: drop, pick, or **paste** (screenshots are first-class) any image the browser can decode — JPEG, PNG,
  WebP, AVIF, GIF (first frame). EXIF orientation honoured.
- On-device matting with the two commercially-permissive models of D2, chosen by the visitor:
  **"People — fast"** (default) and **"Any subject — detailed"** (opt-in, WebGPU only).
- Output: **transparent PNG** (default), or flattened onto **light / dark / a picked colour** as PNG or JPEG.
  Honest before/after byte sizes.
- First use of each model shows an honest **download disclosure** (exact size) and a **real progress bar**;
  the model is then kept in Cache Storage and not re-fetched.
- A **backend line** that says what actually ran: "on your GPU (WebGPU)" or "on your CPU (WebAssembly)".
- Full registration per CONTRIBUTING.md "Adding a tool" (§8).

### Not in v1 — do not build

- **No route that accepts user bytes.** If you are writing a handler that reads a request body, an upload, a
  base64 string or an image — stop; that is the whole promise gone. v1 adds **no** route at all.
- No batch mode, no ZIP, no Pro/paywall strings, no licence-key code. Keep the core a pure per-file function so
  batch is a UI loop later (§12).
- No cloud/API fallback, no account, no analytics, no `localStorage`/`sessionStorage` of image data, no image
  history. Caching the **model** is fine (it is our file, not theirs); caching the **photo** is a bug.
- No upscaling, no manual brush/eraser, no video, no share cards or OG route, no proof-band demo on the landing.
- **Never** ship `briaai/RMBG-1.4`, `briaai/RMBG-2.0`, `@imgly/background-removal`, or the
  `onnx-community/ISNet-ONNX` repack (§3.1).

---

## 2. Read these first

1. **`AGENTS.md`** — repo law, especially the top warning (this Next.js 16 is not the one in your training
   data: read `node_modules/next/dist/docs/` before touching app-router code) and **§6 Hosting & Runtime —
   Cloudflare Workers** (no filesystem; `public/_headers` carries asset-layer headers; `wrangler.jsonc` is
   security surface; `NEXT_PUBLIC_*` is build-time).
2. **`CONTRIBUTING.md` → "Adding a tool"** — the seven-step registration recipe.
   **Stale line:** it says the eyebrow "is the only place you type the number". Since September the eyebrow is
   **derived** by `ToolPageShell` from the tool's position in `SUITE`. **Do not pass `eyebrow`**; you type the
   number nowhere. (`.agents/skills/capytools-dev/SKILL.md` §1 has the same stale instruction — ignore it.)
3. **`PRODUCT.md`** — positioning ("open and local"), principles ("show, don't claim"; "every promise scoped
   truthfully"), and what must never be fabricated.
4. **`DESIGN.md`** — tokens, the type ramp (10/11/12/13/14/15/16/18/21/26 px), radii (6/12/16/24/full).
5. **`.agents/rules/production-invariants.md`** — hydration and WCAG invariants.
6. **Templates to copy, not reinvent:**
   - Page: `src/app/capyresize/page.tsx` (`toolMetadata()` + `ToolPageShell`).
   - Three-card tool: `src/components/tool/CapyQR.tsx` (StageCards, sticky right column at `lg`, the
     phone **download dock** portalled to `document.body`), `src/components/tool/CapyResize.tsx`
     (`toBlob` honesty, byte reporting), `src/components/tool/CapyStrip.tsx` (drop/paste, decode).
   - Shared UI: `src/components/stage-card.tsx` (`StageCard`, `StageChip`, `STAGE_TONE`),
     `src/components/tool/ErrorCard.tsx`, `src/components/tool/TerminalLoader.tsx`, `src/components/Reveal.tsx`.
   - Helpers: `canvasIsUsable` in `src/lib/capystrip/clean.ts` (probe the canvas, don't guess a pixel cap);
     `toBlob` in `src/lib/capyresize/render.ts` (Safari returns PNG when asked for WebP — check the type).
   - Lazy-engine discipline: `src/components/landing/ProofBand.tsx` + `tests/proof-band.test.tsx` (engines
     reach the page only through `import()`, and a test proves nothing imports them statically).
7. **`tests/share.test.ts`** — phrasing rules for privacy copy.

**Invariants that are easy to break here:**

- Hydration: never read storage, `navigator.gpu`, or randomness in a `useState` initializer. Use the
  `useCallback` + `useEffect` hydrate pattern from AGENTS.md §3. Server markup must not depend on WebGPU.
- Reduced motion: never render different markup for `prefers-reduced-motion` (a hydration mismatch React does
  not patch — it blanked the landing once, PR #58). Reveals carry `data-reveal`; zero the transition instead.
- One sage primary button per screen. Touch targets ≥44px on coarse pointers. Text ≥4.5:1.

---

## 3. Verified technical facts (design constraints)

### 3.1 Models — licence is make-or-break

| Model | Licence | Commercial | Size (verified) | Use |
|---|---|---|---|---|
| **`Xenova/modnet`** `onnx/model_quantized.onnx` | **Apache-2.0** (upstream `ZHKKKe/MODNet` LICENSE = Apache-2.0) [3][4] | ✅ | **6,632,188 B (6.3 MiB)** | **Default — people** |
| **`onnx-community/BiRefNet_lite-ONNX`** `onnx/model_fp16.onnx` | **MIT** (upstream `ZhengPeng7/BiRefNet` LICENSE = MIT) [5][6] | ✅ | **114,538,221 B (109.2 MiB)** | **Opt-in — any subject** |
| same, `onnx/model.onnx` (fp32) | MIT | ✅ | 213.6 MiB | not used (too heavy) |
| `briaai/RMBG-1.4` | BRIA licence, non-commercial free tier | ❌ | — | **never** |
| `briaai/RMBG-2.0` | CC BY-NC 4.0 | ❌ | — | **never** |
| `@imgly/background-removal` | AGPL-3.0 | ❌ | — | **never** |
| `onnx-community/ISNet-ONNX` | **AGPL-3.0 as published** [7] (upstream DIS is Apache-2.0, but this repack is labelled AGPL) | ❌ | 42–168 MiB | **never** |
| `u2netp` (rembg release, U-2-Net Apache-2.0) | Apache-2.0 | ✅ | 4.4 MiB | not chosen — general but visibly rougher; a fallback if MODNet disappoints |

**Pin exact revisions and hashes** (the `X-Linked-ETag` of a Hugging Face LFS file is its SHA-256) [3][5]:

```text
MODNet     repo onnx/model_quantized.onnx
           revision  fa2fa546052fba4c08921230a26cc69a333fca12   (Xenova/modnet)
           sha256    92e49898c3e05a6d7a944fc67a8cb87c4aad754ffb6ebd949528c7d1105fee3a
           bytes     6632188
BiRefNet   repo onnx/model_fp16.onnx
           revision  de15b22ba131738a16dff04aab8bdf8dc32e3ac1   (onnx-community/BiRefNet_lite-ONNX)
           sha256    d39b897ceb16ae654c1731f3dba0cf9b368d9cae74b5a57459b455cc8bfec402
           bytes     114538221
URL form   https://huggingface.co/<repo>/resolve/<revision>/<path>
```

**I/O contracts** (from each repo's `preprocessor_config.json` and README) [3][5]:

| | MODNet | BiRefNet_lite |
|---|---|---|
| Input name | `input` | `input_image` |
| Output name | `output` | `output_image` |
| Layout | NCHW float32, `1×3×H×W` | NCHW, `1×3×1024×1024` (**fp16 model — confirm whether the input tensor must be `float16`**; see §11 R2) |
| Resize | **shortest edge 512**, both dims rounded to a **multiple of 32**, aspect kept | fixed **1024×1024** (stretch; restore aspect on the way back) |
| Rescale / normalise | ×1/255, mean **0.5**, std **0.5** (→ [−1, 1]) | ×1/255, ImageNet mean **[0.485, 0.456, 0.406]**, std **[0.229, 0.224, 0.225]** |
| Output | alpha matte in **[0, 1]** — use as-is | **logits — apply sigmoid** |
| Good at | people, portraits, headshots | products, objects, animals, anything |

### 3.2 Runtime — `onnxruntime-web` 1.30.0 (MIT) [8]

- Subpath exports (verified): `.`, `./all`, `./wasm`, `./webgpu`, `./webgl`, `./jspi`.
- **Which binary each bundle loads (verified by reading the bundles):**

| Import | Loads | `.wasm` size | Fits a 25 MiB asset? |
|---|---|---|---|
| `onnxruntime-web/wasm` | `ort-wasm-simd-threaded.mjs` + `.wasm` | **13.6 MiB** | ✅ ship whole |
| `onnxruntime-web/webgpu` | `ort-wasm-simd-threaded.asyncify.mjs` + `.asyncify.wasm` | **25.5 MiB** | ❌ **shard it** |
| `onnxruntime-web` (default) | `.jsep` | 27.0 MiB | not used |
| `onnxruntime-web/jspi` | `.jspi` | 16.0 MiB | not used in v1 (JSPI is not universal) |

- ORT accepts the binary as bytes via **`ort.env.wasm.wasmBinary`** (present in the webgpu bundle, verified),
  so the asyncify `.wasm` can be fetched as shards, concatenated, and handed over. Point
  **`ort.env.wasm.wasmPaths`** at same-origin URLs for the `.mjs` glue (it accepts a prefix string or a
  `{ mjs, wasm }` object — confirm in `node_modules/onnxruntime-web/dist/` types). **Nothing may load from
  jsDelivr** (ORT's default).
- Import **dynamically**, inside the worker only, chosen by capability:
  `navigator.gpu && await navigator.gpu.requestAdapter()` → `onnxruntime-web/webgpu`, else
  `onnxruntime-web/wasm`. Never at module top level, never in SSR.
- **Single-threaded:** set `ort.env.wasm.numThreads = 1`. Multi-threading needs `SharedArrayBuffer`, which
  needs COOP+COEP; Capytools sets neither, and `COEP: require-corp` would break the GitHub avatars `img-src`
  allows. **Do not add COOP/COEP.**

### 3.3 Hosting — Cloudflare Workers static assets [9]

- **Individual asset ≤ 25 MiB.** 20,000 files per Worker version (free) / 100,000 (paid). **No total size
  limit** is stated. Static asset requests are served by the assets layer before the Worker runs.
- So: MODNet (6.3 MiB) ships whole; BiRefNet fp16 (109.2 MiB) ships as **5 shards**; the asyncify `.wasm`
  (25.5 MiB) as **2 shards**. Shard size: **24 MiB** (25,165,824 B) — a safety margin under the cap.
- **Do not commit the binaries.** A build step downloads them from the pinned revisions, verifies SHA-256, and
  writes shards into `public/capybg/` (gitignored). Precedent: `scripts/generate-license-text.mjs` runs from
  `prebuild` today (§4.2).

### 3.4 Backends and the opt-in model

- WebGPU is shipped in Chrome/Edge, Firefox and Safari 26 [10]. Fall back to WASM and **say so**.
- **BiRefNet fp16 is offered only when the WebGPU backend initialised.** fp16 on the WASM CPU path is slow at
  best and op-coverage is not guaranteed; a 1024² swin model on single-threaded CPU would take tens of seconds.
  On the CPU path show an honest line instead: *"the detailed model needs a browser with GPU support; this one
  runs on your CPU."* Verify this decision empirically (§11 R2) and record the result here.

### 3.5 CSP (report-only today, `next.config.ts`) [11]

- `connect-src 'self' https:` → same-origin model fetches are allowed.
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` → WASM instantiation allowed today. A module worker from
  `new URL(..., import.meta.url)` is same-origin, which `worker-src` (falling back to `script-src`) allows.
- **Leave a note** next to the CSP: if the policy is ever enforced and `'unsafe-eval'` is dropped, CapyBg needs
  `'wasm-unsafe-eval'`. Do not change the CSP in v1.

### 3.6 Copy rules

- The promise is **"your photo never leaves this tab"**. Do **not** write "no network", "works offline" or
  "nothing is downloaded" — the first run downloads the model. "Nothing uploaded" is true; say that.
- The page `description` must carry the browser promise ("100% in your browser") — `tests/<name>.test.ts`
  asserts it (CONTRIBUTING step 1).
- **Do not name remove.bg (or any competitor) in product copy.** Trademark caution, and PRODUCT.md's "show,
  don't claim". SEO comes from generic terms (§8.2).

---

## 4. Architecture

### 4.1 Request map (what the browser ever fetches)

```
/capybg                          the page (Worker-rendered, as today)
/_next/static/**                 JS, incl. the worker chunk and the ORT JS (code-split, loaded on demand)
/capybg/ort/<ortVersion>/*.mjs   ORT glue
/capybg/ort/<ortVersion>/*.wasm  ORT binary — wasm: whole; asyncify: .part0, .part1
/capybg/models/<sha8>/modnet.onnx                MODNet, whole
/capybg/models/<sha8>/birefnet.onnx.part0..4     BiRefNet fp16, sharded (only when the visitor opts in)
/capybg/manifest.json            generated: every file's URL, byte length, SHA-256, shard list
```

Nothing else. No request carries the visitor's image or anything derived from it.

### 4.2 Build-time asset pipeline — `scripts/fetch-capybg-assets.mjs`

Runs from `prebuild` (chain it after the licence generator:
`"prebuild": "node scripts/generate-license-text.mjs && node scripts/fetch-capybg-assets.mjs"`).

1. Read pins from **`src/lib/capybg/models.ts`** (the one registry — the script imports the constants, or reads
   a sibling `models.json` both sides use; pick one, never two copies).
2. For each model: if `public/capybg/models/<sha8>/` already holds verified shards, skip (keeps local rebuilds
   instant). Otherwise download from the pinned `resolve/<revision>/` URL with retries, **verify byte length
   and SHA-256**, **fail the build on mismatch**, then split into ≤24 MiB parts.
3. Copy ORT's `.mjs` glue and `.wasm` binaries for the **installed** `onnxruntime-web` version out of
   `node_modules/onnxruntime-web/dist/` into `public/capybg/ort/<version>/`, sharding any file over 24 MiB.
4. Write `public/capybg/manifest.json` (versioned, deterministic order) listing every file, its parts, byte
   lengths and SHA-256s.
5. Add `/public/capybg/` to `.gitignore`.
6. **CI:** add an `actions/cache` step for `public/capybg/models` keyed on the pins, so CI does not pull
   ~115 MB from Hugging Face on every run. A Hugging Face outage must fail the build loudly, not ship a page
   with no model. Both CI build paths (PR preview and main deploy) run `prebuild` — verify in
   `.github/workflows/ci.yml` and in what `opennextjs-cloudflare build` invokes.
7. Output size sanity: assert in the script that no file in `public/capybg/` exceeds 25 MiB.

**`public/_headers`:** add a `/capybg/*` block — `Cache-Control: public, max-age=31536000, immutable` (paths
are content-addressed by `<sha8>` and ORT version) plus the **same security headers** as the `/_next/static/*`
block (AGENTS.md: change one, change both).

### 4.3 Runtime model loader — `src/lib/capybg/loader.ts`

1. Fetch `manifest.json` once.
2. **Cache first:** open Cache Storage `capybg-v1`; if every part for the model is present, read them.
3. Otherwise fetch all parts **in parallel**, reporting combined progress from streamed bytes against the
   manifest's known total (do not rely on `Content-Length` — compression can hide it).
4. Concatenate into one `Uint8Array`; **verify SHA-256 with `crypto.subtle.digest`** (~a second for 109 MiB;
   worth it — it catches a truncated cache entry); on mismatch, delete the cache entry and retry once, then
   surface an error.
5. Put verified parts into Cache Storage (a cache write failing — quota, private mode — is not an error: the
   tool still works, it just downloads again next time).
6. Same flow for the asyncify `.wasm` shards → `ort.env.wasm.wasmBinary`.
7. Expose `deleteCachedModels()` for a quiet "remove downloaded models" link (it is the visitor's disk).

### 4.4 File map

```
docs/plans/capybg.md                       this plan
docs/plans/capybg.sources.json             citations
scripts/fetch-capybg-assets.mjs            build-time download → verify → shard → manifest
src/lib/capybg/
  models.ts         MODEL registry: id, label, licence, repo, revision, path, sha256, bytes, io names,
                    input size rule, mean/std, sigmoid?, backends allowed
  types.ts          ModelId, Backend, Backdrop, BgOptions, BgResult, Progress
  manifest.ts       manifest types + parse/validate (pure)
  loader.ts         cache-first sharded fetch + SHA-256 verify (browser)
  backend.ts        decideBackend(hasWebGPU, adapterOk) → { backend, note } (pure)
  preprocess.ts     RGBA → normalised NCHW Float32 per model (pure)
  postprocess.ts    matte → [sigmoid] → resize to source → feather → alpha (pure)
  compose.ts        backdrop/format decisions (pure) + canvas compose/encode (browser)
  worker.ts         module Web Worker: owns ORT + sessions; messages in/out (§5.4)
  client.ts         main-thread wrapper: removeBackground(blob, opts, onProgress) → BgResult
  demo.ts           DEMO fixture for the idle state (no model, no network)
src/components/tool/CapyBg.tsx             the client component
src/app/capybg/page.tsx                    the page
public/plates/lab-12.webp                  896×1200 lab plate (owner-supplied image, §8.3)
tests/capybg.test.ts                       unit tests (§9)
tests/capybg-boundaries.test.ts            lazy-load + no-upload guards (§9)
```

**Dependency:** `onnxruntime-web@1.30.0` (MIT), pinned exactly like `next`. Nothing else.

---

## 5. Core pipeline

### 5.1 The seam

```ts
export type ModelId = "modnet" | "birefnet";
export type Backdrop = "transparent" | "light" | "dark" | { color: string };
export interface BgOptions {
  model: ModelId;
  backdrop: Backdrop;
  format: "png" | "jpeg";
  quality?: number;      // jpeg only, 0.5–1
  feather?: number;      // 0–3 px matte softening, default 1
}
export interface BgResult {
  blob: Blob; mimeType: string;
  width: number; height: number;
  bytesBefore: number; bytesAfter: number;
  backend: "webgpu" | "wasm";
  modelMs: number;
  notes: string[];       // honest fallbacks: downscaled, first GIF frame, encoder swapped type…
}
export function removeBackground(
  file: Blob, opts: BgOptions, onProgress?: (p: Progress) => void,
): Promise<BgResult>;
```

Pure per file, zero UI coupling. Future batch = `for (const f of files) await removeBackground(f, opts)` behind
an entitlement check — documented in §12, not built. **Changing the backdrop or format must not re-run the
model**: cache the last matte (one image only) and recompose.

### 5.2 Decode

- `createImageBitmap(file, { imageOrientation: "from-image" })`; fall back to `<img>` + `img.decode()`.
- Unsupported (HEIC in most browsers, corrupt files) → `ErrorCard` with a plain reason and a way forward
  ("this browser can't open HEIC — export it as JPEG first").
- Size guard: probe with `canvasIsUsable` (CapyStrip). If the full-size canvas is unusable, downscale the
  **output** to the largest usable size and add a note. The model input is always small (512-ish / 1024).

### 5.3 Preprocess (pure)

- MODNet: scale so the **shortest** edge is 512, round both dims to a multiple of 32, bilinear resize, ×1/255,
  (x − 0.5) / 0.5, interleaved RGBA → planar NCHW Float32.
- BiRefNet: resize to 1024×1024, ×1/255, ImageNet mean/std, NCHW; convert to Float16 if the model input
  requires it (§11 R2).
- Keep the source dimensions; the matte is restored to them.

### 5.4 Inference — in a module worker

- `new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })` — webpack (used by `next dev
  --webpack` and the production build) code-splits it. The worker imports ORT, holds one `InferenceSession`
  per model (lazy), and runs inference. WebGPU is available in workers in current Chrome/Edge/Firefox/Safari 26
  — **verify on each**; if the worker cannot get an adapter while the window can, fall back to running in the
  window for that backend and note it.
- Transfer tensors as `ArrayBuffer` (transferable) — no structured-clone copies of large buffers.
- Messages: `load(model)` → progress events; `run(model, tensor, dims)` → matte; `dispose(model)`.
  Send the **image tensor**, never the file — keeps the worker contract minimal.
- Session options: `executionProviders: [backend]`, `graphOptimizationLevel: "all"`. Keep sessions for the page
  lifetime; `release()` on unmount.

### 5.5 Postprocess (pure)

- BiRefNet: sigmoid. MODNet: clamp to [0, 1].
- Bilinear upscale of the matte to the source size; optional feather (small box/gaussian on the matte).
- Write the matte into the alpha channel of the source RGBA. Fully opaque/transparent edge cases tested.

### 5.6 Compose and encode

| Backdrop | Default format | Notes |
|---|---|---|
| transparent | **PNG** | JPEG not offered (no alpha) — say why if the visitor picks it |
| light / dark / colour | PNG or **JPEG** | flatten onto the fill |

- Reuse CapyResize's `toBlob` honesty: report the real returned MIME type, real `bytesBefore`/`bytesAfter`.
- Filename: `<original-basename>-nobg.png` (or `.jpg`).

### 5.7 Memory hygiene

One image at a time; a new drop replaces the old. Revoke object URLs in `finally`. Keep only the latest matte.
Do not hold decoded bitmaps after composing (`bitmap.close()`).

---

## 6. UI spec — `CapyBg.tsx`

House layout: three `StageCard`s; at `lg` the result card is a sticky right column; on phones a bottom
**download dock** portalled to `document.body` (copy CapyQR's pattern: `inert` while the result is in view).

**Card 01 · The photo**
- Full-width dashed `rounded-3xl` dropzone: click, drag-and-drop, paste (window `paste` listener while mounted).
  Label it so a screen reader announces how to paste.
- Idle state shows `DEMO` (a hand-made subject + matte from `demo.ts`) with a "demo" chip — teaches the tool
  without loading a model.
- Model choice: two pills, **"People — fast (6 MB)"** (default) and **"Any subject — detailed (109 MB, one-time)"**.
  The second appears only on the WebGPU path; on the CPU path show the §3.4 line instead.

**Card 02 · The cut** (results region, `aria-live="polite"`, `scroll-mt-24`)
- First use of a model: disclosure + real progress ("downloading the people model — 3.1 of 6.3 MB, once").
  Then "cutting… on your GPU" with elapsed time.
- Preview on a checkerboard; **press-and-hold "show original"** (keyboard: Space while focused).
- Backend line: "ran on your GPU (WebGPU) · 840 ms" / "ran on your CPU (WebAssembly) · 6.2 s" — never claim the
  GPU when it was the CPU.
- If the people model produced a poor cut (it cannot handle products), offer the detailed model in one click:
  "not a person? try the detailed model" — copy, not detection.

**Card 03 · The finish**
- Backdrop: transparent / light / dark / colour picker + swatches (named for screen readers, like CapyQR's
  `SWATCH_NAMES`).
- Format PNG/JPEG, JPEG quality slider, before/after sizes.
- **Download** — the one sage primary, full width, 44px; Copy image beside it.
- Quiet footer link: "remove downloaded models (6.3 MB)" → `deleteCachedModels()`.

**Errors:** `ErrorCard` with the napping capybara; plain cause + recovery for: unsupported format, model
download failed (offline/HF outage at build is a build error, not a visitor error), hash mismatch (retried once
automatically), out of memory on huge images (downscale and retry once, note it), WebGPU lost mid-run (fall back
to WASM and say so).

**A11y and motion:** labelled controls, 44px targets on coarse pointers, focus rings from the house outline,
`Reveal`/`data-reveal` only — no reduced-motion markup forks.

### 6.1 Page

```tsx
export const metadata = toolMetadata("CapyBg", {
  title: "CapyBg — remove image backgrounds in your browser",
  description:
    "Cut the background out of a photo and download a transparent PNG. 100% in your browser — your image is never uploaded; the only download is the model.",
});

<ToolPageShell
  tool="CapyBg"
  headline={[{ text: "The background," }, { text: "gone", em: true, dot: true }]}
  lead="cut the subject out of any photo, in your browser. nothing uploaded."
  align="left"
>
  <CapyBg />
</ToolPageShell>
```

---

## 7. Performance budget

- **The landing and every other page are unaffected:** no static import of `onnxruntime-web` anywhere; the ORT
  JS and wasm load only after the visitor drops an image on `/capybg` (or presses a "load the model" button).
  Prefetch the people model on idle **only after** the first interaction — never on page load (it is the
  visitor's bandwidth).
- Targets to measure and record in the PR (not promises to print on the page): MODNet first cut on a
  mid-range laptop, WebGPU ≤ 1.5 s, WASM ≤ 8 s; BiRefNet on WebGPU ≤ 5 s after download.

---

## 8. Registration and copy

### 8.1 `SUITE` row (`src/lib/capytools/suite.ts`, appended — position 12)

```ts
{
  name: "CapyBg",
  short: "Bg",
  href: "/capybg",
  cat: "browser",
  badge: "Bg",
  appCategory: "MultimediaApplication",
  blurb:
    "Cut the background out of any photo — people in a blink, products and pets with the detailed model — and download a transparent PNG. The photo never leaves your tab.",
  note: "background remover",
  line: "Remove a photo's background, in your browser.",
  keywords: ["remove background", "background remover", "remove bg", "transparent png",
             "cutout", "product photo", "headshot", "no upload", "onnx", "webgpu"],
  plate: { src: "/plates/lab-12.webp", width: 896, height: 1200 },
},
```

### 8.2 The rest of the recipe (CONTRIBUTING "Adding a tool")

1. `PLATES` in `src/lib/capytools/landing.ts` gains `"lab-12"`.
2. `README.md`: a numbered **"## 12. CapyBg"** section, and the first line becomes
   **"…Twelve so far. Eleven run in your browser and keep nothing; one lives on your desktop and keeps your
   files there."** That sentence must match **verbatim** in three places: `README.md`, `COLOPHON.quote` in
   `landing.ts`, and `package.json` `description` (tests assert all three; `tests/landing.test.tsx` also
   asserts the README section headings — add `## 12. CapyBg`).
3. `tests/tool-pages.test.tsx`: add the CapyBg row and bump **every** existing `Nº NN / 11` to `/ 12`.
4. Everything else — masthead, footer, `/tools`, `/notes`, sitemap, `llms.txt`, counts, the landing's
   `10/11 in-tab` stat (becomes `11/12`) — derives from `SUITE`. If any test hard-codes "eleven"/"11", fix the
   test to derive, don't just bump the literal.

### 8.3 The lab plate — a dependency on the owner

`public/plates/lab-12.webp` (896×1200) must be an **object still-life in the lab-plate style** (DESIGN.md;
look at `lab-1…lab-11`) with **no baked-in text**. Image generation is the owner's step. Until it exists the
asset test fails, so: build everything else, leave the `SUITE` row's plate pointing at `lab-12.webp`, and flag
the missing file in the PR — **do not** ship a placeholder that copies another tool's plate.

---

## 9. Tests (vitest, node environment, no network)

`tests/capybg.test.ts`
1. **models.ts** — every model has licence, revision (40-hex), sha256 (64-hex), bytes, I/O names; **no
   model's licence is non-commercial or copyleft** (regex `/nc|non-commercial|agpl|gpl/i` must not match);
   `birefnet` declares `backends: ["webgpu"]`.
2. **preprocess.ts** — MODNet size rule (shortest edge 512, multiples of 32; e.g. 4000×3000 → 672×512 —
   compute exactly), mean/std maths on a 2×2 fixture, NCHW ordering; BiRefNet 1024² and ImageNet normalisation.
3. **postprocess.ts** — sigmoid only for BiRefNet; clamp for MODNet; matte resize maths; feather 0 is identity;
   alpha written only to channel 3.
4. **backend.ts** — `decideBackend` truth table and the honest notes.
5. **compose.ts** — transparent→PNG, JPEG refused with alpha (+ note), filename rule, quality clamping.
6. **manifest.ts** — parse/validate: rejects a part over 25 MiB, a length mismatch, a missing hash.
7. **Page metadata** — title contains "CapyBg"; description contains "100% in your browser" (CONTRIBUTING 1).

`tests/capybg-boundaries.test.ts`
1. **Lazy engine:** no file outside `src/lib/capybg/worker.ts` imports `onnxruntime-web`, and `worker.ts`
   imports it only via `import()` (pattern: `tests/proof-band.test.tsx`).
2. **No upload path:** no file under `src/app/api/` mentions `capybg`; no `fetch(` in `src/lib/capybg/` or
   `CapyBg.tsx` targets anything but same-origin `/capybg/` paths (string-level check on `fetch(` call sites).
3. **No third-party runtime fetch:** `wasmPaths` is set and same-origin; the string `cdn.jsdelivr` appears
   nowhere in `src/`.
4. **Build artefacts stay out of git:** `.gitignore` contains `/public/capybg/`.

`scripts/fetch-capybg-assets.mjs` gets a `--verify-only` mode used by a test or CI step to assert every shard
in `public/capybg/` matches the manifest (skipped when the directory is absent, so the unit suite stays offline).

Registration parity is already enforced by existing tests (tool-pages, landing README/colophon/package.json
trio, `/tools` grid, sitemap). Run the whole suite.

---

## 10. Definition of done

- `npm run test` (all green, including every pre-existing test), `npm run lint`, `npx tsc --noEmit`,
  `npm run build` — with `public/capybg/` populated by `prebuild` and no file over 25 MiB.
- **Judge in a production build** (`npm run build && npx next start`), not `next dev` (handover §5: the dev
  server lies about hydration-heavy pages).
- Browser checks (record results in the PR):
  - Chrome (WebGPU): people photo → clean cutout; product photo on the detailed model → clean cutout; the
    model is **not** re-downloaded on reload (Network panel: served from Cache Storage).
  - Firefox and Safari 26: same; if WebGPU is unavailable, the CPU path works and says so.
  - CPU path: the detailed model is not offered; the honest line shows.
  - Paste a screenshot; drop a 6000×4000 JPEG; drop a HEIC (honest error); drop a transparent PNG.
  - **Network panel during a cut: zero requests after the model is cached** — screenshot it for the PR. This
    is the claim, so prove it.
  - 375×812 with touch: no horizontal overflow, 44px targets, dock works; reduced motion on: nothing hidden.
  - Lighthouse/LCP on `/capybg` not worse than `/capyresize` (ORT is not in the initial load).
- After merge, CI deploy + `scripts/smoke.mjs` green (smoke walks every page; `/capybg` joins it through
  `SUITE` — confirm).

---

## 11. Risks and open questions (with defaults)

| # | Risk / question | Default / mitigation |
|---|---|---|
| R1 | MODNet is people-only; visitors will drop products. | The "not a person? try the detailed model" affordance; the CPU-path note. Consider `u2netp` (Apache-2.0, 4.4 MiB) as a general CPU fallback if testing shows a gap worth closing — measure first. |
| R2 | BiRefNet **fp16** input type and WebGPU op coverage are unverified. | First implementation task: load it in Chrome on WebGPU, inspect `session.inputNames`/input metadata, run a 1024² tensor. If fp16 fails, the fp32 model is 213.6 MiB (9 shards) — record and ask the owner before shipping a 214 MB download. |
| R3 | `onnxruntime-web` upgrades change binary names/sizes. | The fetch script copies whatever the installed version ships and shards anything >24 MiB; the manifest is regenerated. Pin the version; upgrade deliberately. |
| R4 | Hugging Face outage or a moved file breaks builds. | Pinned revision + SHA-256; CI cache; the build fails loudly. Optional later: mirror the two files to R2 as a second source. |
| R5 | Memory on phones with large images. | Model inputs are small; only compose is full-size. Probe canvas, downscale output with a note, one image at a time. |
| R6 | Cache Storage eviction / private mode. | Treat cache as an optimisation; always able to re-download. |
| R7 | Asset upload size per deploy (~150 MB of shards). | Wrangler uploads only changed (hashed) assets; shards change only on a pin bump. Verify the first deploy's upload time in CI. |
| R8 | Trademark / naming. | "CapyBg" + generic copy; no competitor names in the UI. |

---

## 12. Backlog — seams, not v1

- **Pro batch:** a queue over `removeBackground`, ZIP export, full-res guarantees — behind the monetisation
  entitlement check (`docs/research/monetisation/implementation-plan.md`, blocked on owner decisions).
- **CapyPassport** reuses the people matte for its white-background step — extract, don't duplicate.
- **CapyVeil** (face/plate blur) reuses the model infrastructure (loader, manifest, worker).
- Edge refinement / hair detail; a manual touch-up brush; backdrop library; WebNN backend when it ships widely.
- Programmatic SEO pages ("remove background from product photos", "…headshots") once the tool proves itself.

---

## 13. Phase 2 — CapyBg Desktop (specced, not in the v1 handoff)

**Why a second surface:** the native app runs the big general model with real threads and a real GPU execution
provider (DirectML on Windows, CoreML on macOS) — no WASM ceiling, no 25 MiB asset dance, fully offline after
setup.

| Surface | Model | Runtime | Promise |
|---|---|---|---|
| Web `/capybg` | MODNet + opt-in BiRefNet fp16 | ORT Web (WebGPU / WASM) | "your photo never leaves this tab" |
| Desktop | BiRefNet_lite (fp16 or fp32 — whichever the native EP handles best) | Rust **`ort`** crate (ONNX Runtime native) [12] | "your photos are processed on your machine and never uploaded; the app downloads its model once, then works offline" |

- **A third promise variant — state it, don't inherit it.** CONTRIBUTING's desktop rule is "no network code in
  the binary" (CapyExpense). An app that downloads its model cannot claim that; it states its own promise as
  above. The **only** network code is the one-time model download: no updater beacon, no crash reporting, no
  analytics, no account.
- **Download in Rust (`reqwest`), not the WebView.** CapyExpense's desktop CSP deliberately excludes `https:`
  (`desktop/src-tauri/tauri.conf.json`) — keep it that way. Source: the same pinned file; **pin SHA-256 in the
  binary and refuse a mismatch**. Store under the OS app-data dir. Offer "load the model from a file" for
  air-gapped installs.
- **Architecture — mirror CapyExpense:** shared, framework-agnostic UI in `src/components/capybg/` (no `next/*`,
  no `motion`, no storage, no `@tauri-apps` — extend the boundary test), a `BgEngine` interface, the web passing
  its worker engine and the desktop passing an `invoke("remove_background", …)` engine. Pre/post-processing
  mirrored in Rust (`image` + `ndarray`) with **one shared fixture image + expected matte checksum** asserted on
  both sides.
- **Layout:** a sibling `capybg-desktop/` Tauri v2 app (don't destabilise `desktop/`). Targets `nsis`, `deb`,
  `appimage`, matching CapyExpense.
- **Size:** app ≈ 10 MB + native ORT ≈ 15–25 MB → installer ≈ 30–50 MB; the model downloads separately.
- **Monetisation (flag, don't build):** the natural one-time paid tier — free web tool, paid offline desktop app.
  Default: free for v1 of the desktop app; revisit with traction.
- Effort: medium–high. Start only after the web tool ships and the owner confirms.

---

## 14. Suggested PR sequence

1. **Asset pipeline** — `models.ts`, `manifest.ts`, the fetch script, `.gitignore`, `_headers`, CI cache, the
   `--verify-only` check, R2 investigation (§11) recorded in this doc. Tests 1, 6, boundaries 3–4.
2. **Engine** — `loader.ts`, `worker.ts`, `client.ts`, `backend.ts`, pre/post/compose with tests 2–5 and
   boundaries 1–2. A throwaway dev page is fine locally; don't merge it.
3. **Tool + registration** — `CapyBg.tsx`, the page, `SUITE` row, README trio, tool-pages row and `/12` bump,
   plate (owner), definition-of-done checks with evidence in the PR body.
4. **Polish** — run `/impeccable critique` on `/capybg` and fix what it finds.

Each PR: Conventional Commits, CI green, deploys on merge to `main` (merging deploys — the owner merges).

---

## 15. Sources

See [`capybg.sources.json`](./capybg.sources.json). Keys: [1] remove.bg shutdown notice · [2] Semrush traffic ·
[3] `Xenova/modnet` (licence, revision, files, sizes, LFS SHA-256, preprocessor config, README I/O) ·
[4] MODNet LICENSE · [5] `onnx-community/BiRefNet_lite-ONNX` (same set) · [6] BiRefNet LICENSE ·
[7] `onnx-community/ISNet-ONNX` licence label · [8] `onnxruntime-web` 1.30.0 (licence, exports, dist sizes,
bundle → binary mapping) · [9] Cloudflare Workers limits · [10] WebGPU browser support · [11] repo CSP and
headers · [12] Rust `ort` crate.
