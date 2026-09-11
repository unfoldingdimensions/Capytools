# CapyBench — implementation plan (v1: spec, prompt & result format)

*This document is a complete handoff: a session that has never seen the originating
conversation should be able to run CapyBench and add to it from this alone.
Citation keys `[n]` resolve to `./sources.json`.*

## 1. Mission & scope

CapyBench runs one fixed prompt against many models, one shot each, and publishes
the outputs so a visitor compares them **side by side with their own eyes**. We
publish only mechanical facts: wall-clock time, tokens in and out, and USD cost at
the model's own **official** API rates. No score, no rubric, no opinion from us.
Judgment stays with the visitor.

The task is **Capy Onsen** — a single self-contained HTML file simulating a capybara
hot spring. Chosen over a physics-stacking alternative, which stays on the shelf as
a candidate v2 task with a different failure profile.

**In scope (v1)**
- The benchmark prompt, byte-frozen: `bench/prompt.v1.md`.
- The run protocol and the fairness rules that make two results comparable (§3).
- The runner: `bench/run.mjs`.
- The result format: `bench/results/v1/<model>/result.json` (§5).
- The price ledger: `bench/prices.json`.

**Out of scope (v1 — do NOT build)**
- The `/capybench` comparison page. Design it against real artifacts, not against
  a guess at what models will emit. See §7 for what is already known about it.
- Landing-page registration, tool numbering, any change to the "05 of 05" counts.
- Any second benchmark task.
- Console-error counting, screenshot capture, automated scoring of any kind.

## 2. Read these first (repo law)

- `AGENTS.md` — brand ethos and design tokens. Note §5's registration recipe is
  **stale**: `src/app/page.tsx` no longer holds a `TOOLS` array.
- `docs/research/capyog/implementation-plan.md` — the heading convention this doc follows.
- `next.config.ts` — `X-Frame-Options: DENY` on `/:path*`, report-only CSP with no
  `frame-src`. Both matter the moment a comparison page wants an iframe.

## 3. Run protocol (the fairness contract)

Every rule here exists so that a difference between two results is a difference in
capability and nothing else.

- One user message, `bench/prompt.v1.md` verbatim. **No system prompt.**
- **One shot, zero iterations.** No retries on bad output. A model that emits prose
  instead of a file is a real, publishable result.
- Retry **only** on transport failure (HTTP 5xx, timeout), twice, and record the
  count in `run.transportRetries`.
- **Official vendor API only** — never OpenRouter or any other reseller. Official
  pricing is only meaningful against official token accounting.
- Temperature and reasoning/thinking effort left at vendor default; both recorded
  in `params` rather than set by us.
- `maxOutputTokens`: **clamped to 64000 for every model** by `MAX_OUTPUT_TOKENS` in
  `run.mjs`, so a model with a 128K cap is not handed a larger budget than one capped
  at 64K. `prices.json` still records each model's true cap; the clamp is what gets
  sent, and `params.maxOutputTokens` records it. It also keeps non-streaming requests
  clear of HTTP timeouts, which is what makes non-streaming viable at all.
- Non-streaming, so `durationMs` (request send → final byte) means the same thing
  for every model.
- Artifact extraction is **mechanical, never a judgment call**: the last fenced
  `html` block wins; failing that, a response starting with `<!DOCTYPE` is taken
  whole; failing that, `extracted: "none"` with an empty artifact.

## 4. The prompt

`bench/prompt.v1.md` is the single canonical copy — **do not paraphrase it here or
anywhere else.** Its sha256 goes into every result, which is what proves two results
answered the same question. Changing one byte means incrementing `SPEC_VERSION` in
`bench/run.mjs`; old results stay under `results/v1/` answering the old prompt.

It asks for a one-file, no-dependency, no-network simulation: ten procedurally drawn
capybaras with decaying needs, a real state machine, obstacle pathfinding, a
sixty-second day/night arc, and a yuzu crate that tips into the pool at dusk.

**The discriminators** — the requirements chosen because weak output fails them
*visibly, within ten seconds*, which is what makes a side-by-side worth looking at:

