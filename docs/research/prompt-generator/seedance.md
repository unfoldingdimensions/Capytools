# Seedance (ByteDance) — Video Generation Prompting Research

> For the **Capytools No.2 random prompt generator** — video-prompt variant.
> Research date: 2026-08. Versions covered: Seedance 1.0 → 2.0 → 2.5, with the **2.0/2.5 API era** treated as the practical target.

---

## Executive Summary

**Seedance** is ByteDance Seed team's family of diffusion-transformer (DiT) video foundation models, released in waves: **Seedance 1.0** (June 2025, tech report + arXiv paper), **Seedance 2.0** (late 2025, unified audio-video joint architecture), and **Seedance 2.5** (2026, adds longer duration and stronger instruction following). [1][2][3][4]

- It is **native text-to-video (T2V) and image-to-video (I2V)** in a single model, and by 2.0 supports **multi-modal** input (text + up to 9 images / 3 video refs / 3 audio refs, 12 files total) for reference, edit, and extend workflows. [1][4][2][5]
- Signature capabilities: **multi-shot storytelling** (2–3 shot transitions in one 10 s clip), **native audio-video joint generation** (2.0+), **camera control**, and **strong prompt following** (socket: dense caption training + a prompt-engineering rephraser model). [1][2]
- **Prompting works best as a structured "director's" formula** — not one paragraph but ordered beats: *subject → action → environment → camera → lighting → style → constraints*. The model reads the **opening ~20–30 words most heavily**, so lead with the subject and core action. [5][6]
- **Camera control is done through natural-language shot vocabulary** (push-in, dolly-in, tracking, pan, orbit, rack focus). There is **no separate numeric camera parameter** in the 2.0 API — camera lives in the prompt text; `camera_fixed` (1.0-era) is a boolean only in some versions. [5][7]
- For a random prompt generator, the **most reusable structure** is the timecoded shot-script form (镜头 1/2/3 or `[0:00–0:03]`) plus a constraint tail. This is directly documented in ByteDance's own 2.0 prompt guide. [5]

**Confidence:** High for 1.0 (peer-style tech report + arXiv + official site). High for 2.0 (official Volcano Engine prompt guide + API ref fetched). **Medium for 2.5** — most 2.5 parameter/prompt details come from third-party API guides (MuAPI/fal.ai mirrors) rather than a fetched primary page; where a 2.5 claim lacks a primary source it is marked **[unverified]**. [8][9]

---

## 1. What Seedance Is & T2V/I2V Capabilities

### Seedance 1.0 [1][2][3]
- Multi-shot video-gen foundation model; **1080p** output; T2V + I2V in one model.
- Native **multi-shot storytelling**: ~10 s video with 2–3 shot transitions (wide/medium/close-up) with consistent subject/style/atmosphere.
- **Motion**: wide dynamic range, subtle expressions to large movement, physical plausibility, low distortion.
- **Multi-style**: realism, animation, film, advertising. Bilingual EN/CN prompting.
- **Prompt following**: a trained *precise caption model* (dense captions: dynamic = actions + camera movement; static = subject/scene traits) generated training captions; a *Prompt Engineering (PE)* model rephrases user prompts into detailed video captions at inference. [2][3]

### Seedance 2.0 [4][5]
- **Unified multimodal audio-video joint generation architecture** — text, image, **audio**, and **video** inputs; native synced audio output.
- **Director-level control**: images/audio/videos as references; control over performance, lighting, shadow, camera movement.
- Models on Volcano Ark: `doubao-seedance-2-0-260128` (standard), `...-fast-260128`, `...-mini-260615`. [7]
- Reference/Edit/Extend workflows; audio-video sync; first-frame & first-last-frame modes.

### Seedance 2.5 [8][9]
- Upgrade on 2.0: longer duration (up to ~30 s), more multimodal references (up to ~50), better editing, improved camera/lighting/texture, better negative-prompt & timestamp-based instruction following.
- Available on Volcano Ark / BytePlus ModelArk, plus hosts (fal.ai `fal-ai/seedance/...`, Replicate `bytedance-seedance/seedance-2.5`).

---

## 2. Prompt Structure + Verbatim Examples

