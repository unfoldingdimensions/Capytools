# learning.md — Capytools launch video

*Working learning log for the launch-video effort. Companion to [decision.md](decision.md). Sources: the V1/V2 research playbook (`E:\New-Personal-Projects\Video Design-Generation-Editing\RESEARCH-REPORT.md` and `RESEARCH-REPORT-V2.md`, notes in its `research/notes/`), direct inspection of this repo's v1 video artifacts (`out/`), and a full read of [Tejashmakwana/astra-remotion](https://github.com/Tejashmakwana/astra-remotion) (2026-09-08).*

---

## L1. What "polish" actually is (V2 research, condensed for this project)

The 2026 launch-video standard (reverse-engineered from 77 Anthropic Claude videos) is a rule system, not taste:

- **Restraint grammar**: ~60% hard cuts, ~0% dissolves, every transition < 2 s, stable camera, zoom only for narrative purpose and only at area level (never a single button), no logo intro, no CTA end card (unknown brands may keep a quiet URL), sentence-case titles ending with a period, font weights 500/600/700 only.
- **The "rebuilt UI" lane**: flagship spots never record real screens — they rebuild pixel-perfect UI in code on device mockups. Screen capture is for demos, tutorials, and authenticity beats.
- **Motion tokens** (frame-level): cursor arrives 0.46 s early, flies on `power3.out`, click pulse, fades +0.82 s · task-sequence lines 0.28/0.16/0.10 s with 0.05 s stagger · modals from `y:34, scale:0.965`, `back.out(1.35)`, 0.42 s · opacity and transform never share a curve · stagger compresses (`pow(i,0.8) × base` + 1–2 f jitter) · children follow through on looser damping.
- **Data-backed structure**: launch spots 60–90 s (2–8× the views of every other band; >90 s falls off a cliff); a "magic moment" (the system visibly completing something for the user) must land within the first 15 s; "Introducing X" copy earns ~5× "X is now available"; scenes 4–8 s in 60–90 s spots; every social surface except YouTube main autoplays muted.

## L2. What our v1 already proves (and what it lacks)

`out/capytools-launch.mp4` (62.9 s, 1080p25, QC pass) proves the pipeline works end-to-end: Blender onsen render as emotional bookend, per-tool name cards in real brand type, page captures with a subtle zoom, calm narration, full video-agent-kit contract (validate → render → qc, warnings explained in `out/report.md`).

Gaps against L1: page shots are stills + 1.035 zoom (nothing moves itself) · CapyStrip — the most visceral demo — sits at ~35 s instead of being the ≤15 s magic moment · straight segment cuts with no entrance choreography · audio gain-trimmed but never two-pass loudness-normalized to −14 LUFS · no music bed · 16:9 master only, no platform variants or captions.

## L3. astra-remotion is a working proof of the grammar — in one file

A 41.9 s satirical launch spot, one `Film.tsx` (~77 lines), no dependencies beyond Remotion. What it demonstrates:

- The **rebuilt-UI lane is cheap**: fake ChatGPT, a Slack notification (with a hand-drawn SVG Slack logo), a report document, checklists — all drawn in code. No screen recording anywhere.
- **Scene-function pattern**: each scene is a component taking local frame `f` (`<Chat f={frame-225}/>`), composed by a frame-range switch. Good prototype shape.
- **Blur-to-sharp entrances "arrive"**: `opacity` (7 f) + `translateY 32→0` (15 f) + `blur 9→0` (10 f), items staggered 5–6 f; exits are choreographed (slide + scale-down + blur-out, 5 f). This is a measurable step beyond plain fade+slide — the "arrived vs faded in" distinction from the remocn craft notes.
- **Virtual cursor**: SVG arrow with drop-shadow, position driven by an `easeOutCubic` helper (= the teardown's `power3.out`), traveling to targets ahead of clicks.
- **One-accent discipline**: white/gray world, single soft blue spent only on key words, active states, payoffs.
- **Springs only where bounce belongs** (`spring({damping:16, stiffness:140})` for the notification), clamped cubic ease everywhere else.
- **Hook = subversion**: sets up an expected pattern ("Introducing…"), breaks it by ~2.5 s. Structure transfers even though the joke doesn't.

## L4. astra-remotion's flaws are exactly our pipeline's disciplines

1. **All frame arithmetic is hardcoded magic numbers** — scene boundaries, per-scene offsets, entrance delays (`22+i*6`). One copy edit ripples through every downstream offset. Our rule stands: beats are data (beat-sheet JSON → config), code owns arithmetic.
2. **No beat sync** — the soundtrack is laid under the film; scene changes don't land on musical beats. Timing was eyeballed.
3. **No props/schema** — copy lives as inline constants ("edit Film.tsx to change the animation"). Wrong shape for regenerating per-tool videos.
4. **Unlicensed brand mark** (OpenAI logo) — fine for parody, a non-starter for a commercial video. We use CapyMark and our own tokens.
5. **Arial everywhere** — dodges the webfont problem by accident. We gate Fraunces/Plus Jakarta/IBM Plex Mono behind `delayRender` so no frame catches a fallback mid-swap.
6. Minor: per-character `blur` filters are render-expensive; emoji-glyph icons are cross-platform fragile (prefer SVG).

## L5. Capytools-specific assets inventory (what we can build with today)

- **Brand system is video-ready**: `DESIGN.md` is a machine-readable token sheet (palette incl. dark-mode lifts, type ramp Fraunces/Plus Jakarta/IBM Plex Mono, radii, spacing, motion language `cubic-bezier(0.16,1,0.3,1)` 600/900/350/100/250 ms). Nearly a Remotion theme file as-is.
- **Capybara onsen** (`assets/blender/renders/final3/capy-onsen.mp4` + poster PNGs) — a distinctive "one focal element" hook; background is exactly `#f9f9f6` so 16:9 padding is seamless.
- **v1 toolkit**: pre-rendered name cards + TTFs (`out/assets/`), per-tool segments (`out/segments/`), VO lines (`out/audio/vo1–7`), full contract artifacts to diff against.
- **ZCode capture lane**: `url2video` scripted browser recording (eased moves, 1500–2500 ms click dwell, `showCursor`, ≤90 s per take) produces deterministic, re-runnable real-footage beats.
- **QC lane**: video-agent-kit's validate → render → qc loop plus the V2 aesthetic checklist (magic moment ≤15 s, no blank arrivals, transitions <2 s, silent version tells the story).

## L6. Open questions carried into production

1. Keep the onsen capybara as the emotional bookend (recommended: yes — it's the brand memory device).
2. VO on the master vs Anthropic-style near-silent (compromise: VO master + VO-free captioned social cuts).
3. Landing page still excluded from shots? (v1 assumption; revisit if the homepage is final.)
4. Music bed selection (Pixabay/Mixkit, licence archived) and TTS channel (Gemini vs edge-tts ToS-grey).
