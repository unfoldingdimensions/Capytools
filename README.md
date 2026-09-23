# CapyResume

**A CV that's actually yours. Made in your tab.**

CapyResume is a résumé builder that runs entirely in your browser. You fill in a
structured editor, and it produces a PDF with real selectable text, a Word
(`.docx`) file and a JSON copy of your own data. The document never leaves your
device: there is no account, no upload, and nothing to sign up for.

---

## Why it exists

Résumé tooling is a large market where incumbents charge around $25/month for
what is fundamentally a layout and a PDF export. A résumé is also the document
people least want sitting on someone else's server.

So CapyResume takes the opposite position: everything happens locally, the
exports are unmetered and unwatermarked, and the only network request the app can
make is one you explicitly opt into with your own API key.

## What it does

- **A structured editor** — contact details, summary, experience, education,
  skills, projects, certifications and custom sections. Add, remove and reorder
  anything; bullets and tags per entry.
- **Three templates**, all single-column and table-free by construction, in light
  and dark mode.
- **Real exports** — PDF with a genuine text layer (selectable, copyable, and
  machine-readable, unlike a canvas screenshot), `.docx`, and a JSON backup you
  own. A4 and US Letter.
- **Your data is portable** — stored in your own browser, exportable to JSON at
  any time, importable on any device.
- **Optional AI help** — bring your own key and get wording suggestions you
  review before accepting. See [BYOK](#bring-your-own-key) below.

## What it deliberately does not do

Stated plainly, because these are choices rather than gaps:

- **No claim that it "passes ATS".** It produces a plain, single-column,
  text-based file — the layout parsers handle best, and `.docx` is generally the
  safest format to submit. But applicant-tracking systems vary, layout is only
  one input, and no honest tool can promise a recruiter's parser will behave.
- **No cloud sync or accounts.** Your résumé lives in one browser on one device.
  Clearing site data deletes it, and we cannot recover it because we never had a
  copy. Export the JSON as a backup.
- **No analytics, no telemetry, no cookies.**

## Bring your own key

The AI features are **off unless you turn them on**, and when you do, the request
goes **straight from your browser to the provider you choose**. There is no
CapyResume server in the path, so your key and the text you send never reach us.

Supported: **OpenAI**, **Google Gemini**, **Anthropic Claude**, and any
**OpenAI-compatible endpoint** (including a local server such as Ollama).

It helps you tighten a bullet, lead with impact, fix grammar, or make a line
clearer — one piece of text at a time. Two deliberate constraints:

- **It may not invent facts.** The prompt forbids adding numbers, employers,
  dates or achievements that your text doesn't already support, and the
  "lead with impact" action carries its own explicit ban on manufacturing
  metrics. A résumé editor that invents a metric you cannot defend in an
  interview has done you real harm.
- **Nothing is applied automatically.** You see the suggestion with a
  before/after and choose. Read it before you keep it — you are the one
  signing it.

You pay your provider directly. We have no billing relationship with them on your
behalf.

## Free, and what stays free

The free tier is the whole editor: every section type, the templates, and
unlimited PDF, DOCX and JSON exports with no watermark.

That is a commitment, not a marketing line:

> **We will not watermark your résumé, and we will not lock the export of your
> own document behind a payment.**

Paid features, if they come, will be additions — extra template packs, a
cover-letter bundle, multiple saved versions, bulk tailoring — and this section
will say so before they ship. Getting your résumé out the door stays free.

## Getting started

Requires **Node.js ≥ 20.9** — the floor Next 16 itself declares; install and
build fail below it.

### Environment

| Variable               | Default   | What it does                                                                                                                                                                                          |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | _(unset)_ | The production origin. While it is unset, `metadataBase`, canonical links and `/sitemap.xml` stay off rather than pointing at an invented domain. Set it once at deploy time — no code change needed. |

```bash
git clone https://github.com/unfoldingdimensions/CapyResume.git
cd CapyResume
npm install
npm run dev
```

Then open <http://localhost:3000>.

**No environment variables are needed.** There is no database, no auth provider
and no API key to configure — that is the point. `.env.example` says so.

### Scripts

| Command              | What it does                                     |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Development server                               |
| `npm run build`      | Production build                                 |
| `npm start`          | Serve the production build                       |
| `npm test`           | Jest test suite                                  |
| `npm run type-check` | `tsc --noEmit`                                   |
| `npm run lint`       | ESLint                                           |
| `npm run format`     | Prettier (write) — `format:check` to verify only |
| `npm run verify:pdf` | Renders a real PDF and asserts its text layer    |

## How it is built

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** with Radix UI primitives (`dialog`, `dropdown-menu`, `label`,
  `slot`, `tooltip`), `next-themes` for dark mode
- **`@react-pdf/renderer`** for PDF, **`docx`** for Word, both driven from one
  shared block list so the two exports cannot drift apart
- **Jest** + Testing Library

No server, no database, no auth provider, no state-management library. The whole
application is static files.

### Project layout

```
app/                     Routes: /capyresume (the tool), /privacy, /terms, /cookies
components/tool/         CapyResume (the editor) and AiAssist (the BYOK panel)
components/legal/        Shared shell for the legal pages
components/ui/           UI primitives
lib/capyresume/          The application: pure, testable, browser-only
  types.ts schema.ts       Versioned document model + migrate()
  store.ts                 localStorage persistence with a stable snapshot
  keys.ts                  Storage key names (React-free, so legal pages can cite them)
  document.ts templates.ts Composing the document, and the template registry
  pdf.tsx docx.ts json.ts  The three exports
  ai/                      BYOK: prompts, targets, client, provider catalogue
lib/site.ts              Product identity and contact details
scripts/                 Verification scripts
```

The `lib/capyresume/` layer is deliberately pure wherever possible: the schema,
composing, targets and prompts are plain functions with no React and no network,
which is what makes them straightforward to test.

## Testing

```bash
npm test          # the unit suite
npm run verify:pdf
```

Unit tests cover the schema and migration, the store's referential-stability
invariant (React's `useSyncExternalStore` compares snapshots with `Object.is`, so
a fresh parse per call is an infinite render loop), the JSON round-trip, template
properties, the AI prompt rules and target replacement, and the BYOK request path
against a mocked provider — including the assertion that the API key never
appears in a URL or a request body.

`npm run verify:pdf` goes further than a mock: it renders a genuine PDF through
`@react-pdf/renderer`, checks the `%PDF-` header and byte size, extracts expected
strings from the real text layer, and confirms all three templates are
watermark-free. It is the reason the "real text layer" claim is verifiable rather
than asserted.

## Contributing

The issue tracker is the contact channel for bug reports, security reports and
corrections to the legal pages. Two house rules:

- **Keep the honesty rules.** No "passes ATS", no invented metrics in the AI
  prompts, no claim the code does not support.
- **`npm run type-check && npm run lint && npm test` must pass**, and formatting
  must be Prettier-clean (`npm run format:check`).

Notes on deliberate deviations from the original implementation plan — the PDF
font strategy, the `lib/` versus `src/lib/` layout, and the deferred ESLint
upgrade — are recorded in [`docs/decisions.md`](./docs/decisions.md).

## Legal

- [Privacy Policy](./app/privacy/page.tsx) — what we don't collect, and where
  your résumé actually lives
- [Terms of Service](./app/terms/page.tsx) — the free-tier commitment, and the
  limits of what any of this can promise
- [Cookie Policy](./app/cookies/page.tsx) — the app sets no cookies; here is the
  browser storage it uses instead

## Licence

Apache-2.0. See [LICENSE](./LICENSE).
