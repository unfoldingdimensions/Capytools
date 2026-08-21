# FLUX Prompting Research — Black Forest Labs FLUX.1 [dev / pro / schnell]

**Context:** Research for Capytools No.2 — a random image/video prompt generator. FLUX is a named core target and the emitter should produce FLUX-style plain, natural-language prompts. All claims below are grounded in primary sources (Black Forest Labs blog + official model cards, `docs.bfl.ml`, fal.ai/BFL API docs, HuggingFace Diffusers docs, Replicate fine-tune docs), fetched 2026-08-21. Sources are cited inline as `[n]` and listed in the `## Sources` block; items without a directly fetched URL are marked `[unverified]`.

---

## Executive summary

- **FLUX is a 12B-parameter family of "rectified flow" text-to-image transformers** from Black Forest Labs (BFL), the original Stable Diffusion authors, announced Aug 2024 [1]. Three public FLUX.1 variants differ mainly in *quality × speed × license*, not in *how they read prompts* [1][7].
- **FLUX reads prompts with a dual text encoder — T5-XXL (v1.1) + CLIP-ViT/L — not the CLIP-only encoder of SD 1.5/SDXL.** T5 gives FLUX genuinely long-context natural-language understanding: it parses full descriptive sentences, not keyword tags [2][3][4]. This is the single most important fact for our prompt generator: **write plain, descriptive English sentences, not comma-dense tag lists.**
- **The official docs explicitly say "prompt following is heavily influenced by the prompting-style,"** and "(the model) may fail to generate output that matches the prompts" [2][3][4]. Prompt form is a first-class lever.
- **Parameters that matter for a generator:** `prompt`, `width`/`height` (or `aspect_ratio`), `guidance_scale`, `num_inference_steps`, `seed`, and (dev only) `max_sequence_length`. Guidance-distilled variants (dev, schnell) behave differently from a standard CFG model: **schnell wants no guidance (0.0) and few steps (1–4); dev wants ~3.5 and 28–50 steps** [2][4][7].
- **For our use case (a random prompt emitter), the right move is: emit detailed natural-language prompts (optionally with an in-quotes text element), pick a sane default (guidance ~3.5 for dev, ~3.5 default via fal.ai), a seed for reproducibility, and an aspect presets enum.**

---

## 1. Model variants and how they differ *for prompting*

All three FLUX.1 models share: 12B params, hybrid multimodal/parallel diffusion-transformer architecture, rectified-flow objective (flow matching), dual T5-XXL + CLIP text encoders, and the same basic prompting behavior [1][2][3][4]. Differences that affect generation/prompting:

| Variant | License | Distillation | Recommended steps | Guidance | Prompting notes |
|---|---|---|---|---|---|
| **FLUX.1 [pro]** | API-only (BFL/fal/Replicate) [1][2] | none (base/teacher) | ~25 (server-managed) | server-side | Highest quality + prompt adherence; commercial-ready [1] |
| **FLUX.1 [dev]** | Non-commercial | **guidance-distilled** from pro [1][3] | 28–50 | ~3.5 nominal | Open weights; near-pro prompt adherence [2][3][7] |
| **FLUX.1 [schnell]** | Apache-2.0 | guidance **+ step** distilled (LADD) [1][4] | **1–4** | **0.0 / no CFG** [4] | Fastest; slightly softer detail, less nuance-sensitive prompting [1][4] |

Key prompting-relevant takeaways:

- **Same text encoder family across all three**, so the *prompt-writing rules are identical* — differences are in detail/variance, not in how text is parsed [1][3][4] `[unverified for "identical" phrasing — inferred]`.
- **Schnell is step-distilled to 1–4 steps** [1][4]; its official diffusers snippet literally uses `guidance_scale=0.0, num_inference_steps=4` [4]. Do **not** feed schnell high guidance or many steps — quality doesn't improve and artifacts appear.
- **Dev is guidance-distilled** [1][3]: guidance is a *conditioning input* baked in at training, rather than run as classic classifier-free guidance at inference. Official dev code uses `guidance_scale=3.5, num_inference_steps=50, max_sequence_length=512` [2].
- Both dev/schnell support a wide range of **aspect ratios and resolutions from 0.1 to 2.0 MP** [1].

