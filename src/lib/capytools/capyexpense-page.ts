/**
 * Copy for the CapyExpense page, kept out of the component the way the landing
 * keeps its own in `landing.ts`.
 *
 * The research claims and their citation URLs are lifted verbatim in substance
 * from `docs/research/capyexpense/research-brief.md`, whose 36 sources were
 * each verified by fetch on 2026-09-05. Numbers in the claims resolve to that
 * ledger's `sources.json`; do not soften or round them here without going back
 * to it, and do not add a claim that has no entry there.
 */

export const EXPENSE_WHAT = [
  {
    num: "01",
    tag: "Your file",
    title: "One workbook a year",
    copy: "The app generates a per-year .xlsx — twelve month sheets, a category list, a metadata sheet. You type into it with Excel, LibreOffice, anything. Reading never writes.",
  },
  {
    num: "02",
    tag: "The read",
    title: "Five charts, four numbers",
    copy: "A burn curve, category bars, a weekday heatmap, a subscription ribbon, a month grid — plus a range picker. All of it drawn from the rows you typed, nothing inferred.",
  },
  {
    num: "03",
    tag: "The binary",
    title: "No network code at all",
    copy: "The Tauri capability file grants the app no HTTP permission. Not a promise about what it chooses to send — there is no path for it to send anything.",
  },
] as const;

export const EXPENSE_RESEARCH = [
  {
    claim:
      "Recording your own expenses is one of the few money habits with meta-analytic backing: financial self-control strategies show a medium effect across 29 studies (d = 0.57). Writing an amount down rehearses it into memory in a way an automatic bank feed does not, and that rehearsal is what lowers later spending.",
    sources: [
      {
        label: "PLOS ONE 2021 — meta-analysis",
        href: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0253938",
      },
      {
        label: "Soman 2001 — J. Consumer Research",
        href: "https://academic.oup.com/jcr/article-abstract/27/4/460/1810425",
      },
    ],
  },
  {
    claim:
      "People underestimate their upcoming spending by roughly half, and the expenses they miss are the discretionary ones. Being made to think category by category raises remembered expenses by 36–60%. The category dropdown is not decoration — unpacking spending into categories is itself the intervention.",
    sources: [
      { label: "NBER w35430 — retrieval failures", href: "https://www.nber.org/papers/w35430" },
      {
        label: "Sussman & Alter 2012 — exceptional expenses",
        href: "https://pages.stern.nyu.edu/~aalter/publication.html",
      },
    ],
  },
  {
    claim:
      "The apps that do connect to your bank route it through an aggregator first. Plaid settled a credential-harvesting class action for $58M; lawmakers asked the FTC to investigate Yodlee for selling transaction data. Nothing here connects to anything, so none of that has a place to happen.",
    sources: [
      {
        label: "Reuters — Plaid $58M settlement",
        href: "https://www.reuters.com/legal/litigation/fintech-firm-plaid-agrees-58-mln-deal-end-privacy-case-2021-08-06/",
      },
      {
        label: "InvestmentNews — Yodlee FTC letter",
        href: "https://www.investmentnews.com/fintech/lawmakers-demand-ftc-investigate-envestnet-yodlee-for-selling-consumer-financial-data/176551",
      },
    ],
  },
  {
    claim:
      "The default categories are not invented. They map to the US Bureau of Labor Statistics' Consumer Expenditure Survey major groups and the UK ONS Family Spending classification, so your own numbers can be read against a published baseline.",
    sources: [
      { label: "BLS Consumer Expenditure Survey", href: "https://www.bls.gov/news.release/cesan.nr0.htm" },
      {
        label: "ONS Family Spending in the UK",
        href: "https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/bulletins/familyspendingintheuk/latest",
      },
    ],
  },
] as const;

export const EXPENSE_FAQ = [
  {
    q: "Do I have to connect a bank account?",
    a: "No, and you cannot. There is no bank connection, no aggregator, no import. You type rows into a spreadsheet. That is the entire input.",
  },
  {
    q: "Where does my data actually live?",
    a: "In one .xlsx file, in a folder you chose, on your disk. The app reads it and draws. It writes only when you explicitly ask it to, and version history goes to a plainly visible CapyExpense History/ folder next to it — not a hidden database.",
  },
  {
    q: "How do I know it is not sending anything?",
    a: "The Tauri capability file that ships inside the binary grants no HTTP permission, so the app has no network access to use. That is checkable in the source rather than promised in a policy — which is the point of building it this way.",
  },
  {
    q: "Will it overwrite the spreadsheet I have been keeping?",
    a: "Reading never writes. Before any write the app takes a copy into the history folder first, so the destructive version of any action is already undoable before you take it.",
  },
  {
    q: "Is there a Mac build?",
    a: "No. Gatekeeper blocks unsigned apps outright rather than warning, so a Mac build needs a paid Apple developer account to be worth shipping at all. Windows and Linux warn and let you continue, so those are the two.",
  },
  {
    q: "Do I need Excel?",
    a: "Any tool that reads and writes .xlsx works — LibreOffice Calc, Numbers, Google Sheets via export. The file is an ordinary workbook with no macros in it, deliberately: Office has blocked macros in downloaded files by default since 2022.",
  },
  {
    q: "What does it cost?",
    a: "Nothing. It is Apache-2.0 licensed, like the rest of the suite. There is no account to make, so there is nothing to charge for.",
  },
  {
    q: "Why is there no AI in it?",
    a: "Because categorising your own spending is the part that does the work. A model guessing categories for you removes the step the research says is doing the lifting, and it would need somewhere to send your transactions.",
  },
] as const;
