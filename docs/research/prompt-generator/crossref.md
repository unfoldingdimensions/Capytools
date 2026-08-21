# Cross-Reference Image Models for the Random Prompt Generator

**Scope:** SDXL, DALL·E 3, Ideogram — three engines that reward *different* prompting styles.
**Purpose:** Enrich Capytools No.2 (random prompt generator) taxonomy: which engine gets which prompt grammar, and how each engine's text encoder shapes the prompt you should emit.
**Method:** Primary sources fetched live (Stability AI / Hugging Face model card, OpenAI DALL·E 3 paper + system card + announcement, Ideogram official docs + 4.0 blog + open-source prompting guide). No memory-based facts. Numeric defaults marked `[secondary]` where they come from aggregator guides rather than the primary source.

---

## Executive Summary

The three engines sit on opposite ends of the *prompt-granularity* spectrum:

- **SDXL** is a **weighted/phrase-keyword engine.** It uses **two CLIP text encoders** (OpenCLIP-ViT/G + CLIP-ViT/L) [1][3]. It is sensitive to keyword ordering, weights via `(token:1.2)`, negative prompts, and sampler/CFG/step tuning [4][5][6]. You can steer *per-token* emphasis — but it has **no built-in LLM**, so phrasing must be explicit and the model may misread composition (e.g. "to the left of") [2].
- **DALL·E 3** is a **natural-language engine.** It is trained on long, synthetic, descriptive captions, not short keyword strings [6], and uses a **T5-XXL text encoder** under a diffusion decoder [6]. There is **no weight syntax** — you write a descriptive sentence/paragraph and the model follows it. Prompt-following benchmarks (Drawbench, T2I-CompBench) are state-of-the-art vs. SDXL and Midjourney v5.2 [6]. Weak spots: text-in-image renders text unreliably [6], object placement phrasing is shaky [6], specific-species/plant hallucination [6].
- **Ideogram** is the **text-in-image specialist**, and (as of 4.0) is a **two-mode engine**: (a) a *magic prompt* layer that expands plain natural language (often via an LLM) into structure, OR (b) **structured JSON captions** passed verbatim for exact layout/palette/text control [7][8][9][10]. Quotation marks around desired in-image text are the classic control lever [11].

**Decision rule for the generator:** if the target is a quantifiable/technical prompt → build SDXL-style weighted syntax; if it's a vivid scene description → build DALL·E 3-style prose; if typography/logo/posters are the point → build an Ideogram prompt (quoted text + JSON when exact layout matters). Emit prompt *and* the encoder-appropriate grammar, not one universal string.

---

## 1. SDXL — Stable Diffusion XL

### 1.1 Text encoders (why prompting differs)
Primary source: Stability AI model card [1][3].
> "It is a *Latent Diffusion Model* that uses two fixed, pretrained text encoders (**OpenCLIP-ViT/G** and **CLIP-ViT/L**)."
> "Compared to previous versions... SDXL leverages a three times larger UNet backbone... more attention blocks and a larger cross-attention context as SDXL uses a second text encoder."

Two CLIP models run in parallel: OpenCLIP ViT-bigG (a large contrastive model) plus CLIP ViT-L. Diffusers lets you feed **a different prompt per encoder** and even split one prompt across both [5].

Consequences: SDXL understands more nuance than SD 1.5 and works best at **lower CFG** than SD 1.5/2 [4][5].

### 1.2 Prompt structure & syntax
The canonical phrasing is a **comma-separated keyword list** — subject, then style/aesthetic, then composition/lighting, then quality modifiers [4][5].

Verbatim example from the model card [1]:
> `prompt = "Astronaut in a jungle, cold color palette, muted colors, detailed, 8k"`

Weighted syntax (from emission-side guide; *not* in the official model card) [4][5]:
- **Increase weight:** `(beautiful landscape:1.2)`
- **Decrease weight:** `[unwanted element:0.8]`
- Note: numeric weight `(word:1.2)` is the A1111/WebUI convention; plain double-parens `((word))` also boost. These are ecosystem conventions, not Stability API spec — tag as `[secondary]`.

