---
name: capyproject-research
description: >-
  Orchestrator methodology for researching and planning Capytools work — deciding what to build
  next, scoping a new Capy<N> tool, or writing an implementation plan that a fresh agent session
  will execute. Use when asked to research, scope, plan, or hand off a tool/feature. Produces
  docs/research/<topic>/implementation-plan.md + sources.json and the kickoff prompt for the
  implementing session.
---

# Capytools Project Research (orchestrator method)

Two separated roles across separate sessions: the **orchestrator** (this skill) researches and
writes the handoff; fresh **implementer** sessions build from the handoff; a separate **reviewer**
may audit the diff. Never implement in the orchestrator session and never re-research in the
implementer session — the handoff doc is the only channel between them.

## 0. Ground rules

- **Truth discipline:** every architecture-shaping claim gets verified against a primary source
  *today*, and the verification date is written down. One stale assumption rots the whole plan
  (real examples: Safari silently fails WebP canvas encoding; exifr doesn't read PNG text chunks;
  X's "1200×628" card size was never official; LinkedIn's 1200×627 is a documented *minimum*).
- **Plan mode blocks Bash** — route read-only shell/git recon through Explore subagents, not
  direct Bash calls.
- **Ethos invariants are non-negotiable:** 100% client-side, no signup, no cookies, nothing
  stored. Server routes only as CORS/rate-limit proxies (Wrapped's `/api/contributions`,
  `/api/languages`, `/api/og`). Monetization is deferred until traction; document Pro/batch *seams*
  in the plan but never build paywall code.
- **Fold learnings back.** After an implementer session reports deviations, correct the plan doc —
  it stays the source of truth for the next tool's handoff.

## 1. Read the repo law first (always, in this order)

1. `AGENTS.md` — heed the "this is NOT the Next.js you know" warning; read
   `node_modules/next/dist/docs/` before app-router code.
2. `.agents/rules/production-invariants.md` — Satori subset, storage/hydration, WCAG, layout.
3. `.agents/skills/capytools-dev/SKILL.md` — the tool recipe and design tokens.
4. The 2–3 most similar existing tools: their `src/app/capy<name>/page.tsx`,
   `src/components/tool/<Tool>.tsx`, and `src/lib/<name>/` — read fully, don't skim. The reuse
   inventory changes per tool (`src/lib/card/export.ts`, `src/lib/capytools/llm.ts`, `cache.ts`,
   `motion.ts` are shared assets worth knowing).

## 2. Classify the research question

**Portfolio question** ("what do we build next?") — deliverable: `docs/research/expansion/roadmap.md`.
Dispatch three parallel Explore subagents (medium breadth, self-contained prompts):

1. *Codebase map* — every tool's purpose/data-flow/completion state, reusable infra, the exact
   add-a-tool recipe, architecture constraints, half-built gaps.
2. *Market demand* — proven tool categories with traffic/star/revenue evidence, trending and
   underserved niches, 10–15 candidates ranked by ease-of-client-build × demand.
3. *Monetization* — models ranked by fit with the no-signup/no-cookies ethos, real revenue
   numbers, traction playbook, milestone framing.

**Single-tool question** ("how do we build Capy<N>?") — deliverable:
`docs/research/capy<name>/implementation-plan.md`. Dispatch two parallel Explore subagents:

1. *Domain/platform facts* — the external specs the tool must honor, from primary sources only.
2. *Browser/library stack verification* — exact APIs, compat matrices, silent-failure modes.

…plus **direct reads** of the reuse targets (orchestrator reads code itself; agents summarize the
web). Then write the plan.

## 3. Web-source ladder (primary sources or bust)

Try in order; every claim cites the level it came from:

1. **npm registry API** — `https://registry.npmjs.org/<pkg>` (JSON; the npmjs.com *website* 403s
   WebFetch).
2. **raw.githubusercontent.com** READMEs and source (repo HTML pages sometimes 404/timeout —
   retry with the raw path, and guess `master` vs `main`).
3. **MDN / caniuse** for browser APIs and compat (note Safari gaps explicitly — they drive the
   fallback design).
4. **Official specs & platform docs** (C2PA spec, IPTC vocabularies, developer.x.com, developers.facebook.com,
   help centers) — blogs are corroboration, never citation.
5. **De-facto community formats** (A1111 wiki for Stable Diffusion PNG chunks) — require a second
   corroborating source before prescribing a parser.

WebFetch habits: 60s timeout → retry once as the raw file; a fetch that fails twice goes to the
agent prompts instead of being skipped. Record *why* a source is trustworthy (it was fetched, when).