| Requirement | How weak output fails, on camera |
| --- | --- |
| Exactly four soaking spots, ten capybaras, visible queue | All ten soak in the same puddle |
| Three solid obstacles on the bank | Capybaras walk straight through boulders |
| No overlap, no jitter, never permanently stuck | Agents vibrate in place or pile up |
| Stride matches ground speed | Sliding feet — the classic tell |
| Seeded PRNG, no `Math.random`, seed shown in a corner | Different run every reload |
| Fixed timestep decoupled from rendering | The 4× button visibly breaks the sim |
| Scheduled dusk yuzu event | Never fires |
| Reads unmistakably as a capybara | Reads as a guinea pig |

Known tradeoff, accepted deliberately: the prompt is long and highly specified, which
makes this an **execution and instruction-following-at-scale** benchmark more than a
creativity one. That is the right call for fair visual comparison.

## 5. Result format

`bench/results/v1/<model-slug>/` holds three files: `result.json`, `index.html` (the
extracted artifact) and `raw.txt` (the full response, for audit). `result.json`:

```json
{
  "benchmark": "capy-onsen",
  "specVersion": "1",
  "promptSha256": "215539f2…",
  "model":   { "id": "…", "label": "…", "vendor": "anthropic" },
  "run":     { "startedAt": "…", "durationMs": 48213, "protocol": "one-shot",
               "transportRetries": 0, "stopReason": "end_turn" },
  "params":  { "temperature": null, "maxOutputTokens": 64000, "reasoning": "default" },
  "usage":   { "inputTokens": 1204, "outputTokens": 18442,
               "reasoningTokens": 0, "cachedInputTokens": 0 },
  "pricing": { "source": "<official pricing URL>", "asOf": "YYYY-MM-DD",
               "currency": "USD", "inputPerMTok": 5, "outputPerMTok": 25 },
  "cost":    { "inputUsd": 0.00602, "outputUsd": 0.46105, "totalUsd": 0.46707 },
  "artifact":{ "file": "index.html", "bytes": 84213, "sha256": "…",
               "extracted": "fenced-html-block" }
}
```

`result.json` also carries a `warnings` array — `checkUsage()` in `run.mjs` tests the
two accounting claims the cost figure rests on against every real response, and a run
whose accounting is suspect carries that warning wherever the number is displayed.

Four things that keep the money numbers honest:

1. **Cost is frozen at run time.** The rate that was in force on the day of the run
   is written into the result and never recomputed. A March run is never re-priced
   at today's rates. There is deliberately **no live pricing feed** — no vendor ships
   a pricing API, and a scraper against a page with no contract would break silently
   and quietly poison the one number this benchmark cannot afford to get wrong.
2. **Reasoning tokens are a subset of output tokens**, not an addition — confirmed for
   all three vendors [3][9][12][24]. They are reported for display and never billed
   twice. Pinned by a test, and `checkUsage()` warns loudly if a live response ever
   reports more reasoning than output, which would mean the cost *understates* the bill.
3. **A model with no verified official price cannot produce a result.**
   `bench/run.mjs` aborts on a null rate and tells you which page to read.
4. **Cost is exact on Anthropic and conservative elsewhere.** Anthropic caching cannot
   engage without an explicit `cache_control` breakpoint [4], but OpenAI and Google
   cache automatically [10][25], so a cache hit makes the real invoice *lower* than the
   published figure. `checkUsage()` flags any run with cached tokens. Our prompt is
   ~1.1K tokens, which sits just above OpenAI's 1,024-token cache minimum and below
   Google's 2,048/4,096, so a repeat OpenAI run is the realistic case.

One asymmetry for whoever builds the page: Anthropic reports cached tokens *excluded*
from its input count while OpenAI and Google *include* them, so a cross-vendor "input
tokens" column compares slightly different quantities. The published USD cost is
unaffected.

