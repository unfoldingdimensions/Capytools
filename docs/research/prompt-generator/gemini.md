# Gemini Image Generation — Prompting Research Notes

**Purpose:** Grounding for Cappytool No.2 (random image/video prompt generator) — the Gemini image-generation engine target.

---

## Executive Summary

Gemini's image models ("Nano Banana" = Gemini 2.5 Flash Image, and "Nano Banana Pro" = Gemini 3 / 3.1 Pro Image) are **not diffusion keyword taggers** — they are **natively multimodal language models** trained to process text and images in a single unified step [1]. This is the single most important thing for a prompt generator to account for: Gemini rewards **natural, narrative, descriptive prose**, not comma-separated keyword lists. The explicit official guidance is *"Describe the scene, don't just list keywords — a narrative, descriptive paragraph will almost always produce a better, more coherent image than a simple list of disconnected words"* [1]. Prompts are parsed as instructions with deep language understanding, so **context and intent matter** (state the *purpose* of the image) [1][4]. Image output is requested through a normal chat API call, and images can be generated **natively inside a conversation**, enabling editing, multi-image composition, iterative refinement, and on-the-fly correction [1][4]. Supplemental controls exist via API parameters (aspect ratio via `response_format`) [4]. Gemini also grounds image generation in Google Search for current events [4].

---

## 1. How Gemini Parses Image Prompts

- **Native multimodal, single unified step.** Gemini 2.5 Flash Image "was trained from the ground up to process text and images in a single, unified step," enabling conversational editing, multi-image composition, and logical reasoning about image content [1]. Image output models like Gemini 3 Pro Image are built on the base language model (Gemini 3 Pro), so the *language model itself* plans and executes the image [6][9].
- **Natural-language instruction, not keyword tags.** The model's core strength is deep language understanding; prompts are short or long natural-language requests [1][2]. "Even short prompts will generate high-quality images, but you can take better control of the output by adding details bit-by-bit" [2].
- **Detailed prompts = control.** "Use detailed prompts to take more control over the images you generate. Think about what you want to see – the characters, the setting, and the overall feel" [2]. Official structure dimensions: **style**, **subject**, **setting** [2]; the consumer app guidance adds **subject, composition, action, location, style, and editing instructions** [3].
- **Multimodal input modes** (both text→image and image+text→image) [1][4]:
  - Text-to-image (generate from text description)
  - Image + text-to-image (edit: add/remove/modify elements, change style/colors)
  - Multi-image to image (composition & style transfer)
  - Iterative refinement (multi-turn conversation, small adjustments)
  - Text rendering (clear text inside image: logos, diagrams, posters)
- **Structured prompting works too.** For distinguishing instructions/context/task, Google's prompt-design guidance recommends tags or Markdown/XML-structuring (e.g. `<role>`, `<constraints>`, `<context>`, `<task>`, `<output_format>`) [5]. (This is general LLM guidance; the image guides themselves prefer prose.)
- **Grounding in Google Search.** Generation can be grounded in real-time info via the Search tool for news/weather/time-sensitive subjects [4].

---

## 2. Official Prompt Guidance & Parameters / Controls

### Model IDs (as observed in API docs)
- `gemini-3.1-flash-image` — the "Nano Banana" successor line used throughout the current image-generation API docs [4].
- `gemini-3-pro-image` / `gemini-3-pro-image-preview` — Nano Banana Pro, built on Gemini 3 Pro [6][9].

### API parameters / explicit controls
- **Aspect ratio via structured output:** `response_format = { "type": "image", "aspect_ratio": "1:1" }` — the API lets you set the output image aspect ratio explicitly (e.g. `"1:1"`, `"16:9"`) [4].
- **Resolution (surface-level / in-app):** Nano Banana Pro "Generate crisp visuals at 1k, 2k or 4k resolution" via product resolution dropdowns; up to 4K output [9][7]. (In the Gemini app these are in-product dropdowns rather than prompt parameters [2][9].)
- **Input image count:** Nano Banana Pro supports "input up to 14 images into a composition (varies by surface)" [8].
- **Aspect-ratio behavior on edit:** "When editing, Gemini 2.5 Flash Image generally preserves the input image's aspect ratio. If it doesn't, be explicit in your prompt: `Update the input image... Do not change the input aspect ratio.`" If multiple inputs have different ratios, the model adopts the **last image's** ratio; for a guaranteed new ratio, supply a reference image with the target dimensions [1].

### Official prompting templates (verbatim)
**Text-to-image — accurate text in image** (template) [1][4]:
> Create a [image type] for [brand/concept] with the text "[text to render]" in a [font style]. The design should be [style description], with a [color scheme].

