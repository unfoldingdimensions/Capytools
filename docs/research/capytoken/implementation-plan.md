# CapyToken (tool no. 9) — Implementation Plan

*Prepared 2026-09-13 by the orchestrator session. This document is a complete handoff: an agent
session that has never seen this conversation should be able to implement CapyToken from it alone.
Read §1–§4 before writing any code. Citation keys `[n]` resolve to
[`./sources.json`](./sources.json). Positioning research:
[`../expansion/roadmap.md`](../expansion/roadmap.md).*

---

## 0. Branch discipline (read first — this session was explicitly requested)

**Build on a fresh branch off `main` and deliver as a PR to `main`.** The shared working copy may
be checked out on another branch (e.g. `docs/contributing-recipe`) — do NOT build there and do NOT
stack your commits on someone else's PR:

1. `git fetch origin && git checkout main && git pull origin main`
2. `git checkout -b feat/capytoken`
3. Implement + commit there (conventional commits, e.g. `feat(capytoken): …`).
4. When green, open the PR **to `main`**: `gh pr create --base main --head feat/capytoken …`.

If shared files (`suite.ts`, `README.md`, `tests/tool-pages.test.tsx`, `package.json`) carry
uncommitted edits from another session when you arrive, stop and report — never bundle or revert
them.

---

## 1. Mission & scope

**CapyToken** — "count before you spend." A 100%-offline LLM token counter + API cost calculator:

1. **Count** — paste text → **exact** BPE counts under `o200k_base` (current OpenAI/GPT-5-era) and
   `cl100k_base` (GPT-4-era), loaded lazily from vendored rank files. No server, no API key — the
   tool never asks for one.
2. **Cost** — the same text priced across a curated, in-repo snapshot of current model prices
   (input cost for the counted tokens + a planned-output estimate), with per-1M-token rates shown
   and a **"prices verified 2026-09"** stamp. Context-window fit bars per model.
3. **Estimate honestly** — non-OpenAI models (Claude, Gemini, Llama) have no public tokenizers:
   counts are shown as labeled estimates (§3.3), never dressed up as exact.

The gap this fills is real and current: incumbents are unbundled — OpenAI's tokenizer page counts
one vendor's encodings (and lags new ones) [3], llm-prices.com and Helicone price **hand-typed**
token counts with no tokenizer [1][2], and per-model comparison from one prompt is the feature users
celebrated when Simon Willison shipped it in April 2026 [4]. Nobody offers exact multi-encoding
counting + multi-provider cost + context fit offline, with no signup [1][2][5].

### In scope (v1)

- Exact counts: `o200k_base` + `cl100k_base` (lazy-loaded engines, singleton-cached).
- Char/word stats + OpenAI's own rule-of-thumb cross-check (§3.3).
- Chat overhead toggle (per-message +3, priming +3 — Cookbook constants, labeled model-dependent).
- Curated price table (~24–36 chat models: GPT-5.x/4.x, o-series, Claude, Gemini, DeepSeek, Llama,
  Qwen, Mistral) with per-1M input/output rates, cost for counted input tokens, planned-output
  cost input, context-fit bar, and the verified-date stamp + source commit hash.
