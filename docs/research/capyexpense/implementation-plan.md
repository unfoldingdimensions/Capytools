# CapyExpense (tool no. 5) — Implementation Plan

*Prepared 2026-09-05. Unlike the CapyStrip and CapyOG handoffs, this document was written
**alongside** the implementation rather than ahead of it, so it is an implementation RECORD: the
decisions that were made, the ones the research got wrong, and the seams a later session should
attach to. Citation keys `[n]` resolve to [`./sources.json`](./sources.json); the topic answers are
in [`./research-brief.md`](./research-brief.md).*

---

## 1. Mission & scope

> *"you already have the data. it just never talks back."*

A local-first expense tracker. The user types rows into a spreadsheet they own; a desktop dashboard
reads that file and never writes over their rows. No account, no bank connection, no cloud, no LLM.
The value comes precisely from *not* touching an aggregator.

### In scope (v1, all shipped)
- A per-year `.xlsx` the app generates: 12 month sheets + `Lists` + `_meta`.
- A pure analysis core shared by the desktop app and the website.
- Five hand-rolled SVG charts and four widgets.
- A Tauri v2 desktop app for Windows and Linux, with five-screen onboarding.
- App-managed version history in a visible `CapyExpense History/` folder.
- A marketing page at `/capyexpense` carrying a live demo on seeded data.

### Out of scope (do NOT build)
- **Any network code in the desktop app.** `capabilities/default.json` grants no HTTP permission,
  deliberately — it makes "there is no upload path" checkable rather than merely promised. If you
  find yourself adding one, stop.
- **Any macro / VBA.** Office has blocked macros from downloaded files by default since 2022.
- **A rollup or ALL DATA sheet.** Cut on the user's instruction and then some: a derived sheet is
  only as fresh as the last app write, so it sits stale behind whatever was last typed.
- **macOS.** Gatekeeper blocks unsigned apps outright rather than warning, so it needs a paid Apple
  account to be worth shipping.
- Budgets, multi-currency conversion, bank import.

---

## 2. Read these first (repo law)

1. `AGENTS.md` — including the Next.js warning, and **§1, which this tool amended**: CapyExpense is
   the first Capytools tool that is not a browser tool, so "all tools execute 100% in-browser" and
   "nothing stored" stopped being true site-wide. Desktop tools are now a documented category that
   must state their own promise.
2. `.agents/rules/production-invariants.md` — the WCAG rule (`--primary-foreground` is `#141412`,
   never white) and the storage/hydration rules are both live here.
3. `.agents/skills/capytools-dev/SKILL.md`.

**Reuse targets, and what to take from each:**
- `src/lib/capytools/sparkline.ts` — the geometry-plus-ink-constants idiom every chart here copies,
  and `SPARK` itself, reused for the burn chart's end node.
- `src/lib/capytools/llm.ts` — the `getStored`/`saveStored` shape that `desktop/src/settings.ts`
  mirrors (try/catch, field-by-field guards, defaults fallback).
- `src/components/tool/CapyStrip.tsx` — numbered stage cards, the demo pill, honest error copy.
- `src/app/tokens.css` — **new**; the palette both builds import.

**Ethos invariants (hard):** nothing leaves the machine. The desktop app writes only the user's own
files, in their own folder, and only on an explicit action. Reading never writes.

---

## 3. Verified technical facts

All verified 2026-09-05; ledger in `./sources.json`. The four that shaped the design:

