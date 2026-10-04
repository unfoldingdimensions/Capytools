# handover.md — Capytools

*Rewritten 2026-10-02; CapyBg (tool no. 12) folded in 2026-10-03; its models, modes and matte work 2026-10-04/05 (the why lives in [docs/records/capybg.md](docs/records/capybg.md)). This is the **state** file: what exists, what is verified, what is open. It is
deliberately not a rules file — the rules live in their own documents and are linked, because a second copy
of a rule is a copy that drifts. (The previous version, dated 2026-09-09, described the landing revamp; it is
in git history — `git show 67bf494:handover.md` — and its why-and-what-happened material lives in
[decisions.md](decisions.md) and [learning.md](learning.md).)*

Everything in §1 and §2 was verified by running the commands on 2026-10-02 (re-run 2026-10-03 for CapyBg), not read out of an earlier
document. Where something could not be checked from here, it says so.

---

## 0. The 60-second version

Capytools is a suite of **twelve** small tools at **capytools.app**. Eleven run 100% in the browser tab and
keep nothing; **CapyExpense** (no. 5) is the documented exception — a Tauri desktop app that writes only to
the user's own disk and states its own promise ("stored on your machine, never ours"). No accounts, no
cookies, no telemetry, no uploads. The whole suite is Apache-2.0.

The site is a Next.js 16 app (16.3.8) deployed to **Cloudflare Workers** (not Vercel — see §4.3), verified
by a 1303-test suite and, after every deploy, by a script that walks every page.

