# CapyBg — decisions and learning

*The decision-and-learning record for CapyBg, tool no. 12 (built 2026-10-03, matte work 2026-10-04/05).
One record per effort lives in `docs/records/`; the 2026-09-09 landing revamp's are the root
[decisions.md](../../decisions.md) and [learning.md](../../learning.md). Current state belongs in
[handover.md](../../handover.md), the build plan in [docs/plans/capybg.md](../plans/capybg.md). Decisions are
marked **decided** (shipped), **open** (needs the owner) or **rejected** (tried, measured, not shipped). Every
number below was measured on the owner's own photos, in the real page or in Python on the same tensor. None
is a guess.*

---

## The photos everything was measured on

The owner's photos of their family are the test set, and they are hard in the ways real photos are:

- a standing man in a dark suit against a dark stage, with drapes;
- a seated couple at a ceremony, with props on the floor;
- a group of four, including a woman in a black saree against a black backdrop;
- the owner's mother, solo, in front of a purple banner;
- the mother, father and son, with a sheer green pallu hanging down the mother's side;
- a logo on a dark background.

remove.bg's cut of the family photo was the bar for "clean". Any model or rule change gets re-measured on all
of them. A rule that fixes one photo has repeatedly broken another.

## Decisions

### B1 — The people model is MODNet **fp16**, not int8 · **decided** (#70)

The int8 `model_quantized.onnx` that v1 shipped kept a slab of the dark backdrop on the man (alpha 0.85) and
dropped most of the groom (legs 0.04). It did so on every backend and in Python too, so the fault was the
weights. fp16 tracks fp32 almost exactly (0.42 / 0.86, torso 0.99) at 12.4 MB, against fp32's 25 MB. That's
one Cloudflare asset, with no sharding needed.

### B2 — ORT's WebGPU backend runs **NCHW** · **decided** (#70)

The WebGPU EP's default NHWC layout transform silently corrupts MODNet's float matte: the torso comes back at
0.8 and backdrop is kept, for fp16 and fp32 alike. int8 happened to dodge it. `preferredLayout: "NCHW"` in
`worker.ts` matches the CPU EP exactly, and was faster on the test machine (435 ms against 812 ms).

### B3 — Group mode: U²-Net decides *who*, MODNet draws the edges · **decided** (#71, owner)

