# decisions.md — Capytools landing revamp

*Decision record for the landing-page-revamp effort (2026-09-09). Companion to [learning.md](learning.md) and [handover.md](handover.md). Format follows `docs/launch-video/decision.md`: each decision numbered, marked **decided** (we commit), **recommended** (my call unless overridden), or **open** (needs the owner).*

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

**Decision:** the landing ships `LandingMasthead` (headroom hide-on-scroll, anchor links, Albert Sans CTA pill) and `LandingFooter` (link columns + mega wordmark). Tool pages and the meta pages keep the shared `Header`/`SiteFooter`.
**Consequence:** the editorial page gets its nav language; the rest of the site stays consistent.

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
