# decisions.md — Capytools landing revamp

*Decision record for the landing-page-revamp effort (2026-09-09). Companion to [learning.md](learning.md) and [handover.md](handover.md). Format follows `docs/launch-video/decision.md`: each decision numbered, marked **decided** (we commit), **recommended** (my call unless overridden), or **open** (needs the owner).*

> **Every agent, every session:** before you finish, append the decisions your session made here — the next number, a status, the context, the decision and its consequence — under a section for the effort (e.g. `# SEO`). Read the existing entries first; don't re-argue one marked **decided** without new evidence, and amend it in place if it changes. Learnings go in [learning.md](learning.md). Nothing else from your session survives.

---

## D1 — Branch topology: stacked on CapyExpense · **decided**

**Context:** the landing advertises five tools and links `/capyexpense`, which only exists on `feat/capyexpense` (14+ commits ahead of main). Owner rule: **merging = Vercel deploy**, so PRs stay open until the landing is finalised.
**Decision:** `landing-page-revamp` branches off `feat/capyexpense`, PRs target `main`, stacked. Nothing merges without the owner; each push gets its own Vercel preview.
**Consequence:** merging order is safe either way; previews are the review surface.

## D2 — Editorial-lite fidelity · **decided**

**Decision:** port the OpenDesign editorial landing at reduced fidelity — keep roman-numeral section rules, collage plates, marquee wire, ink slab, footer mega-wordmark; **drop** side rails, topbar, FIG/coordinate annotations, pagination counters, hero index, inert work arrows.
**Consequence:** the design keeps its chapter structure without process garnish; every dropped element is a contained CSS/JSX omission, easy to restore.

## D3 — Plates as WebP at quality 82 · **decided**

**Decision:** 16 export PNGs (~19 MB) converted once to WebP q82 in `public/plates/` → ~0.9 MB total. `next/image` re-optimises at the edge.
**Consequence:** 95% smaller with no visible loss at display sizes. `lab-1.webp` carries a baked-in "2023" (see D13).

## D4 — Dark mode rides the tokens; big surfaces get their own tokens · **decided**

**Decision:** the landing maps the export's palette onto `tokens.css` (paper→background, coral→clay, sage→primary…). Surfaces that must keep an identity across themes use **local** custom props, not theme inversion:
- Ink slab: `--slab-bg`/`--slab-fg` — ink-on-paper in light, `--card` dark field in dark.
- The one earlier attempt at global inversion produced a white panel in dark mode; never repeat it.
**Consequence:** no `prefers-color-scheme` anywhere (house rule), and both themes are correct by construction.

## D5 — `lp-` class prefix + one landing stylesheet · **decided**

**Decision:** all landing CSS lives in `src/components/landing/landing.css` with every class prefixed `lp-`, mapped onto house tokens.
**Consequence:** the export's generic names (`.container`, `.label`, `.card`) can't collide with house styles; the stylesheet is a single, greppable surface.

## D6 — Scroll reveals via motion/react `whileInView` · **decided**

**Decision:** new `ScrollReveal` (client) mirrors the export's 900 ms expo-out reveal system with direction variants and per-element delays. The house `Reveal` is mount-triggered — wrong for a nine-section page. Reduced motion renders content static and visible.
**Consequence:** one reveal primitive for the whole landing; hero stays mount-triggered.

## D7 — The landing owns its chrome · **decided**

**Decision:** the landing renders the shared `Header` — given section anchors in place of the suite switcher, and a brand pointing at `#top` rather than home — plus its own `LandingFooter` (link columns + mega wordmark). Tool pages and the meta pages keep the shared `Header`/`SiteFooter`.
**Consequence:** one masthead for the whole site, and the landing gets its nav language through the shared component's props rather than a second component that drifts from it.
**Amended:** this entry originally named a `LandingMasthead` component (headroom hide-on-scroll, Albert Sans CTA pill). That duplicate was deleted once `Header` absorbed what the landing actually needed; the decision — the landing owns its chrome — stands, but the component it named no longer exists.