- Non-OpenAI estimate labels: Claude (Anthropic's own 1.0–1.35× era multiplier note), Gemini/Llama
  ("estimate — OpenAI-tokenizer equivalent, unverified").
- Copy counts / copy cost summary (`min-w-[84px]`). Full SUITE registration — **tool no. 9**.

### Out of scope (v1 — do NOT build)

- **No server routes. No API keys. No network calls at runtime** — if you find yourself adding
  `src/app/api/...` or a `fetch` to a price API, stop: the snapshot is vendored data.
- No batch/multi-file mode (the Pro seam, §10), no prompt-template presets, no tokenizer visualizer
  (colored token spans — v2 candidate), no o200k_harmony UI toggle (§3.2 note covers it), no
  image/multimodal token math, no localStorage/sessionStorage of anything (no settings to store —
  nothing persists; even that is simpler here).
- No claims of byte-identity with OpenAI's tokenizer — see §7 copy rules.

---

## 2. Read these first (repo law)

1. **`AGENTS.md`** — including the top warning: **this Next.js is not the Next.js in your training
   data.** Read the relevant guide in `node_modules/next/dist/docs/` before app-router code.
2. **`.agents/rules/production-invariants.md`** — storage/hydration, WCAG, layout rules.
3. **`.agents/skills/capytools-dev/SKILL.md`**, **`CONTRIBUTING.md`**, **`DESIGN.md`** (copy
   **Register**: headline sentence-case, lead + UI copy lowercase).
4. **`src/lib/capytools/suite.ts`** — registration source of truth. Note: the tool-page sign-off
   index is now **derived from the registry** (commit `c2fdf22`) — pages pass **no** `index` prop;
   see the CapyResize exemplar.
5. **The freshest exemplars:** `src/app/capyresize/page.tsx` (ToolPageShell without `index`) and
   `src/components/tool/CapyResize.tsx` + `src/lib/capyresize/` (current layering, lazy client-only
   loading patterns, guard-strip UI). Mirror these.
6. **`tests/tool-pages.test.tsx`** — the shell contract. **You will edit this file** (§8.4).
7. **`tests/security.test.ts`** — repo-wide storage/network guard; keep it green.

**Ethos invariants (hard):** zero network calls at runtime; nothing written to storage; no keys,
no cookies. The only "heaviness" is the lazily-imported ranks data (§3.5) — loaded on first count,
never at page load.

---

## 3. Verified technical facts (design constraints)

All verified 2026-09-13 against primary sources; ledger in `./sources.json`.

### 3.1 Engine: `js-tiktoken` ^1.0.21 (MIT, pure JS, no WASM)

- **Never import the package root** — `js-tiktoken`'s root bundles ALL ranks (5.6 MB) [6]. Use:
  - `import { Tiktoken } from "js-tiktoken/lite"` (~9 KB of code), and
  - `import o200k_base from "js-tiktoken/ranks/o200k_base"` — ranks ship as **JS modules** (default
    export `{ pat_str, special_tokens, bpe_ranks }`; there is no `.json` export) [6].
- Exact API [6]: `new Tiktoken(ranks, extendedSpecialTokens?)`; `enc.encode(text, allowedSpecial?,
  disallowedSpecial?)` → `number[]`; `enc.decode(tokens)`; `TiktokenEncoding = "gpt2" | "r50k_base"
  | "p50k_base" | "p50k_edit" | "cl100k_base" | "o200k_base"`.
- **Ranks sizes (v1.0.21, measured)**: `o200k_base` 2.33 MB raw / **~1.1 MB gzipped**;
  `cl100k_base` 1.04 MB raw / ~0.5 MB gz [6].
- **Load pattern (mandatory):** dynamic-import both modules inside a user-triggered effect —
  `const [{ Tiktoken }, ranks] = await Promise.all([import("js-tiktoken/lite"), import("js-tiktoken/ranks/o200k_base")])`
  — cache the constructed encoder in a module-level singleton keyed by encoding. A static
  top-level import inlines the object literal into the route chunk and pays parse cost every
  hydration [6]. Show a tiny honest loading state ("loading tokenizer…") on first use; subsequent
  counts are synchronous.
- No byte-identity claim exists upstream — treat counts as exact-per-ranks, and pin golden test
  vectors (§9) to catch regressions.

### 3.2 Encodings & models

- `TiktokenModel` in js-tiktoken already maps GPT-4o/o1/o3/gpt-4.1/gpt-5 families to
  `o200k_base`/`cl100k_base` [6]. Our UI maps models → encoding via the price snapshot's
  metadata (§5.4), not via `encodingForModel` (which only knows OpenAI names).
- **o200k_harmony** (the gpt-oss tokenizer) reuses o200k_base's `pat_str` + `bpe_ranks` verbatim,
  differing only in special tokens [7]. Consequence, stated in UI where relevant: for plain text,
  o200k_base counts equal harmony counts; we don't ship the variant in v1.

### 3.3 Honest estimation for non-OpenAI models

- OpenAI's own rules of thumb [8]: **"1 token is approximately 4 characters. 1 token is
  approximately three-quarters of a word. 100 tokens are approximately 75 words."** Show these as
  the sanity cross-check next to exact counts ("rule of thumb: ≈N tokens" vs "exact: M").
- Chat overhead [9]: Cookbook constants — `tokens_per_message = 3`, `tokens_per_name = 1`, and +3
  reply priming. Ship as an optional toggle ("add per-message framing: +6 tokens"), labeled
  model-dependent; OpenAI's help page explicitly warns plain-text counts omit message structure,
  tools, and images [8].
- **Anthropic: no public tokenizer** — counting is an API-only feature, and even the API's count
  is documented as an estimate [10]. Anthropic's own announcement (via Willison) puts its
  Opus-4.7-era tokenizer at **1.0–1.35×** vs earlier Claude models, ~+30% per its docs [4][10].
  UI: Claude rows show "estimate — counted with o200k_base; Claude's tokenizer differs (its own
  docs: ~+30% vs earlier Claude)".
