# Backend Mechanics: Why Image/Video Prompt Techniques Work

> A mechanism-grounded taxonomy for the Capytools random prompt generator. Every front-facing
> technique (emphasis brackets, negative prompts, seeds, LoRA, aspect ratios, motion buckets…) is
> mapped to the underlying algorithm it manipulates. Citations `[n]` point to the `## Sources` block
> and to `backend.sources.json`.

---

## 1. Diffusion models: the generative substrate (DDPM → Latent Diffusion)

**Technique being justified:** why "seed + prompt → image" at all; why prompt text steers the result.

A diffusion model is a parametrized Markov chain that learns to reverse a process that gradually
corrupts data with Gaussian noise. Sampling starts from pure noise and denoises step by step toward
an image. The seminal formulation is DDPM:

> "A diffusion probabilistic model … is a parameterized Markov chain trained using variational
> inference to produce samples matching the data after finite time." [1]

> "our models naturally admit a progressive lossy decompression scheme that can be interpreted as a
> generalization of autoregressive decoding." [1]

Denoising in raw pixel space is wasteful, so Latent Diffusion Models (LDMs — the basis of Stable
Diffusion) run the diffusion inside the latent space of a pre-trained autoencoder:

> "we apply them in the latent space of powerful pretrained autoencoders … training diffusion models
> on such a representation allows for the first time to reach a near-optimal point between complexity
> reduction and detail preservation." [2]

**Implication for the generator:** there is no deterministic prompt→image function; the output is the
tail of a stochastic denoising trajectory, so identical prompts can diverge. The two levers that pin a
trajectory are the *seeds* (initial noise, §6) and the *conditioning* (prompt embeddings, §3–4).

---

## 2. U-Net vs. DiT / MM-DiT architectures (SDXL, SD3, FLUX)

**Technique being justified:** why model *generation* (SD1.5, SDXL, SD3, FLUX) changes prompt behavior;
why "base model matters."

- **SD 1.5 / SDXL** are latent-diffusion models with a **U-Net** denoiser. SDXL scaled the U-Net 3× and —
  crucially for prompting — added a second text encoder and longer text context:
  > "Compared to previous versions of Stable Diffusion, SDXL leverages a three times larger UNet
  > backbone: The increase of model parameters is mainly due to more attention blocks and a larger
  > cross-attention context as SDXL uses a second text encoder." [7]

- **SD3 / FLUX** replaced the U-Net with a **Diffusion Transformer (DiT)** and, in SD3, the
  **Multimodal-DiT (MM-DiT)**, where image and text tokens are *jointly attended* inside the same
  transformer blocks rather than text being injected only via cross-attention:
  > "we present a novel transformer-based architecture for text-to-image generation that uses separate
  > weights for the two modalities and enables a bidirectional flow of information between image and
  > text tokens, improving text comprehension, typography, and human preference ratings." [3]

  FLUX.1 keeps the MM-DiT lineage as a "12 billion parameter rectified flow transformer," trained with
  **guidance distillation** so it needs few steps and a low guidance scale [13].

**Implication for the generator:** prompts should be tuned per family — natural-language, compositional
prompts work far better on SD3/FLUX (joint text–image attention) than on SD1.5, where shorter,
token-aligned prompts and explicit weighting are more reliable. A generator that emits
"prompt-style = f(model family)" will outperform one that assumes a single style.

---

## 3. Text encoders: CLIP, T5, and Gemini's multimodal tokenizer

**Technique being justified:** why word/phrase order, synonym choice, and prompt length matter; why
models differ in "prompt understanding."

Text is not fed to the denoiser directly; it is first converted to **embeddings / token logits by a
separate text encoder**. The encoder's training objective determines how a prompt is "understood."

- **CLIP** [4] aligns text and image in a shared embedding space by contrastive pre-training on
  (image, caption) pairs:
  > "the simple pre-training task of predicting which caption goes with which image is an efficient and
  > scalable way to learn SOTA image representations … on a dataset of 400 million (image, text) pairs
  > collected from the internet." [4]
  CLIP text encoders are comparatively short-context and literal → long floaty sentences "wash out."

- **T5** [5] is a text-to-text transformer and is the reason modern models spell words and follow
  long prompts:
  > "we explore the landscape of transfer learning for NLP by introducing a unified framework which
  > casts every language problem as a text-to-text task." [5]
  SD3/SDXL both an **ensemble of CLIP + T5 encoders** (SD3: CLIP-G/14 + CLIP-L + T5-XXL). T5-XXL is the
  main contributor to correct spelling and complex multi-concept comprehension [3] (see also the
  "Scaling Down Text Encoders" ablation, which shows text-rendering/correct spelling is the capability
  most sensitive to text-encoder size [SD3-support]).