### 2.1 Canonical formula (Sythesized from official guide + invideo) [5][6]
```
[Subject] + [Action] + [Environment/Scene] + [Camera] + [Lighting] + [Style] + [Quality Constraints]
```
ByteDance's own "advanced formula" (Chinese): **精准主体 + 动作细节 + 场景环境 + 光影色调 + 镜头运镜 + 视觉风格 + 画质 + 约束条件** = *precise subject + action detail + scene/environment + light/shadow/tone + camera movement + visual style + image quality + constraints*. [5]

**Lead with subject + core action — the opening ~20–30 words carry the most weight.** [5][6]

### 2.2 Verbatim prompt examples

**Official 1.0 tech-report examples (I2V + T2V) [1]:**
> "A girl is playing the piano, with multi-shot transitions and a cinematic look (I2V)"

> "Multiple shots. A detective enters a dimly lit room. He inspects the clues on the table and picks up an item. The shot shifts to capture him thinking."

> "A skier is gliding down the slope, kicking up a large cloud of snow as he turns, and gradually speeding up along the hillside, with the camera moving smoothly."

> "A model in a black backless dress elegantly walks on a striking red runway. Light brings out the flowing texture of the fabric. The audience watches the model intently, and the lights gradually fade away."

**Official 2.0 prompt-guide example — shot-script form (镜头/shots) [5]:**
> 镜头 1：街巷侧拍，男人缓慢起跑，带有急促的呼吸感。 *(Shot 1: side shot in the alley, the man starts slowly, with a hurried breath.)*
> 镜头 2：男人撞翻水果摊，镜头快速摇动并给到男人惊恐的特写。 *(Shot 2: he knocks over a fruit stall, the camera whips and gives a terrified close-up.)*
> 镜头 3：男人翻过矮墙消失，镜头缓慢拉远定格在空荡的街道。 *(Shot 3: he vaults a wall and disappears, camera slowly pulls back and holds on the empty street.)*

**Official 2.0 "master-template" style prompt (3,000-char cap) [6]:**
> "A clear glass perfume bottle sits on a black stone pedestal in a dark studio. Condensation rolls slowly down the glass as a single drop falls onto the surface below. Medium close-up with a slow circular dolly move. Soft side lighting, high contrast reflections, luxury beauty-ad look. Subtle room tone and one sharp glass tap. Stable product shape, clean label detail, natural motion."

**2.5 multi-shot shot-script example (third-party guide — [unverified], no primary) [8]:**
> `[0:00–0:03] WIDE SHOT — Aerial view of a volcanic island at sunrise, slow push in.`
> `[0:03–0:08] MEDIUM SHOT — A researcher emerges from a tent, looks toward the volcano, rack focus to her face.`
> `[0:08–0:15] CLOSE-UP — Her eyes reflecting the distant glow, golden hour light, handheld slight tremor.`
> `Style: BBC Planet Earth, 4K cinematic, natural sound design.`

### 2.3 Motion / movement description [5][6]
- Describe **actions** with concrete, sequential beats (`Camera performs a slow cinematic dolly forward`, `The camera pulls away and freezes`).
- **Abstract emotions must be externalized into visible actions** — the official guide gives a table (sadness = "lowered head, slightly trembling shoulders, eyes welling but not spilling"; joy = "uncontrollable smile, relaxed brows, lighter steps"). [5]
- Two prompt styles: **action prompts** (arrow/shot-list style: `woman walks in › pauses › moves to window › pulls curtain › light floods her face`) vs **feel prompts** (mood) — prefer one per prompt. [6]

### 2.4 Camera control [5][6][7]
- Camera is expressed **in the prompt text**, not as a numeric API parameter.
- Use terms like: `push in`, `dolly in`, `pull back`, `follow/tracking`, `pan`, `orbit/arc`, `rack focus`, `low-angle`, `over-the-shoulder`, `static/固定机位`, `handheld`.
- 2.0 API also exposes **`camera_fixed`** (boolean) in some builds to hold the camera steady. [7]
- Reference videos are an even stronger camera-motion control: *"参考 <视频N> 的运镜方式"* (reference the camera movement of video N). [5]

---

## 3. Parameters / Controls

### 3.1 Official Volcano Engine Ark API (2.0, primary) [7][10]
Async two-step workflow: `POST /contents/generations/tasks` → poll `GET .../{id}` → `content.video_url` (MP4, valid ~24 h).

