# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who needs a plain, ATS-safe résumé without creating an account. Three overlapping
situations, confirmed by the owner:

1. **Job seekers applying now** — they want to fill, preview and export a clean résumé as
   fast as possible, without signing up.
2. **First-timers** (students, career changers) who need a simple guided start rather than
   a design tool.
3. **Privacy-conscious users** who will not put personal data into a cloud résumé builder.

## Product Purpose

A free, in-browser résumé builder: write into a single-column ATS-safe layout, preview it
live, and export a real PDF, DOCX and JSON. Success is a visitor going from blank to
exported résumé in one sitting — with no account created and no data leaving their browser.

## Positioning

Free forever, no account, and the document never leaves the browser tab. Marketed as an
open-source résumé builder (Apache-2.0): the whole tool is inspectable and self-hostable,
and that openness is the pitch rather than a footnote.

## Operating Context

Everything runs client-side in the visitor's browser — no backend, no API routes, no
cookies, no analytics. Draft state and preferences live in the browser's `localStorage`;
the JSON export is the portability and backup path. The only optional network calls are
the visitor's own AI-provider calls using a key they supply and that is stored locally.
Résumés are built from single-column templates and exported as PDF (`@react-pdf/renderer`,
with a genuine selectable text layer), DOCX (`docx`) and JSON.

## Capabilities and Constraints

**Confirmed:** six single-column templates; live editor with reorderable sections; honest
ATS-safe exports (PDF + DOCX); unlimited export with no watermark; optional BYOK AI polish
against OpenAI-compatible providers; legal pages (privacy, terms, cookies); guide pages for
ATS format, role and country queries.

**Constraints:** storage is browser-local only, so clearing site data loses drafts — hence
the JSON export; résumé parsers vary, so no ATS _success_ may be promised, only the
formatting facts the tests enforce; with no server there are no accounts and no sync.

**Explicitly undecided — monetisation.** The owner has not decided how or whether to make
money, and notes the tension with an open-source, self-hostable tool. Therefore: no paid
tier exists, and no pricing, plan or upgrade language may appear in UI copy or metadata
until that decision is made.

## Brand Commitments

- **Name:** CapyResume.
- **Licence:** Apache-2.0.
- **Voice:** open-source and transparent; the brief's register rules are binding (lowercase
  UI copy, sentence-case titles).
- **Visual language:** bound by `DESIGN.md` (Capytools — warm-minimal, sage-forward, quiet
  by default). Recorded here as binding; it is not expanded in this file.

## Evidence on Hand

None. There are no testimonials, user numbers, download counts, benchmarks, press mentions
or performance claims, and no research data behind any of them. The owner's instruction is
explicit: nothing should be fabricated, everything should be transparent, there is no
proof. Future work must not invent social proof, statistics, or results.

## Product Principles

1. **The document never leaves the browser.** Privacy is the product, not a setting.
2. **The core is never gated.** Free, no account, no watermark — monetisation must not
   contradict this (currently undecided).
3. **Claim only what is verifiable.** No ATS guarantees, no invented proof, no promises of
   outcomes; the tests are the source of marketing facts.
4. **Plain text on the page.** Single-column, ATS-safe, no layout tricks — the export is
   the deliverable, the tool is the packaging.
5. **Yours to keep.** PDF, DOCX and JSON export, with JSON as the escape hatch from
   browser-local storage.

## Accessibility & Inclusion

Bound by `DESIGN.md`'s contrast rules (WCAG AA; dark ink on sage, never white) plus keyboard
access: skip link, correct landmarks, visible focus rings. No additional product-specific
requirement was established by the owner.
