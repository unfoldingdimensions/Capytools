# decision.md — Capytools launch video

*Decision record for the launch-video effort. Companion to [learning.md](learning.md). Each decision is numbered D1… and marked: **decided** (we commit), **recommended** (my call unless overridden), or **open** (needs the owner). References: V2 playbook `E:\New-Personal-Projects\Video Design-Generation-Editing\RESEARCH-REPORT-V2.md`; v1 artifacts in `out/`.*

---

## D1 — Retrofit v1, don't rebuild · **decided**

**Context:** `out/capytools-launch.mp4` (62.9 s, 1080p25) already passes QC with a full contract; it fails the V2 polish bar in specific, enumerable ways (learning.md L2).
**Decision:** treat v1 as the base. Produce **v2 as a retrofit**: reorder structure, upgrade motion, fix audio, add delivery variants. From-scratch work is limited to new capture and 1–2 rebuilt-UI scenes.
**Consequence:** roughly a half-day of work instead of a full rebuild; v1's contract artifacts become the diff baseline.

## D2 — Two-lane production architecture · **decided**

**Decision:** real-footage beats come from **`url2video` scripted captures** (eased pointer moves, 1500–2500 ms click dwell, `showCursor`, 25 fps, chaptered ≤90 s takes); polished/abstract beats come from **Remotion rebuilt-UI scenes**. The video-agent-kit loop (timeline → validate → render → qc → timeline_diff) owns assembly and QC for anything with real footage.
**Consequence:** deterministic, re-runnable captures that survive UI changes; synthesized polish where capture can't reach.

## D3 — Structure: make CapyStrip the magic moment at ≤15 s · **decided**

**Decision:** reorder from v1's five-equal-tours to:
1. Onsen hook, "less is more" first frame — one focal element, title revealing at 0.8–1.2 s, payoff tease by 3 s.
2. Quick triple-flash: CapyWrapped / CapyImagine / CapyCreator (~4 s each, name + one visual idea).
3. **CapyStrip magic sequence ≤15 s mark** — photo dropped → metadata revealed row by row (GPS, device, AI fingerprints) → stripped → re-scan proves it.
4. CapyExpense as the "desktop app too" beat.
5. Quiet brand close on cream, gold URL fading up dead-center and never moving (kept: unknown brands may carry a moderate CTA).
**Consequence:** 60–63 s total (inside the data sweet spot); the visceral demo lands before the drop-off window.

## D4 — Adopt the motion-token table; code owns arithmetic · **decided**

**Decision:** encode the V2 motion tokens as a single TS module (`motion.ts`) imported everywhere: blur-to-sharp `enter()` (opacity 7 f + translateY 15 f + blur 10 f, 5–6 f stagger — borrowed from astra-remotion and promoted), choreographed exits, cursor pre-arrival spec, task-sequence timings, `back.out(1.35)` modals, `pow(i,0.8)` stagger compression, three-transition grammar with 12–20 f scene pre-roll. **All scene boundaries and delays come from a beats config, never inline magic numbers** (the explicit anti-astra-remotion rule). Brand fonts vendored and gated behind `delayRender`; no per-character blur on long text.
**Consequence:** polish is `import { tokens }`; retiming is a data edit, not a ripple.

## D5 — Audio pass · **decided**

**Decision:** add a soft ambient bed (Pixabay/Mixkit, licence text archived) ducked 15–21 dB under VO; run two-pass loudnorm to **−14 LUFS / −1 dBTP** on the master (`make.py cut` discipline — v1 was gain-trimmed, never normalized). Voice: Gemini TTS (already paying) replaces edge-tts's ToS-grey endpoint for the deliverable; regenerate only changed lines.
**Consequence:** release-safe loudness; removes the flagged distribution blocker from v1's report.

## D6 — Delivery set, not one file · **decided**

**Decision:** one 1080p25 master → variants: X/Product Hunt 16:9 · LinkedIn/Instagram 4:5 and 1:1 · Shorts 9:16. Burned karaoke captions (60–75 px at 1080×1920, ≤3 colors, sage accent, full phrase visible with word highlight) on all feed cuts; clean SRT archived. Publish framing "**Introducing Capytools**", Monday or Friday, morning-peak window; if per-tool follow-ups get made, pulse them across 3–5 days rather than dribbling.
**Consequence:** mute-autoplay surfaces are covered; launch copy uses the 5× framing.

## D7 — Constraint: brand marks and assets only from this repo · **decided**

**Decision:** CapyMark, the onsen renders, and DESIGN.md tokens are the only brand assets; no third-party logos or marks anywhere (the astra-remotion OpenAI-mark pattern is explicitly not copied). No stock UI screenshots with third-party chrome; rebuilt UIs strip browser chrome per the rebuilt-UI rule.
**Consequence:** zero licence exposure; consistent frames.

## D8 — Keep the capybara onsen as bookend · **recommended**

**Rationale:** it is the brand memory device — the "single focal element + vast negative space" hook that performed best in the 77-video data, and the render's background already matches the brand canvas exactly.
**Override condition:** none foreseen; revisit only if the mascot direction changes.

## D9 — VO strategy · **open (recommended: VO master + captioned VO-free social cuts)**

**Context:** Anthropic flagships skip VO for a calmer read; our narration is calm, aids accessibility, and v1 already has approved lines.
**Recommendation:** keep VO on the 16:9 master; social variants run VO-free with burned captions to match feed-native rhythm.
**Needs:** owner ear-check of regenerated Gemini TTS lines.

## D10 — Landing page shots · **open (recommended: still excluded until homepage is final)**

**Context:** v1 excluded `/` because it was being finalised; the "made *quiet.*" TextReveal would otherwise be a natural shot.
**Recommendation:** hold the exclusion for v2; if the homepage ships before render day, add one 3–4 s beat between intro and triple-flash.
**Needs:** owner confirmation of homepage status at production time.

---

**Sequencing (agreed order of execution):** beats config + `motion.ts` → `url2video` captures for the five tool beats → Remotion scenes (CapyStrip magic moment, hook, outro) → assembly through the video-agent-kit loop → audio pass (D5) → variants + captions (D6) → QC against the V2 checklist → publish per D6.
