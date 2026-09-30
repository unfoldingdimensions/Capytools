# Glossary

Terms this repo uses in a specific way. Where a word here differs from its
everyday meaning, this file wins.

## Architecture vocabulary

Adopted from the deep-module tradition, and used exactly as written. "Component",
"service", "API" and "boundary" are not substitutes for these.

- **module** — anything with an interface and an implementation: a function, a
  file, a directory, or a slice across both. Deliberately scale-agnostic.
- **interface** — everything a caller must know to use a module correctly: the
  type signature, plus invariants, ordering constraints, error modes, and
  required configuration.
- **implementation** — what is inside a module.
- **depth** — leverage at the interface. A module is **deep** when a lot of
  behaviour sits behind a small interface, and **shallow** when the interface is
  nearly as complex as the implementation.
- **seam** — the location where a module's interface lives; the place you can
  alter behaviour without editing in that place.
- **adapter** — a concrete thing that satisfies an interface at a seam. Describes
  the role, not the substance.
- **leverage** — what callers get from depth: more capability per unit of
  interface they have to learn.
- **locality** — what maintainers get from depth: change, bugs, knowledge and
  verification concentrate in one place instead of spreading across callers.

Two rules that follow, and that this repo applies:

- **The deletion test.** Imagine deleting the module. If the complexity vanishes,
  it was a pass-through. If it reappears across N callers, it was earning its keep.
- **One adapter means a hypothetical seam; two make it a real one.** Don't
  introduce a seam unless something actually varies across it.

## The suite's own terms

- **page shell** (`src/components/page-shell.tsx`) — the module that owns the site
  chrome for every non-landing page. Its interface is `tool`, `width`, `layout`,
  `footerHere` and children. It is deep: the `src/app/*` pages and `ToolPageShell`
  both call it with a handful of facts, and it derives the skip-link target, the
  `<main>` landmark, the footer's `wide` and the editorial stylesheet from those
  facts. `tests/page-chrome.test.ts` guards its two structural invariants.
- **chrome** — the wrapper, skip-link, ambient layer, `Header` and `SiteFooter` a
  page needs before its own content. Produced in exactly one module. The landing
  is the single documented exception (decisions.md D7), which is why both guards
  allow exactly two files: the shell and the landing's own chrome.
- **layout** — one of `page` (a display headline, then content), `card` (the share
  page's tight centred column) or `editorial` (`ToolPageShell`'s own sections, each
  at its own width). The value names the shape of the content area, because that
  is what varies between the pages that use the shell.
- **tool page** — a page for one of the eleven `Capy<Name>` tools:
  `src/app/capy<name>/page.tsx` rendered on `ToolPageShell`, with its logic in
  `src/lib/capy<name>/`.
- **suite** (`SUITE`, `src/lib/capytools/suite.ts`) — the single registry every
  count, list and index on the site derives from. Adding a tool is one row there
  plus its page.

## Not here

`decisions.md` remains the decision record — the ADR role. This file names things;
it does not record what was decided, or why.
