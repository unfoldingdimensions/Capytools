## What changed

<!-- One or two sentences. What does this do that the code did not do before? -->

## Why

<!-- The problem, or the reason the change is worth the diff. -->

## How it was verified

<!--
Commands run and what they returned. Measured numbers beat adjectives: if this is a
UI change, say what was measured and at which widths/themes; if it is a guard, show the
guard failing before it passed.
-->

## Still unverified / known gaps

<!-- Be explicit. "I could not test this in Safari" is useful; silence is not. -->

## Checklist

- [ ] The gate passes: `npm run format:check && npm run type-check && npm run lint && npm test && npm run build`
- [ ] `npm run verify:pdf` passes if a template, the PDF path or the DOCX writer changed
- [ ] Tests ship with the change (a bug fix ships with the test that fails without it)
- [ ] No new outbound request: the document still never leaves the browser
- [ ] Nothing that was free is now gated; exports stay unlimited and unwatermarked
- [ ] Design language respected — tokens only, no off-palette hex, no `transition-all`, no stock Tailwind ramps
- [ ] Claims and docs updated if behaviour changed (README / DESIGN.md / docs/decisions.md)
