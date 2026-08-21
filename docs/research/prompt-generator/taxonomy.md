# Cappytool No.2 — Prompt Generator Taxonomy (Synthesis)

*Phase 4 synthesis of the 8 research briefs (`docs/research/prompt-generator/`). This is the DESIGN
SPEC the seed DB (`src/lib/promptgen/criteria.ts`) and the page are built from. Editable before Phase 5.*

**Decisions (defaults, confirm before DB build):**
- Scope: **image-first, video-ready** (all slots built; video is a toggle / branch).
- Randomization: **curated weighting** (style-reference up-weighted, generic boosters down-weighted, so output feels intentional, not noisy).
- Output: **dual-dialect** — one internal pick-set emits per-engine formatted prompts.

---

## 1. The core principle (from `backend.md` + `agency.md`)
Prompting is dictated by the **text encoder**, not the brand. So the generator holds ONE
internal "pick set" of criteria, then *formats* it into each engine's dialect:

| Dialect | Engines | Emission rule |
|---|---|---|
| Weighted-keyword | Midjourney, SDXL | short phrases + suffix params |
| Natural-language | Flux, SD3, DALL·E 3 | subject-first sentences, detail spelled out |
| LLM prose | Gemini | narrative sentence(s), semantic (positive) negatives |
| Director's formula | Seedance, Runway, Kling (video) | subject→action→env→camera→light→style; first ~20–30 words weighted |

**Universal:** subject is ALWAYS the first emitted element. Quality boosters are a *light optional* slot, not a default superlative dump (`agency.md` §3: unreliable).

---

## 2. Category schema (the pick-set)
~22 categories. Each option carries `{ value, tags, sourceId, weight? }`. Tags ∈
`universal | MJ | Flux | Gemini | SDXL | video`. `weight` (curated) nudges randomization.

1. **subject** — universal. The hero entity. (DB: large, user-extensible list.)
2. **action / pose** — universal. What the subject does.
3. **setting / environment** — universal. Where.
4. **time / era** — universal. 1920s, far-future, prehistoric…
5. **art_movement** — universal (strong for MJ/Flux/Gemini). art nouveau, brutalism, vaporwave…
6. **medium** — universal. oil painting, 35mm photo, clay, pixel art, 3D render…
7. **artist_reference** — *up-weighted*. "in the style of X" (Moebius, Klimt, Ghibli…). Highest-leverage lever (`agency.md` §3). `weight: high`.
8. **lighting** — universal. golden hour, volumetric, neon rim, overcast diffused. (A concrete lighting term > 10 boosters.)
9. **camera_lens** — MJ/SDXL/Flux. 50mm, tilt-shift, macro, wide-angle, 85mm f/1.4.
10. **composition** — universal. rule-of-thirds, dutch angle, close-up, birds-eye.
11. **color_palette** — universal. muted earth, high-contrast mono, pastel…
12. **mood** — universal. serene, ominous, whimsical, melancholic.
13. **weather** — universal. fog, snowfall, heat haze.
14. **texture_detail** — universal. weathered, polished chrome, cracked, intricate.
15. **quality_booster** — *down-weighted optional*. A single concrete term only (e.g. "intricate detail", "sharp focus"). Avoid superlative piles. `weight: low`, default OFF.
16. **aspect_ratio** — param. 1:1 / 16:9 / 9:16 / 4:3 / 21:9. (Real conditioning input, `backend.md` §8 — not a crop.)
17. **negative_prompt** — SDXL/Flux/MJ(excl-via-`--no`)/SDXL. Specific concrete exclusions (`motion blur, extra fingers, watermark`) — NOT generic `bad quality`.
18. **negative_space / minimalism** — universal. lots of empty sky, centered subject.
19. **prompt_weighting** — MJ(v6)/SDXL only. `(token:1.2)` / `::` separators. Advanced toggle, default OFF.
20. **mj_params** — MJ only. `--s` (0–1000, default 100), `--c` (0–100), `--q`, `--style raw`, `--v`.
21. **flux_params** — Flux only. guidance/Cfg (2–7, default ~3.5), steps, seed. (Weighting via word order, not parentheses — `flux.md`.)
22. **gemini_params** — Gemini only. aspect_ratio, 1k/2k/4k, semantic negative phrasing.

