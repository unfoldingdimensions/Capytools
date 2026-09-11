# CapyBench — implementation plan (v2: agentic runs, spec, prompt & result format)

*This document is a complete handoff: a session that has never seen the originating
conversation should be able to run CapyBench and add to it from this alone.
Citation keys `[n]` resolve to `./sources.json`.*

## 1. Mission & scope

CapyBench gives many models one fixed prompt, records each one's output as a video,
and publishes the recordings so a visitor compares them **side by side with their own
eyes**. We publish only mechanical facts. No score, no rubric, no opinion from us.
Judgment stays with the visitor.

The task is **Capy Onsen** — a single self-contained HTML file simulating a capybara
hot spring. Chosen over a physics-stacking alternative, which stays on the shelf as
a candidate v2 task with a different failure profile.

### Execution model: agentic, one prompt, isolated folder

**v2 changed how runs happen.** Each model runs as an agent in its own sterile folder,
given the prompt once, with no human turns after it. It writes `index.html` itself and
may test its own work. This produces better artifacts than a single API call — the
model can look at what it made and fix it — and it is closer to how people actually
use these models.

**What that costs, stated plainly: there is no comparable USD cost figure any more,
and v2 does not publish one.** A coding agent's token count is mostly harness — system
prompt plus tool definitions dwarf the task — and it differs per harness. Chat
subscriptions are not billed per token at all. Wall-clock includes the operator. So
comparing tokens or dollars across agentic runs compares harnesses and typing speed,
not models. §5 lists what *is* honestly measurable and published instead.

The v1 one-shot API path (`bench/run.mjs`, `bench/prices.json`) is **shelved, not
deleted**: it still works, is still tested, and is the thing to reach for if rigorous
token-and-dollar numbers are ever wanted again. Its 18 verified official rates stay
current and useful either way.

**In scope (v2)**
- The benchmark prompt, byte-frozen: `bench/prompt.v2.md` (agentic wording).
- The run protocol and the fairness rules that make two runs comparable (§3).
- The run scaffolder and sterility guard: `bench/new-run.mjs`.
- The result format: one `run.json` per run folder (§5).
- Shelved but maintained: `bench/run.mjs`, `bench/prices.json`, `bench/prompt.v1.md`.

**Out of scope (v2 — do NOT build)**
- The `/capybench` comparison page. Design it against real recordings, not against
  a guess at what models will produce. See §7 for what is already decided about it.
- Landing-page registration, tool numbering, any change to the "05 of 05" counts.
- Any second benchmark task.
- Automated scoring of any kind. That is the game we explicitly opted out of.

## 2. Read these first (repo law)

- `AGENTS.md` — brand ethos and design tokens. Note §5's registration recipe is
  **stale**: `src/app/page.tsx` no longer holds a `TOOLS` array.
- `docs/research/capyog/implementation-plan.md` — the heading convention this doc follows.
- `next.config.ts` — `X-Frame-Options: DENY` on `/:path*`, report-only CSP with no
  `frame-src`. Both matter the moment a comparison page wants an iframe.

## 3. Run protocol (the fairness contract)

Every rule here exists so that a difference between two runs is a difference in
capability and nothing else.

- **Same harness for every model.** Same agent, same tools, same system prompt, same
  machine. This is the single rule that keeps an agentic comparison meaningful; break
  it and you are benchmarking model-plus-harness pairs, which cannot be attributed to
  the model. Recorded in `harness` on every run so a later reader can check it was.
- **One prompt, no human turns after it.** Paste `bench/prompt.v2.md` verbatim and
  then say nothing. The agent stops when it says it is done. `humanTurnsAfterPrompt`
  records this and should be `0` on every published run.
- **The run folder must be sterile**, and this is checked, not remembered — see the
  contamination rule below. It is the failure most likely to silently invalidate
  everything.
- A model that never produces a file is a real, publishable result. Record it with an
  empty artifact rather than re-running.
- **Anything that needed an exception goes in `blemishes`**, in the run's own words —
  a crash, a restart, a tool that would not authorise. An honest blemish log is what
  keeps the single-prompt claim credible; both benchmarks worth learning from keep one
  [50][51].
- One run folder is never reused. `new-run.mjs` refuses to scaffold over an existing
  one.

### The contamination rule