`main` is clean and level with `origin/main`. Nothing is half-finished in the working tree. The open work is
**two unmerged PRs owned by other agents** (#11 CapyExpense history, #67 CapyStamp — tool no. 13, in progress)
and the written-but-unbuilt plans in §4.2.

---

## 1. State (verified 2026-10-02)

**Repository** — `E:\New-Personal-Projects\Capytools`, `main` at `db9707c` (#77). The last code change
under this file is CapyBg's matte cleanup, `db9707c` (#77); see §4.1 for what merged 2026-10-02 to 10-04. The E:\ checkout
is shared by several agents and is often left on a feature branch — check `git branch --show-current` before
committing, and commit to `main` from a temporary worktree.
Working tree clean apart from two untracked local tooling artifacts (`.impeccable/` critique logs and a stray
`CapyTools.lottie`); neither is app code, and neither is in `.gitignore`, which is why they keep showing up.

**The suite** — twelve tools, all listed in `SUITE` (`src/lib/capytools/suite.ts`). That array is the only
registry: the landing, masthead, catalog, footer, `/notes`, the sitemap, every count and every `Nº 0N / 12`
sign-off derive from it. There is no second list to update — **except three things that cannot derive
themselves** (§5): the share card `public/og.png`, the lab plate, and the count in `scripts/smoke.mjs`.

| # | Tool | Where it runs |
|---|---|---|
| 1 | CapyWrapped | browser (two GitHub proxies) |
| 2 | CapyImagine | browser |
| 3 | CapyCreator | browser (+ optional BYO-key LLM polish) |
| 4 | CapyStrip | browser |
| 5 | **CapyExpense** | **desktop — Tauri, the suite's one exception** |
| 6 | CapyOG | browser |
| 7 | CapyQR | browser |
| 8 | CapyResize | browser |
| 9 | CapyToken | browser |
| 10 | CapyPixel | browser |
| 11 | CapyTone | browser (one palette-extract fetch) |
| 12 | **CapyBg** | browser — ML background removal (ONNX models, WebGPU or CPU, in a Web Worker) |

**CapyBg in one paragraph** (plan: `docs/plans/capybg.md`; decisions and learning:
[docs/records/capybg.md](docs/records/capybg.md) — read it before changing a model, a threshold or a rule).
Three choices on the page, people the default:

| Choice | Model(s) | Size, once | Runs on |
|---|---|---|---|
| people — fast | MODNet **fp16** | 12.4 MB | WebGPU or the CPU (wasm) |
| groups | MODNet + U²-Net human seg (rembg fp32), fused | +167.8 MB | WebGPU or CPU — **one photo at a time**: a new photo after a cut starts on people again |
| any subject — detailed | BiRefNet_lite where the GPU reports ≥ 17 storage buffers; otherwise **ISNet** general-use (rembg), plus MODNet's attached pieces | 109 MB / 170.4 MB | WebGPU only; a refusal hides it and re-cuts on people |

Every cut then gets `cleanMatte` (haze levels + speck removal) and `decontaminateEdges` (backdrop colour out of
soft edges). WebGPU sessions run **NCHW** (`worker.ts`) — the default NHWC corrupts the matte. Models and the
ORT 1.30.0 runtime are **not in git**: `scripts/fetch-capybg-assets.ts` (run by `prebuild`, `predeploy` and CI,
via tsx) downloads, hash-verifies and shards them into `public/capybg/` (gitignored) under Cloudflare's 25 MiB
per-asset cap — four models, ~480 MB, 21 model files; the browser re-verifies and caches them in Cache Storage
(`capybg-v1`), and `manifest.json` is revalidated on every visit. Nothing is fetched cross-origin. Loads and runs
carry watchdogs (90 s / 60 s) and the page has a "stop" link.

**Measured on the owner's own photos** (the test set is listed in the record): the family photo in detailed
mode keeps the sheer pallu (1.0 / 0.97) and the son's dark trousers (0.98) with 0.95% haze — coverage matching
remove.bg's cut; group mode keeps the woman in black (1.0) the people model loses (0.06); the logo cuts
(letters 1.0, background 0). Known limits (record O2): edges softer than remove.bg's server output, ISNet fills
enclosed holes (a logo's "D"), and training-data terms for U²-Net/ISNet are unread (record O1).

**Verification run today, on this checkout:**

```
npm run test       56 files, 1303 tests passing                (CI, 2026-10-04)
npm run lint       0 errors; 168 warnings, all in the fetched, gitignored
                   public/capybg/ort/*.mjs — not source
npx tsc --noEmit   clean
npm run build      clean — every page prerenders; the only dynamic routes are
                   /api/contributions/[username], /api/languages/[username],
                   /api/og/[username], /api/extract-palette and /u/[username];
                   a Proxy (middleware) is present
```

**Live** — `capytools.app` serves `db9707c` (#77): CI green at `2026-10-04T16:51Z`, smoke 66 passed, 0 failed —
including the checks that `/capybg/manifest.json` is 200 and revalidated, not immutable. The detailed pill
(ISNet, 170.4 MB) shows on the owner's 16-buffer GPU, and the live manifest lists all four models.
On 2026-10-03, #64's deploy succeeded but its smoke failed one check (the hard-coded tool count in
`scripts/smoke.mjs`, still 11); #65 bumped it to 12 and redeployed.
Earlier: the 2026-10-02 run finished green at `2026-10-02T11:01Z`, deploy and smoke (57 passed, 0 failed). (Read from the CI run, not from
`wrangler deployments list`.) Spot-checked 200s on `/`, `/tools`, `/capyqr`, `/notes`, `/robots.txt`,
`/sitemap.xml`, `/u/torvalds` and `/api/og/octocat`, with
`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` and the report-only CSP live.

---

## 2. How it is built, shipped and verified

`npm run` targets, as they actually behave today:

| Command | What it does |
|---|---|
| `npm run dev` | `next dev --webpack`, port 3024 |
| `npm run test` / `lint` | vitest run / eslint |
| `npm run build` | `next build` — **this, plus `npx next start`, is how you judge a page** (§5) |
| `npm run preview` | `opennextjs-cloudflare build && wrangler dev` |
| `npm run deploy` | `opennextjs-cloudflare build && wrangler deploy` |
| `npm run cf-clean` | kills orphaned `workerd`/esbuild on Windows (they hold `.open-next` and break the next build) |

**CI** (`.github/workflows/ci.yml`): a `test` job — lint, test, `next typegen`, `tsc --noEmit`,
`npm audit --omit=dev --audit-level=high` — gates both other jobs. A PR gets `wrangler versions upload`
(a staged version on its own URL; production is untouched). A push to `main` gets `wrangler deploy` followed
by `node scripts/smoke.mjs`, which walks every page and asserts the security headers. Both build steps set
`NEXT_PUBLIC_SITE_URL`, because it is inlined at **build** time — a Worker secret cannot fix it afterwards.

**Rollback** is Cloudflare Worker version history (`wrangler rollback`). There is no other.

The deploy account is pinned in `wrangler.jsonc`; the token is read from a gitignored `.env.cloudflare`
(template: `.env.cloudflare.example`). `wrangler.jsonc` is part of the security surface — see AGENTS.md.

---

## 3. Where the truth lives

| Document | Holds | Written |
|---|---|---|
| [AGENTS.md](AGENTS.md) | **The law.** Brand ethos, design tokens, the React 19 hydration pattern, tool registration, and the Cloudflare Workers runtime rules. `CLAUDE.md` is just `@AGENTS.md`. | 2026-09-19 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | The promise in two versions, the test-enforced boundaries, and the single copy of the **"Adding a tool"** recipe. | 2026-09-18 |
| [DESIGN.md](DESIGN.md) | The design system as built. | 2026-09-23 |
| [PRODUCT.md](PRODUCT.md) | Product truth: users, positioning, operating context, what evidence exists and what must not be fabricated. | 2026-09-23 |
| `docs/plans/` | **Tracked** implementation plans with kickoff prompts: `capybg.md` (shipped as v1; §13 Phase 2 desktop still open), `capystamp.md`, `capycrop.md`. Each has a `.sources.json`. | 2026-10-03 |
| [README.md](README.md) | User-facing. Its first-line count ("Twelve so far") is asserted against `COLOPHON.quote` in `src/lib/capytools/landing.ts` and `package.json`'s `description` — all three change together. | 2026-09-24 |
| `docs/records/` | **Decision-and-learning records, one per effort.** [capybg.md](docs/records/capybg.md): every CapyBg model/mode/rule decision with the measurement behind it, what was rejected and why, and the learning (compare backends on the same tensor, tune thresholds in the real page, fixed URLs under immutable paths). New efforts add a file here. | 2026-10-05 |
| [decisions.md](decisions.md), [learning.md](learning.md) | Dated records of the **2026-09-09 landing revamp**. Read them for *why things are the way they are* and for debugging war stories — not for current state: D1–D2 still describe a Vercel deploy and a five-tool suite, and D9 still calls the licence MIT (D14 changed it to Apache-2.0). | 2026-09-09 |
| `docs/research/**` | The expansion roadmap, the tiered tool pipeline, the monetisation spec, and a research dir for each candidate tool. **Gitignored — local to this machine, not backed up by the repo.** | through 2026-09-21 |

---

## 4. Open work

### 4.1 Pull requests

**Open:** two, both owned by other agents — leave them.

| PR | Title | Open since | State |
|---|---|---|---|
| #11 | capyexpense: see and restore an earlier copy of a workbook | Sep 12 | stale |
| #67 | CapyStamp, tool no. 13 — engine, tool and registration | Oct 4 | in progress (`feat/capystamp`, the E:\ checkout's current branch) |

**Settled on 2026-10-04:**

| PR | Title | Outcome |
|---|---|---|
| #70 | CapyBg: fp16 MODNet, NCHW on WebGPU | merged. The int8 `model_quantized.onnx` kept backdrop and dropped people; ORT's WebGPU NHWC layout transform corrupted the float matte (§5) |
| #71 | CapyBg: group mode | merged — U²-Net human seg + MODNet fused; see §1 |
| #72 | CapyBg: stop caching the manifest as immutable | merged — see §5; the fix that made #70 and #71 reach existing visitors |
| #73 | CapyBg: group mode belongs to one photo | merged — a sticky groups pill leaked its trade-offs onto photos people cut well |
| #74 | CapyBg: edge-colour cleanup | merged — blur-fusion foreground colour; purple hair fringe 0.115 → 0.034 |
| #75 | CapyBg: group mode keeps fabric that hangs from a person | merged — connectivity fusion; the people pill re-cuts |
| #76 | CapyBg: ISNet as the detailed model where BiRefNet doesn't fit | merged — the sheer-pallu fix; BiRefNet OOMs on CPU and needs 17 buffers |
| #77 | CapyBg: matte cleanup everywhere, people parts back in detailed | merged — remove.bg parity on the family photo |
| #66, #68, #69 | SEO: guides, keyword-first titles, intent landing pages | merged by another agent's work stream |

**Settled on 2026-10-03:**

| PR | Title | Outcome |
|---|---|---|
| #64 | CapyBg, tool no. 12 | merged (squash `b0bcf13`). Built by another agent on a local branch; review added the GPU-limit gate, the watchdogs and "stop", the TWELVE share card, plate no. 12, and the fix that keeps the 25.5 MiB ORT wasm out of the bundle (§5) |
| #65 | smoke: llms.txt lists twelve tools | merged; #64's post-deploy smoke still expected 11 |

**Settled on 2026-10-02:**

| PR | Title | Outcome |
|---|---|---|
| #62 | drop five class hooks no stylesheet defines | merged |
| #63 | next 16.3.8 — critical RCE in `next/og` `ImageResponse` ([GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j)) | merged; CI's `npm audit` gate had started failing on it, blocking every deploy |
| #60 | settle line endings, stop the suite flaking under load | merged, with a deterministic test for the PNG over-limit charge added in review |
| #61 | one `PageShell` for every page's opener | **closed unmerged** |

Because #61 closed, the shell is still **`ToolPageShell`**: CONTRIBUTING.md's "Adding a tool" step 1 and
AGENTS.md's reference are correct as written.

### 4.2 Written but unbuilt

- **The monetisation platform** — `docs/research/monetisation/implementation-plan.md` (Sep 21). A complete
  spec: D1 schema, a merchant-of-record checkout (Lemon Squeezy by default), magic-link auth, an entitlement
  route, client-side batch + streaming ZIP, a file map, a test plan, and a rollout order that ships **CapyQR
  first**. **Zero code exists.** It is the single spec behind the four per-tool slices in
  `docs/research/{capyqr,capyresize,capystrip,capyog}/monetisation-plan.md`, so all five move together. Its
  §9.2 still lists **seven owner decisions as "defaults proposed"** — price ($19 one-time), suite-wide vs
  per-tool Pro, and provider choice among them. Nothing here can be built before those are answered.
- **CapyStamp** — `docs/plans/capystamp.md`, with a kickoff prompt. Tool no. 13; free batch, capped. Being
  built by another agent — PR #67 (`feat/capystamp`), open since 2026-10-04.
- **CapyCrop** — `docs/plans/capycrop.md`, with a kickoff prompt. **Not a new tool**: a crop & split mode
  inside CapyResize, so the count does not change.
- **CapyBg Phase 2 (desktop)** — `docs/plans/capybg.md` §13. Specced, deliberately not in v1: a sibling
  `capybg-desktop/` Tauri app that downloads in Rust and states its own promise.
- **The tool pipeline** — `docs/research/expansion/tool-pipeline-tiers.md` (Sep 21). The researched tiers:
  Tier 1 CapyCut (**shipped as CapyBg**), CapyPassport, CapyRead, CapyStamp (planned, above), CapyResume;
  Tier 2 CapyVeil, CapyCrop (planned, above), CapyGIF, CapyReel, CapyWave; Tier 3 CapyData, CapyVector,
  CapyMark, CapyBarcode, CapyCalc.
- **CapyExpense builds** — the page is live and marked "Desktop · soon". The Tauri app exists under `desktop/`
  and has been built locally (`desktop/src-tauri/target/{debug,release}`), but no build is published. PR #11
  is its open history feature. PRODUCT.md records the open question: whether it ships builds, and when.
- **A launch video** — `docs/launch-video/{decision,learning}.md` (Sep 13) plus renders in `.video_agent/`
  (Sep 8). Scoped, never published; nothing in the repo says whether it is paused or dead.
- **Two cosmetic carry-overs** from the Sep 9 pass, both still true: `public/plates/lab-1.webp` has "2023"
  baked into the art while the page says 2026 (decision D13, open — it has never been regenerated: one commit
  since it landed), and `capabilities.webp` carries unreadable micro-text at display size. Neither breaks
  anything; both need an image-generation pass, not code.

### 4.3 Documentation that is behind reality

- `docs/research/cloudflare-migration/implementation-plan.md` ends with seven unticked checkboxes. The things
  they check largely pass live (HSTS with preload, robots + sitemap 200, `/u/[username]` 200). Only the Search
  Console / Bing verification is unconfirmed from here. Tick them or retire them — as written they imply work.
- **`vercel.json` is still tracked at the root**, declaring `"framework": "nextjs"` for a host the site left in
  September. It does nothing, and it is a lie in the tree.
- **Orphaned plan documents** whose work landed anyway: `.hermes/plans/prompt-generator-*.md` (Aug 21 — still
  says "awaiting scope confirmation"; CapyImagine and CapyCreator both shipped), `capytone/.hermes/plans/
  mood-families-plan.md` (Aug 24 — shipped: `engine/families.ts`, `startColors.ts`, `MoodPills.tsx`), and all
  four `.zcode/plans/` (Sep 5–13 — landing, tool-pages and expansion pre-flight, all executed). One real gap:
  the Sep 13 CapyQR v2 plan's stated deliverable, `docs/research/capyqr/implementation-plan-v2.md`, was never
  written, though its code shipped (`capyqr/utf8.ts`, `frame.ts` and the tel/geo/event payloads are in tree).

---

## 5. Things that will bite

- **Adding a tool means three hand edits nothing derives.** `SUITE` drives the site, but these are pixels or
  scripts: (1) `public/og.png` prints the count ("TWELVE TOOLS") — `OG_CARD_TOOL_COUNT` in
  `src/lib/capytools/og.ts` must equal `SUITE.length`, and `tests/og-card.test.ts` fails until the card is
  redrawn (for #64 the words were rebuilt from the card's own glyphs; the pixel diff stayed inside the text
  box); (2) a lab plate `public/plates/lab-N.webp`, 896×1200, owner-supplied; (3) the count in
  `scripts/smoke.mjs` (`/llms.txt lists every tool`), which only fails **after** the production deploy.
- **onnxruntime-web must stay on its extern-wasm builds.** The default bundle builds embed
  `new URL("…asyncify.wasm", import.meta.url)`, so Turbopack emits the 25.5 MiB wasm into `_next/static/media`
  and `wrangler versions upload` refuses it (25 MiB per-asset cap). `turbopack.resolveAlias` in
  `next.config.ts` points `onnxruntime-web/webgpu` and `/wasm` at `dist/ort.{webgpu,wasm}.min.mjs`;
  `tests/capybg.test.ts` guards it. A local `next build` does not catch this — only the wrangler upload does.
- **Without a GPU limits check, ORT on WebGPU can hang silently.** A shader over the adapter's
  `maxStorageBuffersPerShaderStage` makes `session.run()` never settle, with no error. Gate models on the probe's
  adapter limits (`modelFits` in `src/lib/capybg/backend.ts`), and keep the watchdogs.
- **CapyBg's model and rule choices were each measured on the owner's photos — re-measure before changing
  one.** Every fusion rule that fixed one photo broke another, and Python's numbers differ from the browser's
  (the resize differs). The method, the test set and the numbers are in
  [docs/records/capybg.md](docs/records/capybg.md).
- **ORT's WebGPU EP must run NCHW.** Its default NHWC layout transform silently corrupts MODNet's matte (torso
  alpha 0.8, backdrop kept) — for fp16 and fp32 alike; int8 happened to dodge it. `preferredLayout: "NCHW"` in
  `worker.ts` matches the CPU EP exactly. To judge a model, compare its WebGPU output with the CPU EP or
  Python on the same tensor before blaming the model — this repo shipped a wrong matte for a day.
- **A fixed URL under `/capybg/*` is cached for a year.** `public/_headers` marks `/capybg/*` immutable — right
  for the content-addressed model folders, wrong for `manifest.json`, which now detaches it (`! Cache-Control`)
  and the loader fetches with `cache: "no-cache"`. Any new fixed-URL file there needs the same, or browsers
  keep a stale copy (it is how #71's group mode first failed live).

- **The dev server lies about hydration-heavy pages.** Under `next dev --webpack`, the marquee's duplicated
  links feed the prefetcher forever and hydration never settles — frozen motion, dead clicks, and it looks
  exactly like a hydration bug. Judge pages with `npm run build && npx next start`. A frozen page can also be
  a corrupted `.next`. Full story: learning.md L1.
- **Line endings.** `.gitattributes` (from #60) pins `* text=auto eol=lf`, so a fresh clone checks out LF
  everywhere. A checkout made **before** it still holds CRLF — this one has 249 such files — and needs one
  renormalisation pass, which discards uncommitted changes to tracked files:
  `git rm -r --cached . -q && git reset --hard HEAD`. `tests/line-endings.test.ts` names the cause if it
  bites.
- **Nothing local blocks a bad commit.** No pre-commit hook is installed (`.git/hooks` holds only git's
  samples; `core.hooksPath` is unset), so a red suite or a secret-shaped literal reaches GitHub. CI is the gate.
- **The Workers runtime rules are load-bearing, and each one is a bug that already happened** — no filesystem
  at module scope, in-memory Maps do not accumulate, `s-maxage`/`revalidate` are inert (use `withEdgeCache`),
  outbound `fetch` sends no `User-Agent`, `NEXT_PUBLIC_SITE_URL` is inlined at build time, `public/_headers`
  carries the `/_next/static` headers, and `wrangler.jsonc` is security surface. The list lives in AGENTS.md
  §Hosting; read it before adding a route rather than after it 500s.

---

## 6. Kickoff prompt for the next agent

> You are continuing work on Capytools (`E:\New-Personal-Projects\Capytools`), branch `main`. Read
> `handover.md` (this file) first, then `AGENTS.md` — which is law — then `CONTRIBUTING.md` before touching a
> tool page. Verify with `npm run test`, `npm run lint`, `npx tsc --noEmit` and `npm run build`; judge pages
> with `npm run build && npx next start`, never `next dev`. The suite is twelve tools, registered in
> `src/lib/capytools/suite.ts` — plus the share card, plate and smoke count in §5, which do not derive. The
> E:\ checkout is shared, so check the branch before committing. The open work is two PRs owned by other
> agents (#11, and #67 CapyStamp in progress — leave both) plus the plans in §4.2: CapyCrop is ready to build;
> CapyBg's model choices were all measured on the owner's photos — read `docs/records/capybg.md` and
> re-measure before changing one; the
> monetisation spec is blocked on seven owner decisions, so ask before assuming. Merging to `main` deploys to Cloudflare, and the owner has final say on
> every merge.