| Parameter | Type | Default / Notes |
|---|---|---|
| `model` | string | `doubao-seedance-2-0-260128` (std), `...-fast-...`, `...-mini-...` |
| `content` | array | list of `{type: text\|image_url\|video_url\|audio_url}` entries |
| `duration` | int | seconds; **range [4,15]**; `-1` = auto (2.0). 2.5 extends to ~30 s [unverified] |
| `resolution` | string | `480p` / `720p` / `1080p` (2.0: 1080p not supported in some modes; 1.5-pro/1.0-lite default 720p, 1.0-pro default 1080p) |
| `ratio` / `aspect_ratio` | string | `16:9, 4:3, 1:1, 3:4, 9:16, 21:9, adaptive` |
| `seed` | int | `-1` default; range [-1, 2^32-1]; same seed → similar but **not identical** output |
| `generate_audio` | bool | `true` default (2.0) — synced audio |
| `watermark` | bool | `false` |
| `camera_fixed` | bool | hold camera steady (1.0-era / some builds) |
| `frames` | int | specify frame count instead of duration (rare) |
| `return_last_frame` | bool | return last frame PNG for chaining |
| `callback_url` | string | webhook for status |
| `execution_expires_after` | int | task timeout [3600, 259200] |

**Parameter passing:** newer models prefer **request-body params** (strong validation; errors if wrong). Older 1.0–1.5 allow appending **`--[parameters]`** to the text prompt (e.g. `小猫对着镜头打哈欠 --rs 720p --rt 16:9 --dur 5 --seed 11 --cf false --wm true`). [10]

**Prompt length cap:** ~**500 characters** recommended in the text field (official; >500 → model may drop details); third-party guides cite a 3,000-char cap for the full window. [5][10][6]

### 3.2 2.5 parameters (third-party — partial, **[unverified]**) [8]
- MuAPI 2.5 params: `prompt`, `image_url` (I2V single), `images_list` (first/last frame = 2 URLs; omni = up to 30 refs), `videos_list` (≤10 clips), `audios_list` (≤10 clips), `aspect_ratio`, `duration`.
- Native Ark/BytePlus 2.5: `duration` (-1 auto or 4–30, default 5), `resolution` (480p/720p/1080p/4K route), `ratio`, + `content.role` marking reference asset purpose (`first_frame`, `last_frame`, `reference_image/video/audio`).
- Sound: **use only where a primary source exists**; 2.5 specifics are largely third-party-documented.

---

## 4. Best-Practice Prompting Techniques

1. **Lead with subject + one clear action** — first ~20–30 words dominate. [5][6]
2. **Use a structured order** (subject → action → scene → camera → lighting → style → constraints), not adjective-stacking. "Clarity beats intensity." [6]
3. **Timecode / shot-script the sequence** (镜头1/2/3 or `[0:00–0:03]`) for multi-shot; organize shots in event order, main-first. [5][8]
   - Caveat: official guide warns **exact second-level timing (0–3 s) is unstable** — prefer relative/sequential shot labels over hard timestamps. [5]
4. **Externalize emotion into visible action** rather than naming the feeling. [5]
5. **Assign reference roles** with `@` (e.g. `@image1` = character, `@frame1` = opening comp, `@video1` = camera/choreography) and **place important references early** in the prompt. [6][5]
6. **Shorten I2V prompts** — the reference image already carries the scene; keep text to the action/camera/constraints. [6]
7. **Reference video is the strongest motion control** — "a clean reference clip does more for motion than fifty extra words." [6][5]
8. **Use constraint words to avoid artifacts** — official templates: `保持无字幕` (keep no subtitles), `不要生成 Logo` (no logo), `不要生成水印` (no watermark), `无卡顿无闪烁` (no stutter/flicker), `画面稳定` (stable frame). [5]
9. **Use symbol conventions for audio** (official): `（）` = music, `<>` = SFX, `{}` = dialogue, `【】` = subtitles. [5]
10. **Audio direction**: describe sound explicitly (e.g. "Subtle room tone and one sharp glass tap"). [6]

### Pro-tip for the generator
Emit a **timecoded shot-script** as the default "video mode" — it maps 1:1 to both Seedance 2.0 quick guide conventions and the 2.5 format, and is the most differentiated from image prompting.

---

## 5. Known Limitations / Gotchas [5]