An agent reads instruction files from its working directory **and every parent
directory**. A run folder anywhere under this repo would hand the model
`AGENTS.md` — the sage palette, Fraunces and Plus Jakarta, the `rounded-3xl` surface
rules, the whole brand ethos. The benchmark would be measuring who read the style
guide. `findContamination()` in `bench/new-run.mjs` walks from the run folder to the
filesystem root and splits what it finds:

- **fatal** — project-level config (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`,
  `.cursorrules`, `.claude/`, `.mcp.json`, `.git`, and friends) found anywhere other
  than the home directory itself. These vary by location, so one run could inherit a
  design system while another inherits nothing. `new-run.mjs` refuses to scaffold.
- **ambient** — the operator's own user-level config sitting directly in the home
  directory (`~/.claude`, `~/CLAUDE.md`). On this machine `~/.claude/CLAUDE.md` exists
  and applies to every project, so it cannot be escaped without leaving home entirely.
  Because every model runs in the same harness on the same machine it applies
  *equally* to all of them — a constant, not a variable, which is a far smaller
  problem. It is still a thumb on the scale, so it is recorded in
  `harness.ambientConfig` and disclosed on the page rather than quietly ignored.

**Keeping run folders on a drive root outside the home directory (e.g. `E:\`) leaves
`ambientConfig` empty**, which is the cleanest option and what to prefer.

Also: no MCP servers, no skills, no project memory. Turn them off for the runs.

### Shelved v1 protocol (API one-shot)

Still implemented and tested in `bench/run.mjs`, for if rigorous token/dollar numbers
are wanted again: one user message, prompt verbatim, no system prompt, zero
iterations, official vendor API only (never a reseller), vendor-default temperature
and reasoning, `maxOutputTokens` clamped to 64000 for every model so a 128K-cap model
is not handed twice the budget of a 64K one, non-streaming so `durationMs` means one
thing, and mechanical artifact extraction (last fenced `html` block; else a bare
`<!DOCTYPE` response whole; else `extracted: "none"`).

## 4. The prompt

`bench/prompt.v2.md` is the single canonical copy — **do not paraphrase it here or
anywhere else.** Its sha256 goes into every run, which is what proves two runs
answered the same question. Changing one byte means a new `prompt.vN.md` and bumping
`SPEC_VERSION`; old runs keep answering the prompt they were given.

It asks for a one-file, no-dependency, no-network simulation: ten procedurally drawn
capybaras with decaying needs, a real state machine, obstacle pathfinding, a
sixty-second day/night arc, and a yuzu crate that tips into the pool at dusk.

v2 differs from `prompt.v1.md` only in the deliverable wording, because the execution
model changed: **write `index.html` into the working directory** rather than emit a
fenced code block, create no other files, install nothing — and, stated explicitly so
it is equally available to every model, *"you may open and test your own work before
you finish."* Everything from **Stage** onwards is byte-identical to v1, which is what
keeps the two versions comparable as tasks even though their numbers are not.

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

## 5. Result format (v2)

One folder per run, named `<model-slug>__<local-date>` — e.g.
`gemini-3-8-flash__2026-09-12`. The slug strips dots and spaces because these names
end up in video URLs, and the date is the operator's **local** calendar day, not UTC,
so an evening run is not filed under yesterday. It holds `prompt.md` (the exact prompt
given, copied in), `index.html` (what the model wrote) and `run.json`:

```json
{
  "benchmark": "capy-onsen",
  "specVersion": "2",
  "promptSha256": "…",
  "model":   { "id": "gemini-3.8-flash", "label": "Gemini 3.8 Flash", "vendor": "google" },
  "harness": { "name": "claude-code", "version": "…", "ambientConfig": [] },
  "run":     { "protocol": "agentic-single-prompt",
               "startedAt": "2026-09-12T10:00:00Z", "finishedAt": "2026-09-12T10:07:30Z",
               "durationSeconds": 450, "turns": 14, "toolCalls": 31,
               "humanTurnsAfterPrompt": 0 },
  "blemishes": [],
  "artifact":  { "file": "index.html", "bytes": 84213, "sha256": "…" },
  "notes": ""
}
```

**There is deliberately no `cost` and no `usage`.** Those fields are absent rather
than null, because a null invites someone to fill it with a number that cannot mean
what it appears to mean (§1). What gets published instead: session duration, turn
count, tool-call count, the blemish log, and the harness named openly.

Fill the nulls by hand after a run, then `node bench/new-run.mjs --finalize <dir>`
computes `durationSeconds` from the timestamps and the artifact's bytes and sha256,
and tells you what is still unfilled. A run with no `index.html` finalizes to an empty
artifact with a warning — that is a real result, not an error.

### Shelved v1 result format (API one-shot)

`bench/results/v1/<model-slug>/` holds `result.json`, `index.html` and `raw.txt` (the
full response, for audit). `result.json`:

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
# 1. Scaffold a sterile run folder. Refuses if the location is contaminated.
node bench/new-run.mjs --model gemini-3.8-flash --dir E:\capybench-runs

# 2. Open the agent in that folder. Paste prompt.md verbatim. Say nothing else.
#    Record when you started and finished, the turn count and the tool-call count.

# 3. Fill the nulls in run.json, then:
node bench/new-run.mjs --finalize E:\capybench-runs\gemini-3-8-flash__2026-09-12
```

`--dir` defaults to a `capybench-runs` folder beside the repo; pass it explicitly to
put runs somewhere outside the home directory, which keeps `ambientConfig` empty.
Runs live **outside** this repo by necessity (§3), and get copied into
`bench/results/v2/` afterwards for archival, once there is something worth archiving.

### Shelved v1 path (API one-shot)

```bash
node bench/run.mjs --model claude-opus-5 --dry-run   # resolve everything, call nothing
node bench/run.mjs --model claude-opus-5             # one shot, writes the result
```

API keys come from the environment variable named in the model's row, never from a
file, and are never written into a result. As of 2026-09-12 only `GEMINI_API_KEY` is
set on this machine; `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are not.

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
- **The stat row publishes what agentic runs can honestly support** (§5): session
  duration, turn count, tool-call count, the blemish log, and the harness named
  openly — plus `harness.ambientConfig` if it is not empty. **No cost column.** If a
  cost figure is ever wanted, it comes from the shelved API path, and the page must say
  the number describes a *different run* than the video shows.
- **One thing worth stealing from prior art, one to avoid** [50][51]: keep the honest
  blemish log (both benchmarks worth learning from do, and it is what makes a
  single-prompt claim believable). Avoid the authored verdict or scored rubric — that
  is the game we explicitly opted out of. Note FlappyBench publishes cost but not
  wall-clock time; we are doing the reverse, and for a defensible reason.
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
- `slug` / `runFolderName` — dots and spaces stripped, `model__date` shape.
- `findContamination` — this repo classified fatal (it would hand over the design
  system), parents walked and not just the folder itself, a temp folder clean of
  anything fatal, the operator's home-directory config classified ambient rather than
  fatal, and a contaminant in the run folder itself caught as fatal.

The scaffolder's end-to-end behaviour is checked by hand rather than in vitest (it
touches real directories): it refuses inside this repo naming all four offenders,
scaffolds on `E:\` with `ambientConfig: []`, copies a prompt whose hash matches
`run.json`, refuses to reuse a folder, warns and records an empty artifact when there
is no `index.html`, and computes `durationSeconds` from the timestamps.

Run with `npm run test`. `bench/` passes `npx eslint bench` and `npx tsc --noEmit`
as-is; it is not swept into the Next build because `tsconfig.json`'s `include` lists
`**/*.ts`/`**/*.mts` but not `.mjs`.

**Definition of done (v2):** the agentic prompt is frozen and hashed; `new-run.mjs`
scaffolds a sterile folder and refuses a contaminated one; `--finalize` fills duration
and artifact hash and names what is missing; `run.json` carries no cost or usage
field; the shelved API path still resolves a model and its frozen price via
`--dry-run`; and the nineteen tests pass.

## 9. Out-of-scope backlog

- **The recording protocol — the next thing to write.** §7 settles the encoding recipe
  and where videos are hosted, but nothing yet pins down how a capture is *made*:
  window size, duration, frame rate, the `?seed=` used, whether the three interactions
  are exercised and at what timestamps, and whether capture starts at page load.
  Until that is written down and identical for every run, the side-by-side is not a
  fair comparison. A recording shorter than 60 seconds cannot show the dusk yuzu event,
  which is one of the discriminators.
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