MODNet is a single-portrait model. On the group of four it lost the woman in black, and no input size fixed
it. U²-Net human seg (Apache-2.0 weights, rembg's fp32 release asset, 167.8 MB) kept all four, but its 320²
mask is soft. So it's a helper, fused with MODNet. Alternatives measured and turned down:

- ISNet as the helper left her half-transparent;
- a 4.4 MB "U-2-Net-Human-Seg" repack lost both women;
- a self-converted fp16 U²-Net (~84 MB) would have meant hosting our own file, and the owner chose rembg's
  original.

Group mode is opt-in, because the helper is 13× the people model's size.

### B4 — Group mode belongs to **one photo** · **decided** (#73, owner)

The "groups" pill stayed on once picked, so photos MODNet already cut well got group mode's trade-offs. On the
mother's photos that meant a cut pallu and a purple strip by her hair. Now:

- a new photo after a cut starts on the people model;
- picked before the first photo, group mode applies to it;
- "try again" keeps the photo's mode;
- tapping "people" re-cuts (#75).

### B5 — The group fusion rule is **connectivity**, not a threshold · **decided** (#75)

`fuseMattes` keeps:

- every piece of MODNet's matte (> 0.5, 4-connected) that touches a person U²-Net is sure of (> 0.5);
- plus faint-person areas (U²-Net > 0.03);
- plus U²-Net's sure core (shrunk ~2%, feathered), which fills people MODNet lost.

Five threshold rules were measured on all photos first. Each one that kept the pallu brought the gaps back on
the woman in black (see L3). Group mode on the family photo: pallu 0.41 → 0.64, the same as the people model,
with the woman in black still 1.0.

### B6 — Edge-colour cleanup on every cut · **decided** (#74)

A soft-edged pixel is part subject and part backdrop, and kept the backdrop's colour: a purple fringe through
the mother's hair. `decontaminateEdges` replaces partly transparent pixels' RGB with an estimated foreground
colour, using blur-fusion (Forte & Pitié 2021, radius 45 then 3). The blurs run at ≤ 1024 px and the
per-pixel formula runs at full resolution on edge pixels only. Results:

- blue cast in the hair band: 0.115 → 0.034;
- cost: 0.65 s at 24 MP.

### B7 — ISNet is the detailed model where BiRefNet doesn't fit · **decided** (#76, owner)

BiRefNet can't run on Chrome/Windows/D3D:

- WebGPU: it needs 17 storage buffers per shader stage, and the adapter reports 16;
- CPU: `std::bad_alloc` after 17 s, measured in the browser 2026-10-04.

ISNet general-use (DIS, Apache-2.0; rembg's release export, pinned by SHA-256) runs on that adapter in about
0.36 s warm.

The page picks BiRefNet first, then ISNet. If the GPU refuses either, the option hides itself and the cut
finishes on the people model.

This is what fixed the sheer pallu. The hanging part reaches only 0.82 with MODNet and ~0 with U²-Net, so no
fusion could recover it. ISNet reaches 0.98 and BiRefNet 1.0.

### B8 — Matte cleanup on every cut; ISNet gets MODNet's attached pieces · **decided** (#77)

Against remove.bg, ours left milky half-transparent haze and specks, and ISNet dropped the son's dark trousers
(0.02).

- `cleanMatte` (all models): levels 0.15 → 0 / 0.85 → 1, linear between; solid pieces smaller than 2% of the
  largest are dropped.
- `attachPeople` (ISNet only): ISNet's cut, plus MODNet's pieces that touch ISNet's subject. A logo stays pure
  ISNet.

Family photo, detailed mode:

| Measure | Before | After |
|---|---|---|
| Pallu (upper / lower) | 0.98 / 0.88 | 1.0 / 0.97 |
| Son's trousers | 0.02 | 0.98 |
| Haze (pixels at 0.02–0.5) | 6.45% | 0.95% |

Over a dark backdrop the coverage matches remove.bg's cut.

### B9 — The asset manifest is revalidated, never immutable · **decided** (#72)

See L5. The loader fetches it with `cache: "no-cache"`, and `public/_headers` detaches the year-long header for
it. The smoke script fails if it ever comes back immutable.

### B10 — ViTMatte re-mattes the detailed cut's edges · **decided**

The owner zoomed into clothing edges: soft, with a strip of backdrop showing (a pink banner smudge at the
father's ear, a light rim on the groom's suit). The masks come from 1024² inputs stretched to full size.
ViTMatte-small (MIT, hustvl; Xenova's fp32 ONNX, 99 MB) takes the photo plus a trimap built from our cut, and
recomputes alpha in the unsure band:

- It runs on 512² tiles (64 px overlap, sine-window hand-off) over a working image ≤ 2048 px. One 2048 pass
  needs a 2.77 GB buffer, over WebGPU's 2 GB cap. The model was trained on 512² crops, and matting is local
  given the trimap.
- 512 tiles match a full 2048 pass to 0.02–0.03 mean alpha in the band. At 1024 (one pass) ViTMatte was
  *worse* than our cut, so resolution is the point.
- On the owner's GPU a tile takes 55 ms warm. A detailed cut went from ~0.7 s to ~3.2–3.5 s of model time.
- It runs on detailed cuts only (BiRefNet or ISNet). If it can't run, the cut stands with a note. The
  detailed pill counts its download (269.4 MB in all).
- fp32, not the 27.5 MB int8 build: on screen they looked alike, but the numbers were mixed (one photo better,
  one worse), and B1 already showed int8 can hide damage.

### R3 — Tiled ISNet at near-full resolution · **rejected**

The idea was to re-run ISNet on 2×2 overlapping tiles and blend them in along the edge band. Python's numbers
were good. In the real page it was no better than the current cut (crisper shirt, blurrier pallu), cost 1.2 s,
and first dropped the sheer pallu. A tile only sees a crop, so ISNet stops treating sheer fabric as subject
(0.02), and the band had been judged on raw rather than cleaned levels. Segmenters need the whole photo;
matting models don't. That's why B10 tiles ViTMatte instead.

### R1 — Guided-filter edge refine · **rejected**

He et al.'s guided filter was tried, with a grey guide, r = 8, eps = 1e-3. It was meant to snap the 1024² mask
to full-resolution edges. Instead it added a glow round heads and stair-steps on collars, and *raised* the haze
share. It could come back with a colour guide and careful tuning, but measure it on all photos first.

### R2 — BiRefNet on the CPU · **rejected** (measured)

It runs out of memory: wasm EP, `std::bad_alloc`. The plan's R2 claim was right. Its input is also fixed at
1024², so a smaller-input run isn't possible without re-exporting the model.

### O1 — Training-data terms for U²-Net and ISNet · **open**

Both models' code and weights are Apache-2.0. ISNet was trained on DIS5K, which has its own terms-of-use PDF,
and U²-Net's training data has the same question. Neither has been read. The owner should decide whether that
matters for a free tool.

### O2 — What's still short of remove.bg · **open**

- Edges come from 1024² (ISNet) or 512-short-edge (MODNet) masks, so up close they're softer than remove.bg's
  server output.
- ISNet fills fully enclosed holes, such as the inside of a logo's "D".
- The solo photo's chair corner comes back in detailed and people modes (0.21).

A sharper fix needs a better model, not another rule.

---

## Learning

### L1 — Compare backends on the *same tensor* before blaming a model

A wrong matte has three suspects: the weights, the backend, the pipeline. Run the identical preprocessed tensor
through Python (CPU), the browser's wasm EP and the browser's WebGPU EP, and diff the outputs. That's how B1
(int8 is bad everywhere) and B2 (NHWC corrupts only WebGPU) were separated. Before that, a "fix" shipped that
was really a second bug: the fp16 switch alone exposed the NHWC fault on WebGPU.

### L2 — The browser's resize is not Python's, and thresholds near the model's output are fragile

U²-Net scored the sheer pallu 0.09 in the browser and 0.17 in Python. The only difference was the 320² resize
(canvas "high" smoothing against PIL bilinear). A 0.1 threshold tuned in Python silently failed in the page.
Tune anything threshold-like **in the real page**, with the browser's own numbers. Prefer rules that don't sit
on a knife-edge, such as connectivity (B5) and attachment (B8).

### L3 — Fusion rules trade photos against each other: measure all of them at once

Every rule that fixed the mother's pallu or hair, judged on her photo alone, broke the group of four. Keep a
contact sheet (crops of the contested areas × candidate rules) and a table of region alpha means for *all*
photos, and decide from the whole grid. The scripts that did this (`tune*.py`, `detail_union.py`) are in the
session scratchpad, not the repo. Re-create them from these descriptions.

### L4 — A sticky mode leaks its trade-offs onto photos that don't need it

Group mode was correct for the photo it was picked for and wrong for the next one. Modes with costs should
belong to one input (B4). The owner's "it's still cutting her saree" reports were mostly group mode left on
from an earlier photo, not a fresh bug.

### L5 — A fixed URL under an immutable path is stale for a year

`/capybg/*` is served `max-age=31536000, immutable`. That's right for content-addressed model folders and wrong
for `manifest.json`. After #71 deployed, group mode failed live with "the u2human model is missing from the
asset manifest", because the browser still held the old list. After #70, such a browser kept loading the int8
model from cache. Any fixed-URL file there needs `no-cache` (B9).

### L6 — Probe GPU limits before any download

Chrome on Windows/D3D reports `maxStorageBuffersPerShaderStage` = 16. A model whose shaders need more either
never settles (BiRefNet with NHWC) or fails in `OrtRun` (with NCHW). `modelFits` checks the probe's adapter
limits before the download, and watchdogs (90 s load, 60 s run) tear the worker down if a run still hangs.

### L7 — How to verify a cut in a driven browser

- **Measure, don't eyeball:** read the result PNG's alpha back with `createImageBitmap` and an OffscreenCanvas,
  then report region means (pallu, trousers, gap, backdrop) and a haze share.
- **For a picture:** overlay a fixed, full-viewport `<img>` with `object-fit: contain` over a dark or green
  backdrop. Fixed-size canvases get clipped by the pane.
- **Trigger cuts** by setting the file input's `files` via `DataTransfer` and dispatching `change`. Wait about
  2.5 s after navigation for hydration, or the click lands on a dead pill.
- **Don't trust pane download speed.** The background pane pulls at about 150 KB/s; `curl` shows the real site
  speed (3.4 MB/s). Pre-warm a model cache, or verify locally on `next start`.
- **Serve test photos** from `public/__t/` and restart `next start` after adding files. Never commit them.

### L8 — Check the licence of the exact file, not the project

The plan banned the `onnx-community/ISNet-ONNX` repack, which is labelled AGPL, while upstream DIS is
Apache-2.0. rembg's release export of the same model is fine. Pin the exact URL and SHA-256 of the file you
vetted.

### L10 — Tile matting models, not segmenters

A segmenter decides *what* the subject is, and needs the whole photo to do it. On a crop it changes its mind
(R3). A matting model decides *how much* of each edge pixel is subject, given a trimap, and that's local, so it
tiles cleanly (B10). And check a model's GPU buffer needs at the target size before planning around it.
ViTMatte's global attention at 2048 needed one 2.77 GB buffer.

### L9 — Windows worktree hygiene

`git worktree remove` fails on long `node_modules` paths ("Filename too long"). Use
`Remove-Item -LiteralPath "\\?\<path>" -Recurse -Force`, then `git worktree prune`. The `E:\` checkout is
shared by several agents and sits on their branches. Do CapyBg work in a temporary worktree from
`origin/main`, and never touch their launch entries.