## D8 — Albert Sans replaces IBM Plex Mono, under the `--font-mono` name · **decided**

**Decision:** the label voice swaps family, not token. `layout.tsx` imports `Albert_Sans` into the existing `--font-mono` variable, so every `font-mono` utility switches in one file.
**Consequence:** eyebrows/tags/code are now proportional (geometric sans) — the uppercase + 0.24em tracking carries the technical look. If true monospacing is ever needed (aligned code), add a fourth voice rather than reverting.

## D9 — Zero external hrefs on the landing · **decided**

**Decision:** every landing link routes natively; GitHub targets became three editorial pages — `/notes` (project notes + issue reporting), `/design` (palette/type/motion), `/license` (MIT grant). Asserted by test (`href="http` must not appear in the landing render).
**Consequence:** the only external hop on the site lives one page deeper (`/notes` contribution links) — a deliberate exception the owner approved implicitly; veto-able.

## D10 — Surface arc: chapter bands on a single scroll · **decided**

**Decision:** keep one continuous narrative but alternate surfaces — cream → white manifesto band (`--card` + hairlines) → cream → ink slab → cream → **sage band** (12% primary over background) at the CTA. Labs tightens to 90px, Colophon expands to 160px, and the Labs footer gained a real "Open the suite" pill (distributed CTA).
**Consequence:** two accents on nine sections (inside the "one in five" budget); the page survives the squint test.

## D11 — Blender renders removed entirely · **decided**

**Decision:** the owner rejected the Blender-rendered onsen. Removed: `CapyOnsen.tsx`, `public/animations/`, `assets/blender/` sources, and the revert is also applied on `feat/capyexpense`. About's plate slot uses the export's original `about.png` (as `about.webp`).
**Consequence:** the capybara motif lives in the collage plates and `CapyMark` only. Never propose Blender-rendered media for brand surfaces.

## D12 — README honesty · **decided**

**Decision:** the colophon quotes the README "verbatim", so the README was fixed to match: "Five so far" + a CapyExpense section. Root `DESIGN.md` was committed because the landing links to it on main.

## D13 — lab-1 plate's baked-in "2023" · **open**

**Context:** the generated plate for CapyWrapped has "2023 YEAR-IN-REVIEW" in the art; the page says 2026 everywhere else. It reads as sample data on a depicted card.
**Recommendation:** accept for now; regenerate from the archive's `assets/imagegen-prompts.md` with 2026 and re-run the WebP conversion when convenient.
**Needs:** owner call + an image-generation pass.

## D14 — License: MIT → Apache-2.0 · **decided**

**Decision:** the owner moved the project to the Apache License 2.0. `LICENSE` is the canonical text (copyright filled: "Copyright 2026 unfoldingdimensions"), GitHub shows it via the file, and `/license` reads the file at build time (`readFileSync` in the server component) so the page can never drift from the license text. All user-facing "MIT" mentions became "Apache-2.0" (footer Project column, CTA foot, Method foot, footer blurb/status, notes + design cross-links, README, package.json `license` fields).
**Consequence:** contributors get an explicit patent grant; the license page stays a pure render of the repo file. Historical references to "MIT" inside these logs describe the past and are left as-is.

---

# tool-pages-revamp (2026-09-09)

## D15 — Tool-page revamp stacks on the landing branch · **decided**

**Context:** the tool pages needed the landing's editorial language, but they must not gate the landing PR.
**Decision:** new branch `tool-pages-revamp` off `landing-page-revamp`; its PR targets `landing-page-revamp`, not `main`. Merging it does not trigger a deploy (only `landing-page-revamp` → `main` does); the owner merges everything.
**Consequence:** the landing PR stays reviewable on its own; the tool pages ride on top of it and can be reworked without touching the landing.