`bench/prices.json` is hand-maintained: one row per model with `vendor`, `label`,
`baseUrl`, `apiKeyEnv`, `maxOutputTokens`, the two rates, `asOf`, `source` (the
vendor's own pricing page) and `tiers` (batch/cache/long-context rates, never folded
into the main rate). Keys beginning `_` are ignored. **18 models across three vendors
are priced as of 2026-09-12** [1][7][12]; rates were merged from
`docs/research/capybench/pricing.json` after review rather than written straight in.

Two corrections applied during that merge, both worth knowing about:
- `pricing.json` had Claude Fable 5.1 at `$10/$25`. The canonical Anthropic pricing
  table and `sources.json` [1] both give **$10/$50**; the row's batch note had been
  derived from the wrong figure and was corrected with it. Both files now read $10/$50.
- Haiku is keyed by its undated ID `claude-haiku-4-5`, not the dated snapshot, per
  Anthropic's model table. The snapshot ID is noted in `tiers`.

Deliberately excluded: Claude Mythos 5.1 (`claude-mythos-5-1`, $10/$50) is
access-restricted to Project Glasswing, and legacy/previous-generation models from all
three vendors are still purchasable but no longer the current lineup — the brief's
"Could not verify" section lists them with their rates if a retrospective run ever
wants them.

## 6. Running it

```bash
node bench/run.mjs --model claude-opus-5 --dry-run   # resolve everything, call nothing
node bench/run.mjs --model claude-opus-5             # one shot, writes the result
```

API keys come from the environment variable named in the model's row, never from a
file, and are never written into a result.

Adding a model: add a row to `prices.json` with rates read off the vendor's page. Three
vendor adapters exist — `anthropic` (`/v1/messages`), `openai-compatible`
(`/v1/chat/completions`) and `google` (native `:generateContent`). A new vendor is one
~20-line entry in `VENDORS`.

Gemini uses Google's **native** endpoint rather than its OpenAI-compatible path: the
compat layer reports thinking and cache token details as empty [6][27], and those are
exactly the fields the cost figure depends on. The API key travels in an
`x-goog-api-key` header, never the query string.

Before the first published Gemini run, sanity-check one real response:
`candidatesTokenCount - thoughtsTokenCount >= 0`. The API reference defines the two
separately without stating the subset relationship [26]; two other official statements
imply thoughts sit inside the output total [12][24]. `checkUsage()` fails loudly if a
response contradicts that, but confirm it once by eye.

## 7. Notes for whoever builds the comparison page

**The page publishes recordings, not live artifacts.** The model-written HTML runs
only locally, on our machine, to be captured; visitors watch video. This is
deliberate — it sidesteps running arbitrary model-written JavaScript in a visitor's
browser entirely, so none of the iframe sandboxing, `X-Frame-Options` exception or
`frame-src` CSP work is needed. The artifact still ships in the repo under
`bench/results/` as the auditable source of the recording.

- **Recording protocol is part of the fairness contract.** A video comparison is
  only honest if every recording is identical in everything but the artifact:
  same window size, same duration, same frame rate, same start point (page load),
  same `?seed=`, same interactions performed at the same timestamps or none at all.
  Write the protocol down and record it per result before capturing anything —
  an eyeballed recording is an unfair one. Sim time matters too: the prompt
  specifies a sixty-second day, so a recording shorter than that cannot show the
  dusk yuzu event, which is one of the discriminators.
- **Host the videos from `/public`, committed to the repo** [28][29][30]. At 20–40 short
  clips the bandwidth is a rounding error inside Hobby's 100 GB, storage is free, and
  the privacy promise stays literally true — one party, no player, no cookies. Revisit
  Vercel Blob only past a few GB or if 100 GB/month becomes real, and revisit it *on
  Pro*, because exceeding Hobby's allowance pauses the whole site [29]. An embedded
  third-party player is out: YouTube's own developer policy says the embed collects and
  shares user data [36].
- **Encode every recording once, identically**: H.264 High in MP4 — the only format
  that plays everywhere, 97.26% global and iOS Safari since 3.2 [38][41] — at
  `-crf 21 -preset slow -tune animation -pix_fmt yuv420p`, fixed 2-second GOP,
  `+faststart` [42]. Screen content is flat colour and hard edges, so CRF holds small
  HUD text at low bitrate. Identical settings across all recordings are a precondition
  for frame-accurate side-by-side comparison, not a nicety.