### 1.3 Key parameters
- **CFG scale (guidance_scale):** SDXL sweet spot is **lower** than SD 1.5 — typically **5–8**, avoid rising much above 10 (oversaturation/artifacts faster than SD 1.5) [4][5]. SDXL's improved dual-encoder text understanding means it needs less CFG to follow a prompt [4].
- **Steps (num_inference_steps):** ~20–50 typical; quality issues (blurry/low-quality) often fixed by increasing steps [4].
- **Samplers:** DPM++ and Euler a commonly cited as good starting points; sampler choice interacts with CFG [4].
- **Negative prompt:** supported; aggressive negatives + high CFG can over-correct into an artificially "perfect"/uncanny look — drop CFG 1–2 pts if negatives are heavy [5].
- **Base + Refiner:** SDXL is an ensemble-of-experts pipeline — base generates latents, a *refiner* model optionally does final high-res denoising (SDEdit/img2img). Base works standalone [1][3].
- **Per-encoder prompts & negative conditioning:** Diffusers supports a *different* prompt for each text encoder, and `negative_original_size`, `negative_crops_coords_top_left`, `negative_target_size` to negatively condition on resolution/crop params `[secondary from docs]` [5].
- **LoRA / Textual Inversion (embeddings):** LoRA = efficient fine-tuning, small files (10–100MB), combinable with base models; Textual Inversion/embeddings = learn new concepts/style tokens for consistent characters [4].

### 1.4 Gotchas
- **Composition words are unreliable:** like other CLIP-based models, relational phrasing ("to the left of", "underneath") is often misread — position with weighted attention or rely on prompt order [2][6].
- **High CFG + heavy negatives** → over-processed/"AI sharp" look [5].
- **Weight syntax is an ecosystem convention**, not part of the primary Stability API docs — generator should only emit it when the target runtime (A1111-style) supports it [4][5].
- **No built-in LLM — the prompt is the only intelligence.** Everything must be spelled out.

---

## 2. DALL·E 3

### 2.1 How the model works (primary: paper [6] + system card [2])
- Trained on **95% synthetic captions / 5% ground-truth** captions, generated by a bespoke image captioner → this is the core thesis: *"[p]rompt following abilities of text-to-image models can be substantially improved by training on highly descriptive generated image captions."* [6]
- Text conditioning: **"we first encode text inputs using a T5 XXL text encoder"**, outputs cross-attended by the diffusion model (`xfnet`) [6]. So DALL·E 3 = **T5-XXL (text) + diffusion decoder** (own decoder on the SD VAE latent space, consistency-distilled to ~2 denoising steps) [6].
- In ChatGPT, a **GPT-4 layer synthesizes/rewrites the user's short request into a detailed DALL·E 3 prompt** — i.e. the *product* adds an LLM on top; the raw API model takes a descriptive prompt directly [2][3][6].

### 2.2 Natural-language prompting (no weight syntax)
There is **no `(token:1.2)` weighting and no negative-prompt convention** in DALL·E 3 — you control output through **descriptive phrasing**. OpenAI's framing [3][6]:
> "Modern text-to-image systems have a tendency to ignore words or descriptions, forcing users to learn prompt engineering. DALL·E 3 represents a leap forward in our ability to generate images that exactly adhere to the text you provide."

So: **write full sentences / a descriptive paragraph.** Long, specific captions are the *input format the model was trained on*. Verbatim example captions from the paper [6]:
> "A bustling city street under the shine of a full moon... a young woman with fiery red hair, dressed in a signature velvet cloak, is haggling with the grumpy old vendor."
> "Ancient pages filled with sketches and writings of fantasy beasts... The faded dark green ink tells tales of magical adventures, while the high-resolution drawings detail each creature's intricate characteristics."

### 2.3 Benchmark evidence (why prose wins here) [6]
| Metric | DALL·E 3 | SDXL (refiner) | DALL·E 2 |
|---|---|---|---|
| Drawbench short (GPT-V correct %) | **70.4** | 46.9 | 49.0 |
| Drawbench long (GPT-V correct %) | **81.0** | 51.1 | 52.4 |
| MSCOCO CLIP score | **32.0** | 30.5 | 31.4 |
| T2I-C colors / shape / texture | **81.1 / 67.5 / 80.7** | 61.9 / 61.9 / 55.2 | ... |

Human eval (ELO, prompt following): DALL·E 3 **+153.3**, Midjourney 5.2 **−104.8**, SDXL **−189.5** [6].

### 2.4 Gotchas (all from the paper's limitations section [6])
- **Text rendering is unreliable** — words come out with missing/extra characters. Suspected cause: T5 sees whole-word tokens and must map them to letters; author notes a character-level LM would help. → For logos/typography, Ideogram is the better engine. [6]
- **Object placement / spatial phrasing** ("to the left of", "underneath", "behind") is unreliable — the synthetic captioner itself is weak at position, and the model inherits it. [6]
- **Specific-species / genus / plant hallucination:** captioner hallucinates botanical/ornithological specifics, so the model is unreliable at highly specific scientific names. [6]
- **Safety/product constraints:** refuses public figures by name, declines living-artist style imitation, refuses certain official documents — generator should avoid those categories. [2][3]
- **Biases:** default outputs skew White / female / youthful / Western; mitigations exist. [2]

