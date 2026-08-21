# Practitioner / Agency Prompt-Engineering Techniques — Image Generation

*Research input for Capytools No.2 (random image/video prompt generator).*
*Focus: reusable prompt skeletons, what top practitioners actually use, "quality booster" phrasing and its real effect, and how studios/agencies organize criteria.*

---

## Executive Summary

Where the *taxonomy* layer of the generator categorizes styles/subjects/mediums, this practitioner layer supplies the **structural skeletons** those categories plug into. Across Midjourney's official docs, Runway Academy, Leonardo.Ai, NightCafe Studio, community hubs (PromptHero, Lexica) and practitioner write-ups (Liora, 10b.ai, PromptChief, AI Tool Discovery, Vanikya Insights), the field has converged on a small set of repeatable prompt formulas. Key takeaways for the generator:

- **Every source leads with the SUBJECT.** Subject-first ordering is near-universal because models weight words near the start of a prompt more heavily [1][3][4][7][8]. A random generator should always emit subject first.
- **The canonical skeleton is a slot order, not a recipe.** Subject → details → style/medium → lighting → camera/composition → mood/color → parameters [1][3][4][15]. The generator can model these as pick-band slots.
- **"Quality booster" phrasing is unreliable and often counterproductive.** Vagstrings like `8k, award-winning, hyperrealistic, trending on ArtStation` do *not* reliably raise quality; piled up with no subject they produce muddy, incoherent images [17][16]. The most-cited single lever is an **artist/studio/photographer style reference** ("in the style of X"), which practitioners report exceeds dozens of technical adjectives [14].
- **Named studios publish their own official structures** — Runway (motion-first), Leonardo.Ai (step-wise list prompt), NightCafe (moment-not-list, 3–7 word guidance), Midjourney (short-and-simple) — making them the highest-trust sources for the generator's framing.
- **Agencies/marketing teams combine criteria by freezing fixed "brand" slots** (palette, style language, lighting) and varying only the creative slots — a "template with locked brand constants" pattern [15].

---

## 1. Reusable Prompt Skeletons / Frameworks

### A. The canonical subject-first skeleton (community + practitioner consensus)

Most-cited composite across [1][3][4][14][15]:

```
[Subject] → [Key visual details / action] → [Style / medium] → [Lighting] → [Camera / composition] → [Mood / color palette] → [Parameters (--ar --v --s --c / weights)]
```

- Midjourney's own docs frame it as Subject → details → **lighting** (soft/ambient/overcast/neon/studio) → **color** (vibrant/muted/monochrome/pastel) → **mood** (playful/calm/gloomy/energetic) → **composition** (portrait/headshot/closeup/bird's-eye) [1].
- PromptChief formalizes six slots: **Subject, Description/details, Style & medium, Composition & camera, Lighting & mood, Parameters** [4].
- AI Tool Discovery gives the community Midjourney formula: `[Subject description], [art style or medium], [lighting type], [mood], [camera/perspective], [color palette] --ar … --v 6.1` [14].
- 10b.ai's tested "4-part formula": **Subject → Key Visual Details → Style/Mood → [technical parameters]**, with an explicit habit of changing one slot at a time [3].

**Generator implication:** pick one phrase per slot from curated pick-bands; compose left→right; append model parameters.

### B. Purpose-first / "job" framing (agency-flavored)

Vanikya's 6-part "anatomy" leads with intent, not subject, for production assets [15]:

```
[Job/Purpose] → [Subject] → [Medium & Style] → [Lighting] → [Framing/Composition] → [Mood + Color Palette]
```

Reasoning: "Hero image for a fintech landing page" outperforms "a cool abstract image" because purpose forces clarity of context/format/audience — purpose-first consistently beats aesthetic-first for usable assets [15]. Good for a generator "brief" mode.

### C. Liora's five reusable frameworks (practitioner-curated)

Liora catalogs five distinct prompt skeletons worth encoding as generator modes [2]:

1. **Subject + Style + Context** — base structure all-in-one.
2. **Artistic Reference** — "as if painted/filmed by [artist/movement/director/photographer]" (the most-cited single lever).
3. **Emotion + Subject + Palette** — lead with a feeling (melancholy, joy, tension) to shape narrative/evocative work.
4. **Narrative Scene** — a full sentence staging a moment ("an astronomer observing a starry sky from the top of an ancient tower…").
5. **Targeted Technical Parameters** — freeze the words, vary only parameters (`--v 6 --style raw --stylize 500 --chaos 20`) for controlled experiments.

### D. Motion-first / video skeleton (Runway — official)

For video, both the object and its *change over time* matter [5][6]:

```
Text-to-Video:   [Camera] shot of [subject] [action] in [environment]. [Supporting descriptions]
Image-to-Video:  The camera [motion] as the subject [action]. [Additional descriptions]
```