**Example text-to-image — logo** (verbatim) [1][4]:
> Create a modern, minimalist logo for a coffee shop called 'The Daily Grind'. The text should be in a clean, bold, sans-serif font. The design should feature a simple, stylized icon of a coffee bean seamlessly integrated with the text. The color scheme is black and white.

**Image + text editing — add/remove/modify** (template) [4]:
> Using the provided image of [subject], please [add/remove/modify] [element] to/from the scene. Ensure the change is [description of how the change should integrate].

**Editing example — add element** (verbatim) [1][4]:
> Using the provided image of my cat, please add a small, knitted wizard hat on its head. Make it look like it's sitting comfortably and matches the soft lighting of the photo.

**Inpainting — edit one area only** (template) [1]:
> Using the provided image, change only the [specific element] to [new element/description]. Keep everything else in the image exactly the same, preserving the original style, lighting, and composition.

**Inpainting example** (verbatim) [1]:
> Using the provided image of a living room, change only the blue sofa to be a vintage, brown leather chesterfield sofa. Keep the rest of the room, including the pillows on the sofa and the lighting, unchanged.

**Style transfer** (template) [1]:
> Transform the provided photograph of [subject] into the artistic style of [artist/art style]. Preserve the original composition but render it with [description of stylistic elements].

**Style transfer example** (verbatim) [1]:
> Transform the provided photograph of a modern city street at night into the artistic style of Vincent van Gogh's 'Starry Night'. Preserve the original composition of buildings and cars, but render all elements with swirling, impasto brushstrokes and a dramatic palette of deep blues and bright yellows.

**Multi-image composition** (verbatim) [1][4]:
> Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it. Generate a realistic, full-body shot of the woman wearing the dress, with the lighting and shadows adjusted to match an outdoor environment.

**Photorealistic scene opener** (verbatim, from API REST sample) [4]:
> A photorealistic wide-angle shot of a vibrant coral reef teeming with tropical fish. Crystal-clear turquoise [water]…

### DeepMind prompt-guide techniques (verbatim summary) [2]
- **Render precise text:** "Enclose your desired words in quotes (e.g., `"Happy Birthday"`)… describe the typography style, like a `bold sans-serif font` or `neon cursive signage`."
- **Translate/localize:** write in one language then specify target language + regional cultural cues; provide exact foreign phrasing in quotes.
- **Prompt for production specs:** request aspect ratio (4:3, 1:1, 9:16) and format ("widescreen backdrop", "vertical social post"); use in-product resolution dropdowns for 2K/4K.
- **Ask for multiple images at once:** e.g. "three distinct variations of a product mockup" or "four different color palettes"; upload one reference image and ask for a multi-image story.
- **Maintain subject consistency:** "Upload clear reference images, and assign a distinct name to each character or object in your prompt" so the model maintains their look.

---

## 3. Best-Practice Techniques & Structures

1. **Write prose, not keywords.** Narrative descriptive paragraph > comma list [1]. This is the #1 rule and the key design constraint for a generator that assembles Gemini prompts.
2. **Be hyper-specific.** "Instead of 'fantasy armor,' describe it: 'ornate elven plate armor, etched with silver leaf patterns, with a high collar and pauldrons shaped like falcon wings'" [1][4].
3. **Provide context and intent.** State the *purpose*: "Create a logo for a high-end, minimalist skincare brand" beats "Create a logo" [1][4].
4. **Use step-by-step instructions for complex scenes.** "First, create a background of a serene, misty forest at dawn. Then, in the foreground, add a moss-covered ancient stone altar. Finally, place a single, glowing sword on top of the altar" [4].
5. **Use semantic (positive) negatives.** "Instead of saying 'no cars,' describe the intended scene positively: 'an empty, deserted street with no signs of traffic'" [1][4].
6. **Control the camera with photographic/cinematic language.** `wide-angle shot`, `macro shot`, `low-angle perspective`, `85mm portrait lens`, `Dutch angle` for precise composition control [1]. Photorealism benefits from camera angles, lens types, lighting, fine details [1].
7. **Fix character drift by restarting.** "If you notice a character's features begin to drift after many iterative edits, you can restart a new conversation with a detailed description to retain consistency" [1][3].
8. **Iterate conversationally.** Make small follow-up edits: "That's great, but can you make the lighting a bit warmer?" / "Keep everything the same, but change the character's expression to be more serious" [1][4].
9. **Character consistency / 360° views.** Generate 360° character views by iterating angles and including previously generated images (and a reference pose for complex poses) in subsequent prompts [4].
10. **Sequential art/storyboards.** Comic panels / storyboards build on character consistency + scene description; these "work best with Gemini 3 Pro and Gemini 3.1 Flash Image" [4].
11. **Use real-world knowledge.** Prompt with real concepts/locations/historical eras, timelines, flowcharts, infographics [2][3][7][9].
12. **Let the model reason.** "Give Gemini a simple concept and let its reasoning capabilities build out the details" — good for real-world relationships/processes [3].

