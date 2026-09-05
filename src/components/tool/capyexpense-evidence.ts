/**
 * The research behind the landing page's claims.
 *
 * Inline `[1]` superscripts were the wrong shape for this: they interrupt every
 * sentence with a number that means nothing on its own, and the reader has to
 * hold it until some footnote list they never reach. Each claim now names its
 * own source in an expandable card, so a sceptical reader can check the one
 * paragraph they doubt and everyone else reads uninterrupted prose.
 *
 * Full ledger, with verification dates: docs/research/capyexpense/sources.json.
 */

export interface Evidence {
  /** The claim this backs, in the page's own words. */
  claim: string;
  title: string;
  publisher: string;
  year: string;
  url: string;
}

export const TRACKING_EVIDENCE: Evidence[] = [
  {
    claim: "Recording expenses measurably reduces spending",
    title: "A meta-analysis of financial self-control strategies",
    publisher: "PLOS ONE",
    year: "2021",
    url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0253938",
  },
  {
    claim: "Writing a payment down is what makes it stick",
    title: "Effects of Payment Mechanism on Spending Behavior: Rehearsal and Immediacy of Payments",
    publisher: "Journal of Consumer Research",
    year: "2001",
    url: "https://academic.oup.com/jcr/article-abstract/27/4/460/1810425",
  },
  {
    claim: "People forget about half of their upcoming spending, and category prompts recover it",
    title: "Retrieval Failures and Consumption Smoothing",
    publisher: "NBER Working Paper 35430",
    year: "2026",
    url: "https://www.nber.org/papers/w35430",
  },
  {
    claim: "The forgotten expenses are the discretionary ones",
    title: "The Exception Is the Rule: Underestimating and Overspending on Exceptional Expenses",
    publisher: "Journal of Consumer Research",
    year: "2012",
    url: "https://pages.stern.nyu.edu/~aalter/publication.html",
  },
  {
    claim: "People estimate $86 a month on subscriptions and actually spend $219",
    title: "Subscription Service Statistics and Costs",
    publisher: "C+R Research",
    year: "2022",
    url: "https://www.crresearch.com/blog/subscription-service-statistics-and-costs",
  },
  {
    claim: "Small recurring charges escape re-evaluation by design",
    title: "Paying Too Much and Being Happy About It: Tariff-Choice Biases",
    publisher: "Journal of Marketing Research",
    year: "2006",
    url: "https://journals.sagepub.com/doi/10.1509/jmkr.43.2.212",
  },
];

export const PRIVACY_EVIDENCE: Evidence[] = [
  {
    claim: "YNAB stores in the US and shares with MX and Plaid",
    title: "YNAB privacy policy",
    publisher: "YNAB",
    year: "verified 2026",
    url: "https://www.ynab.com/privacy-policy",
  },
  {
    claim: "Monarch shares via Plaid, Finicity, MX and Spinwheel",
    title: "Monarch Money privacy policy",
    publisher: "Monarch",
    year: "verified 2026",
    url: "https://www.monarch.com/privacy",
  },
  {
    claim: "Rocket Money markets “never sell your data” while its policy admits sharing for value",
    title: "EPIC complaint to the CFPB regarding Rocket Money",
    publisher: "Electronic Privacy Information Center",
    year: "2024",
    url: "https://epic.org/documents/epic-cfpb-complaint-rocket-money/",
  },
  {
    claim: "Plaid paid $58m to settle a class action over harvesting bank credentials",
    title: "Fintech firm Plaid agrees to $58 mln deal to end privacy case",
    publisher: "Reuters",
    year: "2021",
    url: "https://www.reuters.com/legal/litigation/fintech-firm-plaid-agrees-58-mln-deal-end-privacy-case-2021-08-06/",
  },
  {
    claim: "Lawmakers asked the FTC to investigate Yodlee for selling transaction data",
    title: "Lawmakers demand FTC investigate Envestnet Yodlee for selling consumer financial data",
    publisher: "InvestmentNews",
    year: "2020",
    url: "https://www.investmentnews.com/fintech/lawmakers-demand-ftc-investigate-envestnet-yodlee-for-selling-consumer-financial-data/",
  },
  {
    claim: "The budgeting app Dave leaked 7.5 million user records",
    title: "Dave data breach affects 7.5 million users, leaked on hacker forum",
    publisher: "BleepingComputer",
    year: "2020",
    url: "https://www.bleepingcomputer.com/news/security/dave-data-breach-affects-75-million-users-leaked-on-hacker-forum/",
  },
];
