# Video Prompting Research — Runway (Gen-3/Gen-4) & Kling

*Research input for Cappytool No.2 (random image/video prompt generator). Compiled from primary vendor documentation and reputable secondary guides. Inline `[n]` refs map to `video.sources.json`; `[unverified]` marks URLs referenced but not fully read in this pass.*

---

## Executive Summary

Video prompting differs from image prompting in one decisive way: **text describes *motion over time*, not a static scene**. For both backbones the winning formula is *subject + action + scene + camera + lighting/mood + pacing*, with **one dominant motion or camera move per clip** — overloaded prompts produce unstable, drifting, or morphing output.

Two contrasting control philosophies matter for a prompt generator:

- **Runway (Gen-3/Gen-4)** — *motion-first, minimize text.* Gen-3 was text-to-video; Gen-4 is **image-to-video only (input image required)**, so the prompt should be almost entirely about *what moves*, with positive phrasing and no negative prompts. Simple prompts beat long ones. Camera control is partly a separate UI (Gen-3 Turbo camera controls) and partly prompt-driven.
- **Kling (Kuaishou)** — *richer structured prompts + explicit controls.* Supports both text-to-video and image-to-video (first frame, last/end frame, reference images), a dedicated **Negative Prompt** field, and **Cfg scale (0–1)** to trade prompt adherence vs. natural motion. Kling 3.0 adds Multi-Shot storyboards, elements/reference binding for character consistency, and native audio.

Common cross-model truths: one action per clip, keep clips 5–10s, describe the *end state* of a camera move (reveal), tie camera motion to subject motion, and iterate from a minimal prompt by adding one element at a time.

---

## 1. Runway (Gen-3 Alpha / Gen-3 Turbo / Gen-4)

> Note: Runway retired Gen-3 Alpha (Jul 8 2026) and Gen-3 Alpha Turbo (Jul 30 2026) [7]. Current models: Gen-4 / Gen-4 Turbo and Gen-4.5 [1][2]. Research below covers the still-authoritative Gen-3 camera-control mechanics plus Gen-4 prompting guidance.

### 1.1 How Runway parses prompts (text + image/video)

- **Gen-4: input image is REQUIRED.** The image is frame 0 — "the visual starting point of the entire generative process and acts as the first frame of your output video." It conveys subjects, composition, colors, lighting, style. [2][1]
- Because the image carries the visuals, **"your text prompt should be almost entirely focused on describing the desired motion."** [2][1]
- Best practices [1]:
  - **Power of simplicity** — start minimal, iterate by adding one element at a time (subject motion → camera motion → scene motion → style).
  - **Positive phrasing only.** Negative prompts are *not supported* and may produce unpredictable/"opposite" results. `❌ No camera movement. The camera doesn't move.` is actively discouraged; write `✅ Slow static lock-off shot.` [1]
  - **Refer to subjects generically** ("the subject", "she") so the model animates smoothly instead of reinterpreting details already in the image. [1]
  - **Avoid conversational/command phrasing** — LLMs like chat; Runway wants visual/motion detail, not greetings or explanations. [1]
- Two ways to describe scene motion [1]:
  - **Insinuated** (via adjectives, more natural): *"The subject runs across the **dusty** desert."*
  - **Described** (direct, emphasizes the element): *"The subject runs across the desert. **Dust trails behind them** as they move."*

**Verbatim example prompt (all four elements) [1]:**
> `a handheld camera tracks the mechanical bull as it runs across the desert . the movement disturbs dust that trails behind the mechanical creature. cinematic live-action .`

### 1.2 Motion / movement description techniques

- **Subject motion**: physical movement, expressions, gestures. Use generic referents (`the subject`) or positional identifiers for multiple subjects (*"The subject on the left walks forward. The subject on the right remains still."* / *"The woman nods. The man waves."*) [1]
- **Camera motion**: movement style (locked, handheld, dolly, pan), tracking subjects, shifts in focus. [1]
- **Scene motion**: ambient/environmental motion (dust, water, cloth), insinuated vs. described. [1]
- **Style descriptors**: broad motion/mood/medium cues — speed, live-action vs. smooth animation vs. stop motion, aesthetic. [1]
- Useful reference (independent guide): describe camera and subject motion **separately**, with direction/speed/character — *"slow, weighted crane rise"* vs. *"rapid handheld pan"*; subject physics like *"walking with deliberate, measured steps."* [8]

