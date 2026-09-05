# CapyExpense research brief

Companion to `sources.json` (36 entries, all verified 2026-09-05). This brief answers the six
research questions and resolves the `[1]`–`[4]` citation placeholders for the marketing page.

> **Note on the marketing page:** no CapyExpense marketing page exists in the repo as of this
> research pass (`grep` for capyexpense/[1]–[4] across `src/`, `docs/`, `tests/` returned nothing;
> working tree clean). The four claims below are copy-ready; whichever session authors the page
> (`src/app/capyexpense/page.tsx` or a handoff doc's marketing section) should paste them in
> verbatim with the numbered keys resolving to `sources.json`.

## Resolved claims [1]–[4]

- **[1] — Tracking works (efficacy).** Financial self-control strategies — including expense
  self-monitoring — reduce spending/increase saving with a medium meta-analytic effect
  (d = 0.57, 29 studies) [1]. Manual recording adds psychological weight: payment mechanisms that
  require *rehearsal* (writing down the amount) make past expenses more accessible and future
  spending lower [2][3]. Safe copy: *"People who record their expenses spend measurably less —
  manual logging is one of the few money habits with meta-analytic backing [1]. Writing an amount
  down makes it real in a way automatic bank feeds don't [2]."*
- **[2] — You underestimate, and in which direction.** People underestimate upcoming spending by
  ~50%; simply thinking through expenses category-by-category raised remembered expenses 36–60%
  and savings 15% [6]. The systematic blind spot is *exceptional/discretionary* spending, which is
  under-estimated relative to routine costs and then overspent [7]. Safe copy: *"Research finds
  people underestimate upcoming spending by about half — and the expenses they miss are exactly
  the discretionary ones [6][7]. A category dropdown isn't decoration; unpacking expenses into
  categories is itself the intervention that works [6]."*
- **[3] — Why local-first (privacy).** Mainstream expense apps route your bank data through
  aggregators: YNAB stores in the US and shares with MX/Plaid, sends hashed emails to ad
  platforms [11]; Monarch shares via Plaid/Finicity/MX/Spinwheel, uses OpenAI and ad partners
  while stating "we will never sell your financial data" [12]; Rocket Money markets "never sell
  your data" while EPIC quotes its policy admitting sharing "in exchange for valuable
  consideration" [14]. Aggregator record: Plaid paid $58M in a class action over harvesting bank
  credentials [9]; lawmakers asked the FTC to investigate Yodlee for selling transaction data to
  institutional investors [10]; the budgeting app Dave leaked 7.5M user records [15]; Credit Karma
  (Mint's successor) paid the FTC $3M over dark-pattern credit offers [16]. Safe copy: *"Every
  mainstream expense app sends your transactions to a data aggregator first [11][12][14]. CapyExpense
  never does — your file stays on your disk and nothing leaves the window."*
- **[4] — Grounded taxonomy.** The default dropdown maps to real taxonomies: BLS Consumer
  Expenditure Survey's 14 major groups [30], ONS Family Spending COICOP divisions [31], and the
  category-group shapes used by YNAB [33] and Monarch [32]. Safe copy: *"Categories based on the
  US Bureau of Labor Statistics' Consumer Expenditure Survey and the UK ONS Family Spending
  classification — not invented."*

## Topic-by-topic answers

### 1. Efficacy of manual expense tracking
- Meta-analysis: financial self-control strategies (incl. tracking) → d = 0.57 [0.43–0.71], 29
  studies, 12 strategies; proactive vs reactive tracking shows no significant difference in
  effectiveness [1].
- Mechanism for *manual* specifically: Soman's rehearsal/immediacy model — writing down a payment
  rehearses it into memory, making past expenses accessible and future spending lower [2]; payment
  "transparency" lowers consumption [3]; pain-of-paying/decoupling origin [4]; card-vs-cash WTP
  premium up to ~50–100% [5].
- Underestimation: ~50% of upcoming spending forgotten [6]; exceptional/discretionary expenses
  under-estimated → overspending [7]. Direction: **underestimate, concentrated on discretionary
  items**.

### 2. Privacy record of mainstream expense apps + aggregators
- **Plaid** [8][9]: collects account numbers, balances, transactions; shares "with the developer
  of the app … and as directed by that developer"; auto-deletes on connection removal (the
  "three years" line is biometric-data-only — don't cite it as general retention); $58M class
  action over credential harvesting (NOT an FTC action — folklore correction) [9].
- **Yodlee** [10]: sold transaction data to institutional investors; 25M people aggregated;
  Wyden/Brown/Eshoo FTC letter (Jan 2020).
- **Apps** [11][12][13][14]: YNAB — US storage, MX/Plaid, analytics session recordings, hashed
  email to ad platforms, "sale" acknowledgment. Monarch — Plaid/Finicity/MX/Spinwheel, OpenAI as
  service provider, ad retargeting + session replay, "never sell" + state-law sale acknowledgment.
  Copilot — Plaid + Mastercard Data Connect. Rocket Money — Plaid; "never sell" marketing vs EPIC
  CFPB complaint quoting "shared personal information … in exchange for valuable consideration".
- **Breach/enforcement record** [15][16][17]: Dave 7.5M records (2020, ShinyHunters, third-party
  GitHub leak); Credit Karma FTC $3M dark-patterns order (2022); Mint forcibly migrated into
  Credit Karma Jan 2024 — i.e. even the free tools' data lifecycle ended in an ad-supported
  credit-recommendation product.

### 3. exceljs in a Vite / WebView2 bundle (gates Phase 0)
- **Answer: yes, with one import-path rule.** exceljs 4.4.0's `browser` field →
  `dist/exceljs.min.js` [18]; the browser build is the document-based workbook only (no streaming
  reader/writer; use `xlsx.load()`/`writeBuffer()`) and needs **no Node polyfills on modern
  Chromium/WebView2** — WebView2 is evergreen Chromium [19][24].
- **What breaks:** `vite build` chokes on the minified bundle (Rollup `Unexpected token` —
  issue #2093, open) [20].
- **Which fix:** import/alias `exceljs/dist/es5/exceljs.browser.js` (discussion #2496) [21] —
  not a polyfill plugin; `core-js`/`regenerator-runtime` are only needed for legacy ES5 targets
  [19].
- **dataValidation survival:** exceljs writes list-type validations with dropdowns [19]. LibreOffice
  is reliable with **range-based** lists but lossy with inline literal lists (tdf#94393) [22];
  Google Sheets imports xlsx dropdowns reliably (export back to xlsx can drop them) [23].
  → **Design rule: put the category list on a hidden "Lists" sheet and reference it by range,
  never as an inline `'"A,B,C"'` formula.**

### 4. Tauri v2 filesystem scope and watching (gates Phase 0)
- **Dialog grants scope at runtime — yes.** plugin-dialog calls
  `allow_directory(&path, options.recursive)` / `allow_file(&path)` on the fs scope after every
  pick; `FsExt::allow_directory` in Rust is only for paths the user didn't select [26].
- **Critical nuance:** subdirectory access requires `open({ directory: true, recursive: true })`
  — `recursive` defaults to **false** [26].
- **Restart persistence:** default runtime grants are session-scoped; add
  `tauri-plugin-persisted-scope` ("save filesystem and asset scopes and restore them when the app
  is reopened"), registered **after** the fs plugin [27].
- **Watch vs Excel save:** plugin-fs watch uses `notify` (+ `notify_debouncer_full` when
  `delayMs` is passed) [28]. Excel saves via temp-file-then-rename, so Windows reports Rename —
  **not** Modify(Data) — events; match any event touching the target path
  (`ModifyKind::Name(RenameMode::Both/To)` included), debounce (`delayMs` ~300–500ms), and ignore
  `~$` lock files [29]. Without that, a watcher filtering on Modify(Data) sees *no* Excel saves.

### 5. Category taxonomies (grounding for the dropdown)
- BLS CE: 14 exact labels (Food; Alcoholic beverages; Housing; Apparel and services;
  Transportation; Healthcare; Entertainment; Personal care products and services; Reading;
  Education; Tobacco products and smoking supplies; Miscellaneous; Cash contributions; Personal
  insurance and pensions) [30].
- ONS Family Spending: COICOP division labels incl. division 13 "Other expenditure items" [31].
- Monarch: 12 expense groups / ~35 default categories (full list in ledger) [32].
- YNAB: group-first shape — Immediate Obligations, True Expenses, Debt Payments, Quality of Life
  Goals, Just for Fun [33].
- → Synthesis for CapyExpense's default set: BLS/ONS division names as top-level categories,
  Monarch-style leaf categories, one "Other" required fallback; keep the total small (~20–25
  leaves) since category-prompting itself is an intervention [6].

### 6. Subscription creep
- The number: consumers estimate $86/mo on subscriptions; actual itemized $219/mo (2.5×); average
  gap $133/mo (~$1,600/yr); n=1,000, Apr–May 2022; 74% easy to forget, 42% pay for unused, 72%
  auto-pay [34].
- Why small recurring charges escape re-evaluation: flat-rate bias — people overpay for flat
  recurring tariffs and are *happier*/less likely to churn (JMR) [35]; shrouded-attribute myopia —
  small add-on/hidden charges are systematically under-anticipated (QJE) [36]; automation +
  payment decoupling remove the per-payment pain [3][4].
- → Subscription-commitment card copy can safely say: *"The average person underestimates their
  subscription spend by more than 2.5× — $133 a month"*, citing [34].