## D16 — Port scope: furniture + accents, not a re-skin · **decided**

**Context:** the tools' house language (DESIGN.md tokens, rounded-3xl cards, shadcn pills, sage/clay/water) is already the language the landing was built from; the delta is the landing's editorial furniture.
**Decision:** every tool page adopts the landing's chrome — hairline `.lp-label` eyebrow (AGENTS.md text unchanged), `.lp-display` headline with the clay `.lp-dot` terminal period, `.lp-lead`, the `.lp-tool-foot` sign-off row ("← back to the suite" + `Nº 0N / 05` index) — via a shared `ToolPageShell`. Selectively inside: numbered step labels take the `--lp-accent-ink` treatment, Creator/Strip's progressive cards enter with the landing's `ScrollReveal`, and the three hero artifacts (Wrapped demo card, Strip drop card, Expense showcase) get plate-style corner crop marks. Cards, buttons and tokens stay house.
**Consequence:** the pages read as chapters of the same publication without re-skinning working UI. The number appears once (the footer index), not twice on the eyebrow line.

## D17 — CapyExpense is a two-screen page · **decided**

**Context:** the page was a long editorial essay (How it works / Why track / Why local / Get it / FAQ + evidence cards) under a two-state showcase; the owner ruled every other tool page stays a single screen and CapyExpense gets exactly two.
**Decision:** screen one is the hero + the at-rest showcase (self-drawing chart); screen two is the full dashboard behind the existing in-card switcher (`aria-expanded`/`aria-controls`). The five bands are trimmed to two essentials folded under the showcase: the unsigned-installer warning (collapsed `<details>`, clay-tinted) and the desktop-promise/status line ("stored on your machine, never ours. windows & linux builds coming soon."). The evidence essays and FAQ are dropped from the page (the `Evidence[]` data module stays for future use); the landing already pitches CapyExpense.
**Consequence:** the page loses its external evidence hrefs, leaving CapyStrip's OpenStreetMap lookup as the site's only functional external tool link.

## D18 — Header "made by" link nativised to /notes · **decided**

**Context:** handover §6.5 — the shared Header's only external link was the GitHub profile icon; the owner hadn't ruled.
**Decision:** replaced with a ghost icon button linking to `/notes` ("Project notes and issue tracker"), keeping D7 (tool/meta pages keep the shared chrome) and extending D9's zero-external direction to all non-landing chrome. `tests/tool-pages.test.tsx` now asserts the header and four of five tool surfaces render zero external hrefs (Strip's OSM link is the sanctioned functional exception).
**Consequence:** GitHub is one hop deeper, on `/notes`, consistent with the landing's rule.

---

# SEO (2026-10-04 → 2026-10-09)

*Starting point: Search Console showed 45 impressions and 3 clicks. Technical SEO (sitemap, robots, canonicals, JSON-LD, `llms.txt`) was already in place; the gaps were thin pages, brand-first titles and no links in. Shipped across PRs #66, #68, #69, #79, #80, #81, #82, #84, #85, #86.*

## D19 — Every tool page carries a server-rendered guide · **decided**

**Context:** a tool page was a headline, one lead line and a client-rendered widget — almost no text for a crawler to match a query against.
**Decision:** `TOOL_GUIDES` (`src/lib/capytools/guides.ts`) — how-to steps, what it does, FAQ — rendered by `ToolGuideSection` below the stage. Kept **out of `SUITE`** because the masthead's client bundle imports the registry. Every claim is checked against the tool's code before it ships.
**Consequence:** `tests/tool-guides.test.tsx` fails if a `cat: "browser"` tool has no guide, so a new tool can't ship the thin page. CapyExpense (desktop) is exempt: its page already has its own FAQ.

## D20 — Titles lead with the search phrase, brand last · **decided**

