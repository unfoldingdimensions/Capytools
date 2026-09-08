# learning.md — Capytools landing revamp

*Working learning log for the landing-page-revamp effort (2026-09-09). Companion to [decisions.md](decisions.md) and [handover.md](handover.md). These are the things that cost debugging time this session or will bite again if forgotten.*

---

## L1. `next dev --webpack` + duplicated `Link`s = a hydration-killing prefetch storm

The live wire renders its engine links twice (seamless marquee loop). Under webpack dev, Next prefetches every link entering the viewport; the moving marquee feeds the prefetcher forever, HMR starts "rebuilding" in a ~750 ms loop, and hydration never settles — motion elements freeze at their `initial` state and clicks silently do nothing. Symptoms look exactly like a hydration bug but aren't.

**Rule:** verify landing changes with `npm run build && npx next start`, not the dev server. Also: a stale/corrupted `.next` produced a similar freeze once — `rm -rf .next` fixes that variant.

## L2. Animating inline headline segments with `inline-block` breaks punctuation

Per-segment `display: inline-block` (needed for transform animation) creates soft-wrap opportunities at segment boundaries — the comma after an italic word wrapped to the next line as a leading orphan. Fix: animate the `<em>` words with **opacity + blur only** (no transform), keeping them truly inline so the browser wraps naturally. `filter` and `opacity` work on inline elements; `transform` doesn't.

## L3. Big themed surfaces must not invert with the theme

Painting a section with `background: var(--foreground); color: var(--background)` inverts elegantly in light mode and produces a giant white panel in dark mode. Surfaces with an identity (the ink slab) get **local custom props** (`--slab-bg`/`--slab-fg`) that each theme supplies explicitly, and everything inside tints against the slab's own foreground via `color-mix`. The house rule stands: no `prefers-color-scheme`, tokens only.

## L4. `color-mix` over theme tokens gives two themes for one formula

`color-mix(in srgb, var(--primary) 12%, var(--background))` is a soft sage wash over cream in light and sage-charcoal over `#121212` in dark — one declaration, both themes correct. This is the default tool for tinted bands now.

## L5. `next/font` family names are hashed — literal names only work where you register them

`next/font` self-hosts fonts under mangled family names (`__Albert_Sans_x`). Two consequences:
- **Satori/OG route**: registers literal names ("Albert Sans") via the fonts array — CardArt's stacks must match those literals exactly.
- **html-to-image captures**: `'Albert Sans'` in inline styles does NOT resolve to the next/font instance; exports fall through to the fallback stack. Fine today, but if an export ever looks off-font, this is why.

## L6. Editorial collage plates compress absurdly well

WebP q82 took the 16 export plates from ~19 MB to ~0.9 MB with no visible loss at render sizes (flat paper textures + limited palette are the ideal case). `sharp` in a throwaway folder beats CLI wrangling. Remember: `about.webp` exists and is used; `lab-1.webp` has "2023" baked in (regeneration path in `docs/launch-video`-adjacent archive, prompt pack under `Capytools-Editorial-Landing-OpenDesign/assets/imagegen-prompts.md`).

## L7. `line-height: 1` + `overflow: hidden` clips descenders

Display type at line-height 1 paints descenders (y, Q tail) below its em box. The footer mega wordmark sits in an `overflow: hidden` block (needed for horizontal containment), so the clip cut the glyphs at the page end. Fix: `padding-bottom: 0.25em` **on the word itself** — em-relative, so it scales with the clamp() font-size and the horizontal containment stays.

## L8. Family swaps are one-file changes if the token name is stable

Swapping IBM Plex Mono → Albert Sans touched one import in `layout.tsx` because every consumer (dozens of `font-mono` utilities, CSS `var(--font-mono)`) resolves through the token. Renaming the token would have touched dozens of files for zero visual change. Keep the token name, document the family change in a comment, update the docs that name the family (DESIGN.md, AGENTS.md, OG route, CardArt).

## L9. Mimosa pre-commit hook runs in compat mode

Commits and pushes pass, but every hook run prints a partial-scan notice (library_source, callgraph partial). This is normal for this repo — never describe the project as "security-audited" on the strength of a passing commit. Secret-shaped literals in tests WILL hard-block; keep stub keys non-literal (see commit `004df11` for the pattern).

## L10. Verifying a long page in a driven browser has three traps

1. **Viewport emulation persists**: the automation browser pins a viewport (it was 1440×900 for the matrix shots); maximising the window leaves the page rendering in a corner with dead fill. Resize to the window before judging layout.
2. **Bfcache/stale pages**: after a rebuild+restart, a plain navigate can serve a stale render — cache-bust the URL (`?v=N`) when comparing builds.
3. **Synthetic events don't trigger CSS `:hover`** — use the driver's real `hover()`; and read `aria-pressed` etc. on a *later* tick than the click, React state hasn't flushed synchronously.

The reliable check that caught real bugs this session: computed-style assertions (`getComputedStyle(img).transform`, `.opacity`) rather than screenshots alone.