From ByteDance's official 2.0 prompt guide (high confidence) [5]:
- **Exact timestamps unstable** — forcing 0–3 s timing can produce abnormal results; prefer sequential shot labels.
- **Subtitle/watermark leakage** — model may add subtitles or logos even when unrequested; can reduce (not eliminate) via constraint words, removing text from refs, and preferring landscape.
- **Character ID drift ("换脸")** — use a dedicated **face close-up (大头照)** reference + separate full-body/clothing ref; put crucial refs early; **avoid multi-view** refs (model may treat angles as separate subjects).
- **Style drift** — real-photo reference without a style constraint may drift to live-action; add explicit style words ("2D日漫风格") or convert the ref to target style first.
- **Twin/duplicate-subject glitch** — model may clone a person at ~8 s; constrain "no repeated identical characters" and use single-person refs.
- **Extend/quality degradation** — chaining extensions decays quality (esp. faces); limit continuation count, use high-DPI refs.
- **>4 reference people** → unstable counts; group and generate in stages.
- **Text/SFX precision** — precise digital effects (countdowns, small text) unreliable via text; use a **reference video** to define the effect.
- **End-of-clip audio noise** — fade audio (volume envelope) in post if a pop/snap appears at the end.
- **Chinese homophone mispronunciation** — replace rare/ambiguous chars with same-sound common chars.

---

## 6. Backend / Architecture Notes [2][3]

- **DiT with decoupled spatial & temporal layers** (diffusion transformer): spatial layers aggregate attention *within* each frame; temporal layers attend *across* frames (window partitioning, global temporal receptive field). Textual tokens interact cross-modally **only in spatial layers**. [2][3]
- **MM-RoPE** (3D multi-modal rotary positional encoding): 3D RoPE for visual tokens + extra 1D position encoding for text; supports interleaved visual+textual token sequences and multi-shot sequences with per-shot captions. [2][3]
- **Video VAE** with a hybrid PatchGAN-style discriminator for appearance+motion latents. [3]
- **Cascaded / diffusion-refiner generation**: base model renders **480p**, then a learned **refiner** upscales to 720p/1080p (explains why 2.0's 1080p adds cost and why some tiers are 480p/720p only). [3]
- **Unified task formulation**: binary masks mark which input frames are "instructions to follow," unifying T2I/T2V/I2V joint training. [2][3]
- **Post-training**: composite reward system of three reward models (**foundational** = image-text alignment + structural stability, VLM-based; **motion**; **aesthetic**) + video-tailored RLHF maximizing composite reward (reported more efficient than DPO/PPO/GRPO). [2][3]
- **Inference speed**: ~**41.4 s** for a 5 s 1080p clip on NVIDIA L20 (1.0). [1][2]

---

## Sources

All URLs below were fetched during this research. [n] markers above map to these IDs.

1. https://seed.bytedance.com/en/blog/tech-report-of-seedance-1-0-is-now-publicly-available — *Seed News: Tech Report of Seedance 1.0 Is Now Publicly Available* (ByteDance, official)
2. https://huggingface.co/papers/2506.09113 — *Seedance 1.0: Exploring the Boundaries of Video Generation Models* (HF paper page → arXiv)
3. https://arxiv.org/html/2506.09113v2 — *Seedance 1.0: Exploring the Boundaries of Video Generation Models* (full paper)
4. https://seed.bytedance.com/en/seedance2_0 — *Seedance 2.0* (ByteDance Seed, official)
5. https://www.volcengine.com/docs/82379/1587797 — *Doubao Seedance 2.0 系列提示词指南* (official Volcano Engine prompt guide)
6. https://invideo.io/blog/seedance-2-0-prompt-guide/ — *Seedance 2.0 Prompt Guide (With Examples)* (reputable third-party)
7. https://github.com/mercallureAI/seedance — *Seedance 2.0 API SKILL.md* (third-party API param reference)
8. https://github.com/Anil-matcha/awesome-seedance-2.5-api-prompts — *Awesome Seedance 2.5 — API, Prompts & Complete Guide* (third-party)
9. https://we0.ai/articles/seedance-2-5-api-is-live — *Seedance 2.5 API Is Live on Volcano Engine* (third-party)
10. https://www.volcengine.com/docs/82379/1520757 — *Seedance 2.0 API 参考官方文档* (official Volcano Engine API reference)
11. https://linghuiai.net/en/guide/doubao-seedance-2-0-prompt-guide — *Doubao Seedance 2.0 Prompt Guide* (third-party, four-step method)
12. https://research.doubao.com/en/seedance — *Seedance 1.0* (ByteDance research page, official mirror)