---

## 3. Ideogram — text-in-image specialist

### 3.1 Two prompting modes (primary: Ideogram 4.0 blog [9] + official docs [7][8][10])
Ideogram 4.0 is **trained on structured JSON captions**, not plain text [8][9][10]. Two modes:
1. **Verbose / plain-text** → runs through the **magic prompt layer**, which expands/refines your text (an LLM-backed step; the open-weight `ideogram4` package ships configs for Ideogram's hosted magic-prompt API or Claude Opus/Sonnet via OpenRouter as alternatives) [9][10]. Model makes creative decisions; output is *Ideogram's interpretation* of your intent.
2. **Structured JSON** → passed **verbatim**; what you write is what renders (exact palette, composition, bounding boxes, per-element text). Magic Prompt automatically turns off when you send JSON [8][9][10].

**Color-palette conditioning** is a headline v4 feature — you can name exact `#RRGGBB` hex values [9][10].

### 3.2 Text-in-image prompting (the defining capability)
Classic control: **wrap desired in-image text in quotation marks** and state it early [11].

Verbatim from official docs — Magic Prompt example, summer camp logo [7]:
> Original prompt: `Make a logo for a summer camp named "Pinecrest Pioneers Camp."`
> Enhanced (Magic Prompt): `"A vibrant and colorful logo for the 'Pinecrest Pioneers Camp' summer camp. It features a pioneer-style wooden cabin nestled among tall pine trees... The camp's name is written in bold, playful letters in a mix of red, orange, and yellow..."`

Best practices (`[secondary]` — from a third-party best-practices source, unverified vs. official docs) [11]:
- Use **double quotation marks** around exact text: put `"Café del Sol"` in quotes rather than "with the text Café del Sol".
- Put **the most important text first** (priority/visual hierarchy).
- **Keep in-image copy short**; describe the typeface **by its properties** ("bold geometric sans-serif") rather than naming a font (fonts may render wrong).
- Mention **technical design terms** for branding: "negative space", "minimalist", "modern sans-serif", "geometric composition", "flat design".

### 3.3 Structured JSON prompting (4.0)
JSON caption schema (official docs [8]): `high_level_description` (1–2 sentences) + **`compositional_deconstruction`** (required; defines background + all elements) + fields for style, art_style, color_palette, per-element bounding boxes [8][9][10]. Field **ordering matters** — the model was trained on a fixed sequence [9][10]:
- **Photo captions:** `aesthetics → lighting → photo → medium`
- **Non-photo:** `aesthetics → lighting → medium → art_style`

Color-palette gotchas [8]:
- Include **background colors** in the palette to control overall tone.
- Include **contrast pairs** (highlight + shadow) for controlled lighting.
- Use **uppercase hex only**: `#RRGGBB`, not `#rgb`.
- Bounding boxes use `[y_min, x_min, y_max, x_max]` `[secondary]` [10].

### 3.4 Gotchas
- **Plain text straight into the model does not work well** — for 4.0 you should run it through a magic prompt to convert to JSON, else the model may not follow it (and open-source wrapper warns plain text can trigger a safety warning) [10].
- Magic prompt is **not always deterministic** across generations — it adds variety; use **Off** when you need the literal prompt [7][9].
- Logo renders can vary (the "Pinecrest Pioneers Camp" example shows different logo layouts between Magic-Prompt-off and on) [7].

---

## 4. Encoder differences (CLIP vs T5) — why prompting differs

| | SDXL | DALL·E 3 | Ideogram |
|---|---|---|---|
| Text encoder | **OpenCLIP ViT-bigG + CLIP ViT-L** (dual CLIP, parallel) [1][3] | **T5-XXL** (text-to-text transformer) [6] | Trained on **structured JSON captions**; plain text goes through an LLM-backed magic-prompt layer [8][9][10] |
| Prompt grammar | **Weighted keyword list**, `(x:1.2)`, negatives, CFG [4][5] | **Full descriptive sentences/paragraphs**; no weights [3][6] | **Quoted text** for in-image copy; **structured JSON** for exactness [7][8][9] |
| Why it differs | **CLIP** is a contrastive encoder — it maps *phrases to a shared vision-language space*; it rewards discriminative keywords and per-token emphasis, but with no autoregressive language understanding of word order/relations [1][4] | **T5** is a *generative text encoder* that understands long, ordered, natural-language context → prompt-following leaps (Drawbench 81% long vs SDXL 51%) [6] | 4.0 is **not a single fixed encoder** — output is driven by an **LLM-converted structured schema**, so the prompt *form* (JSON) matters more than raw wording [9][10] |

**The practical upshot for the generator:**
- **CLIP/SDXL** responds to *nouns + adjective emphasis* and tolerates—even needs—explicit weight/negative controls. Emit keyword lists + `(weight)` when targeting SDXL-style runtimes. Compose with word order doing the work of "focus".
- **T5/DALL·E 3** responds to *descriptive prose*. Because it was trained on dense, complete captions, a long descriptive sentence outperforms a comma list. Do **not** emit `(1.2)` syntax.
- **Ideogram** responds to *exact quoted text* for anything that must appear in the image, and to *structured JSON* for anything that must be placed precisely. A prose description is fine only because (and *is* rewritten by) the magic-prompt layer first.

---

## 5. Best-practice techniques & gotchas at a glance

| Technique | SDXL | DALL·E 3 | Ideogram |
|---|---|---|---|
| Lead with **subject**, then style/composition/quality [4] | ✅ | ✅ (in prose) | ✅ |
| **Weight** a token `(x:1.2)` [4][5] | ✅ core | ❌ | ❌ |
| **Negative prompt** [4][5] | ✅ | ❌ (n/a) | JSON mode: describe absence |
| Keep **CFG in 5–8** (not >10) [4][5] | ✅ | n/a (no CFG control) | n/a |
| **Descriptive sentences** over keywords [3][6] | weaker | ✅ core | ✅ (via magic prompt) |
| **Quoted text** for in-image copy [11] | weak text | weak text [6] | ✅ core |
| **Structured JSON** for layout [8][9][10] | ❌ | ❌ | ✅ (4.0) |
| **Named hex palette** [8][9] | ❌ | ❌ | ✅ |
| Built-in **style/reference** images [9][11] | via LoRA/inversion [4] | ❌ (has img edit) | ✅ Style Reference |

**Key gotchas to encode:**
1. Don't mix grammars: `(weight:1.2)` is SDXL-only; on DALL·E 3 it's literal text. [3][4][6]
2. For **typography/logos** → Ideogram (quoted text/JSON), because DALL·E 3 text is unreliable and SDXL can't do legible text well. [6][7][10]
3. For **spatial/compositional scenes** → DALL·E 3 prose (best prompt-following) but be aware placement words are its weak point too. [6]
4. Ideogram plain text ≠ literal — it's expanded by a magic prompt unless you send JSON or set OFF. [7][9][10]
5. SDXL: lower CFG than you'd expect, mind heavy negatives + high CFG oversharpening. [4][5]

---

## Sources

All fetched live during research. `[secondary]` markers above flag claims that came from aggregator/third-party guides rather than the vendor/official primary docs.

1. Stability AI — SD-XL 1.0-base model card, Hugging Face: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
2. OpenAI — DALL·E 3 System Card: https://cdn.openai.com/papers/DALL_E_3_System_Card.pdf
3. OpenAI — DALL·E 3 announcement: https://openai.com/index/dall-e-3/
4. NVIDIA NIM / aggregator SDXL overview (points to model card): https://docs.api.nvidia.com/nim/reference/stabilityai-stable-diffusion-xl
5. Hugging Face Diffusers — Stable Diffusion XL pipeline docs: https://huggingface.co/docs/diffusers/v0.26.3/en/api/pipelines/stable_diffusion/stable_diffusion_xl
6. OpenAI — Improving Image Generation with Better Captions (DALL·E 3 paper): https://cdn.openai.com/papers/dall-e-3.pdf
7. Ideogram Docs — Magic Prompt: https://docs.ideogram.ai/using-ideogram/generation-settings/magic-prompt
8. Ideogram Docs — 4. JSON Prompting (Ideogram 4.0): https://docs.ideogram.ai/using-ideogram/getting-started/prompting-guide/4.-json-prompting-ideogram-4.0.md
9. Ideogram Blog — The Ideogram 4.0 prompt guide: https://ideogram.ai/blog/claude-mcp
10. ideogram-oss/ideogram4 — docs/prompting.md: https://github.com/ideogram-oss/ideogram4/blob/main/docs/prompting.md
11. Ideogram Best Practices (AI Wiki) — `[secondary]` third-party: https://artificial-intelligence-wiki.com/prompt-engineering/image-generation-prompts/ideogram-best-practices

> Note on SDXL numeric defaults (CFG/steps/weights): these appear in third-party guides ([4][5]) and the Diffusers docs ([5]), not in Stability's terse model card ([1]); flagged `[secondary]` in the body.
> Note on OpenAI image-generation docs ([platform.openai.com/docs/guides/images]): fetched but was a network error on one pass and now reflects newer GPT Image models — cited here only as general OpenAI API context, not DALL·E 3-specific `[unverified]`.