- **Gemini/Llama/Qwen/DeepSeek/Mistral: no primary-source multiplier exists.** Label rows
  "estimate — OpenAI-tokenizer equivalent, not verified". Never invent ranges.
- Copy rule (§7): never "100% identical to OpenAI", never a Claude-vs-cl100k number (that figure
  is folklore; the verified one is Claude-vs-prior-Claude) [4].

### 3.4 Price snapshot: curated LiteLLM subset, vendored in-repo

- Source of truth: LiteLLM's `model_prices_and_context_window.json` — fetchable, ~2.3 MB,
  ~3,900 entries, MIT-licensed at repo root, actively maintained (repo pushed 2026-09-13; contains
  gpt-5.2, claude-opus-4-7, gemini-2.5-pro) [11]. Field names (verified): `input_cost_per_token`,
  `output_cost_per_token`, `max_input_tokens`, `max_tokens`/`max_output_tokens`, `mode`,
  `litellm_provider`, `cache_read_input_token_cost` [11].
- **Vendor a PRUNED snapshot, not the full file**: `src/lib/capytoken/prices.ts` (a typed TS data
  module) with ~24–36 **chat-mode** models you curate at build time from the raw JSON. Keep per
  model: `id` (LiteLLM key), `label`, `provider`, `encoding` ("o200k" | "cl100k" | "estimate"),
  `inputPerMTok`, `outputPerMTok`, `maxInput`, `maxOutput`. Include the module constants
  `PRICES_VERIFIED = "2026-09"`, `PRICES_SOURCE = "BerriAI/litellm model_prices_and_context_window.json"`,
  and `PRICES_SOURCE_COMMIT` (the hash you snapshotted from). Run the pruning pass manually (a
  scratch script or jq) — **do not** add a build-time fetch; the repo snapshot is the artifact.
- Cross-check option: OpenRouter's keyless `GET /api/v1/models` (pricing per-token USD strings +
  `context_length`) [12] — use it once, at snapshot time, as a sanity second source. Never at
  runtime.
- **Context fit** [11][13]: input and output share one window with separate caps — hard-fail
  `countedInput > maxInput`; warn when `countedInput + plannedOutput > maxInput + maxOutput`.
  Display both caps.

### 3.5 Bundle & perf reality

- First count costs the ranks parse (~hundreds of ms, one-time, ~2 MB materialization) [6] — hence
  lazy-on-first-use + singleton cache + a loading state. Counting itself is fast for the text sizes
  this tool serves (KBs–low MBs); a Web Worker is a documented v2 seam (§10), not v1.
- Debounce live counting (~150 ms) like CapyQR debounces engine updates.
- Currency display: USD, per **1M tokens** (industry convention — all three incumbents use it
  [1][2][11]); compute cost as `tokens × perToken`, display via `formatCost` with enough precision
  ($0.0047 style), never round to cents for small prompts.

---

## 4. File map (everything you will create or touch)