- **Gemini** (relevant for providers like Gemini 2.0 Flash *image* and for understanding multimodal
  tokenizers) encodes everything — text, images, audio, video — into discrete tokens in one
  deep context:
  > "Video understanding is accomplished by encoding the video as a sequence of frames in the large
  > context window." and "Video frames or images can be interleaved naturally with text or audio as part
  > of the model input." [12]
  Its text side uses a **SentencePiece** tokenizer trained on the whole corpus:
  > "We use the SentencePiece tokenizer … training the tokenizer on a large sample of the entire
  > training corpus improves the inferred vocabulary and subsequently improves model performance." [12]

**Implication for the generator:** emit *encoder-aware* text. For CLIP-only/SD1.5-targeted output: short,
concrete, subject-focused. For T5-powered (SD3/FLUX): richer, compositional sentences and spelled-out
details are rewarded. Because Gemini/GPT image models take the prompt through an LLM backbone and a full
tokenizer, they reward natural-language brevity and inline guidance ("in the style of X").

---

## 4. Cross-attention and prompt weighting (why `::` and `()` emphasis work)

**Technique being justified:** `(word)`, `word::1.2`, `word:1.3`, `[word]` de-emphasis.

The single most important mechanism for weighted prompting is **cross-attention**: in LDMs the text
conditioning is injected by making image-latent *queries* attend over text-token *keys/values*:

> "By introducing cross-attention layers into the model architecture, we turn diffusion models into
> powerful and flexible generators for general conditioning inputs such as text or bounding boxes." [2]

At each cross-attention block the denoiser computes attention logits between each spatial latent and
every text token. **Attention weights are a softmax over (query·key) dot products**, so scaling a token's
key embedding (which is exactly what emphasis weight does) raises that token's softmax share, biasing
how strongly the corresponding text concept is painted into every spatial location at that timestep.
In SD3/FLUX's MM-DiT the same principle holds but text and image tokens are attended jointly inside
shared blocks (§2), so emphasis redistributes probability mass across a shared attention map [3].

> ⚠️ **Source honesty:** the concrete *syntax* `(word)` / `word::w` / `word:w` is a community/UI
> convention (A1111, SD.Next, Compel) rather than a peer-reviewed standard, so **there is no canonical
> paper URL for the exact syntax** — it is marked **[unverified]** at the source of its mechanism [unverified].
> The *mechanism* it exploits (scaling text-key embeddings to raise cross-attention logits) is
> well grounded in the cross-attention formulation of [2] and the joint attention of [3].

**Practical rule to encode:** emphasis is *monotonic and saturating* — mild weights (1.1–1.3) sharpen
attribution, large weights (>1.5) distort/oversaturate. De-emphasis `[x]` or `¬x` drives the token
toward the unconditional branch (see §5), effectively *negative prompting a single token*.

---

## 5. Classifier-free guidance (CFG), guidance scale, and negative prompts

**Technique being justified:** the **CFG / guidance scale** slider and **negative prompt** field.

CFG trades diversity for adherence by mixing the *conditional* and *unconditional* score estimates:

> "in what we call classifier-free guidance, we jointly train a conditional and an unconditional
> diffusion model, and we combine the resulting conditional and unconditional score estimates to
> attain a trade-off between sample quality and diversity." [6]

It is almost free to implement because it is a one-line training change:

> "The most practical advantage of our classifier-free guidance method is its extreme simplicity: it
> is only a one-line change of code during training—to randomly drop out the conditioning—and during
> sampling—to mix the conditional and unconditional score estimates." [6]

And guidance's effect is precisely characterized:

> "we have arrived at an intuitive explanation for how guidance works: it decreases the unconditional
> likelihood of the sample while increasing the conditional likelihood." [6]

