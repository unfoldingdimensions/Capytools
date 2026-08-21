# Midjourney Prompting — Research Brief

*Research input for Capytools No.2 (random image/video prompt generator). Target engine: Midjourney. Source-grounded in Midjourney's official Help Center docs; version-volatile behavior flagged `[unverified]`.*

---

## Executive Summary

- Midjourney is a **CLIP-family, weighted-keyword engine**: it wants **short, specific, high-signal text** with parameters appended at the very end — not long natural-language paragraphs.[1][2]
- The official prompt anatomy is a slot list: **Subject → Medium → Environment → Lighting → Color → Mood → Composition**, then **parameters**.[2]
- Parameters are a *separate layer after the text*: `--ar`, `--s/--stylize`, `--c/--chaos`, `--q/--quality`, `--seed`, `--no`, `--raw`, `--style`, `--v`, `--stop`, `--tile`, plus reference params (`--sref`, `--oref`, `--sw`).[1]
- Prompt weighting uses **multi-prompt `::` separators with weights** (`concept A::2 concept B::1`) on v6.x and below; this is documented for versions 1–6.1.[4] Behavior on v7+ is **`[unverified]`** (third-party 2026 guides claim inline `::` was dropped in favor of natural-language hierarchy + `--ow`/`--sw`; not confirmed against a primary MJ v7 doc in this pass).
- **Stylize** is the one parameter with a fully confirmed range from primary docs: default **100**, adjustable **0–1000**; low = more literal/prompt-faithful, high = more artistic but strays from the prompt.[3]

---

## 1. Prompt Structure

Midjourney parses text as a **creative recipe**, not a sentence. Official guidance:[2]

- **Short and simple prompts typically generate the best images.** Avoid long lists or detailed instructions — they "can confuse the process."
- **Specific synonyms over vague words** ("huge" / "gigantic" / "enormous" beats "big").
- **Specific numbers / collective nouns** over plurals ("three cats" or "flock of birds", not "cats").
- **Describe what you DO want**, not what you don't (use `--no` for exclusions — see §3).
- Prompt length is flexible: even one word works, but fewer details = more variety / less control.[2]

Official slot anatomy (the canonical skeleton for the generator):[2]

```
Subject (who/what) → Medium (photo/painting/illustration) → Environment (where)
→ Lighting (soft/neon/studio) → Color (vibrant/muted/mono) → Mood (calm/gloomy)
→ Composition (portrait/closeup/birds-eye)  →  PARAMETERS (at the end)
```

---

## 2. Parameters — Reference Table (exact syntax)

Source: Midjourney **Parameter List** (official).[1] Confirmed placement rules: **parameters always go at the END** of the prompt text; **space before the dashes**; **no punctuation (commas/periods) inside parameters**.[1]

| Parameter | Syntax | Effect |
|---|---|---|
| Aspect ratio | `--ar` / `--aspect` | Changes image shape; MJ images start as squares. e.g. `--ar 16:9` |
| Chaos / variety | `--c` / `--chaos` | "Spice up" results with more unusual/varied compositions. `[unverified: default 0, range 0–100]` |
| No (exclude) | `--no` | Tells MJ what you **don't** want. Accepts comma-separated words. e.g. `--no trees, red` |
| Quality | `--q` / `--quality` | Controls detail and processing time. `[unverified: default 1; accepted .25/.5/1; no effect on resolution]` |
| Repeat | `--r` / `--repeat` | Generate multiple image sets from one prompt. |
| Seed | `--seed` | Pin the starting noise field for testing/experimenting; same seed + same settings → reproducible grid. |
| Raw mode | `--raw` | More literal, less "MJ-default-style" output (closer to prompt). |
| Stylize | `--s` / `--stylize` | **Artistic flair slider. Default 100, range 0–1000** (confirmed primary). Low = literal; high = artistic but strays.[3] |
| Style reference | `--sref` | Match the look/feel of a reference image. |
| Style weight | `--sw` | Strength of the style reference.[1] |
| Omni reference | `--oref` | Use a person's likeness / object form (replaces Character Reference in V7).[1] |
| Personalization | `--profile` / `--p` | Apply a custom personalization profile / moodboard.[1] |
| Stop | `--stop` | Finish partway (blurrier/less detail). `[unverified: default 100, range 10–100]` |
| Tile | `--tile` | Makes the image tileable (seamless pattern).[9] |
| Weird | `--weird` / `--w` | Off-beat / unusual aesthetics.[1] |
| Version | `--v` / `--version` | Model version selector (e.g. `--v 6.1`).[10] |
| Stealth | `--stealth` | Private creations on the website.[1] |

> Note: MJ also exposes video params (`--video`, `--motion low/high`, `--loop`, `--bs`) — see `video.md`. The generator's video branch should reuse the director's-formula structure from `video.md` + these MJ-specific flags.

---

## 3. Prompt Weighting (`::` and negatives)

From the official **Multi-Prompts & Weights** doc:[4]

