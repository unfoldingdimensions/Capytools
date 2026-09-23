# Contributing to CapyResume

Short version: this is a small, opinionated, solo-maintained project with three hard
constraints and a gate that must pass. Everything else is negotiable.

## The three hard constraints

1. **The document never leaves the browser.** No analytics, no telemetry, no error
   reporting, no runtime font or asset fetching, no server. The only outbound request the
   app can make is the one you start yourself in the BYOK panel, to the provider whose key
   you entered. `connect-src` in `next.config.ts` allows any `https:` origin on purpose —
   the BYOK panel accepts any OpenAI-compatible endpoint — so the CSP is not what protects
   this; review is. A change that adds an outbound call to the editor path will be declined.
2. **The free tier never narrows.** No watermark, no metered export, no locked download. A
   paid tier is planned — extra packs, additive, offline licence key — and the rule it must
   respect is that everything free today stays free and the export of someone's own résumé
   is never gated. That rule is written into the plan as a source-level guard so the gate
   cannot be built without it.
3. **No claim the code cannot support.** No "passes ATS", no invented benchmarks, no
   testimonials, no numbers without a source. The landing page has a test that fails the
   build if selling language or a guarantee appears on it. Honesty is a feature here.

## The design language is a spec, not a preference

`DESIGN.md` is the house language and the tests enforce it. The palette is defined once, as
HSL triplets in `app/globals.css` and mirrored in `tailwind.config.ts`; off-palette hexes
and stock Tailwind ramps fail `__tests__/design/language-conformance.test.ts`, and UI copy
voice and page-title casing fail `__tests__/design/register.test.ts`. Reach for the kit in
`components/ui` before writing a new primitive.

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000
```

Node >= 20.9 and npm >= 8 (see `engines`). No database, no services, no keys required —
the AI panel is bring-your-own and entirely optional.

## The gate

```bash
npm run format:check && npm run type-check && npm run lint && npm test && npm run verify:pdf && npm run build
```

`verify:pdf` renders every template and asserts the exported PDF carries a real, selectable
text layer — the claim the README makes. If you touch a template, the PDF path or the DOCX
writer, run it.

## Tests come with the change

New behaviour ships with tests; a bug fix ships with the test that fails without it. The
repository also practises _guard-proving_: when you add a source-level guard, plant a
violation, watch the guard fail, then remove it. A guard that has never failed is a guard
nobody has verified.

Suites are plain Jest. Component rendering is asserted on static markup under
`@jest-environment node` (jsdom resolves the browser build of `react-dom` at import time
and needs a `MessageChannel`), so read an existing suite before reaching for React Testing
Library, which this repo does not use.

## Commits and pull requests

- Conventional prefixes, imperative subjects, one concern per commit — `feat(tool):`,
  `fix(site):`, `docs:`, `test(design):`, `style:` — or say in the body why the deviation
  is justified.
- A pull request should state what changed, **how it was verified**, and what remains
  unverified. Review here asks for evidence rather than agreement; "it works" is not
  evidence, and a screenshot is not a measurement.
- Prefer additive changes. Where a choice exists, keep the existing default and add a
  parallel option rather than replacing behaviour.

## What will be declined

- Analytics, tracking, third-party scripts, or any new outbound request.
- A new runtime dependency without a clear justification and a note on size and supply
  chain.
- Anything that gates the core, watermarks an export, or lowers the free tier.
- A licence change for the application code. It is Apache-2.0 and staying that way is
  load-bearing for the trust the project depends on. (A commercial licence for extra packs
  is a separate thing from the code licence and does not change it.)
- Rewrites for their own sake. The code is small on purpose.

## Licence of contributions

Inbound = outbound: contributions are accepted under **Apache-2.0**. There is no CLA and no
copyright assignment. Opening a pull request confirms you have the right to submit the work
under that licence.

## Contributors and the paid tier

When the paid packs ship, contributors can have a licence key on request. They are the
people most able to build without one, so the default answer will be "here is the
self-hosting flag" — but asking is always fine, and the free tier is unaffected either way.
