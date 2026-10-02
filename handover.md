# handover.md — Capytools

*Rewritten 2026-10-02. This is the **state** file: what exists, what is verified, what is open. It is
deliberately not a rules file — the rules live in their own documents and are linked, because a second copy
of a rule is a copy that drifts. (The previous version, dated 2026-09-09, described the landing revamp; it is
in git history — `git show 67bf494:handover.md` — and its why-and-what-happened material lives in
[decisions.md](decisions.md) and [learning.md](learning.md).)*

Everything in §1 and §2 was verified by running the commands on 2026-10-02, not read out of an earlier
document. Where something could not be checked from here, it says so.

---

## 0. The 60-second version

Capytools is a suite of **eleven** small tools at **capytools.app**. Ten run 100% in the browser tab and keep
nothing; the eleventh, **CapyExpense**, is the documented exception — a Tauri desktop app that writes only to
the user's own disk and states its own promise ("stored on your machine, never ours"). No accounts, no
cookies, no telemetry, no uploads. The whole suite is Apache-2.0.

The site is a Next.js 16 app (16.3.8) deployed to **Cloudflare Workers** (not Vercel — see §4.3), verified
by a 1208-test suite and, after every deploy, by a script that walks every page.

`main` is clean and level with `origin/main`. Nothing is half-finished in the working tree. The open work is
**one unmerged PR** (#11) and **four written-but-unbuilt plans** — §4.

---

## 1. State (verified 2026-10-02)

**Repository** — `E:\New-Personal-Projects\Capytools`, branch `main`, level with `origin/main`. The last
code change under this file is `4306e88` (#60); see §4.1 for what merged on 2026-10-02.
Working tree clean apart from two untracked local tooling artifacts (`.impeccable/` critique logs and a stray
`CapyTools.lottie`); neither is app code, and neither is in `.gitignore`, which is why they keep showing up.

**The suite** — eleven tools, all listed in `SUITE` (`src/lib/capytools/suite.ts`). That array is the only
registry: the landing, masthead, catalog, footer, `/notes`, the sitemap, every count and every `Nº 0N / 11`
sign-off derive from it. There is no second list to update.

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

**Verification run today, on this checkout:**

```
npm run test       52 files, 1208 tests passing (10.9 s)
npm run lint       clean
npx tsc --noEmit   clean
npm run build      clean — every page prerenders; the only dynamic routes are
                   /api/contributions/[username], /api/languages/[username],
                   /api/og/[username], /api/extract-palette and /u/[username];
                   a Proxy (middleware) is present
```

**Live** — `capytools.app` is serving the build from the last `main` push: the CI run for it finished green at
`2026-10-02T11:01Z`, deploy and smoke (57 passed, 0 failed) included. (Read from the CI run, not from
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
| [README.md](README.md) | User-facing. Its first-line count ("Eleven so far") is asserted against `COLOPHON.quote` in `src/lib/capytools/landing.ts` and `package.json`'s `description` — all three change together. | 2026-09-24 |
| [decisions.md](decisions.md), [learning.md](learning.md) | Dated records of the **2026-09-09 landing revamp**. Read them for *why things are the way they are* and for debugging war stories — not for current state: D1–D2 still describe a Vercel deploy and a five-tool suite, and D9 still calls the licence MIT (D14 changed it to Apache-2.0). | 2026-09-09 |
| `docs/research/**` | The expansion roadmap, the tiered tool pipeline, the monetisation spec, and a research dir for each candidate tool. **Gitignored — local to this machine, not backed up by the repo.** | through 2026-09-21 |

---

## 4. Open work

### 4.1 Pull requests

**Open:** one.

| PR | Title | Open since | State |
|---|---|---|---|
| #11 | capyexpense: see and restore an earlier copy of a workbook | Sep 12 | stale; owned by another agent — leave it |

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
- **The tool pipeline** — `docs/research/expansion/tool-pipeline-tiers.md` (Sep 21). Fifteen researched,
  unbuilt tools: Tier 1 CapyCut, CapyPassport, CapyRead, CapyStamp, CapyResume; Tier 2 CapyVeil, CapyCrop,
  CapyGIF, CapyReel, CapyWave; Tier 3 CapyData, CapyVector, CapyMark, CapyBarcode, CapyCalc. Twenty-three
  research dirs against eleven shipped tools.
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
> with `npm run build && npx next start`, never `next dev`. The suite is eleven tools, registered in
> `src/lib/capytools/suite.ts` and nowhere else. `main` is clean; the open work is one PR (#11, owned by
> another agent — leave it) plus the unbuilt plans in §4.2 — the monetisation spec is blocked on seven owner
> decisions, so ask before assuming. Merging to `main` deploys to Cloudflare, and the owner has final say on
> every merge.