---

## 2. Prompt structure & best practices

### Official guidance (docs.bfl.ml — applies to the FLUX family) [5][6]

> "Natural language helps the model understand what should appear in the image, how the elements relate to each other, and what visual direction to follow." [6]

- **Use natural language.** Write a clear description of the image, not a tag list. The clarity of the description drives how focused/consistent the output is [6].
- **Suggested template (a starting structure, not a strict formula):**
  `[SUBJECT], [LOCATION], [STYLE], [CAMERA SETTINGS], [LIGHTING], [COLORS], [EFFECT], [ADDITIONAL ELEMENTS]` [6]
  (BFL's own render of this exact formula appears verbatim in the docs — it's a good slot skeleton for a random generator.)
- **For text inside images, put the exact wording in quotation marks.** e.g. `..."The Importance Of Being Non-Aligned".` — quotes separate written content from scene description and give FLUX a stronger text-rendering signal [6].
- **Iterate rather than gold-plate the first prompt:** start simple → check what FLUX got right/wrong → adjust one detail (subject, framing, lighting, style) at a time [6].
- **Multilingual prompts work** (examples in Thai, Spanish given officially) [6] — relevant if the page supports non-English input.
- Image-input (Kontext/FLUX.2, multi-image) exists but is a separate capability beyond FLUX.1 text-to-image [6].

### Model-card limitations (all variants) [2][3][4]

- "The model may fail to generate output that matches the prompts."
- "**Prompt following is heavily influenced by the prompting-style.**"

### Verbatim official example prompts (`[verbatim from sources]`)

From the BFL Prompting Basics page [6]:
- `"At high noon on a blustery day, capture the surreal presence of a sentient tree, seemingly rooted underwater just off a tumultuous ocean shore. Employ a sweeping panning shot, bathing the scene in cinematic natural light and a stark palette of winter whites and greys, as if glimpsing a spectral sentinel through a watery veil."`
- `"A professional cinematic long shot with the camera positioned half underwater and half above the surface in the open ocean. Beneath the water, a large northern whale is diving smoothly, its tail rising above the surface while the rest of its body descends into the deep blue. The ocean is calm and clear, with bubbles drifting upward from the whale and soft sun rays piercing through the water."`
- `"A wide, sweeping 35mm Kodak film aerial photograph, underexposed and richly grainy, capturing the iconic Victoria Harbour of Hong Kong at dusk. The sky is a blend of soft, desaturated oranges, purples, and deep twilight blues. The water of the harbour reflects the fading light and the emerging city glow."`
- `"A penguin wearing a tiny tuxedo to a penguin wedding"` (short-form works too)
- Text-in-image: `"…Below the scene, bold serif typography reads \"The Importance Of Being Non-Aligned\". Warm, soft studio lighting with subtle shadows."`
- Fashion tip: `"A tall sharp-featured man in an oversized charcoal wool coat, standing on a wet cobblestone street at night, fashion editorial, moody street lighting… watercolor illustration style"`

From model-card diffusers snippets:
- Dev `prompt = "Astronaut in a jungle, cold color palette, muted colors, detailed, 8k"` [2]
- `prompt = "A cat holding a sign that says hello world"` (both dev & schnell snippets) [2][4]

**Design note for the generator:** the strongest FLUX-style prompts blend *subject + setting + camera/lens + lighting + palette + style + a quoted text element when text is needed*. T5 handles long rich sentences (dev supports `max_sequence_length=512`) [2][7], so verbosity is welcome — but schnell has a shorter effective context (`256` in its snippet) and is less nuance-sensitive, so over-long prompts pay off less there [4].