**Decision:** `<what people type> — <differentiator> | CapyX`. The homepage's `<title>` is `Free browser tools that never upload your files | Capytools`, while its `og:title` keeps the brand line "Capytools — calm little tools", which reads well in a feed but matches no query.
**Consequence:** brand-first titles ("CapyCreator — …") are gone. Keep new pages to this pattern.

## D21 — Intent pages must open the tool differently · **decided**

**Context:** one page can't rank for every phrasing of what a tool does.
**Decision:** `INTENT_PAGES` (`src/lib/capytools/intents.ts`) — each row is a URL that opens its tool on a real preset (a stage, a payload, a mode, an engine) with its own copy and guide. A row that would only repeat a tool page under a new URL doesn't belong. The registry drives the page, the sitemap, `llms.txt`, the "More with \<Tool\>" cross-links, and `tests/intent-pages.test.ts` (page file ↔ sitemap ↔ smoke list).
**Live (10):** favicon-generator, png-to-webp, wifi-qr-code-generator, vcard-qr-code-generator, og-image-size, contrast-checker, gradient-generator, event-qr-code-generator, website-color-extractor, midjourney-prompt-generator.
**Consequence:** no programmatic grids. A matrix of format-pair converters (jpg-to-png, png-to-jpg, …) or hundreds of templated pages is what Google's scaled-content policy targets (see D32).

## D22 — Overlapping intent goes on the existing page, not a new URL · **decided**

**Decision:** before a new intent page, check whether an existing page already serves that intent (seoo `content-opportunity-discovery`, step 4b). "EXIF viewer" was folded into `/capystrip` (title, guide heading, two FAQs) rather than given a second page; "color palette generator" is `/capytone`'s job.
**Consequence:** no self-cannibalising pages.

## D23 — FAQPage JSON-LD from the visible guide · **decided**

**Decision:** `faqPageLd()` builds it from the same guide the page renders, so marked-up Q&A is always visible Q&A.
**Consequence:** Google shows FAQ rich results only for well-known government and health sites (since 2023), so this won't change Google's results page; it's for engines that still read it. Don't promise more.

## D24 — Decorative plates keep `alt=""` despite Bing's notice · **decided**

**Context:** Bing URL Inspection flags 22 homepage images as "alt attribute missing" (a Notice).
**Decision:** they are abstract collage plates marked `alt="" aria-hidden="true"` on purpose; describing them would add noise for screen-reader users for no ranking gain. Owner agreed to leave it.

## D25 — Breadcrumbs: skipped · **decided**

**Decision:** the site is two levels deep and Google no longer shows breadcrumb trails in mobile results; not worth the markup.

## D26 — The maker is a named person · **decided**

**Decision:** `AUTHOR` (`src/lib/capytools/author.ts`) — Utkarsh Benjwal, the portfolio's own tagline, and portfolio/GitHub/X/LinkedIn links. Rendered at `/notes#author` with `rel="me"` links; stated as `Person` in the homepage `@graph` (`Organization.founder`) and inline as `author` on every `SoftwareApplication`. The footer credit "made by utkarsh benjwal" links to `/notes#author` (internal, per D18). `AUTHOR` is its own module because the footer also renders inside the client `error.tsx`.

## D27 — IndexNow after every deploy · **decided**

**Decision:** key file `public/2ec68e8c36e34163d2272fadc58b34fe.txt`; `scripts/indexnow.mjs` POSTs the live sitemap's URLs to `api.indexnow.org` from `ci.yml` **after** the smoke passes, against the production host (never `DEPLOY_URL` — the host must own the key), with `continue-on-error`.
**Consequence:** Bing, Yandex, Seznam, Naver and others learn about changes on deploy. Google doesn't take part; it keeps using the sitemap. Every URL is sent each deploy (~28), which is fine at this size (a `ponytail:` comment in the script names the upgrade).

## D28 — Smoke retries a page 404 during deploy propagation · **decided**