Required minimum = **visual descriptions** + **motion descriptions**; optional temporal beats: natural language (`X occurs, then Y. Finally Z.`) or timestamps (`[00:01] … [00:03] …`) [5]. Ideal skeleton for the video half of the generator.

---

## 2. What Structures Top Practitioners Actually Use — and Why

- **Subject first, weighted placement.** Models weight the start of the prompt more heavily. Burying the subject under style adjectives makes the image "all mood and no focus" [4][7][8]. Leonardo.Ai, NightCafe, and PromptChief all explicitly document this [4][7][8][9].
- **Short-and-simple is official advice — then iterate.** Midjourney's docs say short, simple prompts generate the best images and warn against long lists [1]. Runway echoes this ("power of simplicity", over-specification paradoxically forces unnatural results) [5][6]. Practitioners pair this with start-short-then-expand: write 6–10 words, generate 4, pick the best composition, then add detail toward that direction [17].
- **Style reference > adjectives.** "In the style of Annie Leibovitz" (or Van Gogh, Studio Ghibli, a director) "does more than 50 technical words" — the single most-upvoted improvement cited [14][7]. Two mechanisms: it anchors a concrete aesthetic target, and `--sref`/reference images outperform descriptive adjectives [14][17].
- **Parameters are a separate layer, at the end.** Keeping `--ar/--v/--s/--c` at the end isolates them from the language part; burying them mid-prompt causes odd emphasis (e.g. treating `--ar 16:9` as part of the aesthetic) [3][4]. Consistency of aspect ratio + version stabilizes results more than fancy long-tail wording [3].
- **Iteration is the process, not a fallback.** Runway frames prompting as "a conversation with the model" — request, review, refine [5]. 10b.ai reports win rate on "usable first try" rising from ~1-in-6 to ~1-in-2 after adopting the structured formula [3].
- **Change one slot at a time** to see which phrase moved the needle — a controlled-experiment discipline [3].

---

## 3. "Quality Booster" Phrasing and Its Real Effect

**The honest finding:** quality-booster strings are the most-sold but least-reliable part of prompting.

- Common boosters: `award-winning, high resolution, trending on [site], in the style of [artist], 8k, hyperrealistic, sharp focus, cinematic, dramatic` [16][17].
- **Critique:** a prompt of twelve quality modifiers with no subject just weights twelve competing signals and produces muddy, inconsistent lighting ["like telling a chef 'make it amazing, five-star, michelin' without saying what dish"] [17]. Camera-jargon strings (`85mm f/1.4, Canon EOS R5`) are parsed by diffusion models as *vibes associated with professional imagery*, not as aperture/focal-length instructions — occasionally useful, not reliable [17].
- **What actually raises quality (evidence-backed):**
  - A **specific lighting term** (golden hour, soft box, rim light, overcast diffused) — lighting "does more to sell a look than any other single element" [4][15].
  - An **artist/studio/style reference** — the highest-leverage move [14][17].
  - **Reference images / `--sref`** for a concrete aesthetic target [17].
  - **Negative prompting** with *specific, concrete* exclusions (`motion blur, extra fingers, watermark`) rather than generic `bad quality` [15]. Note: this is stable-diffusion-centric; Runway explicitly advises *positive phrasing* over negatives for video [5][6].
  - **Deliberate parameters**: `--s` (stylize, tight vs. artistic), `--c` (chaos, variety) tuned per goal [4][17].

**Generator implication:** treat "quality boosters" as a *light, optional, specific* slot (a single lighting term + optional style reference), not a default pile of superlatives; consider a quality-boost toggle with curated, concrete terms.

---

## 4. How Named Studios / Agencies Organize & Combine Criteria

### Runway (creative AI studio) — official [5][6]
- Formal structure guide on Runway Academy: `[Camera] shot of [subject] [action] in [environment] [supporting]`.
- Core doctrine: **start simple, add detail strategically; positive phrasing; describe motion not just the scene; temporal beats; simple subject references when a reference image already defines identity**.
- Video generators should model these as the default.

### Leonardo.Ai (creative AI studio) — official [7][8]
- Official wiki gives a step-wise list prompt (style → subject/appearance/action → scene/background → composition/lighting/framing as comma-separated terms) [8].
- Help center adds: subject-first, lead-weighted placement, use commas to separate concepts, style-through-reference ("Studio Ghibli-style"), and "magical words" like *Artstation* [7].

### NightCafe Studio (AI art studio) — official [9][10]
- Prompt fundamentals: prompts should be **at least 3–7 words** for specificity; modifiers are weighted toward the start; subject must be a noun; use negative/weighting (`heart:-1`) [9].
- Storytelling technique: **"stop describing things, start describing moments"** — a prompt should be a moment where something changes, not a list of objects ("a child reading as the room transforms into a fantasy world" beats "a fantasy world, dragons, castle") [10].