---

## 3. Parameters / controls

### Runtime knobs (Diffusers / FLUX model cards) [2][4]

| Param | dev | schnell | Notes |
|---|---|---|---|
| `guidance_scale` | `3.5` | `0.0` (no CFG) | Dev is guidance-distilled → 3.5 nominal; schnell must stay ~0/1 [2][4] |
| `num_inference_steps` | `50` (28–50 typical) | `4` (1–4) | Deviation: schnell quality *degrades* past ~4 [4] `[step-cap claim also seen in 3rd-party; mark [unverified]]` |
| `max_sequence_length` | `512` | `256` | Token budget for the prompt [2][4] |
| `seed` | via `torch.Generator(…).manual_seed(0)` | same | Same seed + prompt + version ⇒ same image [2][4] |

### API parameters (fal.ai official endpoint for FLUX.1 [dev]) [7]

- `prompt` (required) — the text prompt.
- `image_size` — enum presets `square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9`, **or** custom `{ "width": 1280, "height": 720 }`.
- `num_inference_steps` — default `28`.
- `guidance_scale` — default `3.5` ("how close you want the model to stick to your prompt").
- `seed` — "The same seed and the same prompt given to the same version of the model will output the same image every time."
- `num_images` — default `1`.
- `enable_safety_checker` (bool), `sync_mode` (bool) — infra details.

### BFL API (official, for FLUX.1 [pro] family) [8]

- Async submit → `polling_url` → download within a **10-minute expiration window**; use `api.bfl.ai` (global LB) or regional `api.eu.bfl.ai` / `api.us.bfl.ai` [8].
- BFL's FLUX.1 ([dev]/[pro] via API) accepts `prompt`, `width`/`height` (256–1440, multiple of 32), `steps` (1–50), `guidance` (1.5–5), `seed`, `output_format`, `safety_tolerance`, `prompt_upsampling` (AI prompt-enhancement off/on). *(Param names as surfaced in the BFL API ecosystem; the integration guide focuses on polling/retry/error handling.)* [8] `[param field names partly [unverified]]`
- Error classes: moderation reject, 401 auth, 422 validation, 429 rate-limit — implement retry with backoff on transient 5xx [8].

**Generator guidance:** emit `prompt`, a random `seed`, an `image_size`/`aspect_ratio` preset, and a model-appropriate `guidance_scale` + `num_inference_steps`; for dev via fal default to `guidance_scale=3.5`, `steps=28`, and pick a seed per image so re-rolls are cheap.

---

## 4. LoRA / fine-tuning / style embeddings

- **FLUX.1 [dev] is the fine-tunable open variant** (non-commercial); LoRA is the standard lightweight adaptation technique, trained on a small image set [9][10]. `[10][11]` are community/HF demonstration spaces, not BFL-primary.
- **Official Replicate path** (Replicate is an official BFL FLUX API partner) [2]: fine-tune FLUX.1 [dev] via Ostris's AI Toolkit (`ostris/flux-dev-lora-trainer`); upload a zip of images (± optional per-image caption `.txt`), set a **`trigger_word`** (a token associated with the concept, e.g. `CYBRPNK` or a made-up word `TOK`), then activate it in the prompt at inference [9].
- **Trigger-word prompts read like natural language**, e.g. `"bennycheung as Gordon Freeman in Half Life, wearing the hev suit, ultra realistic, intricate, elegant, highly detailed, digital painting, artstation, smooth, sharp focus, illustration, in the style of greg rutkowski"` [10].
- **Inference knobs for LoRA models** include `lora_scale` / `extra_lora_scale` (adapter strength, e.g. 0.8–0.95), `prompt_strength`, `guidance_scale` (3.5), `num_inference_steps`, `num_outputs`, `aspect_ratio`, `output_format`/`output_quality` [10][11].
- **Style/character concept LoRAs** are common and cheap: ~$2 to train a rank-16 LoRA for ~4k steps; multiple LoRAs can be combined at inference [9][11][12].
- **Embeddings (e.g. IP-Adapter / Redux)** are a related "style transfer" mechanism; the diffusers docs document `load_ip_adapter("XLabs-AI/flux-ip-adapter", …)` and Redux-style prior pipelines [12].
- **Implication for the generator:** if the page ever targets a fine-tuned/LoRA model, it should (a) know the model's `trigger_word`(s) and weave them into the natural-language prompt, and (b) expose `lora_scale`. For the stock models, none of this is needed [9][10].