| Fact | Consequence |
| --- | --- |
| exceljs runs in WebView2 with no Node polyfills, but Rollup cannot parse its minified bundle (exceljs#2093) `[18][19][20]` | The import must be aliased. See the correction below. |
| LibreOffice is lossy with inline literal data validations (tdf#94393) `[22]` | Every dropdown is a **range reference** into the Lists sheet. The Lists sheet therefore carries the closed vocabularies too. Asserted by test. |
| `open({directory:true})` defaults `recursive` to **false**; dialog grants are session-scoped `[26][27]` | `recursive: true` is passed explicitly, and `tauri-plugin-persisted-scope` is registered **after** the fs plugin. |
| Excel saves by writing a temp file and renaming, so Windows reports Rename, not Modify(Data) `[28][29]` | The watcher matches **any** event touching the path, debounced 400ms, ignoring `~$` lock files. A Modify filter would see no saves at all. |

### Corrections — the research was wrong or incomplete on three points

1. **`exceljs/dist/es5/exceljs.browser.js` is the wrong target.** It parses, but imports ~20
   `core-js/modules/*` paths and `regenerator-runtime` that are not dependencies. Rollup warns and
   externalises them, producing a bundle that builds cleanly and throws on first import at runtime.
   Use **`exceljs/dist/exceljs.bare.js`**: unminified so Rollup parses it, unpolyfilled because
   WebView2 is evergreen Chromium. Zero warnings.
2. **Tauri's template `crate-type` breaks the GNU toolchain.** `["staticlib", "cdylib", "rlib"]`
   exists to support mobile. On `x86_64-pc-windows-gnu` the cdylib fails to link:
   `ld.exe: error: export ordinal too large`. Desktop-only means `crate-type = ["rlib"]`.
3. **`tauri-build` hard-fails without `icons/icon.ico`.** Generated from the CapyMark.

### Measured, not assumed
- Generated workbook: **149KB in 139ms**, in node and again in a real browser.
- Desktop release binary: **23.98MB** with the default profile, **4.98MB** with
  `opt-level="s"` + `lto` + `codegen-units=1` + `strip`.

---

## 4. File map

```
src/lib/capyexpense/
  types.ts schema.ts migrate.ts normalize.ts csv.ts     # data + the schema contract
  dates.ts bucket.ts compare.ts aggregate.ts format.ts  # the analysis
  history.ts sample.ts                                  # snapshots (pure), demo data
  workbook-plan.ts                                      # declarative, NO exceljs
  workbook-write.ts workbook-read.ts                    # the ONLY exceljs surface
  geometry/{ribbon,bars,heatmap,burn}.ts                # chart maths
src/components/capyexpense/                             # pure, prop-fed, rendered by BOTH builds
src/components/tool/CapyExpenseDemo.tsx                 # web shell (fixed clock, fixed locale)
src/app/capyexpense/page.tsx                            # marketing + live demo
src/app/tokens.css                                      # palette, shared by both builds
desktop/                                                # Vite + Tauri, own package.json + lockfile
  src/{App,Onboarding}.tsx  src/{workspace,history,settings,theme}.ts
  src-tauri/                                            # one Rust command: create_workbook_shortcut
tests/capyexpense-*.test.ts(x)                          # 10 files
```

**Registered in:** `TOOLS` in `src/app/page.tsx`, `TOOLS` in `src/components/header.tsx`, the hero
count at `src/app/page.tsx:61`, and the home-page assertion in `tests/capystrip.test.ts`.

**Dependency changes:** `exceljs` as a root **devDependency** (so the round-trip test can run; it
ships only inside `desktop/`). Nothing added to the browser bundle.

### ⚠️ The four edits that keep Vercel green
`desktop/` is a separate package and the root build must not see it. Miss any one and the deploy
breaks *after* a push:
1. `tsconfig.json` — `"desktop"` in `exclude`. Otherwise `next build` type-checks a package whose
   dependencies are not installed at the root.
2. `eslint.config.mjs` — `"desktop/**"` in `globalIgnores`.
3. `.gitignore` — `desktop/node_modules`, `dist`, `src-tauri/target`, `src-tauri/gen`.
4. `exceljs` stays in devDependencies, and `tests/capyexpense-boundaries.test.ts` proves nothing
   under `src/app` or `src/components` imports it.

---

## 5. The schema contract (requirement 3)

"Updates must be progressive and never break previous versions" is the hardest requirement here, so
it is stated as rules in `schema.ts` and **enforced by a test**, not by discipline:

1. Columns are identified by **header string, never by index**.
2. **Append-only.** New columns go to the right; a header is never renamed, removed or repurposed.
   A changed label moves the old string into `aliases`, which is itself append-only.
3. Unknown columns are **preserved verbatim** into `Transaction.extra`.
4. Missing columns are **defaulted, never fatal**.
5. A file from a **newer** build is still read, in compatibility mode. Never refuse, never rewrite.
6. **Reading never writes.** Structural upgrades happen only on an explicit action, after a snapshot.

Rules 1–5 make an old file readable; **rule 6 stops a readable old file becoming a broken new one.**

The enforcement test asserts a hand-frozen `V1_HEADERS` array is a **prefix** of
`COLUMNS.map(c => c.header)`. It is deliberately not imported from `schema.ts` — a shared constant
could be edited in lockstep and pass while every existing workbook broke.

---

## 6. The two subtleties most likely to be "simplified" by a later session

**Like-for-like comparison (`compare.ts`).** On the 5th of the month, 200 spent is not "85% down" on
last month's 1,300 — it is five days against thirty. The current window is clipped to elapsed days
and the previous window clipped to the same count, with grain-specific rules: month clamps the day
offset into short months (31 Mar → 28/29 Feb, never overflowing into March), year compares the same
**calendar date** so leap years do not drift. `ratio` is `null` when the previous period was zero.
Comparing a partial period against a whole one is the most common way these dashboards lie, and it
always lies in the flattering direction.

**Heatmap states.** A future day is **not drawn**; a known zero-spend day is drawn **muted with a
border**. A missing cell means "not applicable"; a muted one means "we know, and the answer was
nothing". Painting a quiet day pale sage would make restraint look like a rounding error. Bucketing
is by **quantile** — on a linear ramp one large day puts every other day in the bottom band and the
year reads as empty.

---

## 7. Test plan and definition of done

**415 tests across 21 files.** The load-bearing ones:
- `capyexpense-schema` — the append-only prefix assertion; alias uniqueness.
- `capyexpense-workbook` — generate → read round trip, plus **forged** workbooks from older and
  newer builds, with columns reordered and columns this build has never heard of. This is the only
  honest proof of §5.
- `capyexpense-compare` — every partial-period rule, including the February clamp.
- `capyexpense-boundaries` — the Vercel guard, plus the `process.env` guard (see §8).
- `capyexpense-components` — renders the dashboard at five presets and asserts no `NaN`,
  `Infinity`, `undefined` or `[object Object]` reaches the page.

**Definition of done (all currently passing):** `npm test` green · `npx tsc --noEmit` at root **and**
in `desktop/` · `npx eslint src tests` · `npm run build` · `cd desktop && npx vite build` ·
`cd desktop/src-tauri && cargo build`.

---

## 8. Lessons worth carrying to the next tool

- **`src/lib/utils.ts` is now shared across two bundlers.** It evaluated `process.env` at module
  load; every shared component imports `cn` from it, so in the Vite bundle the import threw
  `ReferenceError` before first paint. Found by *running* the app, not by building it. The
  `process.env.NEXT_PUBLIC_*` expression must stay verbatim — Next inlines it by textual match.
- **Building is not verifying.** Both the exceljs polyfill trap and the `utils.ts` crash produced
  clean builds and broken runtimes.
- **Inspect the DOM, not the screenshot.** Two real bugs (a heatmap collapsed to one column, a
  comparison label naming the wrong period) were found by querying the live page; screenshots in a
  hidden pane are unreliable because `requestAnimationFrame` does not run, which leaves every
  `Reveal` stuck at `opacity: 0`.

---

## 9. Out-of-scope backlog, with seams

- **Distribution.** Vercel Blob was chosen; nothing is uploaded yet, and the marketing page's
  download buttons are deliberately disabled placeholders. Publish a SHA-256 beside each build.
- **Linux artifacts.** `tauri build` needs a Linux host with `webkit2gtk-4.1`; build from WSL2.
- **exceljs read→write fidelity** on a workbook decorated with charts or conditional formatting is
  still unverified. Mitigations are in place (append-only writes, `pre-write` snapshot every time);
  the escalation is to stop writing to the user's workbook and write a sibling file.
- **Restore UI.** `desktop/src/history.ts` implements list/snapshot/restore/prune and
  `diffTransactions` exists, but no panel surfaces them yet. That is the seam.
- **Mixed currencies** across workbooks: detect, refuse to sum, show a per-currency breakdown.
- **`.rsrc merge failure` linker warning** on windows-gnu. Harmless, binary is produced; would
  disappear on an MSVC host.

---

## 10. Sources

Keys resolve to [`./sources.json`](./sources.json) (36 entries, verified 2026-09-05). Topic answers
and the copy-ready marketing claims `[1]`–`[4]` are in [`./research-brief.md`](./research-brief.md).
