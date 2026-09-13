# Peer review — the other agent's changes (CapyResize, CapyToken, the post-merge batch)

*Prepared 2026-09-13 by the CapyQR implementation session, reviewing work it did not write.
Scope: everything on `origin/main` after the CapyQR merge (47436ca) plus open PR #18, as of
ba85e29 / 01c4e23. Baseline check before this review: `npm test` on the review branch —
597/597 across 30 files.*

## Verdicts at a glance

| Change | Verdict | Notes |
|---|---|---|
| c87c8e3 `feat(download): saveBlob` | **good — fixes a real bug in my CapyQR** | see §1 |
| b6bee2f / 873803b CapyOG fixes | good (skim) | contrast-role accent split, copy-at-scale |
| cd16351 `fix(capyqr): only certify what is on screen` | **good — two real defects fixed** | see §2, reviewed as the original author |
| c2fdf22 `refactor(tool-pages): derive sign-off index` | good | implements the CapyQR plan §10 fold-back |
| 4d3b461 `fix(meta): package.json count` | good | count words now agree |
| debc5d9 CapyResize (tool no. 8) | good (deep skim, merged with green CI) | see §3 |
| PR #18 CapyToken (tool no. 9, open) | **ready to merge** from this seat | see §4 |

## 1. saveBlob (c87c8e3)

My original `handleDownload` did `a.click()` and `URL.revokeObjectURL(url)` on the next line.
The reviewer is right that this is a race browsers can lose (Chrome consumes synchronously;
Firefox/Safari can drop the download), and the fix — one helper, revoke after a 1s delay — is
the correct shape. CapyQR's export path inherited it unchanged. No objections.

## 2. The CapyQR certify fix (cd16351), reviewed as the original author

All three changes stand up:

1. **The stale-chip race was real.** My chip displayed the last scan for the ~270ms debounce
   window after any change — and, worse, every `input` event on a color drag reset the debounce,
   so the chip claimed "verified scannable" for pixels that no longer existed, including pixels
   that had just been made unreadable. The fix stamps the scan with the `engineOptions` object it
   read and the chip renders only when `verify.of === engineOptions`. That reference comparison
   is sound: `engineOptions` is memoized, any state change produces a new object, and the stale
   proof hides until the rescan lands.
2. **The inverted-pass split is correct and better than my `attemptBoth`.** I folded upright and
   inverted success into one boolean; the gold preset ships light-on-dark, and a code that only
   decodes inverted is a real-world scanner risk that my chip certified anyway. The workaround
   details check out: jsqr@1.4.0's `inversionAttempts: "onlyInvert"` throws on every call
   (the binarizer never fills that buffer in that mode), so hand-inverting RGB and re-running the
   upright pass is the right move — it also sidesteps that release's shared-defaults mutation.
   `verifyPixels` being pure now makes the whole proof node-testable; the tests pin it with real
   jsQR.
3. **Removing the logo >0.4 branch was right.** `buildEngineOptions` pins `imageSize` to 0.4 and
   nothing can move it, so the warning was unreachable. The comment documents what would bring it
   back (a size control).

One observation, not a defect: `logoAdvice(hasLogo, ecc)` now takes two args where the plan wrote
three; the plan doc's §5.4 signature is the older shape. Fold the signature change into the plan
doc whenever the doc is next touched.

## 3. CapyResize (tool no. 8, debc5d9) — deep skim

- **`sniff.ts`**: content sniffing by magic bytes with SVG handled by BOM/whitespace-tolerant
  `<svg`/`<?xml` probes — the right call ("extensions lie, and so does a File's reported type").
  Pure and table-tested.
- **`ico.ts`**: hand-built ICONDIR/ICONDIRENTRY container, PNG-in-ICO, 256 encoded as the 0 byte
  the format reserves, little-endian throughout, byte-exact golden tests. Correct per the ICO
  spec and no dependency.
- **`pack.ts`**: favicon-pack specs traced to plan §3.6 (apple 180, 192, 512, maskable 512 with
  the 80% art box, 16/32/48 ICO frames, opaque fills where alpha would render black).
- **Ethos**: grep over `src/lib/capyresize`, the component and the page finds no storage, no
  network, no cookies. 263 lines of tests; merged with green CI.

## 4. CapyToken (tool no. 9, open PR #18) — full diff review

**Ethos: clean.** Grep over `src/lib/capytoken`, `CapyToken.tsx` and the page finds no
localStorage/sessionStorage/cookies/fetch/WebSocket/indexedDB. Two design points worth calling
out because they are the load-bearing ethos decisions:

- **Prices are vendored, not fetched.** `prices.ts` is a pruned LiteLLM subset with a manual
  refresh recipe, a `PRICES_VERIFIED = "2026-09"` stamp and the source commit pinned
  (`30f33a9`). Nothing at runtime ever touches the network — the honest-date stamp carries the
  staleness risk in the UI instead of hiding it.
- **The tokenizer ships with the page.** `js-tiktoken/lite` plus per-encoding rank modules are
  dynamic-imported from the bundle on first count (~1.1 MB gzipped for o200k, measured in their
  sources), cached as a singleton; `countTokens` resolves `null` while ranks load and the
  component's runId guard + honest loading chip + retry card handle it. A failed load evicts its
  cache entry so retry actually retries.

**Correctness: checked.** The pricing math (`tokens × perMTok / 1e6`), the context-fit model
(input ≤ maxInput AND input+output ≤ maxInput+maxOutput), the OpenAI rule-of-thumb constants
(≈4 chars, ≈¾ word) and the chat-overhead constants (+3/message, +3 reply priming) all match
their cited primary sources (OpenAI help center, OpenAI Cookbook). The estimate honesty tiers
are the best part of the design: exact rows name their encoding; Claude rows carry the
Anthropic-documented ~+30% era note (sourced: Anthropic token-counting docs via Willison's
1.0–1.35× measurement — and the docs explicitly refuse the folklore Claude-vs-cl100k figure);
every other non-OpenAI row says plainly it is unverified.

**Registration: complete.** SUITE row 9 with `lab-9.webp`, README §9, first-line count
"Nine so far" (mirrored in the landing Colophon per the sync test), tool-pages/landing test
tables to `/ 09`, package.json description. The registry-derived sign-off from c2fdf22 means no
page edits were needed.

**Nits (non-blocking):**

1. The verdict paragraph prices at `gpt-5` via a `REFERENCE_MODEL_ID` constant. If that id is
   ever renamed out of `CURATED_PRICES` the component loses its reference row loudly at build
   time — acceptable, but a comment on the constant saying "must exist in CURATED_PRICES" would
   help the next editor.
2. The rate card's model ids (gpt-5.4/5.5/5.6 era) are a dated snapshot by design; the refresh
   recipe is manual. Fine — the UI stamp owns it — just worth remembering the UI copy and the
   card must be refreshed together.
3. Not verified from this seat: visual QA of the rendered page (needs `next start`), and the
   loading chip's behavior on a cold cache. Tests cover the logic; a one-time live smoke before
   merge would close it.

**Bottom line:** PR #18 is ready to merge from this reviewer's seat. The only outstanding
human-step in the suite remains the real-phone Wi-Fi join smoke from PR #15.

## 5. Fold-back items

- `docs/research/capyqr/implementation-plan.md` §5.4: `logoAdvice` signature changed to
  `(hasLogo, ecc)` in cd16351; §10's "retire the renumber chore" proposal was implemented by
  c2fdf22 — both worth a line in the doc next time it is touched.
- The UTF-8 payload-encoding gap (see the MiniQR competitive analysis, §4.1) is the top
  functional fold-back for CapyQR itself.