## 4. The implementation-plan template

Self-contained is the acceptance test: an agent with zero conversation context must be able to
build from the doc alone. Sections, in order:

1. **Mission & scope** — one-paragraph pitch, "In scope (v1)" list, and "Out of scope — do NOT
   build" with tripwires ("if you find yourself adding `src/app/api/...`, stop").
2. **Read these first** — repo law pointers + exact reuse-target file paths.
3. **Verified technical facts** — dated tables: platform/browser constraints, library APIs with
   exact option names, folklore corrections, and the fallback each fact forces. This section is
   the reason the implementer doesn't need web access.
4. **File map** — every file to create with function signatures; registration recipe (both `TOOLS`
   arrays, hero count sentence, README, `tests/<name>.test.ts`); dependency changes (aim: none).
5. **Core pipeline / data layer** — the pure-logic spec: types, registries, parsers, formatters.
   Keep the core pure so future Pro features (batch, packs) are UI loops, not rewrites.
6. **UI spec** — house-style three cards, honest-fallback copy rules (`min-w-[84px]`,
   `aria-live`, "your photo never leaves this tab" phrasing; check `tests/share.test.ts` for
   forbidden claims), page metadata targeting the demand keywords.
7. **Test plan + definition of done** — pure-logic tests, a Satori render smoke when the tool
   builds card art, registration parity assertions; DoD = `npm test` green + `tsc --noEmit` +
   eslint on new files + a concrete manual smoke list (browser matrix if the tool hits Safari gaps).
8. **Out-of-scope backlog with seams** — where monetization and v2 attach, documented not built.
9. **Sources** — keys resolving to the ledger.

Special sections when relevant: a **parallel-session note** if another implementer may hold
uncommitted edits to shared files (page.tsx / header.tsx) — instruct the agent to check
`git status` and stop-before-registration rather than commit someone else's edits.

## 5. Citation ledger

`docs/research/<topic>/sources.json` — an array of `{ "id": n, "url": "...", "title": "..." }`
matching the inline `[n]` keys in the plan. Put the verification date and the *exact quoted option
names* in the title string — the ledger doubles as the fact record.

## 6. Kickoff & review

**Kickoff prompt skeleton** (give this to the implementing session with the plan path):

```
Read docs/research/<topic>/implementation-plan.md — that is your complete spec. Before writing
code, also read AGENTS.md (including the Next.js warning), .agents/rules/production-invariants.md,
and .agents/skills/capytools-dev/SKILL.md.

Rules:
1. Implement exactly what the plan says. If you find the plan is wrong or impossible somewhere,
   STOP and report the discrepancy with evidence — do not silently redesign.
2. Scope is frozen: <restate the plan's out-of-scope tripwires>.
3. Work the file map in order: lib → card components (if any) → tool component → page →
   registration → tests.
4. Before declaring done, run and show: npm test, npx tsc --noEmit, npx eslint on new files, and
   the manual smoke from the plan (dev server: npm run dev, port 3024).
5. Commit in conventional-commit style matching the repo (feat(capystrip): …), respecting the
   plan's parallel-session note if present.
6. Finish with a report: what you built, verification output, deviations + why, and anything that
   should be folded back into the plan doc.
```

**Orchestrator review checklist** on the implementer's report:

- [ ] All pre-existing tests still green (registration edits to page/header are the usual breaker).
- [ ] Diff contains no unplanned `src/app/api/` path and no localStorage/sessionStorage call.
- [ ] The manual smoke behaviors were actually exercised, not just described.
- [ ] Deviations were folded back into the plan doc (and this skill if the *method* was wrong).

## 7. Lessons learned so far (keep appending)

- Browser silent-failure modes are the #1 plan risk: Safari WebP canvas encode, `toBlob` type
  fallbacks, HEIC decode only on Safari 17+, TIFF undecodable everywhere. Always design the
  honest-fallback path *in the plan*, with the exact user-facing note copy.
- Library READMEs overstate coverage (exifr: no WebP, no PNG text chunks) — verify the specific
  feature you need, not the library's headline.
- Platform size folklore is mostly wrong; only cite what the platform itself documents, and say
  "undocumented" where it is.
- The repo's shared assets (`src/lib/card/export.ts`, `src/lib/capytools/{llm,cache,motion}.ts`,
  the CardArt/CardScaled pattern) are the fastest path — prefer thin wrappers over refactors, and
  schedule refactors as backlog seams.