---

## 5. Encoder notes — T5 vs CLIP and why prompt style matters

- **FLUX uses two parallel text encoders: T5-XXL (T5 v1.1) + CLIP-ViT/L (openai/clip-vit-large-patch14).** The transformer consumes the concatenated embeddings [2][3][4][12] `[encoder identity corroborated across model-card, SD.Next docs, railwail, andreaskuhr; the exact concatenation detail is [unverified]]`.
- **Why T5 changes prompting:**
  - T5 is a sequence-to-sequence NLP model; it runs whole prompt *segments* through language understanding rather than just matching CLIP keyword tokens. Result: FLUX literally *interprets* natural-language descriptions — "a very long text is summarised and a very short text is supplemented with details" `[interpretive claim attributed broadly; [unverified] as to exact wording]` [10].
  - CLIP still contributes its short-phrase/image-alignment signal; the pair gives FLUX both long-context meaning (T5) and visual-keyword grounding (CLIP) [2][12].
- **Prompting consequence:** because prompt understanding is linguistic rather than tag-based, the exact **wording, order and structure of a sentence matter** — which is why the official docs stress prompting-style and offer the `[SUBJECT], [LOCATION], [STYLE], …` template [5][6], and why BFL lists "prompt following is heavily influenced by the prompting-style" as an explicit limitation [2][3][4].
- **Token budget reality:** dev attends up to 512 tokens, schnell 256 `[source: official diffusers snippets]` [2][4] — so long detailed prompts are supported on dev but not equally rewarded on schnell.

---

## 6. Known gotchas

- **Text rendering:** FLUX is comparatively strong at in-image text (esp. short strings), but rendering arbitrary/long text is still unreliable. **Fix: put exact wording in double quotes** in the prompt [6][10] `[the "strong at text" claim is community-reported; [unverified] against primary — BFL only documents the quote technique and counts Typography as a benchmark they beat [1]]`.
- **Hands/anatomy:** FLUX is far better at hands/faces than SD1.5/SDXL (community- and benchmark-reported), but breakdowns still occur — short/inconsistent asks and low-step schnell output make them likelier [10] `[hands claim [unverified] vs primary; BFL benchmarks list Prompt Following/Detail, not hands specifically [1]]`.
- **Prompt adherence is style-dependent:** BFL states outright that adherence is heavily influenced by prompting style and that the model can fail to match prompts [2][3][4] — so a generator's *style consistency* is a real quality lever, not cosmetics.
- **Guidance-distillation gotchas:** don't apply high CFG to distilled models. Schnell should run at ~no guidance and 1–4 steps; pushing guidance/steps up causes artifacts, not improvements [4] `[artifact risk [unverified] / inferred from guidance_scale=0.0 in official snippet]`.
- **Negative prompts:** guidance-distilled variants (dev/schnell) de-emphasize classifier-free-guidance-negative prompting; rely on positive, descriptive prompts instead of "what to avoid" lists [2][4] `[negative-prompt behavior [unverified]; inferred from guidance-distillation architecture]`.
- **Seed reproducibility caveat:** same seed + same prompt + **same model version** ⇒ same image; version changes or provider differences break it [7].
- **API operational gotchas:** async polling with a 10-min image-expiration window; retry/backoff on 5xx; don't treat 4xx as retryable — they're validation/moderation/auth errors [8].
- **Licensing gotchas** (relevant if the feature ships in a product): dev/schnell outputs *trained and run locally* are non-commercial/Apache respectively — dev is **non-commercial** unless licensed from BFL; using a hosted API (BFL/fal/Replicate) is the commercial path [1][2][3][9].