### 1.3 Camera control

- Gen-3 Alpha Turbo has a dedicated **Camera Control** tool with numeric sliders per axis, values **-10 to 10** (0 = static; sign = direction, magnitude = intensity/speed): **Horizontal, Vertical, Zoom, Pan, Tilt, Roll**, plus movement like push-in, pull-out, move left/right, and orbit-style motion. [6][10][unverified help article 9]
- Trained guidance: pair camera controls with a text prompt that names the **end scene** (a zoom-out revealing what) or subject action to keep the scene intentional. [10]
- In Gen-4 (prompt-driven): camera motion is prompted in natural language — *locked, handheld, dolly, pan, tracking*. [1]

### 1.4 Parameters

| Parameter | Gen-4 values [2] | Notes |
|---|---|---|
| Duration | 5s or 10s | 5s=60 cr, 10s=120 cr (Gen-4); 5s=25/10s=50 (Turbo) |
| Text prompt limit | 1000 characters | |
| Aspect / resolution | 16:9→1280x720, 9:16→720x1280, 1:1→960x960, 4:3→1104x832, 3:4→832x1104, 21:9→1584x672 | 24fps |
| Inputs | Text + Image (required) | |
| Credits | 12 cr/sec (Gen-4), 5 cr/sec (Turbo) | |

Camera control values (Gen-3 Turbo): each axis -10…10 [10]. There is no explicit "motion bucket" or numeric seed exposed in the consumer docs surveyed (seed is a GUI/API-level control, not surfaced in first-party prompting guides) [unverified].

### 1.5 Best practices for coherent video

1. Iterate from a simple base motion; add one element at a time. [1]
2. Use a clean, artifact-free input image. [1]
3. Motion-first text; let the image define look. [1][2]
4. Positive phrasing only; no negatives. [1]
5. Keep net prompt under 1000 chars. [2]
6. One action per clip; avoid temporal chaining ("then", "next"). [6]

### 1.6 Known limitations / gotchas

- **Image required** — Gen-4 cannot run text-only. [2]
- Negative phrasing can invert meaning. [1]
- Complexity degrades stability (too many simultaneous moves / subjects). [10]
- Long conversational prompts waste the 1000-char budget. [1]
- Gen-3 retired; behavior of legacy camera-control axes not documented in Gen-4's natural-language path [7][unverified].

### 1.7 Backend notes (temporal conditioning)

- Gen-4 is a diffusion-transformer generation system that Runway markets on **character/object/style consistency across frames from a single reference image** and improved real-world physics [11][12]. Secondary/technical write-ups describe **full spatiotemporal self-attention (every token attends to every other token across space and time)** as the mechanism for temporal consistency [13] — treat this as a secondary, not first-party, claim [unverified]. Confirmed: text + image are fused inputs to condition generation [2].

---

## 2. Kling (Kuaishou)

### 2.1 How Kling parses prompts (text + image/video)

- **Always text-driven; optionally image/first-frame/last-frame/feature-video/video-driven.** The prompt is the anchor. In image-to-video, the prompt usually *names the motion/change* while preserving the reference. [4][14]
- Content types in the Omni/Kling 3.0 API: `prompt`, `first_frame`, `last_frame`, `refer_image`, `feature_video`, `base_video`, plus **Elements** (video-character / multi-image element binding referenced in-prompt as `@Name`) and voice binding for audio. [14]
- Prompt cap: **3072 chars** (recommended ≤2500) per Omni docs; 2500 for text/image-to-video (V2.6 class). [14][3]
- Guidance from Kling's official prompt guide: a strong prompt defines **subject, action, scene, camera language, lighting/mood** in plain readable language. [5]

