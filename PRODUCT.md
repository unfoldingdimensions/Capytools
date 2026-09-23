# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primarily developers and designers — including indie makers — who need a
one-off utility in the middle of a task: a QR code, an OG card, a favicon
pack, a token count, a metadata-free photo. A clear second audience is
privacy-conscious people, technical or not, who will not upload a photo or
file to a site they cannot inspect. (Confirmed with the owner, Sep 2026:
"both, devs first".)

## Product Purpose

A suite of small, single-purpose tools — eleven as of Sep 2026 — each of
which does one job and finishes it. Ten run entirely in the browser tab; the
eleventh, CapyExpense, is a Tauri desktop app. Success is a visitor arriving,
doing the job, and leaving with the file, with nothing asked of them and
nothing kept.

## Positioning

**Open and local.** Every browser tool computes in the visitor's own tab, and
the whole suite is open source under Apache-2.0, so the claim is inspectable
rather than promised: the code that runs is the code anyone can read.
(Confirmed with the owner, Sep 2026, over "proof in-tab" and "no dark
patterns" as the lead claim.) Several tools additionally prove their own
output — CapyQR decodes the code it made, CapyStrip re-reads the cleaned
file — which is evidence for the positioning, not the positioning itself.

## Operating Context

- Visitors arrive mid-task, often from search, wanting one tool, and leave.
- House rules, stated in the README: Arrive (no account, no cookie banner,
  no onboarding tour) · Compute (every byte processed in the browser) ·
  Forget (the suite forgets you when the tab closes) · Keep (download the
  file; desktop tools keep it on your disk).
- Hosted on Cloudflare Workers at capytools.app. Server routes exist only
  where the browser cannot do the work (GitHub proxy for CapyWrapped, the
  palette-extract fetch for CapyTone) and store nothing.

## Capabilities and Constraints

- Browser tools: no signup, no cookies, no telemetry, no uploads; optional
  API keys for LLM polish live only in `localStorage`.
- CapyExpense is the documented exception: a desktop app that writes the
  user's own files to the user's own disk, with no network code. It states
  its own promise ("stored on your machine, never ours") and must never
  inherit "nothing stored". It has a page and no shipped builds yet.
- `SUITE` (`src/lib/capytools/suite.ts`) is the only registry; every list,
  count and index derives from it.
- Undecided: whether CapyExpense ships builds, and when.

## Brand Commitments

- Name and voice: "Capytools — calm little tools". Tools are named
  `Capy<Name>`. Named after the capybara: calm, unhurried, at home anywhere.
- The capybara mark and mascot artwork (`public/brand/`, `public/mascot/`).
- The editorial look — Fraunces display, sage palette, lab plates — is kept
  (owner, Sep 2026: "lean into proof", keep the look). DESIGN.md records it.

## Evidence on Hand

- The eleven working tools themselves, each demonstrable live in the tab.
- CapyQR's self-scan ("verified scannable — decoded: …") and CapyStrip's
  re-scan of its own output.
- The public repository: https://github.com/unfoldingdimensions/Capytools
- Absent, and not to be fabricated: user counts, testimonials, ratings,
  press, benchmarks. The Colophon quotes the README, not a person.

## Product Principles

1. Show, don't claim. Where a promise can be demonstrated in the tab, the
   demonstration beats the sentence.
2. One tool, one job, finished. No tool grows a second purpose.
3. Nothing is asked of the visitor that the task does not need.
4. Every promise is scoped truthfully — browser tools keep nothing; the
   desktop tool keeps your files on your disk.