---

## 4. Known Limitations & Gotchas

- **Small-text rendering is weak.** Gemini 3 Pro Image still struggles: "Text rendering: poor in small text (often blurry in 1k model), long paragraphs, page length" [6]; consumer-facing docs: "it can still struggle with small faces, accurate spelling, and fine details" [9].
- **Character consistency is not always perfect** between input images and generated output [6]; "The model excels at character consistency, but it may not always get it right" [9].
- **Spatial/localisation confusion.** "Occasional confusion around spatial localisation (e.g. left/right etc.)" [6] — important gotcha for position-heavy prompts.
- **World-knowledge / 3D / factuality limits.** "Still limited in advanced capabilities with world knowledge, 3D reasoning and factuality" [6].
- **Masked/doodle editing is partial.** "Masked/Doodle based editing: partial instruction following and persistent ink" [6].
- **Copy/paste fidelity on edit.** "When editing images: infrequent copying/pasting from user's input image to generated image" [6].
- **Complex edits / blends can artifact.** "Advanced features like masked editing, major lighting changes (like day to night), or blending multiple images may sometimes produce unnatural results, visual artifacts, or disjointed scenes" [9].
- **Aspect ratio behavior:** preserves input ratio; otherwise must be explicit; multi-image inputs adopt the last image's ratio [1].
- **Hallucination / factual error.** Standard LM limitation (general hallucination) [6][9].
- **Safety/refusals**: content is safety-filtered; images are watermarked with **SynthID** for AI detection [9][7]. (Policy constraints apply — [6] lists prohibited content categories incl. sexual content, violence, misinformation.)
- **Knowledge cutoff:** Gemini 3 Pro Image: **January 2025** [6]; Gemini 2.0 Flash family: June 2024 [10].
- **Perf/slowness:** occasional slowness or timeout [6].

---

## 5. Backend Notes (relevant to prompting)

- **Architecture:** Gemini image models are built on the base Gemini LLMs. Gemini 3 Pro Image is "based on Gemini 3 Pro" — a natively multimodal, reasoning LLM [6]. The Gemini 2.x family uses a **sparse Mixture-of-Experts (MoE) transformer** architecture [10]. Trained on Google **TPUs** with **JAX / ML Pathways** [6][10].
- **Context window:** up to **1M tokens**; text+image inputs; Gemini 3 Pro Image outputs image with a **64K token output** budget [6][10].
- **Tokenizer / encoder behavior:** The Gemini series uses a SentencePiece-based tokenizer shared across modalities (modality interleaving); token counts in the API include image/audio/video tokens and the context is modality-interleaved. *[unverified in this session — standard Gemini tokenizer details; not directly confirmed by the fetched primary pages, which only state the 1M context and 64K output budgets.]*
- **Implication for a prompt generator:** because tokens are shared with the text LLM that *plans* the image, prompt length directly consumes inference/token budget like normal text. Long, richly detailed prose prompts are expected and well-supported (1M context) [6][10], so the generator can be generous with descriptive detail without hitting hard length limits — but should favor prose quality over raw length, since the model's strength is language understanding [1][2].
- **Conversational/stateful generation:** output is produced as an image block inside a normal chat/interaction step, which is what enables multi-turn editing and refinement [1][4].

---

## Sources

1. Google Developers Blog — *How to prompt Gemini 2.5 Flash Image Generation for the best results* — https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/
2. Google DeepMind — *How to create effective image prompts with Gemini Image (Nano Banana)* — https://deepmind.google/models/gemini-image/prompt-guide
3. Google (The Keyword) — *Gemini image generation: How to write an effective prompt* — https://blog.google/products-and-platforms/products/gemini/image-generation-prompting-tips
4. Google AI for Developers — *Nano Banana image generation: Prompting guide and strategies* (Gemini API) — https://ai.google.dev/gemini-api/docs/image-generation
5. Google AI for Developers — *Prompt design strategies* (Gemini API) — https://ai.google.dev/gemini-api/docs/prompting-strategies
6. Google DeepMind — *Gemini 3 Pro Image Model Card* (PDF, Nov 2025) — https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Pro-Image-Model-Card.pdf
7. Google DeepMind — *Introducing Nano Banana Pro: Gemini 3 Pro Image model* — https://deepmind.google/blog/introducing-nano-banana-pro/
8. Google (The Keyword) — *7 tips to get the most out of Nano Banana Pro* — https://blog.google/products/gemini/prompting-tips-nano-banana-pro
9. Google DeepMind — *Gemini 3 Pro Image – Nano Banana Pro* (model page) — https://deepmind.google/models/gemini-image/pro
10. Google DeepMind — *Gemini 2.0 Flash Model Card* (PDF) — https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-0-Flash-Model-Card.pdf
