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
**Amended 2026-10-09 (owner):** the keyword research (D46, D47) showed format conversion is the largest demand our tools can honestly serve — png to jpg 1M–10M/month on Google; webp to png, jpg to png, compress image 100K–1M each — so a **capped** set of format pages is allowed. Each must: (1) clear ~100K/month on Google *and* show real volume on Bing; (2) be a conversion CapyResize does in the browser today (no HEIC — only Safari decodes it; no `.ico` or SVG page until the tool handles them, see the brief); (3) open CapyResize on a real preset (output format, starting quality) with its own copy, guide and summary — not the same text with the format names swapped; (4) ship in batches of at most four, with ~4 weeks of Search Console data before the next batch (D34). First batch: `/png-to-jpg`, `/webp-to-png`, `/jpg-to-png`, `/compress-image`. Still **no exhaustive matrix**; the ban on hundreds of templated pages stands.

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
| Submit to Brave Search | **recommended, owner action** | Free, manual: [search.brave.com/submit-url](https://search.brave.com/submit-url). No console, no sitemap upload, and IndexNow (D27) doesn't reach it — see L32. |
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
---

# CapyInvoice (2026-10-09)

## D39 — CapyResume's plumbing moved to shared modules, CapyResume re-binds · **decided**

**Context:** the CapyInvoice kickoff said reuse, not rebuild: pieces of `src/lib/capyresume/` that are genuinely tool-agnostic move to a shared home while CapyResume's tests stay green.
**Decision:** five extractions, each proven by CapyResume's existing tests running UNCHANGED:
- `src/lib/download.ts` gains `downloadBlob`/`downloadText`/`readFileAsText` (moved from `capyresume/download.ts`, which is now a re-export shim); `saveBlob` stays as-is for its eight existing callers.
- `src/lib/capytools/doc-store.ts` — `createDocStore<T>()`, the battle-tested localStorage store (stable snapshots, versioned key, storage-refusal memory). `capyresume/store.ts` binds it with a `stamp` hook for the schema version; `capyinvoice/store.ts` and `capyinvoice/business.ts` bind their own.
- `src/lib/capytools/paper-size-pref.ts` — `createPaperSizePref(key)`; each tool keeps its OWN key (an invoice and a résumé print independently).
- `src/lib/capytools/pdf-fonts.ts` — `registerLiberationFonts()` + `PDF_FONT_BASE`, shared by both PDF exporters.
- `src/lib/capytools/uid.ts` — the id helper, re-exported from `capyresume/schema.ts`.
**Consequence:** per-tool copies remain only where the repo convention already had them (`formatBytes`/`fileNameSafe` — capyread and capypassport each carry their own). `saveBlob` and `downloadBlob` still co-exist in `src/lib/download.ts` with slightly different bodies; unifying them is a follow-up that touches eight tools and stayed out of this PR.

## D40 — Money math: integer minor units, per-line tax, no-lost-cent discount spread · **decided**

**Context:** the part of the tool most likely to be wrong, per the kickoff; test hardest.
**Decision:**
- Every amount is an integer of the currency's minor unit from parse to print (`src/lib/capyinvoice/money.ts`). Parsing is the one boundary where text becomes an integer (half away from zero at the currency's own digits); the only float in the model is `qty`, rounded once when the line amount forms.
- **Tax is per line**, at each line's own rate (held in basis points), grouped by rate for the totals — never tax-on-the-total. Stated on the page and in the PDF's fine print via `roundingNote()`, one string in one place.
- A document discount applies before tax and is spread across lines **in proportion to their amounts**, walking the lines and giving the last positive line the remainder, so shares always sum to exactly the discount. **Credit lines take no share** (a test caught the first version's remainder logic overwriting a share when a credit line trailed).
- Rounding is half **away from zero**, symmetric for credit lines; pinned against `Math.round`, which rounds negative ties toward +∞.
- Currency digits come from Intl (`JPY` → 0, `KWD` → 3); an unknown but well-formed code degrades to 2 rather than throwing.
**Consequence:** the demo invoice's totals (£2,442.45 / balance £1,942.45) are hand-checked in tests AND extracted back out of a real rendered PDF by `scripts/verify-capyinvoice-pdf.mjs`.

## D41 — Number inputs: one lexer, last-separator-wins, dot-preferring · **decided**

**Context:** typed amounts arrive with dots, commas, spaces, currency symbols.
**Decision:** `parseDecimalInput` accepts both marks — when both appear, the LAST separator is the decimal mark ("1,234.56" en, "1.234,56" de); a lone comma with 1–2 digits after it is a decimal mark ("12,5"), with three it is grouping ("1,234"); a lone dot is always the decimal mark ("12.345" is over-precise, not twelve thousand); multiple dots are all groupings. Symbols £$€¥₹, spaces and apostrophes are stripped; parentheses or a leading minus make a negative.
**Consequence:** the rule is documented in the tool's own hint line ("the last separator counts") and pinned by 27 money tests. UI numeric fields use the TagsInput focus-draft pattern, so typing "12." is never fought by the parser.

## D42 — CapyInvoice's intent pages open the tool on the document kind · **decided**

**Context:** D21 requires an intent page to open the tool on a real preset.
**Decision:** `CapyInvoice` takes `initialKind`; `/free-invoice-generator`, `/quote-template` and `/receipt-maker` pass invoice/quote/receipt. On mount, a landing with a stored draft of a different kind switches the KIND only — every line, party and total is kept; a first visit seeds the demo wearing that kind.
**Consequence:** quote↔invoice↔receipt is a one-click conversion, which the quote guide names explicitly.

## D43 — Owner assets: lab-17 prompt delivered; og.png regenerated in-repo · **decided**

**Decision:** the lab-17 plate prompt (brass counting frame beside a shapes-only invoice sheet) is appended to `docs/research/plates/lab-prompts.md` — the plate FILE stays the owner's step, and the landing asset test is the expected-red canary until it lands (the D-CapyPassport precedent). The share card's count was regenerated the way the CapyResume count commit documents it: clear the old text box (x 818–1068, y 54–80, `#f9f9f7`), composite "SEVENTEEN TOOLS" right-aligned at ink edge 1064, baseline 74.5, Albert Sans 500 19.75px, tracking 4.2px, `#6b6a66`, via sharp with a scratch fontconfig pointing at a downloaded Albert Sans 500 TTF, alpha removed to keep the 3-channel RGB. `OG_CARD_TOOL_COUNT` bumped to 17 with it.
**Consequence:** next count bump can copy the recipe from this entry; the scratch dir was deleted after use.

## D44 — lib-internal imports stay relative, not `@/` · **decided**

**Context:** `scripts/verify-*-pdf.mjs` compile `src/lib/<tool>` with bare `tsc`, which has no `paths` mapping; `@/lib/...` imports inside lib files broke it.
**Decision:** modules under `src/lib/` import each other by RELATIVE path (components keep `@/`). Both verify scripts pass `--rootDir src`, so shared modules emit under `OUT_DIR/lib/capytools/` and the loaders point there.
**Consequence:** the repo's lib style is now stated: `@/` is for components and tests; lib-to-lib is relative.

## D45 — Controls and hierarchy for every editor · **decided**

**Context:** the owner found CapyResume's first builder and CapyInvoice's first pass flat — every control the same grey pill, no headings, hovers that barely changed.
**Decision:** DESIGN.md "Controls and hierarchy" is the rule: every button fills on hover, from one shared set (`src/components/ui/house.tsx` — `PRIMARY_BTN`, `BTN`, `ADD_BTN`, `DANGER_BTN`, `ICON_BTN`, `CHOICE_BTN`, plus `FIELD`, `<Field>`, `SECTION`, `GROUP`, `SELECT_TRIGGER`); a visible label on every field; grouped fields under headings split by hairlines; one emphasis per card; repeated entries as rows; the house Select, never `<select>`. CapyResume and CapyInvoice use it; AGENTS.md and the house rules in `docs/research/expansion/next-four-prompts.md` point new tools at it.
**Consequence:** the other fourteen tools predate the rule and still carry their own button classes; bring them over when each is next touched.

## D46 — Search volume comes before building a page · **decided**

**Context:** Bing Webmaster's Keyword Research (2026-10-09) gave real volumes for the first time. Several intent pages chosen earlier from search-result checks alone — midjourney-prompt-generator, website-color-extractor, event-qr-code-generator, and og-image-size's "og image generator" — show **0** on Bing (below its reporting threshold), while phrases our tools already serve run into the hundreds of thousands.
**Decision:** before a new intent page or a title change, check the phrase's volume (Bing Keyword Research; method in L36; latest table in `docs/research/keywords-2026-10-09.md`, owner-local). Titles lead with the highest-volume phrase the page honestly serves (D20). Applied first to three titles:
- `/capyresume`: "Free resume builder — no signup, PDF & Word download" (resume builder ~101K over 3 months on Bing; free resume builder ~40K). It was brand-first, against D20.
- `/capypassport`: "Passport photo maker — US, UK & Schengen sizes, free, no upload" (passport photo ~26K). Also brand-first.
- `/capyresize`: "Image resizer — resize and convert PNG, JPG and WebP, free, no upload" (image resizer ~262K; resize image ~179K, +73%). The favicon pack has its own page, `/favicon-generator`.
**Resolved 2026-10-09:** the owner approved both open items — format-conversion pages (D21 amended) and a CapyTone "palette from image" mode ("color picker from image": 100K–1M/month on Google, ~20K on Bing). The build list for the orchestrator is `docs/research/seo-build-brief-2026-10-09.md` (owner-local).

## D47 — Check Google and Bing before building the next tool or page · **decided**

**Context:** on 2026-10-09 the same 59 phrases were checked on both engines, and they disagreed sharply. Bing alone made `/wifi-qr-code-generator` (~2.3K/3 mo) and `/favicon-generator` (~7.4K) look minor; Google puts both at **100K–1M/month**. Bing alone also made "color picker from image" look modest (~20K); Google says 100K–1M. One engine is not enough to decide what to build.
**Decision:** before building a **new tool**, an intent page, or retitling a page, look up its phrases in **both**:
- **Google Ads → Keyword Planner → "Get search volume and forecasts"**, location **All locations** (the owner's account defaults to India — change it), all languages. Without ad spend it gives ranges.
- **Bing Webmaster → Keyword Research** (L36 has the bulk method).
Record both columns in `docs/research/keywords-<date>.md`, and say in the PR which phrase the page targets and its volume on each engine. Google decides the size of the opportunity; Bing confirms the trend and shows related and question phrases. A phrase that is ≤10K on Google *and* ~0 on Bing needs a reason the owner agrees to.
**Consequence:** no more pages picked from search-result checks alone (the four small intent pages in D46 were). Google's "Competition" column is *ad* competition, not ranking difficulty — don't rank opportunities by it.

## D48 — Four format-conversion intent pages on CapyResize (D21 amended) · **decided**

**Context:** the 2026-10-09 research (D46/D47) found image-format conversion is the largest demand CapyResize already serves with no page. Volumes, Google Keyword Planner (All locations, average monthly searches) / Bing Keyword Research (12 weeks, impressions):
- `png to jpg` — 1M–10M / 166,421 → `/png-to-jpg`
- `webp to png` — 100K–1M / 115,317 → `/webp-to-png`
- `jpg to png` — 100K–1M / 103,129 → `/jpg-to-png`
- `compress image` — 100K–1M / 82,678 → `/compress-image`
**Decision:** each is an `INTENT_PAGES` row opening CapyResize on a preset: `initialFormat` jpeg / png / png / jpeg. `/compress-image` also passes a new `initialQuality={0.7}` (CapyResize's `useState(0.85)` is now `useState(initialQuality)`, default unchanged; the slider runs 0.50–1.00 in 0.05 steps). It starts on **JPEG, not WebP**: every browser can write JPEG, whereas a browser that can't encode WebP silently hands back a PNG — the opposite of "compress". The page says so and points to WebP as the one-click alternative. Copy is written to each pair's own question (alpha for PNG→JPG, size growth and no restored detail for JPG→PNG, lossless + transparency kept for WebP→PNG, measured savings and the two levers for compress); none is a format-name swap of another (D21).
**Consequence:** copy claims checked against `CapyResize.tsx`/`render.ts`: the JPEG fill is the "Flatten onto" picker, default `#ffffff` (not sampled — `sampleCornerColor` feeds only the favicon pack's background); before = the dropped file's `size`, after = the encoded blob's `size`, shown as "% smaller/larger"; PNG has no quality slider. `CONTENT_UPDATED` was already `2026-10-09`, so there was nothing to bump. HEIC→JPG (also 1M–10M on Google) stays unbuilt: only Safari decodes HEIC.
