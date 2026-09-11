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
- `maxOutputTokens`: the model's maximum or 64000, whichever is lower. Recorded.
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

Three things that keep the money numbers honest:

1. **Cost is frozen at run time.** The rate that was in force on the day of the run
   is written into the result and never recomputed. A March run is never re-priced
   at today's rates. There is deliberately **no live pricing feed** — no vendor ships
   a pricing API, and a scraper against a page with no contract would break silently
   and quietly poison the one number this benchmark cannot afford to get wrong.
2. **Reasoning tokens are a subset of output tokens**, not an addition — Anthropic
   counts thinking inside `output_tokens`, OpenAI counts reasoning inside
   `completion_tokens`. They are reported for display and never billed twice.
   `tests/capybench.test.ts` pins this.
3. **A model with no verified official price cannot produce a result.**
   `bench/run.mjs` aborts on a null rate and tells you which page to read.

`bench/prices.json` is hand-maintained: one row per model with `vendor`, `label`,
`baseUrl`, `apiKeyEnv`, `maxOutputTokens`, the two rates, `asOf`, and `source` (the
vendor's own pricing page). Keys beginning `_` are ignored. **Every row currently
ships with null rates — they must be read off the official page and filled before
that model can run** [1][2].

## 6. Running it

```bash
node bench/run.mjs --model claude-opus-5 --dry-run   # resolve everything, call nothing
node bench/run.mjs --model claude-opus-5             # one shot, writes the result
```

API keys come from the environment variable named in the model's row, never from a
file, and are never written into a result.

Adding a model: add a row to `prices.json` with rates read off the vendor's page. Two
vendor adapters exist — `anthropic` (`/v1/messages`) and `openai-compatible`
(`/v1/chat/completions`). A new vendor is one ~20-line entry in `VENDORS`.

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

Run with `npm run test`. `bench/` passes `npx eslint bench` and `npx tsc --noEmit`
as-is; it is not swept into the Next build because `tsconfig.json`'s `include` lists
`**/*.ts`/`**/*.mts` but not `.mjs`.

**Definition of done (v1):** the prompt is frozen and hashed; `--dry-run` resolves a
model, its price and its request shape without calling anything; an unpriced or
unknown model aborts; a real run writes three files with a frozen rate; and the six
tests pass.

## 9. Out-of-scope backlog

- The `/capybench` comparison page (§7).
- Show the spec beside the two frames as a checklist the *visitor* ticks off — keeps
  judgment with them, as intended.
- Console-error count on load. Mechanical and free, not needed to ship.
- The physics-stacking task as a v2 benchmark.
- A `prices.json` staleness warning once rates have an `asOf` older than N months.

## 10. Sources (keys → `./sources.json`)

`[1]` Anthropic official API pricing. `[2]` OpenAI official API pricing.
**Both are unverified in-repo** — the rate must be read off the page and dated in
`prices.json` before a model runs.