```
src/lib/capytoken/
  types.ts       # TokenEncodingId, ModelPriceRow, CountResult, EstimateLabel, OverheadToggle
  engine.ts      # browser-only: countTokens(text, encoding) via lazy dynamic-import + singleton
                 # cache; returns null while loading (caller shows state)
  estimate.ts    # ruleOfThumb(text) (chars/4, words×4/3), chatOverhead(messages), pure
  prices.ts      # CURATED_PRICES: ModelPriceRow[], PRICES_VERIFIED, PRICES_SOURCE, PRICES_SOURCE_COMMIT
  compute.ts     # costFor(row, inputTokens, plannedOutput), contextFit(row, input, output),
                 # estimateLabelFor(row), perM rates formatting inputs (pure)
  format.ts      # formatTokens, formatCost(USD), formatPerM, formatBytes-free (pure)
  demo.ts        # DEMO_TEXT fixture (a brand-flavored paragraph) for the idle state
src/components/tool/CapyToken.tsx # the editor (three cards)
src/app/capytoken/page.tsx        # ToolPageShell — tool no. 9, no index prop
public/plates/lab-9.webp          # 896×1200 plate (§8.2)
tests/capytoken.test.ts           # pure-logic suite (§9)
```

Registration touches (§8): `src/lib/capytools/suite.ts`, `README.md`, `package.json` (description
carries the tool count — bump to nine, cf. commit `4d3b461`), `tests/tool-pages.test.tsx`.

**Dependency changes (the only allowed one):** `npm i js-tiktoken@^1.0.21`. The ranks modules ship
inside it — nothing else.

---

## 5. Data layer (`src/lib/capytoken/`)

### 5.1 `types.ts`

```ts
export type TokenEncodingId = "o200k" | "cl100k";
export type EstimateKind = "exact" | "claude-estimate" | "unverified-estimate";
export interface ModelPriceRow {
  id: string;            // LiteLLM key, e.g. "gpt-5", "claude-opus-4-7"
  label: string;         // "GPT-5"
  provider: string;      // "OpenAI" | "Anthropic" | "Google" | "DeepSeek" | "Meta" | …
  encoding: TokenEncodingId | "estimate";
  inputPerMTok: number;  // USD per 1M input tokens
  outputPerMTok: number;
  maxInput: number;      // tokens
  maxOutput: number;
}
```

### 5.2 `engine.ts` (browser-only)

```ts
export async function countTokens(text: string, encoding: TokenEncodingId): Promise<number | null>;
// null = ranks still loading (caller renders the loading chip). Module-level Map<TokenEncodingId,
// Tiktoken> singleton; dynamic-imports lite + ranks once each; strips nothing — counts the raw
// string. Empty string → 0 without loading the engine.
```

### 5.3 `estimate.ts` (pure)

`ruleOfThumb(text)` → `{ byChars, byWords }` (chars/4; words × 4/3) per OpenAI's rule [8];
`chatOverhead(messages: number)` → `messages * 3 + 3` (Cookbook constants + priming, labeled) [9].

### 5.4 `prices.ts` + `compute.ts` (pure)

- `CURATED_PRICES` — the §3.4 snapshot. Curation bar: every row's prices must have been readable
  in the LiteLLM JSON the day you snapshot it; include a spread of budget→frontier (e.g. gpt-5,
  gpt-5-mini, gpt-4o, o3, claude-opus-4-7, claude-sonnet-4-x, claude-haiku-4-x, gemini-2.5-pro/flash,
  deepseek-chat, llama-4 variants, qwen, mistral) — aim for breadth a prompt-paster actually
  compares.
- `costFor(row, inputTokens, plannedOutput)` → `{ input: number; output: number; total: number }`.
- `contextFit(row, inputTokens, plannedOutput)` → `{ fitsInput: boolean; fitsTotal: boolean;
  inputShare: number }`.
- `estimateLabelFor(row)` → the §3.3 label text per row's `encoding`.

### 5.5 `format.ts`

`formatTokens(1234)` → "1,234"; `formatCost(0.004678)` → "$0.0047"; `formatPerM(2.5e-6)` → "$2.50"
(per 1M). All pure; golden-tested.

---

## 6. The editor (`CapyToken.tsx`) — three cards, house style

