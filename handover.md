# handover.md — Capytools, landing-page-revamp

*Written 2026-09-09 for the next agent picking up this work. Read this first, then [decisions.md](decisions.md) (why things are the way they are), [learning.md](learning.md) (how not to burn time), and `AGENTS.md` + `DESIGN.md` (the standing rules).*

---

## 0. The 60-second version

Capytools is a suite of five calm little browser tools (CapyWrapped, CapyImagine, CapyCreator, CapyStrip, CapyExpense-desktop) — no signup, no cookies, no telemetry, nothing leaves the machine. This session rebuilt the home page as an **editorial "magazine" landing** ported from a design archive, swapped the label font to **Albert Sans**, removed the Blender renders the owner rejected, made **every landing link route natively** (three new meta pages), and added a research-backed **surface arc** so the long scroll has chapters. All work is on branch `landing-page-revamp`, pushed, tests green. **Nothing is merged — and nothing may be merged without the owner** (merging triggers the Vercel production deploy).

## 1. Repo & branch state

- Working branch: **`landing-page-revamp`**. Parent branch: **`feat/capyexpense`** (the CapyExpense PR — tool no. 5, Tauri desktop app, first pushed to origin on 2026-09-09). Both PRs target `main` and are **open, stacked, unmerged**. On top of the landing sits **`tool-pages-revamp`** (2026-09-09): the five tool pages port the landing's editorial language via a shared `ToolPageShell` — see decisions D15–D18; its PR targets `landing-page-revamp`, so merging it does not deploy.
- Owner workflow: PRs stay open until the landing is finalised; merging = deploy. Vercel builds a preview per push — previews are the review surface.
- Recent commits on this branch (newest last): security pass + CapyOnsen + shadcn chore (on the parent) → plates → the editorial landing → design docs → surface arc → Albert Sans → native routing → descender fix → Apache-2.0 license.
- Untracked on disk (intentional): `Capytools-Editorial-Landing-OpenDesign/` (the design archive this was ported from — includes `assets/imagegen-prompts.md` for regenerating plates), `docs/launch-video/` (a separate effort's logs), `.playwright-mcp/` et al. (gitignored).

## 2. What exists now

**The landing** (`src/app/page.tsx` → `src/components/landing/`): nine sections — Hero, LiveWire marquee, About (manifesto band), Capabilities (band), Labs (filterable catalog, tight 90px rhythm), Method, SelectedWork (ink slab), Colophon (160px), ClosingCta (sage band), LandingFooter (mega wordmark). Surface map: cream → white band → cream → ink slab → cream → sage band → cream.

**File map:**
- `src/lib/capytools/landing.ts` — **single source of all landing copy and link targets**. Registration-parity tests for CapyStrip/CapyExpense read this file.
- `src/components/landing/*` — one component per section + `ScrollReveal` (whileInView), `LandingMasthead` (headroom), `LiveWire` (marquee + WCAG pause), `Labs` (filters), `SectionRule`, `icons`.
- `src/components/landing/landing.css` — all landing styles, **every class prefixed `lp-`**, export palette remapped onto house tokens.
- `public/plates/*.webp` — 16 editorial plates (~0.9 MB total).
- `src/app/design|license|notes/page.tsx` — editorial meta pages (Header/SiteFooter chrome + `lp-` body).
- `tests/landing.test.tsx` — 13 assertions incl. **zero external hrefs on the landing** and plate-existence checks.

**New pages this session:** `/notes` (project notes; holds the site's only external links — GitHub issue tracker/repo for contributions), `/design` (design system page), `/license` (Apache-2.0, read from the repo LICENSE at build time).

## 3. Standing conventions (violating these = rework)

1. `AGENTS.md` is law: eyebrow format `Capy<Name> · tool no. X` in `font-mono text-[11px] uppercase tracking-[0.24em]`; hydration pattern (read localStorage on mount via useCallback+useEffect); shared `src/components/capyexpense/` UI imports no `next/*`, no `motion`, no storage (`tests/capyexpense-boundaries.test.ts` enforces).
2. Colors only via tokens (`tokens.css`); no `prefers-color-scheme`; never invert a big surface with fg/bg swaps — give it local custom props (see the slab).
3. Motion: expo-out `cubic-bezier(0.16,1,0.3,1)` family, 600/900ms entrances, 350ms hovers; transform/opacity only; everything dies under `prefers-reduced-motion`.
4. The landing renders **zero external hrefs** — test-enforced. Contribution links live on `/notes` only.
5. All landing copy comes from `src/lib/capytools/landing.ts`; the Colophon quotes the README "verbatim", so they change together (test-enforced).
6. Label font is **Albert Sans** under the `--font-mono` token name (owner's swap). Don't reintroduce a mono without asking.

## 4. Gotchas (details + war stories in learning.md)

- **Dev server lies**: `next dev --webpack` + the marquee's duplicated links = prefetch/HMR storm that freezes hydration. Verify with `npm run build && npx next start`. A frozen page can also mean corrupted `.next` → `rm -rf .next`.
- **Mimosa pre-commit hook** prints partial-scan notices — normal; commits pass. Secret-shaped literals in tests hard-block; keep stubs non-literal.
- **Automation browser**: viewport emulation persists (don't judge layout in a maximised emulation); cache-bust URLs when comparing builds; synthetic events don't fire CSS `:hover`.
- Display type at `line-height: 1` clips descenders inside `overflow: hidden` — the mega wordmark carries `padding-bottom: 0.25em` for this; keep it.

## 5. Verification playbook

1. `npm test` (457 passing), `npm run lint` (clean), `npm run build` (all routes prerender).
2. `npx next start -p 3100` → check the landing + one tool page + one meta page.
3. Playwright audit: unique hrefs → 0 external, all anchors resolve, all routes 200 (360/390/820/1440/1920, no horizontal overflow; dark mode toggle; marquee pause; Labs filters; reduced-motion).
4. Squint test: each section should read as a chapter (surface map above).

## 6. Open items (pick-up points)

1. **`lab-1.webp`** has "2023" baked into the art (decision D13, open). Regenerate from the archive's prompt pack with 2026, re-convert to WebP q82.
2. **OG image** for `/` not wired — metadata is text-only. A static OG (hero plate or a satori card) is a cheap win.
3. **`capabilities.webp`** has tiny garbled micro-text (unreadable at size; cosmetic).
4. **README** documents the five tools but CapyStrip/CapyExpense sections are thin; a fuller rewrite was out of scope.
5. ~~Tool-page header still has a "made by" GitHub icon (external)~~ — **resolved 2026-09-09 (D18)**: nativised to an internal `/notes` link on `tool-pages-revamp`; tool-page chrome is now zero-external (test-enforced there too).
6. Full **Mimosa security audit** still pending (hook has only ever passed in compat mode).
7. Editorial-lite trims are one-way doors only by convention — any dropped furniture (side rails, pagination, hero index) can be restored from the archive if the owner changes taste.

## 7. Kickoff prompt for the next agent

> You are continuing work on Capytools (E:\New-Personal-Projects\Capytools), branch `landing-page-revamp`. Read `handover.md`, `decisions.md`, `learning.md`, `AGENTS.md`, and `DESIGN.md` before touching anything. The landing is an editorial port of the OpenDesign archive; all copy lives in `src/lib/capytools/landing.ts`; styles are `lp-`-prefixed in `landing.css`; the landing must render zero external hrefs (test-enforced). Verify with `npm test`, `npm run build`, and `npx next start` — never trust `next dev` for hydration judgement. Open items are listed in handover.md §6; the owner has final say on merging anything (merge = production deploy).