**Verbatim example (camera-forward, from official blog) [5]:**
> `A smooth and deliberate dolly-in tracking shot approaching a classical marble statue of a graceful female figure standing on an elegant stone terrace. The camera starts from a medium-wide distance and slowly moves forward toward the statue with cinematic precision. As the dolly-in progresses, the camera simultaneously performs a subtle pan right and a gentle tilt upward, gradually revealing the statue's intricate details, flowing drapery, serene facial expression, and elegant posture from a lower angle to a more heroic low-angle view. ... Photorealistic, 8K detail, masterpiece cinematography`

### 2.2 Motion / movement description techniques

- **Motion intensity control** (secondary guide on Kling 3.0): specify motion level 0.3 (subtle) to 1.0 (dramatic) — e.g. *"motion intensity 0.6"*; moderate ~0.5 to start. [15]
- **Multi-shot prompting**: sequence shots with differing perspective/purpose while keeping subject consistency (wide establishing → medium action → close-up reaction). [5][15]
- **Negative prompt strategy** is central to Kling: it tends to fill in drifting cameras and facial detail changes when direction is loose; negatives like *"no camera drift, no handheld movement, no sudden zooms, no facial warping, no flicker, no motion blur"* sharply improve stability. [8]
- Tie camera motion to subject motion for clarity. [4]

### 2.3 Camera control

- Official **Camera Movement** function supports **six basic movements — horizontal, vertical, zoom, pan, tilt, roll — plus four "Master Shots": move-left-and-zoom-in, move-right-and-zoom-in, move-forward-and-zoom-up, move-down-and-zoom-out**, with adjustable displacement (extent) parameters. Example base prompt used in demos: *"A giant panda is playing the piano by the lake."* [6][3]
- Natural-language camera direction is explicitly encouraged: *push in, pull back, pan left/right, tilt up/down, track forward, orbit slowly, static*. [4][5]
- **One main camera move per shot**; avoid stacking "push in + pan + tilt + orbit". [4]
- Camera prompt patterns [4]:
  1. *Subject + Camera Move + Purpose* — "Camera slowly pushes in on [subject] to emphasize [detail]."
  2. *Start Frame → End Frame* — "Start with a close-up of X, then pull back to reveal Y."
  3. *Move + Speed + Stability* — "Slow, stable pan left across [scene], no sudden motion."
  4. *Shot list (Multi-Shot)* — short planned shots.
- Shot-type/framing vocabulary: extreme close-up, medium close-up, full body, establishing wide; composition terms ("centered", "rule of thirds", "off center"). [5]

### 2.4 Parameters (API V2.6-class, per official/derived docs) [e.g. 3]

| Parameter | Values | Notes |
|---|---|---|
| `prompt` / `negative_prompt` | ≤2500 chars (V2.6); ≤3072/2500 (Omni) | negative optional |
| `mode` | `std`, `pro` | V1.6 does not support pro; pro required for end-frame |
| `aspect_ratio` | `16:9`, `9:16`, `1:1` (default 16:9) | |
| `duration_string` | `"5"`, `"10"` (T2V/first-frame I2V); Omni allows 3–10 where supported | |
| `cfg_scale` | range **[0,1]** | higher = stronger prompt adherence; lower ≈ more natural motion |
| `sound` | `on`, `off` | V2.6+ only; native audio |
| `voice_list` | up to 2 voices | voice binding |
| `init_image` / `image_tail` | required (I2V) / optional end frame | image_tail requires `mode=pro` |
| Resolution (consumer) | HD/1080p/4K; 30fps (2.1 Pro reports) | 4K ~30 credits/sec (3.0) [5] |

Cfg tuning guidance: higher ~0.7–1.0 = stronger style/detail adherence; lower ~0.3–0.6 = more natural motion [3].

### 2.5 Best practices for coherent video

1. Use the official 5-element structure: **subject, action, scene, camera, lighting/mood**. [5]
2. Start minimal, add one element at a time; keep a "personal library" of proven prompts. [5]
3. Use negative prompts to set stability boundaries (no drift, no warp). [8]
4. One camera move per shot; match it to the scene. [4]
5. For multi-shot, plan shot-by-shot (each shot one job) and use reference binding for character identity. [5][4]
6. Set `cfg_scale`, `aspect_ratio`, and audio intention early. [3]