**Card 1 — "The text."** Textarea (mono, autosizing, `htmlFor`/`id` per invariants) · char/word
live stats · "try a sample" link that fills `DEMO_TEXT` · optional overhead toggle ("this is one
chat message (+6 framing tokens)") · live per-encoding count chips: `o200k_base — 1,203 tokens`
and `cl100k_base — 1,241 tokens`, each with the rule-of-thumb cross-check in muted text ("rule of
thumb ≈ 1,180"). First count shows the honest "loading tokenizer…" chip (~1 MB ranks, once).

**Card 2 — "The price."** Planned-output token input (default 512) · a compact table of curated
models: model · in/out per-1M · input cost · output cost · total · context bar (input share of
`maxInput`, clay when >80%, hard-fail note when over). Claude rows carry the estimate label;
Gemini/Llama rows "not verified". Footer: **"prices verified 2026-09 · source: LiteLLM
model_prices (<short commit>)"** — the stamp is the honesty feature, keep it quiet and factual.

**Card 3 — "The read."** A short verdict paragraph (computed, calm): "your prompt is ~1,203
tokens (o200k). At GPT-5 rates that's $0.0060 in + $0.0064 out per call — about 166 calls per
dollar." (The calls-per-dollar line is the shareable insight — compute it, never hardcode.) ·
Copy summary (`min-w-[84px]`, plain text: counts + chosen-model cost). `aria-live="polite"` status
line.

Page shell: `ToolPageShell` exactly like `src/app/capyresize/page.tsx` — `tool="CapyToken"`,
`eyebrow="CapyToken · tool no. 9"`, **no `index` prop** (derived from the registry), headline
sentence-case with `em` + `dot` (e.g. "Count before you *spend*."), lowercase lead ("exact token
counts and model costs, computed entirely in your browser. all local."). Metadata:

```ts
export const metadata = {
  title: "CapyToken — free LLM token counter & API cost calculator (offline)",
  description:
    "Count GPT/o200k and cl100k tokens exactly — no signup, no API key, nothing uploaded — and price your prompt across GPT-5, Claude, Gemini and DeepSeek with a verified date stamp. 100% in your browser.",
};
```

Errors reuse `ErrorCard` (e.g. engine load failure → calm retry card). Memory: nothing to revoke;
no storage anywhere.

---

## 7. UI copy register (binding)

Per `DESIGN.md` + `tests/tool-pages.test.tsx`: headline uppercase-start, lead/UI lowercase-start;
no exclamation marks. Accuracy copy is honest by construction: "exact for OpenAI encodings,
estimate for everything else"; never "identical to ChatGPT's counter", never a Claude-vs-cl100k
multiplier, never "always up to date" — the verified-date stamp is the claim.

---

## 8. Registration (SUITE workflow)

1. **`src/lib/capytools/suite.ts`** — append the 9th row:
   ```ts
   {
     name: "CapyToken", short: "Token", href: "/capytoken", cat: "browser", badge: "Token",
     year: "2026",
     blurb: "Count tokens exactly, price them across every model that matters — offline, keyless, with a verified-date stamp on the rates.",
     note: "Count, then cost",
     line: "Exact token counts and model costs, offline.",
     plate: { src: "/plates/lab-9.webp", width: 896, height: 1200 },
   }
   ```
   (Tune copy to house voice; field roles per the suite.ts docstring.)
2. **Plate** — `public/plates/lab-9.webp`, **896×1200**: a product shot of the tool's own surface
   (count chips + a cost table row + the verified stamp, on the cream canvas with corner marks).
   Match `lab-8.webp`'s tone; no stock imagery.
3. **`src/app/capytoken/page.tsx`** — per §6.
4. **`tests/tool-pages.test.tsx`** — add the CapyToken row (`"CapyToken · tool no. 9"`, a headline
   fragment, and the registry-derived sign-off — check how the CapyResize row asserts it and
   mirror). Zero external hrefs on the page (default branch).
5. **`README.md`** — add `## 9. CapyToken` following the existing sections' voice. Check whether
   the README or `package.json` description hardcodes a suite count ("eight") and bump both —
   `4d3b461` is the precedent for package.json.

No renumber chore exists anymore (the sign-off index is registry-derived) — do not invent one.

---

## 9. Test plan (`tests/capytoken.test.ts` — node env, zero network)

1. **engine.ts** — run in node (js-tiktoken is isomorphic; import lite + ranks directly, no
   dynamic-import dance needed in tests). Pin **golden vectors**: at test-writing time, compute
   counts for 4–5 fixed strings with the library and hardcode them (empty string → 0; "hello
   world"; a short paragraph; a string with emoji; a code snippet). These catch any future ranks/
   library upgrade drift. Keep the ranks import in this test file only (CI cost is fine).
2. **estimate.ts** — rule-of-thumb goldens (known char/word counts); overhead math.
3. **prices.ts** — every row has positive finite prices, non-negative context caps, a known
   `encoding` value, and a `provider`; `PRICES_VERIFIED` matches `2026-09` pattern;
   `PRICES_SOURCE_COMMIT` is a 7–40 char hex string; ≥24 rows; no duplicate ids.
4. **compute.ts** — `costFor` goldens (e.g. 1,000 tokens at $2.50/M → $0.0025; input+output sum);
   `contextFit` branches (fits / input-share band / hard-fail); `estimateLabelFor` mapping.
5. **format.ts** — `formatCost`/`formatPerM`/`formatTokens` goldens incl. rounding edges.
6. **Registration parity** — SUITE row 9 exists with `href: "/capytoken"`; page exports the
   expected title; `tests/tool-pages.test.tsx` covers the shell contract.

**Definition of done:** `npm test` green (all existing tests incl. `tool-pages`, `security`,
`landing`, `design-scale` still pass), `npx tsc --noEmit` clean, `npx eslint` clean on new files,
and a manual smoke: first count shows the loading chip then exact counts; the build's route chunk
does **not** contain ranks data (inspect `.next` client chunks for "o200k" after `npm run build`
— the dynamic import must keep it out of the initial bundle); devtools Network shows zero requests
across load→count→copy; the table's cost math matches a hand calculation for one model; the
verified stamp renders; hard refresh of `/capytoken` shows no SSR crash.

---

## 10. Out-of-scope backlog (seams, documented not built)

- **Batch mode** (drop many files → per-file counts → CSV): the one-time-Pro seam; `engine.ts` and
  `compute.ts` are already per-item loops.
- **Prompt-template presets** (system + user + output roles → overhead-aware cost) — the next
  demand step per the market research [5]; needs a small role model, not new infra.
- **Token visualizer** (colored per-token spans via `decode` of slices) — heavy DOM; v2.
- **Web Worker counting** for MB-scale texts; the singleton cache makes this a drop-in later.
- **Snapshot refresher** — a documented manual recipe (curl LiteLLM → prune → update stamp/commit)
  in `prices.ts`'s header comment; never a runtime fetch.
- **o200k_harmony construction** (`new Tiktoken(o200kRanks, harmonySpecialTokens)`) if gpt-oss
  demand appears — §3.2 documents why counts already match for plain text.

---

## 11. Sources (keys → `./sources.json`)

[1] llm-prices.com + simonw/llm-prices (typed-count pricing, "Prices last updated" stamp) ·
[2] Helicone /llm-cost + PricePerToken.com (typed-count calculators, no tokenizer) · [3] OpenAI
platform tokenizer page (o200k/cl100k only; lags new encodings) · [4] Simon Willison, "Claude
Token Counter, now with model comparisons" (2026-04-20; Anthropic's 1.0–1.35× Opus-4.7-era delta;
his 1.46× measurement) · [5] holaclaw token-studio / zatomic.ai / GPT for Work (closest entrants;
none offline + privacy-led) · [6] js-tiktoken v1.0.21 (npm README/package.json/dist types; ranks
as JS modules; measured sizes; lite API; root-bundle warning) · [7] openai/tiktoken
`openai_public.py` (o200k_harmony reuses o200k_base ranks) · [8] OpenAI help — "Understanding and
counting tokens" (4 chars ≈ 1 token ≈ ¾ word; 100 tokens ≈ 75 words; plain-text-count caveats) ·
[9] OpenAI Cookbook — how_to_count_tokens_with_tiktoken (tokens_per_message = 3, tokens_per_name =
1, +3 priming) · [10] Anthropic docs — token counting (API-only; count is an estimate; +30% era
note) · [11] LiteLLM model_prices_and_context_window.json (fields verified; ~2.3 MB; MIT at repo
root; maintained 2026-09) · [12] OpenRouter /api/v1/models (keyless; pricing.prompt/completion
strings; context_length) · [13] OpenAI help — context window (input/output share the window,
separate output cap).
