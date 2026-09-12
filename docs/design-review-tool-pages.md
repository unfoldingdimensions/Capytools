# Design review — the five tool pages against the landing

**Scope:** landing (`/`), `/capywrapped`, `/capyimagine`, `/capycreator`, `/capystrip`,
`/capyexpense`, plus the shared chrome (`Header`, `SiteFooter`, `ToolPageShell`),
the motion layer, and the meta pages (`/notes`, `/design`, `/license`).
**Method:** read the shipped source (styles, components, copy constants, tests),
ran the site locally on `:3024`, and measured real layout geometry through the
live DOM. Screenshots were captured at 1440 and 390 px into
`.openclaw/tmp/shots/` (they were not viewable in the reviewing model, so every
claim below is anchored to source or measured geometry, not to an impression of
a picture).
**Goal stated by the client:** a consistent design language that survives three
or four more tools, with CapyExpense about to launch.

---

## 0. Status

*Updated 2026-09-12. All six P0 items are addressed.*

| PR | Items | State |
|---|---|---|
| [#3](https://github.com/unfoldingdimensions/Capytools/pull/3) | P0 #1, #2, #3 | merged to `main` |
| [#4](https://github.com/unfoldingdimensions/Capytools/pull/4) | P0 #4, #5, #6 | open, awaiting review |

| # | Change | Where |
|---|---|---|
| 1 | One reduced-motion contract for every `motion.*` in the app, plus local guards where the config alone is not enough | new `src/components/motion-provider.tsx` (`reducedMotion="user"`), wired in `layout.tsx`; explicit `useReducedMotion` guards in `Reveal`, `TextReveal`, `TerminalLoader` |
| 2 | One masthead for the whole site — landing, tools and meta pages — on the landing's `.lp-container`, with one CTA, one brand mark and a nav that collapses instead of vanishing | `src/components/header.tsx` rewritten; `Landing` now renders it; new `src/components/brand-mark.tsx` is the single logo slot; the superseded `LandingMasthead.tsx` deleted |
| 3 | Skip link on every page, not just the landing | `ToolPageShell`, `notes`, `design`, `license` |
| 4 | `CapyCreator` moved onto the shared form primitives, every label bound to its control, and its two smooth-scroll jumps put under `prefers-reduced-motion` | `CapyCreator.tsx`; new `src/components/ui/textarea.tsx` |
| 5 | The unreachable page wipe removed, and the seam documented with the upgrade path rather than half-implemented | `globals.css`, `lib/capytools/reveal.ts`, `TransitionLink.tsx` |
| 6 | The tool nav measures its own fit instead of trusting a breakpoint, and folds into the disclosure when the row would not fit | `header.tsx`, `landing.css` |

Verification as of #4: **484 tests pass**, ESLint clean, `tsc --noEmit` clean,
`next build` green (14/14 static pages). The one failing test,
`capyexpense-geometry > format > formats an unlisted but well-formed code`, is
pre-existing on `main` and untouched by this work.

Measured after #2: at a 919px viewport the brand sits at x=32 on
`/capywrapped`; at 735px it sits at x=24 on the landing — both exactly what
`.lp-container`'s responsive padding predicts from a single shared component
(before: x=84 vs x=32 at the same 1015px width).

Measured after #6, over CDP in headless Chrome at 390 / 900 / 1180 / 1400 /
1700px on the landing and on a tool page: the row is inline while it fits, folds
into the disclosure when it does not, and the page never overflows horizontally
at any width. Two faults in the measurement itself were only visible by doing
that — the container's `clientWidth` includes the page gutter it must not count,
and `<Link ref={...}>` leaves the ref null in the App Router, which made the
fold a silent no-op.

### Decisions recorded from the client (2026-09-12)

Tool pages converge **up** to the editorial landing; a tool page is an **app
surface**; no per-tool accent colour; `landing.css` stays on every tool page; the
lowercase register is deliberate but must not touch titles or anything needing
uppercase; the circle-`C` was a placeholder pending a real logotype.

### Deliberately not done

- **The page transition itself.** The unsupported half was removed rather than
  half-implemented; re-adding it needs React's `<ViewTransition>`, which
  `react@19.x` stable does not export. `TransitionLink` stays as the single seam
  where it would reattach. Client decision on 2026-09-12: leave as is for now.
- **One further deletion.** `src/components/TransitionLink.tsx` would be unused
  if its 27 call sites were unwrapped. It stays for now as a documented seam
  that names the upgrade path; unwrapping it needs an approved file delete.
  (`LandingMasthead.tsx`, the other passthrough, was deleted in #4 once the
  delete was approved.)
- **Everything in P1 and P2** — the suite count hardcoded in roughly fifteen
  places, the two `repeat(5, 1fr)` grids, the second footer, the missing
  section-rule vocabulary on tool pages, and the `--clay` over-use.

---

## 1. Verdict

The landing is genuinely good. It has a point of view, a rhythm, and a
vocabulary — roman-numeral section rules, a clay terminal period, an ink slab, a
sage CTA band, a mega wordmark, crop marks on every plate. It reads like a
publication that happens to contain software.

The five tool pages inherit the landing's **vocabulary** (Fraunces display, the
mono eyebrow, the clay dot, `AmbientBackground`) but almost none of its
**grammar** (section rules, numbering, band rhythm, slab, width, footer). What
they actually read as is a shadcn app inside a themed wrapper, parked behind a
magazine cover.

That is the central problem, and it is worth fixing before launch — because the
tool pages are the pages people bookmark and return to, and because the suite is
about to double in size on top of a foundation that is currently two different
design systems sharing one token sheet.

---

## 2. What is working — do not regress these

- **The palette is disciplined.** Sage as primary, water reserved for data,
  dark ink *on* sage rather than white. `--water` is used in exactly three places
  (`AmbientBackground`, the hero chart line, `SubscriptionPanel`) — that is
  genuinely single-purpose and rare.
- **The motion *implementation* is unusually careful.** Compositor-only
  transforms, no `filter: blur()` on moving elements, `will-change` promotion
  where a scaled subtree would otherwise re-rasterise, ambient washes on
  `alternate` loops with negative delays so they never breathe in unison.
- **`CapyExpenseHeroChart` is the house pattern for animated artifacts.**
  The resting state *is the finished chart*; the animation is layered inside
  `@media (prefers-reduced-motion: no-preference)`. If the animation never runs,
  the chart is still there. Every animated artifact in the suite should copy
  this.
- **Accessibility is treated as a design constraint, not a checklist.** The
  marquee ships a keyboard-reachable WCAG 2.2.2 pause, pauses on hover and on
  `focus-within`, hides its toggle under reduced motion, and marks its duplicate
  loop `aria-hidden` with `tabIndex={-1}`. The `TextReveal` splits words but
  exposes the intact string via `aria-label`. Edge-case copy (`rate_limited`)
  explains *why* and offers retry only where retry can work.
- **Loading is honest.** `TerminalLoader` reports real per-request progress and
  says so in a comment; no cosmetic timer pretending to be a bar.
- **The theme spread** (clip-path circle from the toggle, `flushSync` inside
  `startViewTransition`, theme read from the `dark` class at click time rather
  than from render state) is the most delightful moment on the site, and the
  reasoning in the comments is correct.

---

## 3. The core problem: two design languages sharing one token sheet

### 3.1 There are two headers, and they don't line up

| | Landing (`LandingMasthead`) | Tool pages (`Header`) |
|---|---|---|
| Container | `.lp-container` — max 1360, `px-64/44/32/16` | `max-w-4xl` (896), `px-6` |
| Brand mark | circle-`C` monogram (`lp-brand-mark`) | capybara SVG (`CapyMark`) |
| Nav | 4 section anchors + `Notes` | 5 tool pills |
| CTA | black pill "Open the tools →" | none |
| Behaviour | headroom hide-on-scroll, `is-scrolled` border | plain sticky |
| Extras | — | `BookOpen` notes icon, `ThemeToggle` |

**Measured, at a 1015 px viewport:** the brand link sits at **x = 32** on the
landing and **x = 84** on `/capywrapped`. The right-hand cluster (theme toggle)
is at **x = 788** on the landing and **x = 896** on the tool page. At 1440 px the
gap is larger still (`max-w-1360 + 64` vs `max-w-4xl + 24`).

So the single most common journey on the site — landing → tool — begins with the
logo and the theme toggle both jumping ~50–190 px sideways, and the primary CTA
disappearing. That is the first thing a visitor's eye does after clicking, which
is exactly the wrong first impression to spend on chrome drift.

### 3.2 There are two brand marks

The product is named after a capybara; the mascot (`CapyMark`, `CapyScene`) is
the identity. It currently appears in: the tool `Header`, `CapyStrip`'s error
state, `ErrorCard`, and `CardArt`. It appears **nowhere on the landing** — the
landing masthead, the landing footer and the About avatar all use a plain
circle-`C`. The landing outsources its personality to the `.webp` plates. Pick
one mark and use it everywhere; the mascot is the stronger asset and the landing
is where it would earn the most.

### 3.3 There are two footers, and the tool one is a stub

The landing footer is a 4-column editorial footer with a brand column, a
CapyExpense CTA and a 150 px mega wordmark. The tool footer (`SiteFooter`) is one
line of mono text and one line of UI text at `max-w-4xl`, with no brand mark, no
columns, and **no cross-sell to the other four tools**.

On a launch page the footer is where the suite gets sold. The landing knows this;
the tool pages throw it away. This is also the last thing a visitor sees, so it
is carrying the "five tools, one house" message at the weakest possible volume.

### 3.4 There are three numbering systems

| Where | Format |
|---|---|
| Landing sections | `I.`…`VIII.` + `· Nº 05` + `CAPYTOOLS / VOLUME 01` |
| Landing catalog | `Nº 01`, `05 / 05 TOOLS`, `05 OF 05 SHIPPED`, `01 / 05` |
| Tool eyebrow | `CapyWrapped · tool no. 1` *(locked by `tests/tool-pages.test.tsx`)* |
| Tool sign-off | `Nº 01 / 05` |
| `/capyexpense` sections | `01 · What it is`, `02 · Why typing it out` … |

Roman, `Nº 0X`, `tool no. X`, bare `0X`, and `X / 05` all coexist within one
click of each other. `/capyexpense` manages three of them on a single page.
Consistency here is cheap and highly visible — it is the clearest signal of
"one house" a visitor can actually see.

### 3.5 The landing's signature device is missing from every tool page

`.lp-sec-rule` (hairline + roman numeral + `META • META`) is the thing that makes
the landing read as *an issue of something*. Tool pages open with a bare eyebrow
and nothing else, so the "publication" frame drops the moment you enter a tool.
A tool-page variant — `Nº 02 — CAPYIMAGINE / TOOL NO. 2 • BROWSER · NOTHING
STORED` — would reconcile 3.4 and 3.5 in one move.

---

## 4. Findings, by severity

*All six P0 items are addressed — see §0 for what landed, where, and what was
left out deliberately. The ratings below are the original findings as written.*

### P0 — fix before the CapyExpense launch

| # | Finding | Evidence |
|---|---|---|
| 1 | **Reduced-motion is broken on every tool page.** `Reveal` and `TextReveal` never check `useReducedMotion`, and there is **no `MotionConfig`** anywhere in `src/`. framer-motion's default is `reducedMotion: "never"` (verified in `node_modules/framer-motion/.../MotionConfigContext.mjs`). So the tool-page `h1` word-by-word blur, the surface fade, and `TerminalLoader`'s **infinite** opacity pulse all run for users who asked for no motion. This directly contradicts `/design`'s "Every motion dies under `prefers-reduced-motion`" and the landing's own behaviour (`Hero` and `ScrollReveal` both guard correctly). | `Reveal.tsx`, `TextReveal.tsx`, `TerminalLoader.tsx`; `src/app/design/page.tsx` |
| 2 | **Header geometry jumps between landing and tools** (§3.1). | measured 32 vs 84 px |
| 3 | **Tool pages have no skip link; the landing does.** Tool pages put a 5-item nav before the content and then offer no bypass. | `Landing.tsx` has `.lp-skip-link`; `ToolPageShell.tsx` has none |
| 4 | **`CapyCreator` uses raw `<input>`/`<textarea>`** with bespoke classes, `focus:border-primary` instead of a `focus-visible` ring, and — for "Your ask" — a `<label>` with **no `htmlFor`** and a textarea with **no `id`**. Clicking the label does not focus the field; keyboard users get a 1 px border-colour change as their only focus cue. | `CapyCreator.tsx` |
| 5 | **The page transition is dead code.** `TransitionLink` is now a passthrough `<Link>`; `startTaggedTransition("wipe")` is never called, so `[data-vt="wipe"]`, `vt-wipe-in/out` and the whole wipe block are unreachable. 15 files still import the passthrough. Navigation is a hard cut, which makes the theme spread feel like the only trick in the deck. | `TransitionLink.tsx`, `globals.css`, `reveal.ts` |
| 6 | **Tool nav will not survive tools 6–9.** Five pills already forced the breakpoint from `sm` to `md`; eight or nine short-label pills will overflow `md` and there is no disclosure pattern. | `header.tsx` + the current comment |

### P1 — fix before tools 6 and 7

| # | Finding | Evidence |
|---|---|---|
| 7 | **"Five" is hardcoded in ~15 places**, across copy *and* layout. `HERO.lead` names all five tools; `hero.stats` shows `05`; `hero.ix = "· Nº 05"`; `LABS.meta = "05 of 05 shipped"`; `LABS.foot = "05 / 05 TOOLS"`; `LABS.pills` counts `05/04/01`; the README quote "Five so far" (asserted against `README.md` by a test); `LANDING_FOOTER.blurb` "Suite of five"; plus `.lp-labs-grid { repeat(5,1fr) }` and `.lp-partners { repeat(5,1fr) }`. Tool #6 makes the catalog grid wrap raggedly (5+1) and every one of those strings wrong. | `landing.ts`, `landing.css`, `tests/landing.test.tsx` |
| 8 | **No shared skeleton for "the tool page".** After the `h1`, the vertical rhythm is bespoke on all five: Wrapped = form + one card; Imagine = 2 cards; Creator = 3 stacked cards; Strip = 3 cards + 2 conditional states; Expense = chart + dashboard + 4 editorial sections. Only Expense has numbered stages (`01 · What it is`), and those are hand-written per section. | `CapyExpenseShowcase`, `CapyExpenseDemo`, page bodies |
| 9 | **The ink slab and the sage band have no analogue on tool pages.** The landing alternates cream → white band → cream → slab → cream → sage band. All five tool pages are one flat cream field with the same `AmbientBackground` and the same grain, so the only differentiator between tools is the widget in the middle. | `landing.css` vs `ToolPageShell.tsx` |
| 10 | **Two button systems, 36 px apart.** Editorial `.lp-btn` = 14 px/22 px padding, 51 px tall, 180 ms. shadcn `Button` = `h-9` (36 px), `rounded-4xl`, `transition-all`. Plus bespoke buttons in `CapyExpenseShowcase` (`px-6 py-3`), `CardComposer`'s `PillToggle`, and `UsernameForm`'s `h-12`. The landing's most prominent button is 51 px; the same action inside a tool drops to 32–36 px. | `landing.css`, `ui/button.tsx`, `CardComposer.tsx` |
| 11 | **Radius drift: five values where the spec says three.** `rounded-3xl` (26 px, ✓ cards) and `rounded-2xl` (21.6 px, ✓ wells) are correct, but there is also `rounded-[20px]` (`TerminalLoader`, `ErrorCard`), `rounded-[1.75rem]` = 28 px (`CapyExpenseShowcase`), and `rounded-xl` = 12 px used as *both* input and card (`CapyCreator`). | DESIGN.md §Shapes vs actual |
| 12 | **Clay is no longer "sparing".** `--clay` appears **55 times**: every section numeral, every headline period, the live-wire pulse, the lab and capability arrows, `.lp-read-more`, the footer heart, the mega-wordmark italics, all "Coming soon" chips, the `sensitive` badges. DESIGN.md says clay "appears once per view, at most"; the hero alone carries two clay elements plus the pulse. Meanwhile **`--gold` is effectively unused** as UI (design page, tokens, chart-5 only) — half the celebration ramp is decorative. | grep counts |
| 13 | **Entrance easing has four values** where docs promise one expo-out: `ease.slowOut = (0.16,1,0.3,1)` in `motion.ts`, but `Hero.tsx` and `ScrollReveal.tsx` hardcode `(0.22,1,0.36,1)`, `landing.css` uses `(0.2,0,0,1)` for UI and `(0.22,1,0.36,1)` for reveals, and the hero chart uses `(0.16,1,0.3,1)` plus `(0.33,0,0.25,1)`. | motion tokens vs call sites |
| 14 | **`transition-all` in 9 places** (`ui/button.tsx`, `ui/switch.tsx`, `theme-toggle.tsx` ×2, `CapyCreator.tsx` ×5) — explicitly forbidden by DESIGN.md and by the comment in `globals.css`. | grep |
| 15 | **Hover durations span 150–600 ms** against a documented 350 ms: shadcn defaults (~150), `lp-btn` 180, `lp-partner` 250, `lp-work-card` 350, lab plate zoom 600. | CSS + component classes |
| 16 | **Copy case is inconsistent inside the same block.** Every tool `lead` is a lowercase fragment ("no signup. no cookies. nothing stored."); every landing lead is a proper sentence. Headline case flips between sentence case ("Your GitHub year, in a calm little card"), all-lowercase ("your photos talk. this one helps them forget"), and sentence case again on Expense. | page files |
| 17 | **Two error cards for one idea.** `ErrorCard` (GitHub-specific copy) and `StripErrorCard`, the latter duplicating the former's markup because the copy didn't fit. | `ErrorCard.tsx`, `CapyStrip.tsx` |
| 18 | **Copy-confirmation timing is inconsistent**: 1500 ms (`PromptGen`, `CapyCreator`, `CapyStrip`), 2200 ms (`CardComposer` copy-post), 4000 ms (`CardComposer` posted). |  |

### P2 — polish

| # | Finding |
|---|---|
| 19 | **Crop marks on 3 of 5 tool surfaces.** `lp-corner` frames the Wrapped demo card, Strip's drop card and the Expense showcase — and is asserted by a test for exactly those three. Imagine and Creator get none, so the "framed artifact" language is arbitrary. |
| 20 | **One of eight landing headlines breaks the display-face rule.** `.lp-testimonial h2` sets `font-weight: 700` and no `font-family`, so the Colophon quote renders in Plus Jakarta Sans Bold while the other seven section headlines are Fraunces 300. If the pull-quote voice is deliberate, document it; otherwise it's drift. |
| 21 | **`.lp-foot-grid`'s 4th column is `display: none` below 1080 px**, silently dropping the entire "Colophon" link column (Five tools / House rules / First line) on tablets. |
| 22 | **Small text fails contrast.** `.lp-ix` and `.lp-tool-foot-ix` are `muted-foreground` at 70 % alpha — roughly `#8e8c86` on `#f9f9f7` ≈ **3.2:1** at 10–11 px. AA needs 4.5:1. Same for `.lp-nav-cta::after`. |
| 23 | **Labs cards are arrow-only clickable while Work cards are fully clickable.** Two different affordances for "this is a tool card" on the same page; the Labs card has no `cursor: pointer`. |
| 24 | **The `CapyCreator` Polish Settings panel appears with zero motion**, and the questionnaire/output cards appear only because `ScrollReveal` remounts them — in a codebase where a hairline progress bar gets an easing curve. There is no "card mounts in place" primitive. |
| 25 | **`CapyStrip`'s report → clean-copy swap has no transition**; the preview `<img>` swaps instantly. |
| 26 | **Two focus treatments**: a 2 px `outline` (cards, inputs, links) versus a 30 %-alpha box-shadow ring (buttons, because `outline-none` is in the button base). Both are visible; only one is the house ring. |

---

## 5. Page by page

### `/capywrapped` — the reference for a browser tool
Form → preset chips → demo card → (loading) → (error) → composer. This is the
most complete state machine in the suite and the demo-card-at-rest pattern is
right. Weaknesses: the brand-new visitor sees a *card* before they see what the
tool does with their own data; the preset chips (`try: unfoldingdimensions
torvalds mojombo`) are 21 px tall on desktop (the `sm:px-2 sm:py-0.5` branch
shrinks them below the 44 px touch target that `.lp-pill` carefully maintains on
the landing) — the same idea, two different hit-area standards. The action
button "wrap it" is 48 px where the landing's equivalent is 51 px.

### `/capyimagine` — the cleanest tool surface
Two cards, control panel then output well, `rounded-3xl` + inset `rounded-2xl`,
house mono labels, engine guidance printed directly under the thing it
describes, honest "why we dropped the artist" copy. Problems: it is the only
tool page with no crop marks and no loading/empty state at all (the `<pre>` falls
back to `…`), and the "Lock this draw" / "Force generate in chat" switches sit in
a bordered footer row that reads like a settings drawer rather than a control.
It also shares zero layout vocabulary with `/capyexpense`, which is the page it
should most resemble.

### `/capycreator` — the furthest from the house style
Three stacked cards is a good mental model, and the tier scaffolding banner is
excellent teaching copy. But this page abandons the design system in the middle
of using it: raw inputs instead of the shared `Input`, `rounded-xl` where the
spec says `rounded-md`/`rounded-2xl`, `focus:border-primary` instead of the
`focus-visible` ring, a settings panel that appears with no motion, section
labels in clay (`01 · The Ask & Model Dialect`) where `/capyexpense` uses the
mono/muted treatment, and an unassociated `<label>` for the primary textarea.
It is also the only tool that scroll-jacks with `scrollIntoView({behavior:
"smooth"})` twice — smooth-scrolling is a motion the user did not ask for and
`prefers-reduced-motion` does not govern it.

### `/capystrip` — the most complete, the most bespoke
Best-in-class empty/loading/error/partial states, a report that teaches before
it works, a `demo` chip, an honest "no clean copy here" fallback with a napping
capybara, and a real reason for its one external link. Costs: it invents
`StripErrorCard` rather than generalising `ErrorCard`; it drops the `lp-corner`
marks on its own card (good) but uses `rounded-3xl` cards with an inner
`rounded-[20px]` error card; and the drop-zone's only hover language is a border
colour change — on the page whose primary action *is* the drop zone.

### `/capyexpense` — the outlier in both directions
This is the strongest *page* in the suite: numbered stages, a what-it-is section,
research with checkable citations, an FAQ in native `<details>`, and a status
block that answers "why unsigned, why bother" before anyone will run a binary.
It is also the least consistent: arabic stage numbers against the landing's
roman, `large` display + `entrance={false}` (the only page that opts out of the
entrance), the only page with sections, the only page with external links, a
`rounded-[1.75rem]` card, a bespoke CTA button, and a "Coming soon" chip built
inline. Since this is the launch headline, the other four should be pulled toward
*this* page's structure — not the other way round.

---

## 6. Motion and micro-animation

**Inventory of what actually moves**

| Layer | Where | Duration / easing |
|---|---|---|
| Ambient washes ×3 | every page | 44 / 52 / 68 s, alternate, out of phase |
| Grain | every page | static |
| Marquee ×2 (counter-scrolling) | landing | 52 s / 64 s, linear, pause on hover/focus/toggle |
| Live-wire pulse | landing | 2.6 s |
| Hero entrance (mount) | landing | 900 ms, `(0.22,1,0.36,1)`, delays 0→0.58 |
| Word-blur emphasis | landing hero | 900 ms, 90 ms stagger |
| Section reveals | landing | 900 ms `(0.22,1,0.36,1)`, 45–110 ms stagger |
| Lab plate zoom | landing | 600 ms, 1.05 |
| Work-card lift | landing | 350 ms, −4 px |
| Partner lift | landing | 250 ms, −3 px |
| Masthead headroom | landing | 360 ms hide/show |
| Mega wordmark | landing footer | 900 ms, `rise-lg` |
| Theme spread | every page | 650 ms clip-path circle |
| Card drift | landing preview | 9 s |
| Mascot drift / steam / breathe / blink | tool pages | 6 s / 4 s / 4.8 s / 7 s |
| Pose cycle | tool pages | 4.2 s hold, 900 ms shift |
| Tool h1 word reveal | tool pages | 900 ms, 60 ms stagger **(@unreduced)** |
| Tool surface entrance | tool pages | 900 ms, delay 0.3 |
| TerminalLoader steps + pulse | Wrapped, Strip | 250 ms stagger, **1.4 s infinite pulse** |
| Expense hero chart draw | Expense | 620 ms bars (62 ms stagger), line draw, 420 ms peak pop |
| In-tool hovers | tool pages | ~150 ms, colour only, `transition-all` |

**What this adds up to.** The landing has a *choreography* — entrances settle
from a consistent direction with an intentional stagger, hovers lift, plates
zoom. The tool pages have an *entrance* and then nothing: after the h1 resolves
and the surface fades in, every subsequent interaction is a flat 150 ms colour
change, including the drop zone, the copy buttons and the primary run buttons.
The pages with the most interaction have the least interaction design.

**Specific motion defects**

1. `Reveal` / `TextReveal` / `TerminalLoader` ignore reduced motion (P0 #1).
   The one-line fix is a `<MotionConfig reducedMotion="user">` around
   `ThemeProvider`'s children — it makes those three consistent with `Hero` and
   `ScrollReveal` without editing either.
2. The wipe transition is unreachable (P0 #5). Either wire
   `startTaggedTransition("wipe")` into navigation or delete `TransitionLink`,
   the `[data-vt="wipe"]` block and `vt-wipe-*`. Leaving a dead abstraction
   imported by 15 files is worse than having no page transition.
3. Four entrance easings, 150–600 ms hovers, two stagger values (45/90 on the
   landing, 60 in `TextReveal`, 100 in `dur.staggerGap`) — all documented as one
   language. Consolidate on `motion.ts`.
4. Smooth `scrollIntoView` in `CapyCreator` (and `CapyStrip`) is unguarded
   motion; `scroll-behavior: auto` under reduced motion, or use `scrollIntoView({
   behavior: reduced ? "auto" : "smooth" })`.
5. `Labs` replays its card entrance on every filter click by remounting on
   `key={filter}-${name}`. That reads as "the cards are new" when only the
   filter changed — a filter animation (cross-fade / translate) would say
   "these are the same cards, differently selected".
6. No transition for the biggest product moments: the Polish Settings panel
   opening, the questionnaire appearing, the report→clean swap, the
   `Show the whole dashboard` expansion (which mounts a whole dashboard with no
   height transition, so the footer jumps).

---

## 7. Scaling to eight or nine tools

Everything that breaks, in one place:

- **Layout:** `.lp-labs-grid` and `.lp-partners` are literal `repeat(5, 1fr)`.
- **Counts:** `05`, `05 / 05`, `05 of 05 shipped`, `\u00b7 Nº 05`, `05 in the
  suite`, `LABS.pills` `{05, 04, 01}`.
- **Copy that enumerates the suite:** `HERO.lead`, `ABOUT.lead`,
  `LANDING_FOOTER.blurb`, `COLOPHON.quote` ("Five so far", asserted against the
  README by a test), `notes` page list, `sitemap` (derives from `LABS.tools`,
  which is the one place doing this right).
- **Chrome:** the tool nav's 5 pills; already the reason the breakpoint moved to
  `md`.
- **Categories:** `LABS.pills` only knows `all | browser | desktop`; a new
  category needs a pill *and* recomputed counts.
- **Per-tool identity:** there is none. All five share sage everywhere; the only
  differentiators are the wording, the widget and (for 3 of 5) crop marks. At
  nine tools, nine identical cream pages with nine different widgets is not a
  suite, it is a directory.

**Recommended shape for growth:** a `SUITE` constant (`tools`, `count`, `pills`
derived), grids as `repeat(auto-fit, minmax(...))` or explicit 3/4-col steps, and
one accent per tool drawn from the existing ramp (`sage` / `water` / `clay` /
`gold`, or `chart-1..5`) used in exactly two places per page — the section rule
and the primary action. That is enough to make nine pages feel like nine rooms in
one house, and it uses only tokens that already exist.

---

## 8. Recommendations, in order

**P0 — before CapyExpense ships**
1. `<MotionConfig reducedMotion="user">` in `layout.tsx` (or `ThemeProvider`).
2. Unify the header: one component, one container width, the mascot as the mark,
   the tool nav as a disclosure that scales past five, and a persistent CTA.
3. Add the skip link to `ToolPageShell`.
4. Replace `CapyCreator`'s raw inputs with the shared `Input`/`Textarea`; add
   `htmlFor`/`id`; move focus styling to `focus-visible` with the house ring.
5. Decide on `TransitionLink`: wire the wipe or delete it and the CSS.
6. Add a tool-page section-rule variant and adopt one numbering system end to
   end (`Nº 0X` for tools, roman for landing sections).

**P1 — before tools 6 and 7**
7. Derive every count from `SUITE`; change the two `repeat(5, 1fr)` grids.
8. One footer component with a compact variant that still cross-sells the suite.
9. One `ToolStage` skeleton with optional numbered stages; port all five.
10. Introduce a per-tool accent (two placements) so nine pages stay legible.
11. One button component with an editorial variant; retire the bespoke buttons.
12. Collapse the radius set to the documented three; fix the off-token values.
13. Consolidate motion on `motion.ts` (one entrance ease, one hover duration,
    one stagger) and remove `transition-all`.
14. Generalise `ErrorCard` and delete `StripErrorCard`.

**P2 — polish**
15. Rebalance clay; find a real job for gold or drop it from the palette.
16. Fix the 3.2:1 small-text contrast on `.lp-ix` / `.lp-tool-foot-ix`.
17. Make the Labs card fully clickable like the Work card.
18. Add a "card mounts in place" transition primitive and use it for the
    Creator panels, the Strip report swap and the Expense dashboard expansion.
19. Add crop marks to Imagine and Creator (or remove them from all five).
20. Fix the `<1080 px` footer column that disappears.
21. Resolve the Colophon headline's font (Fraunces or document the exception).

**Guardrails worth adding as tests** (the repo already tests eyebrows, one `h1`,
the clay dot, the external-href budget and the corner marks — this fits):
- every tool page renders a skip link and a `.lp-sec-rule`;
- no source file contains `transition-all`;
- no reduced-motion-unguarded `motion.*` component is used on a tool page;
- suite counts in copy equal `LABS.tools.length`.

---

## 9. Open questions

1. **Which direction is "correct"?** Should the tool pages be pulled up to the
   editorial landing (wider, section-ruled, banded), or should the landing be
   pulled down toward the tool pages (narrower, plainer)? My recommendation is
   the former — but it is a real fork in the road and it decides most of the
   items above.
2. **Is the circle-`C` monogram deliberate** as a second mark (a "seal" for the
   landing, the mascot for the tools), or is it drift from a first pass?
3. **Is the lowercase register a decision?** "no signup. no cookies. nothing
   stored." / "your photos talk. this one helps them forget." reads like a
   deliberate editorial voice. If it is, it should apply to all five headlines
   and all five leads; if it is not, it should apply to none.
4. **What is a tool page for?** A marketing page, an app surface, or both? Right
   now they are hybrids — a marketing hero on top of a working app — and that is
   a defensible choice, but it needs to be an explicit one, because it decides
   whether `/capyexpense`'s four-section structure is the template for
   everything or a special case for an unshipped product.
5. **Do you want a per-tool accent colour?** It is the single cheapest way to
   keep eight or nine pages from blurring together, but it does cut against
   "clay and gold are sparing" and against the current monoculture.
6. **Is `Save 44 ms` worth it?** `landing.css` is imported on every tool page on
   purpose (documented reasoning: shared Turbopack chunk). Worth confirming that
   reason still holds once the tool pages grow their own vocabulary — if they
   diverge, the coupling becomes a liability.

---

### Evidence anchor points

- `src/components/landing/landing.css` — the whole landing grammar, including
  the dead `[data-vt="wipe"]` block.
- `src/components/tool/ToolPageShell.tsx` — the tool-page grammar (or lack of it).
- `src/components/header.tsx` vs `src/components/landing/LandingMasthead.tsx` —
  the two headers.
- `src/components/site-footer.tsx` vs `src/components/landing/LandingFooter.tsx`
  — the two footers.
- `src/components/Reveal.tsx`, `src/components/TextReveal.tsx`,
  `src/components/tool/TerminalLoader.tsx` — the reduced-motion gap.
- `src/lib/capytools/motion.ts` vs every call site — the easing drift.
- `src/lib/capytools/landing.ts` — every hardcoded "five".
- `tests/tool-pages.test.tsx`, `tests/landing.test.tsx` — the invariants already
  enforced, and therefore the cheapest place to add new ones.
- Live measurements at a 1015 px viewport: brand at x=32 (landing) vs x=84
  (`/capywrapped`); theme toggle at x=788 vs x=896.