---

## Backend notes (for the Capytools integration)

- **Which endpoint:** For a web app, use a hosted API — BFL official (`api.bfl.ai`, FLUX.1 [pro]/[dev]), Replicate (dev/schnell + LoRA models), or fal.ai (dev endpoint with clear JSON params). Model cards officially list bfl.ml, Replicate, fal.ai, mystic.ai [2].
- **Async pattern (BFL):** POST generate → get `polling_url` → poll until complete → download before the 10-min expiry [8].
- **Recommended defaults for the generator's "Flux" mode:** `prompt` (detailed NL, optional quoted text element), `seed` (random per image), `image_size`/`aspect_ratio` preset, `guidance_scale = 3.5` (dev/fal default), `num_inference_steps = 28` (dev/fal default); for schnell set `steps=4`, `guidance≈0`.
- **Prompt surface to emit:** sentence-structured descriptions following the official template slots (subject, location, style, camera, lighting, colors, effect, extra elements) [6]; wrap literal text in quotes [6]; optionally append quality/style modifiers for high-detail runs.

---

## Sources

- [1] https://blackforestlabs.ai/announcing-black-forest-labs/ — Announcing Black Forest Labs (FLUX.1 suite announcement; variants, architecture, benchmarks) *(fetched)*
- [2] https://huggingface.co/black-forest-labs/FLUX.1-dev — FLUX.1 [dev] model card (key features, usage/diffusers snippet, limitations, license) *(fetched)*
- [3] https://github.com/black-forest-labs/flux/blob/main/model_cards/FLUX.1-dev.md — FLUX.1 [dev] model card (GitHub) *(fetched)*
- [4] https://huggingface.co/black-forest-labs/FLUX.1-schnell — FLUX.1 [schnell] model card (LADD distillation, steps/guidance snippet, limitations) *(fetched)*
- [5] https://docs.bfl.ml/guides/prompting_summary — FLUX Prompting Guide (official) *(fetched)*
- [6] https://docs.bfl.ml/guides/prompting_unified_basics — Prompting Basics (natural language, formula template, text-in-image quotes, verbatim examples) *(fetched)*
- [7] https://fal.ai/models/fal-ai/flux/dev/api — FLUX.1 [dev] Text-to-Image API docs (image_size enum, steps 28, guidance 3.5, seed) *(fetched)*
- [8] https://docs.bfl.ml/api_integration/integration_guidelines — BFL API Integration Guide (endpoints, polling, expiration, error handling) *(fetched)*
- [9] https://replicate.com/blog/fine-tune-flux — Replicate: "Fine-tune FLUX.1 with your own images" (LoRA trainer, trigger words, licensing, pricing) *(search-verified; full body not extracted — partly [unverified])*
- [10] https://bennycheung.github.io/personal-fine-tuning-with-flux — Personal Embedding/Fine-tuning with FLUX on Replicate (trigger-word natural-language prompts, lora_scale/guidance params, encoder interpretation notes) *(search-verified; [unverified] body)*
- [11] https://huggingface.co/spaces/multimodalart/flux-lora-the-explorer — FLUX LoRA gallery/demo space (LoRA exploration) *(search-verified; [unverified] body)*
- [12] https://huggingface.co/docs/diffusers/main/en/api/pipelines/flux — Diffusers FluxPipeline docs (T5 tokenizer_2, prompt_2, parameters, IP-Adapter, LoRA unloading) *(fetched)*

*Compiled 2026-08-21 for Capytools prompt-generator research. Items marked `[unverified]` were surfaced in search snippets/other guides but not confirmed by direct extraction of the primary page at authoring time.*