### Midjourney (the tool itself) — official [1]
- Short-and-simple; specific synonyms over vague words; specific numbers/collective nouns over plurals; describe what you *want* not what you don't; parameters at the end.

### PromptHero & Lexica (community hubs) [11][12][13]
- PromptHero: the dominant crowd-sourced prompt library; curated topic pages (e.g. "Stable Diffusion Cinematic Prompts"), an Academy teaching diffusion prompting, and per-model prompt collections — the de-facto source for *which vocab is trending* [11][12].
- Lexica: visual-search index over millions of generated images with their prompts — used by practitioners as an **example-mining** source ("starting from what works") and for reverse-searching prompts by image [13][16]. Useful sweep data for the generator's trending-category feed.

### Agency / marketing-team pattern (how criteria get combined at scale) [14][15]
- **Template-with-locked-constants**: brand attributes (color palette, style language, lighting) become *fixed elements in every prompt*; only the creative slots vary [15]. This is the production way agencies combine criteria: constants + variable slots.
- **Per-platform rules**: agencies note each model prefers a different prompt style — Midjourney V7 (short high-signal phrase sequences), DALL-E/GPT-4o (natural-language paragraphs), Stable Diffusion (weighted keyword prompts `(photorealistic:1.3)`), video models (motion-first) [15]. A generator that can emit per-model formats is a real differentiator.
- **Negative-constraint discipline** and **role/few-shot/system-style structure** carry over from text prompting, but image-specific "role prompting" = artist reference [14].

---

## Most-Cited Studios / Named Sources (2–3 highlighted)

The task asked for named studios with their *actual published material*. The three genuinely named, citable studios surfaced during research, with direct citations, are:

1. **Runway** — official Runway Academy *Prompting Guide* [5] and *Gen-4 Video Prompting Guide* [6].
2. **Leonardo.Ai** — official *Formatting a basic prompt* wiki [8] and *Prompting Tips & Tricks* [7].
3. **NightCafe Studio** — official *What are prompts and how to use them?* [9] and storytelling prompt guide [10].

Supporting named organizations with published material: **Midjourney** (official Prompt Basics [1]), **PromptHero** (Academy + curated library [11][12]), **Lexica** ([13]), plus practitioner-authored field guides (Liora [2], 10b.ai [3], PromptChief [4], AI Tool Discovery [14], Vanikya Insights [15], Packt [16]).

---

## Sources

Inline [n] citations map to `agency.sources.json` (same ids):

[1] https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics — Prompt Basics, Midjourney (official)
[2] https://liora.io/en/all-about-midjourney-prompt-engineering — Prompt engineering on Midjourney, Liora
[3] https://10b.ai/blog/midjourney-prompt-engineering — Midjourney Prompt Engineering Guide, 10b.ai
[4] https://promptchief.tech/artikel/prompt-engineering-midjourney.html — Prompt Engineering for Midjourney, PromptChief
[5] https://academy.runwayml.com/guides/prompting-guide — Prompting Guide, Runway Academy
[6] https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide — Gen-4 Video Prompting Guide, Runway
[7] https://intercom.help/leonardo-ai/en/articles/8067671-prompting-tips-tricks — Prompting Tips & Tricks, Leonardo.Ai
[8] https://leonardo.ai/wiki/formatting-a-basic-prompt/ — Formatting a basic prompt, Leonardo.Ai
[9] https://help.nightcafe.studio/portal/en/kb/articles/what-are-prompts — What are prompts, NightCafe Studio
[10] https://nightcafe.studio/blogs/blog/turn-stories-into-ai-art-prompt-guide — Story prompts guide, NightCafe Studio
[11] https://prompthero.com/stable-diffusion-cinematic-prompts — Cinematic prompts library, PromptHero
[12] https://prompthero.teachable.com/ — Mastering Prompt Engineering, PromptHero Academy
[13] https://lablab.ai/ai-tutorials/stable-diffusion-lexica — How to use Lexica, LabLab
[14] https://www.aitooldiscovery.com/guides/prompt-engineering — Prompt Engineering Guide 2026, AI Tool Discovery
[15] https://insights.vanikya.ai/prompt-engineering-ai-image-generation-2026 — Prompt Engineering for AI Image Gen, Vanikya Insights
[16] https://www.packtpub.com/en-us/newsletters/how-to-tutorials/text-to-image-prompt-engineering-tips-stable-diffusion — Text-to-Image Prompt Engineering Tips, Packt
[17] https://www.bestprompt.art/ai-art-prompts-2026 — AI Art Prompts 2026, bestprompt.art

*All URLs fetched and content verified during research. None marked [unverified].*
