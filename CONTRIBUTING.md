# Contributing to Capytools

Capytools is a home for small, quiet tools. The brief is narrow on purpose, so
most of this document is about the constraints rather than the process. Read
the constraints first — a patch that breaks one of them can't be merged no
matter how good it is.

## The promise

Every tool keeps a promise to the person using it, and the promise is the
product. There are exactly two versions of it.

**Browser tools** — the default — run **100% in the browser**. Client-side
TypeScript and Web APIs, no server round trip, nothing persisted. No account,
no cookie banner, no telemetry inside a tool. The suite forgets you the moment
the tab closes.

**Desktop tools** are the documented exception, introduced by CapyExpense. They
ship as a Tauri app and *do* write files — but only the user's own files, on
their own disk, with no network code in the binary. A desktop tool must state
its own promise, "stored on your machine, never ours". It may not inherit
"nothing stored", which would be false.

Sensitive values — API keys, preferences — live in browser `localStorage` and
nowhere else.

If a change would put a byte of someone's data on a wire, it is out of scope
for this project. That is not a bar to clear with better encryption; it's the
whole point of the suite.

## Getting set up

```bash
npm install
npm run dev
```

The site runs on port 3024. Before you open a PR:

```bash
npm test
npm run lint
```

The CapyExpense desktop app is a separate Vite bundle with its own typecheck:

```bash
cd desktop && npm install && npx tsc --noEmit
```

## Boundaries the tests enforce

`tests/capyexpense-boundaries.test.ts` fails the build on two mistakes that are
otherwise silent until something expensive breaks:

1. **`exceljs` or a Tauri plugin reached from `src/app` or `src/components`.**
   `exceljs` is a dev dependency here, so this breaks the Vercel deploy — after
   a push, not before one.
2. **A shared dashboard component importing `next/*`, `motion`, or storage.**
   Anything under `src/components/capyexpense/` renders in both the Next site
   and the desktop app's Vite bundle, which has no Next in it at all. It
   compiles fine on the web and breaks the desktop build.

If one of these fails, the fix is to move the import, not to relax the test.

## Design system

The look is a fixed vocabulary, not a suggestion. Reach for the token before
inventing a value.

**Canvas** — cream `#f9f9f7` light, deep charcoal `#121212` dark.

**Palette** — sage `#8e9b7e` / `#9aab8d` primary, warm clay `#c07952` for
required fields and alerts, water `#5f7a72` for links and secondary, gold
`#d9a441` for milestones and sparkles. Clay and gold carry meaning; don't spend
them on decoration.

Those hexes are fills and decoration. An accent used as *text* needs its own
darker shade in light mode — sage measures 2.94:1 on white and gold 2.25:1,
both under AA — which is why `src/lib/capyog/themes.ts` splits `accent`,
`accentText` and `accentFill` and measures all three in tests.

**Type** — `font-display` (Fraunces) for titles, light weight, with italic
emphasis via `<em className="italic">`. `font-sans` (Plus Jakarta Sans) for UI.
`font-mono` (Albert Sans) for eyebrows, code and tags.

**Surfaces** — `rounded-3xl` for main cards, `rounded-2xl` for inset wells,
`rounded-full` for pills and buttons.

**Atmosphere** — every tool page carries `AmbientBackground` and the `CapyMark`
mascot.

Tools are named `Capy<Name>`. The eyebrow is exact:

```
font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground
Capy<Name> · tool no. X
```

## Hydration

Client-only values — `localStorage`, random seeds — hydrate on mount, or React
19 reports a mismatch and the linter flags the setState:

```tsx
const hydrateValues = useCallback(() => {
  setValue(getStoredValue());
}, []);

// eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(hydrateValues, [hydrateValues]);
```

## Optional LLM polish

Some tools offer a generation or polish pass. Supported providers are
OpenCode-Go (`qwen3.8-flash`), OpenRouter, Nous Portal (`hermes-3`), Command
Code, and custom OpenAI-compatible endpoints. Keys are saved in `localStorage`
only. Always strip reasoning tags defensively with `stripThinkingTags` — a
model that leaks `<think>` into a user's prompt is a bug, not a quirk.

## Adding a tool

Take the next free tool number, then work down this list. Most of it is
enforced by a test, so `npm test` tells you what you have left.

1. **Page** at `src/app/capy<name>/page.tsx`, on the shared `ToolPageShell`.
   Export a `metadata` object whose `title` carries the tool name and whose
   `description` carries the promise ("100% in your browser" for a browser
   tool) — `tests/<name>.test.ts` asserts both.
2. **Client component** at `src/components/tool/<ToolName>.tsx`.
3. **Register** in the `SUITE` array in `src/lib/capytools/suite.ts`. The
   masthead, footer, notes page, sitemap and every count derive from that one
   row, so this is the only place the suite learns your tool exists.
4. **Lab plate** at `public/plates/lab-N.webp`, 896×1200, with its name added
   to `PLATES` in `src/lib/capytools/landing.ts`. The asset test checks both
   that the file exists and that the landing renders it.
5. **README section**, numbered to match, plus the first-line count ("N so
   far"). That sentence lives in three places and all three are asserted
   against each other: the README, `COLOPHON.quote` in
   `src/lib/capytools/landing.ts` (verbatim), and `package.json`'s
   `description`.
6. **Unit tests** at `tests/<name>.test.ts`.
7. **Add a row** to the page table in `tests/tool-pages.test.tsx`, and bump the
   denominator on the rows already there — a ninth tool makes every sign-off
   read `/ 09`.

Don't write the sign-off index into your page. `ToolPageShell` derives
`Nº 06 / 08` from the tool's position in `SUITE` and the suite's size; the
eyebrow (`Capy<Name> · tool no. N`) is the only place you type the number.

## Commits and pull requests

Conventional Commits, with the scope naming the tool or area:

```
feat(capystrip): probe the canvas instead of guessing a pixel cap
fix(a11y): one focus treatment instead of two
```

Keep a PR to one concern. Say what you changed, why, and how you checked it —
test output beats an assurance. If you made a deliberate trade-off, name it in
the PR body rather than leaving it for a reviewer to find.

## Reporting a bug

Open an issue with the tool name and what you expected:
[github.com/unfoldingdimensions/Capytools/issues](https://github.com/unfoldingdimensions/Capytools/issues).
A browser and an OS help. Never paste a photo, a spreadsheet or an API key into
an issue — the whole point of these tools is that nobody else sees your file,
and that includes us.

## License

Contributions are accepted under the [Apache License 2.0](LICENSE), the same
license that covers the project. Submitting a pull request means you agree to
license your work under it.