- **Sync playback** with `<video muted playsinline preload="auto">` elements driven off
  one `performance.now()` master clock and a `requestAnimationFrame` drift-correction
  loop — hard-seek past ~80 ms of drift, rate-nudge past ~30 ms, and gate both start and
  scrub on every `seeked` event [44][45][46][47]. Muted autoplay needs exactly
  `autoplay muted playsinline` and works on desktop and mobile [48][49]. Note `rAF` is
  paused in hidden tabs [47].
- **Two things worth stealing from prior art** [50][51]: publish cost next to every
  model (FlappyBench does; it omits wall-clock time, which we show), and keep an honest
  blemish log for any run that needed an exception. What to avoid: an authored verdict
  or scored rubric — that is the game we explicitly opted out of.
- Committed JSON is imported straight out of the repo where a page needs it — see
  `src/lib/promptgen/criteria.ts:1331` importing from `docs/research/`.
- Page shell: `src/components/tool/ToolPageShell.tsx` owns all the chrome
  (AmbientBackground, header, CapyMark, eyebrow, footer). Pages stay server
  components; only the interactive surface is `"use client"`.
- Decide whether CapyBench is a **sixth tool or a page**. If a tool, the "05 of 05"
  count is hardcoded across `src/lib/capytools/landing.ts`, `src/components/header.tsx`,
  `src/app/page.tsx` metadata, every tool page's `index` prop, the
  `.lp-labs-grid` `repeat(5, 1fr)` in `src/components/landing/landing.css`, and
  `tests/tool-pages.test.tsx`.
- Display note: say out loud that reasoning tokens are billed at the output rate, or
  a reasoning model looks mysteriously expensive per visible token.

## 8. Test plan (`tests/capybench.test.ts`, vitest)

Covers the only non-trivial logic, which is also the money path:
- `extractArtifact` across four inputs — one fenced block, two blocks (last wins),
  bare `<!DOCTYPE`, prose only → `"none"`.
- `computeCost` against known rates, plus the invariant that reasoning tokens change
  nothing.
- `checkUsage` — quiet on clean usage, shouts on reasoning-exceeds-output
  (understated cost) and on cached input (overstated cost).
- The `google` adapter's usage mapping, that the API key stays out of the URL, and that
  a truncated response with no candidates does not throw.

Run with `npm run test`. `bench/` passes `npx eslint bench` and `npx tsc --noEmit`
as-is; it is not swept into the Next build because `tsconfig.json`'s `include` lists
`**/*.ts`/`**/*.mts` but not `.mjs`.

**Definition of done (v1):** the prompt is frozen and hashed; `--dry-run` resolves a
model, its price and its request shape without calling anything; an unpriced or
unknown model aborts; a real run writes three files with a frozen rate; and the twelve
tests pass.

## 9. Out-of-scope backlog

- The `/capybench` comparison page (§7).
- Show the spec beside the two frames as a checklist the *visitor* ticks off — keeps
  judgment with them, as intended.
- Console-error count on load. Mechanical and free, not needed to ship.
- The physics-stacking task as a v2 benchmark.
- A `prices.json` staleness warning once rates have an `asOf` older than N months.

## 10. Sources (keys → `./sources.json`)

52 sources, every one read on 2026-09-12: vendor pricing and token-accounting docs
`[1]`–`[11]` (Anthropic), `[7]`–`[11]` (OpenAI), `[12]`–`[27]` (Google); Vercel limits
and pricing `[28]`–`[35]`; media format, playback and autoplay `[36]`–`[49]`; prior art
`[50]`–`[52]`. Full findings in [`research-brief.md`](./research-brief.md), rates in
[`pricing.json`](./pricing.json).

The brief's **"Could not verify"** section is the part to read before trusting anything
here — it lists, up front, every claim that could not be pinned to an official page,
including Anthropic truncation billing (a well-supported inference, not a quoted fact)
and the Gemini thinking-token subset relationship.