- A **double colon `::`** divides the prompt into separately-considered concepts, then MJ blends them. `space ship` → sci-fi craft; `space:: ship` → a boat in space (two ideas mixed).
- **Format rule:** **no space on the left of `::`, single space on the right.** Parameters still go at the very end.
- **Weights:** append a number after `::` to set relative importance — `hot::2 dog` makes "hot" twice as important as "dog".
- **Negative weight:** `--no X` is equivalent to `:: X::-0.5`. So `vibrant tulip fields --no red` == `vibrant tulip fields:: red::-0.5`. (Sum of weights must stay positive or MJ errors.)
- Documented for **versions 1, 2, 3, 4, Niji 4/5, 5, Niji 5, 6, Niji 6, 6.1**.[4] → **`::` is confirmed primary for v6.1 and below.**
- **`[unverified]`** — third-party 2026 guides claim **v7 removed inline `::` from the main prompt** (kept only inside `--sref url::2`), shifting to sentence hierarchy + `--ow` (object weight) / `--sw` (style weight). Not verified against a primary MJ v7 doc in this pass; the generator should treat `::` as **v6.x-and-below syntax** and prefer natural-language emphasis for v7+.[12]

---

## 4. Best-Practice Techniques (official)

- **Lead with the subject** and keep early words high-signal — MJ weights the opening of the prompt.[2]
- **Keep parameters at the end** so they aren't mis-read as aesthetic language.[1][2]
- **Use `--no` for exclusions, never "no X" in text** — MJ "seeks to depict everything it finds in the prompt," so negation-in-text can backfire.[2][5]
- **`--style raw` + low `--stylize` (50–100)** for product/photographic fidelity; raise stylize (150–400+) for illustrative/artistic looks. `[unverified: exact sweet-spots from secondary guides]`[12]
- **Iterate:** short prompt → pick best grid → add detail toward that direction.[2]

---

## 5. Gotchas / Limitations

- Burying parameters mid-prompt makes MJ treat them as style language (e.g. `--ar 16:9` read aesthetically).[1]
- Punctuation inside parameters breaks them.[1]
- `--no`/weights only affect **initial generation**, not subsequent upscales/variations (per secondary; `[unverified]` for exact scope).[5][12]
- `::` weights must sum positive or MJ errors.[4]
- Version behavior is volatile — `::` and some params differ across `--v` values.[4][10][12]

---

## 6. Backend Notes (how `--stylize` maps to the pipeline)

Midjourney does not publish its architecture, but the observable behavior is consistent with a **CLIP-conditioned latent model with a style prior**:
- `--stylize` interpolates between *prompt-faithful* and *model-default-aesthetic* outputs — i.e. it biases the conditioning toward MJ's trained "look" vs. the literal text. Low stylize = high text adherence; high stylize = high prior influence.[3] This mirrors the CFG/conditional-vs-unconditional trade-off described in `backend.md` §5.
- `--chaos` perturbs the noise/init to widen the variation of the 4-image grid (`[unverified]` mechanism).
- `--seed` pins the initial noise field so the same prompt+settings reproduces (consistent with DDIM determinism in `backend.md` §6).
- Multi-prompt `::` weighting exploits **cross-attention** key-scaling exactly as `backend.md` §4 describes (emphasis = raised softmax share of a concept). `[unverified: MJ-specific implementation, but mechanism is the general one]`

---

## 7. Generator Implications (for the DB + page)

1. MJ output format = `concise keyword/phrase sentence --ar X --s Y --c Z --no ...` — a **suffix-param dialect** distinct from Flux/Gemini natural language.
2. Emit **subject-first**, short (6–10 high-signal words) by default; longer only when user adds detail slots.
3. The generator's **parameter block** for MJ = `--ar`, `--s`, `--c`, `--q`, `--seed`, `--no`, `--style raw`, `--v` (configurable defaults per the user's chosen version).
4. `::` weighting is an **optional advanced toggle** (v6.x style); default OFF, with natural-language emphasis as the v7-safe path.

---

## Sources

Inline `[n]` map to `midjourney.sources.json`.

[1] https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List — Parameter List (official)
[2] https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics — Prompt Basics (official)
[3] https://docs.midjourney.com/hc/en-us/articles/32196176868109-Stylize — Stylize (official)
[4] https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights — Multi-Prompts & Weights (official)
[5] https://docs.midjourney.com/hc/en-us/articles/32173351982093-No — No parameter (official)
[6] https://docs.midjourney.com/hc/en-us/articles/32099348346765-Chaos-Variety — Chaos / Variety (official)
[7] https://docs.midjourney.com/hc/en-us/articles/32604356340877-Seeds — Seeds (official)
[8] https://docs.midjourney.com/hc/en-us/articles/32176522101773-Quality — Quality (official)
[9] https://docs.midjourney.com/hc/en-us/articles/32197978340109-Tile — Tile (official)
[10] https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version — Version (official)
[11] https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference — Style Reference (official)
[12] https://promptmake.net/blog/text-to-image-prompt-weighting-midjourney-flux — PromptMake 2026 weighting guide (secondary; v7 `::` claim marked `[unverified]`)

*Primary MJ docs [1]–[11] fetched and verified this pass. Items marked `[unverified]` lacked a primary-source confirmation in this research and should be re-checked against current MJ docs before the generator hard-codes them.*