### 2.6 Known limitations / gotchas

- Loose prompts → **drifting cameras, ad-lib movement, subtle facial drift**; mitigate with negatives + tighter positive prompt (tightening the positive usually works better than adding negatives). [8]
- **Native audio is a V2.6+ / 3.0+ capability**; many classic Kling generations are silent — don't assume audio. [16]
- Too many moves in one shot degrades consistency. [4]
- Contradictory instructions ("static with fast push-in and orbit") confuse the model. [4]
- 4K improves detail during moves but doesn't fix a weak prompt. [4]
- Output is probabilistic; some variation is expected even with strong prompts. [4]

### 2.7 Backend notes (temporal conditioning)

- Kling (Kuaishou) video models are latent/video-diffusion systems with a strong spatiotemporal prior and physics simulation emphasis (Kling 3.0 markets realistic physics: liquids, fabric, collisions). [15]
- Conditioning is multimodal and reference-aware: first/last frames, reference images, feature videos, and Elements are fused with the text prompt through a transformer/attention stack so identity/camera continuity hold across shots. [4][14]
- **Multi-Shot / storyboard** is a first-class structural conditioning input (shot duration, shot size, perspective, narrative, camera per shot) rather than a pure diffusion prior. [4][5]

---

## Sources

- [1] https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide — Runway Gen-4 Video Prompting Guide (primary)
- [2] https://help.runwayml.com/hc/en-us/articles/37327109429011-Creating-with-Gen-4-Video — Runway Creating with Gen-4 Video (primary)
- [3] https://www.ambienceai.com/tutorials/kling-prompting-guide — Kling 2.1 Pro prompt guide, params, template (secondary)
- [4] https://kling.ai/blog/kling-ai-camera-control-video-guide — Kling Camera Control guide: push/pull/pan/tilt (primary)
- [5] https://kling.ai/blog/kling-ai-prompt-guide — Kling AI Prompt Guide (primary)
- [6] https://kling.ai/quickstart/ai-camera-control-guide — Kling Camera Movement quickstart, 6 moves + Master Shots (primary)
- [7] https://help.runwayml.com/hc/en-us/articles/30586818553107-Gen-3-Alpha-Prompting-Guide — Runway Gen-3 Alpha Prompting Guide (retirement notice) (primary)
- [8] https://artlist.io/blog/negative-prompts-ai-video — Negative prompts for Kling/Veo/Wan (secondary, strong examples)
- [9] https://help.runwayml.com/hc/en-us/articles/34926468947347-Creating-with-Camera-Control-on-Gen-3-Alpha-Turbo — Runway Camera Control on Gen-3 Turbo (primary; body not fully extracted — [unverified])
- [10] https://filmart.ai/runway-camera-control-runway-gen-3-camera-prompts — Runway Gen-3 camera control values -10…10 (secondary)
- [11] https://the-decoder.com/runway-releases-gen-4-video-model-with-focus-on-consistency — Gen-4 consistency/physics coverage (secondary)
- [12] https://arstechnica.com/ai/2025/03/with-new-gen-4-model-runway-claims-to-have-finally-achieved-consistency-in-ai-videos — Ars Technica Gen-4 consistency (secondary)
- [13] https://aimodels.in/ai-models/runway-gen-4/ — Gen-4 architecture note: spatiotemporal self-attention (secondary, [unverified claim])
- [14] https://kling.ai/document-api/api/video/3-0-omni/video-omni — Kling 3.0 Omni Video API docs: contents/settings params (primary)
- [15] https://www.veed.io/learn/kling-3-0-prompts — Kling 3.0 prompting: motion intensity 0.3–1.0, multi-shot, negatives (secondary)
- [16] https://www.ambienceai.com/tutorials/kling-prompting-guide — see [3] for native-audio limitation note

*Unverified refs used contextually: [9] (body unread), [13] (secondary architecture claim).* See `video.sources.json` for the machine-readable source list.