**Negative prompts** are the practical UI for this: at inference the "unconditional" branch of CFG is
not truly empty — it is scored against the *negative prompt* embedding, so the sampler is steered
*away* from those concepts. (The CFG frame work above licenses this; the negative-prompt-specific
construct is an implementation convention, not in the paper itself — **[unverified] for the negative
field's exact semantics**.)

**Rule to encode:** raising guidance scale ⇒ stronger prompt adherence but less diversity and more
saturation/artifacts; pairing a negative prompt ("blurry, low quality, watermark") pulls the trajectory
from those tokens. Distilled front-ends (FLUX [dev]/[schnell]) are trained *with* a fixed low guidance
and can behave badly at high CFG [13].

---

## 6. Seeds, sampling, and deterministic reproduction

**Technique being justified:** the **seed** input and "same seed = same image."

DDPM's ancestral sampler is stochastic at every step, but **DDIM** showed the reverse process can be
made *non-Markovian and effectively deterministic* given the same initial noise, while sharing the same
training objective:

> "We construct a class of non-Markovian diffusion processes that lead to the same training objective,
> but whose reverse process can be much faster to sample from." [10]

> "can perform semantically meaningful image interpolation directly in the latent space." [10]

This is why a **seed** (which seeds the initial Gaussian noise tensor) plus fixed steps/sampler/CFG
reproduces a result: for any fixed seed the *initial latent trajectory* is fixed, and a deterministic
ODE-style sampler (DDIM, Euler, DPM++ over a rectified flow in SD3/FLUX) retraces it. Change the seed
→ new noise → new sample. Change sampler *or* step-count → different trajectory even for same seed.

**Rule to encode:** a "random prompt generator" should also randomize other trajectory parameters
(steps, CFG, sampler, resolution) if the goal is diversity; fixing seed alone does not fix the image
unless sampler settings are fixed too. Because SD3/FLUX train with **rectified flow**, their
noise→data path is *straighter*, so they need far fewer steps than SD1.5 [3][13].

---

## 7. LoRA, textual inversion / style embeddings

**Technique being justified:** style LoRAs, concept embeddings, "Style of X," trigger words.

- **Textual Inversion** learns a new *token embedding* for a concept from a few images, leaving the
  model frozen:
  > "Using only 3-5 images of a user-provided concept, like an object or a style, we learn to
  > represent it through new 'words' in the embedding space of a frozen text-to-image model." [8]

  > "Importantly, this process leaves the generative model untouched. In doing so, we retain the rich
  > textual understanding and generalization capabilities that are typically lost when fine-tuning." [8]
  → The learned "pseudo-word" then flows through the §4 cross-attention path, so mentioning it is
  exactly like emphasizing an unusually dense text token.

- **LoRA** is a parameter-efficient fine-tune that *does* touch weights, but only through small
  low-rank matrices injected into attention layers:
  > "we freeze the pre-trained model weights and inject trainable rank decomposition matrices into
  > each layer of the Transformer architecture, greatly reducing the number of trainable parameters
  > for downstream tasks." [9]
  In image/video pipelines a LoRA thus re-shapes the cross-attention and (in DiTs) the joint
  attention toward a style/subject, and multiple LoRAs are combined by summing their low-rank updates
  — which is why a generator can stack "base style LoRA + subject LoRA."

**Rule to encode:** concept/style keywords are *learned tokens*, so a generator should wrap style
intent in already-known trigger words or bracket them for emphasis (§4) rather than inventing tokens a
model can't know.

---

## 8. Aspect ratio & parameter handling

**Technique being justified:** the **aspect-ratio / resolution** dropdown and "size conditioning."

Empirically, aspect ratio is not just a crop: modern models *condition on it*. SDXL introduced
**micro-conditioning on image size and crop parameters** plus **multi-aspect training**:

> "We design multiple novel conditioning schemes and train SDXL on multiple aspect ratios." [7]

> the model "has learned to associate the conditioning `c_size` with resolution-dependent image
> features, which can be leveraged to modify the appearance of an output corresponding to a given
> prompt" … and the crop conditioning prevents "cropping artifacts" from the previous SD 1.5/2.1 which
> "provide no explicit control of this parameter." [7]

**Implication for the generator:** emitting a non-square aspect ratio is not a "trick" — it is a real
conditioning input the model was trained on (better than asking for a square image and cropping).
The available bucket sizes map to the model's trained multi-aspect buckets; requesting an unpinned
ratio is why some models silently crop or squish.

---

## 9. Video temporal conditioning / motion buckets

**Technique being justified:** **motion bucket id**, **fps**, duration, `noise_aug_strength`.

Video LDMs (Stable Video Diffusion et al.) extend image LDMs by inserting **temporal layers** and
conditioning on how much motion to produce. SVD defines this as *micro-conditioning*:

> "Stable Diffusion Video also accepts micro-conditioning, in addition to the conditioning image,
> which allows more control over the generated video: `fps` … `motion_bucket_id`: the motion bucket id
> to use for the generated video. This can be used to control the motion … Increasing the motion
> bucket id increases the motion of the generated video. `noise_aug_strength`: the amount of noise
> added to the conditioning image. The higher the values the less the video resembles the conditioning
> image. Increasing this value also increases the motion." [14]

At the data level SVD sorts clips by a streaming **motion magnitude**, bucketizes it, and feeds that
bucket id into the time-embedding path of the UNet — which is why the *same* prompt can yield a static
shot (low bucket) or a tracking shot (high bucket) [11][14]. The paper's three-stage recipe
(image-pretrain → video-pretrain → high-quality video finetune) explains why motion quality and prompt
adherence are separable knobs [11].

**Rule to encode:** a video-prompt generator should randomize `motion_bucket_id` (or its provider-branded
equivalent), `fps`, frame count/duration, and `noise_aug_strength`, because those — not just the text —
determine the *temporal* character of the clip, exactly as text determines the *spatial* character.

---

## Synthesis: a mechanism-keyed prompt-generation checklist

- Text passes through an encoder first → match language style to the encoder family (§3).
- Every token competes in cross-attention → weighting/emphasis is real, use it sparingly (§4).
- CFG / negative prompt steer conditional vs. unconditional trajectory (§5).
- Seed only reproduces if sampler + steps + CFG are fixed (§6).
- Style = learned tokens (inversion) or small low-rank weight deltas (LoRA) (§7).
- Aspect ratio is a conditioning input, not a crop (SDXL+) (§8).
- In video, motion is a *conditioning parameter* (motion bucket / fps), not prompt text (§9).

---

## Sources

Verified primary sources (all URLs fetched/seen during this research). Entries mirror
`backend.sources.json`. Where a specific syntax/construct has no canonical paper, it is flagged
`[unverified]` and grounded in the nearest mechanism instead.

1. **Denoising Diffusion Probabilistic Models** — Ho, Jain, Abbeel — arXiv:2006.11239
   https://arxiv.org/abs/2006.11239
2. **High-Resolution Image Synthesis with Latent Diffusion Models** — Rombach, Blattmann, Lorenz, Esser, Ommer — arXiv:2112.10752 — https://arxiv.org/abs/2112.10752
3. **Scaling Rectified Flow Transformers for High-Resolution Image Synthesis (SD3)** — Esser et al. — arXiv:2403.03206 — https://arxiv.org/abs/2403.03206
4. **Learning Transferable Visual Models From Natural Language Supervision (CLIP)** — Radford et al. — arXiv:2103.00020 — https://arxiv.org/abs/2103.00020
5. **Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (T5)** — Raffel et al. — arXiv:1910.10683 — https://arxiv.org/abs/1910.10683
6. **Classifier-Free Diffusion Guidance** — Ho & Salimans — arXiv:2207.12598 — https://arxiv.org/abs/2207.12598
7. **SDXL: Improving Latent Diffusion Models for High-Resolution Image Synthesis** — Podell et al. — arXiv:2307.01952 — https://arxiv.org/abs/2307.01952
8. **An Image is Worth One Word: Personalizing Text-to-Image Generation using Textual Inversion** — Gal et al. — arXiv:2208.01618 — https://arxiv.org/abs/2208.01618
9. **LoRA: Low-Rank Adaptation of Large Language Models** — Hu et al. — arXiv:2106.09685 — https://arxiv.org/abs/2106.09685
10. **Denoising Diffusion Implicit Models (DDIM)** — Song, Meng, Ermon — arXiv:2010.02502 — https://arxiv.org/abs/2010.02502
11. **Stable Video Diffusion: Scaling Latent Video Diffusion Models to Large Datasets** — Blattmann et al. — arXiv:2311.15127 — https://arxiv.org/abs/2311.15127
12. **Gemini: A Family of Highly Capable Multimodal Models** — Team Google — arXiv:2312.11805 — https://arxiv.org/abs/2312.11805
13. **FLUX.1 [dev] model card (Black Forest Labs)** — https://huggingface.co/black-forest-labs/FLUX.1-dev
14. **Diffusers docs — Stable Video Diffusion (micro-conditioning: fps, motion_bucket_id, noise_aug_strength)** — https://huggingface.co/docs/diffusers/api/pipelines/stable_diffusion/svd

`[unverified]` — emphasis *syntax* `(word)` / `word::w` / `[word]` and the *negative-prompt field's exact
semantics* are community/UI conventions (A1111, SD.Next, Compel), not peer-reviewed canonical
references; the mechanisms they exploit (cross-attention key-scaling [2][3]; CFG conditional-vs-
unconditional mixing [6]) are the cited, verifiable grounding.