**Context:** run 37494723671 (#85) — smoke got 404 on two pages the deploy had just added; seconds later all of them answered 200. A failed smoke also skips IndexNow, so page-adding deploys never announced their pages.
**Decision:** the page loop retries a 404 up to 6 times, 5 s apart; any other status is final at once. A page that's really missing still fails (~35 s later).

## D29 — `llms.txt` stays, with a "By task" section · **decided**

**Decision:** keep it and list `INTENT_PAGES` in it. Google ignores `llms.txt`; it's for the other AI tools that read it. Don't claim it helps Google.

## D30 — Dependencies patched narrowly · **decided**

**Context:** `npm audit --omit=dev --audit-level=high` began failing every PR (sharp <0.35.5, source-map-js ≤1.2.1).
**Decision:** `npm update sharp source-map-js` — lockfile only, within existing ranges. `npm audit fix` was rejected: it moved ~100 unrelated packages.

## D31 — Page speed: serving rendered pages from cache · **open**

**Context:** from the owner's connection, cached static files arrived in ~0.5–0.85 s, but Worker-rendered pages took 0.45–1.6 s to first byte. The pages don't change between deploys, yet the Worker renders them on every request. Lighthouse wasn't run (the PageSpeed API's daily quota was used up).
**Next step:** run PageSpeed Insights on `/capybg` (mobile). If LCP is over 2.5 s, look at serving pre-rendered pages from cache (AGENTS.md §6 explains what does and doesn't cache on Workers).

## D32 — Organic-growth playbook (a post the owner follows, 2026-10-09): what we take · **recommended**

| Playbook item | Call | Why |
|---|---|---|
| Content that answers the query; internal links | **done** | D19, plus D21's cross-links |
| Short summary at the top of each page | **done** (D35) | Our lead lines are lowercase taglines, not answers; each guide now carries a one-sentence plain summary under the H1. |
| Created / last-modified date and author on every page | **done** (D26, D35) | A visible "Updated … · by" byline and `dateModified` in JSON-LD, from a hand-set date — never a build-time clock. |
| Canonicals, JSON-LD, crawlable pages | **done** | D20–D23; every page has a canonical |
| 500–700 programmatic pages | **rejected** | Contradicts D21; scaled-content risk on a young domain. Grow by real presets, a few at a time, measured (D34). |
| Multiple languages | **open** | Real reach, real cost (routing, translation quality, hreflang). Revisit once the English pages rank. |
| Listicles ("Best X for Y in 2026") | **open** | Only as honest comparisons that treat competitors fairly (e.g. "background removers that don't upload"); a list that ranks ourselves first hurts trust. |
| A `.md` twin of every page, served by content negotiation | **declined for now** | Google ignores it, `llms.txt` already covers AI readers, and it's a second copy of every page to keep in sync. |
| Sitemap to Google, Bing and IndexNow | **done** | GSC and Bing submitted by the owner; D27 |
| Submit to Brave Search | **recommended, owner action** | Free. The submission route hasn't been checked by an agent yet. |
| Track AI search performance in GSC and Bing | **recommended, owner action** | Check what each console actually reports before relying on it. |
| SEO audit tool (squirrelscan) | **open** | We audit with the seoo pack (installed at `~/.claude/skills/`) plus live checks. Review any third-party skill before installing it. |
| Claude / OpenAI connectors | **open — conflicts with the ethos** | The tools run in the tab and store nothing; a server-side connector breaks that promise. Only revisit for something that needs no user data. |
| Reddit: help first, no direct promotion, tailor each post | **adopted** | `docs/research/backlinks-kit.md` (gitignored, on the owner's machine) |
| Directories | **adopted** | The kit lists AlternativeTo, Product Hunt and awesome-webgpu; awesome-privacy not before 2026-12-20 (the repo must be ≥ 4 months old). |
| iOS keyword research | **n/a** | No app. |

## D33 — Off-site work is the owner's; agents draft · **decided**

**Decision:** posting (HN, Reddit, Product Hunt, AlternativeTo) and anything published under the owner's accounts is done by the owner. Agents draft the copy (`docs/research/backlinks-kit.md`) and open PRs to third-party lists only with explicit approval. Merging PRs is the owner's too: `gh pr merge` from an agent is blocked by the auto-mode classifier, so hand over the command.

## D34 — Content cadence: build a few, measure ~4 weeks · **decided**

**Decision:** the site is early-stage (seoo `seo-growth-stage-strategy`: under ~300 clicks per 28 days, under 6 months of history). After each batch of intent pages, request indexing and wait ~4 weeks of Search Console data before building the next. Next candidate: `/webp-to-png` (high demand, hard SERP) — decide on that data.

## D35 — Plain summary and an "Updated" byline on every tool page · **decided**

**Context:** two cheap items from the playbook review (D32).
**Decision:**
- Every `ToolGuide` has a required `summary`: one plain sentence that answers the query, shown under the lead tagline. The tagline stays the brand's voice; the summary is what a reader, or an AI answer engine that stops at the first paragraph, takes away. TypeScript refuses a guide without one.
- Every tool and intent page carries a byline: "Updated \<date\> · by Unfolding Dimensions", the name linking to `/notes#author`. The owner chose **Unfolding Dimensions** for the byline; the JSON-LD `Person` stays Utkarsh Benjwal (D26). `AUTHOR.byline` holds it.
- One hand-set date, `CONTENT_UPDATED` (`src/lib/capytools/updated.ts`), drives the sitemap's `lastmod`, the visible byline and `SoftwareApplication.dateModified`, so the three can't disagree. Bump it whenever page copy changes.
**Consequence:** every page shows the same date, even when only one page changed (a `ponytail:` comment in `updated.ts` names the upgrade to per-page dates). Tests assert the summary and byline render on every tool page and that `dateModified` equals the shared date.

# Copy, CapyResume and the next four tools (2026-10-09)

## D36 — Sentence case everywhere; no all-caps labels · **decided**

**Context:** the owner found the lowercase register (2026-09-12) and the capitals label style odd to read.
**Decision:** all UI copy and titles are sentence case; labels are normal text at `label` (13px) / `label-sm` (12px), never `uppercase` + wide tracking. DESIGN.md "Register" and AGENTS.md say so; `tests/tool-pages.test.tsx` requires a capital on every tool page's headline and lead. Left as written: generated prompt content, sample data, model names, the README quote chain, `<title>` strings, and text baked into share images (og.png, share cards, CapyTone posters) until those are regenerated.
**Consequence:** new tools must ship in sentence case (the house rules in `docs/research/expansion/next-four-prompts.md` say so); CapyStamp still matches one decode error by exact string, so rewording that message needs the match updated too.

## D37 — Tools 17–20 and how candidates are picked · **decided**

**Decision:** 17 CapyInvoice, 18 CapyVeil, 19 CapyCrop, 20 CapyPDF (merge, split, reorder, compress and sign in one tool), merged strictly in that order. Candidates must (a) not be something an AI agent does instantly — pure text-in/text-out tools like diff, JSON/CSV, calculators, markdown and cron are out; (b) not be heavy — no ffmpeg.wasm or new multi-MB models until there is an audience (video/GIF tools parked); (c) fold overlapping features into one tool.
**Consequence:** CapyDiff was dropped; CapyCrop owns the frame (crop, mask, split), CapyResize keeps pixel size and format.

## D38 — CapyResume guide pages held for the paid tier · **decided**

**Decision:** templates, by-role, by-country and ATS-format pages sit in `src/app/capyresume/(guides)` (URLs unchanged); its layout answers 404 while `CAPYRESUME_GUIDES_LIVE` (`src/lib/capyresume/seo/live.ts`) is false, and the sitemap and the tool's links follow the same switch. The AI assist stays built but unrouted (paid).
**Consequence:** flipping the one constant publishes all guide pages together.