**Video branch (toggle):**
23. **motion / dynamics** — video. slow drift, sudden burst, flowing.
24. **camera_movement** — video. dolly in, orbit, handheld, push-in.
25. **video_duration / fps / motion_strength** — video params (Seedance `duration` 4–15s; Runway/Kling axes).

Target: **200–400 leaf options** total across categories (subject + setting + artist_reference are the largest).

---

## 3. Per-engine assembly grammar
Given a pick-set `P = {subject, action, setting, art_movement, medium, artist_ref, lighting, camera, composition, color, mood, weather, texture, qr, ar, negative, ...}`:

### Midjourney (weighted-keyword + suffix)
```
{subject}, {action}, {setting}, {medium}, {art_movement}, {artist_ref:"in the style of X"},
{lighting}, {camera}, {composition}, {color}, {mood} --ar {ar} --s {stylize} --c {chaos}
--no {negative (comma list)}
```
Rules: short (6–10 words ideal), subject-first, params at end, `--no` not text-negation (`midjourney.md` §3).

### Flux (natural-language, positional emphasis)
```
{subject} ({action}). {setting}. {lighting}. {medium}, {art_movement}{artist_ref}, {camera}, {composition}.
```
Emphasis via **word order + plain-language focus** ("with particular focus on…"), NOT parentheses. Guidance scale set separately (`flux.md`).

### Gemini (LLM prose + semantic negative)
```
"A {mood} scene of {subject} {action} in {setting}. {lighting}, {medium} style{artist_ref},
{color} palette, {composition}. Avoid {negative as positive phrasing}."
```
Narrative prose; describe what you WANT; semantic (positive) exclusions (`gemini.md`).

### SDXL (weighted-keyword + negatives field)
```
{subject}, {action}, {setting}, {medium}, {art_movement}, {artist_ref}, (lighting:1.1),
{camera}, {composition}, {color}, {mood}  [NEGATIVE: {negative}]
```

### Video (Seedance/Runway/Kling) — director's formula
```
[Camera {camera_movement}] shot of {subject} {action} in {setting}. {lighting}, {style},
{motion: dynamics}.  (first ~20-30 words carry most weight; camera in text, not numeric)
```
Params: Seedance `duration`/`ratio`/`seed`; Runway camera axes; Kling presets.

---

## 4. Randomization (curated weighting)
- Each category sampled once per "Randomize" (pick 4–5 categories → user may also free-pick).
- `weight` biases per-option draw: artist_reference options up, quality_booster options down.
- Seed is randomized per generation for diversity; user can lock seed for reproducibility (`backend.md` §6).
- Video branch only assembles when the video toggle is on.

---

## 5. Build order (Phase 5 → 6)
1. `src/lib/promptgen/criteria.ts` — typed `Category[]` + `Option[]` from this schema (Phase 5, the "small db").
2. `src/lib/promptgen/assemble.ts` — pure functions: `pickSet → { mj, flux, gemini, sdxl, video }` strings.
3. `src/app/prompt-generator/page.tsx` — standalone route (tool no.2), `WrappedFlow`-style: pick categories → Randomize → per-engine outputs + copy buttons (Phase 6, spec only here).

---

## Open before DB build
- Confirm scope (image-first vs full video) and weighting (curated vs uniform).
- Confirm engine set to *emit* (default: MJ + Flux + Gemini + SDXL; video toggle optional).
- Per-category option counts to hit 200–400 total — propose subject ~60, setting ~40, artist_ref ~40, others 8–20.
