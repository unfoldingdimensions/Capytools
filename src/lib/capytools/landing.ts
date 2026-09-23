/**
 * Single source of copy for the editorial landing page (src/app/page.tsx and
 * src/components/landing/*). Ported from the OpenDesign export
 * (Capytools-Editorial-Landing-OpenDesign) with these deliberate deltas:
 *
 * - The README quote reads "Five so far" — the export still said "Four"
 *   because the README itself was stale; both were updated together so the
 *   "quoted verbatim" framing stays true.
 * - The wire's CapyCreator row includes @gemini (the export omitted it;
 *   src/lib/capycreator/profiles.ts has seven families).
 * - The export linked back to capytools.app from the site itself, and
 *   out to GitHub for project meta; every link here now routes natively
 *   (/notes, /design, /license are real pages). The landing renders ONE
 *   external href: the proof band's "read the code that just ran", because
 *   "open and local" (PRODUCT.md) is a claim the visitor should be able to
 *   check from where it is made. Everything else stays native; /notes links
 *   out for contributions.
 * - Editorial-lite: side rails, FIG/coordinate annotations, pagination
 *   counters, the hero index and the inert work arrows did not survive
 *   the port.
 */

import {
  SUITE,
  SUITE_INDEX,
  listOut,
  numberWord,
  SUITE_WORD,
  SUITE_WORD_CAP,
  countByCategory,
  pad2,
} from "@/lib/capytools/suite";

export const EXTERNAL = {
  repo: "https://github.com/unfoldingdimensions/Capytools",
  readme: "https://github.com/unfoldingdimensions/Capytools#readme",
  issues: "https://github.com/unfoldingdimensions/Capytools/issues",
  license: "https://github.com/unfoldingdimensions/Capytools/blob/main/LICENSE",
  designNotes:
    "https://github.com/unfoldingdimensions/Capytools/blob/main/DESIGN.md",
} as const;

/** Headline segment; `em` renders the italic Fraunces emphasis. */
export type Headline = { text: string; em?: boolean }[];

/**
 * The hero names JOBS, not products. It used to read out all eleven Capy-
 * names in a row — made-up words that told a first-time visitor nothing. Four
 * jobs anyone recognises lead; the rest are counted from the registry, so a
 * twelfth tool changes "seven more" to "eight more" by itself.
 */
export const HERO_JOBS = [
  { href: "/capyqr", job: "QR codes" },
  { href: "/capyog", job: "OG cards" },
  { href: "/capyresize", job: "favicon packs" },
  { href: "/capytoken", job: "token counts" },
] as const;

const HERO_REST = numberWord(SUITE.length - HERO_JOBS.length);
const IN_BROWSER = numberWord(countByCategory("browser"));

export const HERO = {
  label: "Calm little tool suite",
  ix: `· Nº ${SUITE_INDEX}`,
  headline: [
    { text: "Calm " },
    { text: "little tools", em: true },
    { text: ", quiet by " },
    { text: "default", em: true },
  ] as Headline,
  lead: `${listOut([...HERO_JOBS.map((row) => row.job), `${HERO_REST} more small jobs`])} — ${IN_BROWSER} of them done right in your browser, keeping nothing. No signup, no cookies, no uploads.`,
  primary: { label: "Explore our tools", href: "#labs" },
  aside: { label: "CapyExpense, the desktop one — coming soon", href: "/capyexpense" },
  stats: [
    { value: SUITE_INDEX, label: "tools", sub: "in the suite", tone: "solid" },
    { value: "0", label: "bytes", sub: "stored by us", tone: "plain" },
    // Counted, not rounded up: CapyExpense is a desktop app, so "100%
    // client-side" was false the day it joined the suite.
    { value: `${countByCategory("browser")}/${SUITE.length}`, label: "in-tab", sub: "one desktop", tone: "plain" },
  ] as { value: string; label: string; sub: string; tone: string }[],
  meta: "↳ one quiet tab · your input stays in it",
} as const;

/**
 * The proof band, directly under the hero: three real tools, live in the tab,
 * beside a counter that watches for a request carrying what you typed.
 *
 * "Open and local" is the positioning (PRODUCT.md). This is where the landing
 * stops saying it and shows it — the words below describe the demo, and the
 * demo is the claim.
 */
export const PROOF = {
  headline: [
    { text: "Nothing you type " },
    { text: "leaves this tab", em: true },
  ] as Headline,
  lead: "Three of the tools, running right here. Type into any of them and watch the counter: it counts every request this page makes to a server that could read what you typed.",
  counter: {
    label: "requests to a server that could read it",
    note: "counted by your browser's resource timing — our API or any other site, since you first typed. the page loading its own files is not one.",
  },
  demos: [
    {
      id: "qr",
      tab: "QR code",
      prompt: "a link to encode",
      initial: "https://capytools.app",
      open: { label: "open CapyQR", href: "/capyqr" },
    },
    {
      id: "tokens",
      tab: "Token count",
      prompt: "text to count",
      initial: "Calm little tools that run in your browser and keep nothing.",
      open: { label: "open CapyToken", href: "/capytoken" },
    },
    {
      id: "palette",
      tab: "Palette",
      prompt: "a mood",
      // A curated lexicon anchor (night-rain), so the first palette anyone sees
      // is a tuned one — "rain on a tin roof" matched nothing and improvised.
      initial: "rain on the window",
      open: { label: "open CapyTone", href: "/capytone" },
    },
  ],
  /** The code behind the demos — the one external href on the landing. */
  source: {
    label: "read the code that just ran",
    href: `${EXTERNAL.repo}/blob/main/src/components/landing/ProofBand.tsx`,
  },
  /** Auto-advance until the visitor touches anything, then never again. */
  advanceMs: 7000,
} as const;

export type ProofDemoId = (typeof PROOF.demos)[number]["id"];

export const WIRE = {
  // Not "live", and no pulsing dot: on a product that watches nothing, a
  // live indicator read as real-time monitoring to exactly the visitors
  // who care most that there is none.
  title: "The suite at a glance",
  sub: `${SUITE_WORD_CAP} tools · zero uploads · one machine`,
  tools: SUITE.map((tool, i) => ({ no: `Nº ${pad2(i + 1)}`, name: tool.name })),
  /** Real engine lists: src/lib/promptgen/criteria.ts + capycreator/profiles.ts. */
  engines: {
    imagine: [
      { handle: "@gemini" },
      { handle: "@midjourney" },
      { handle: "@flux" },
      { handle: "@sdxl" },
      { handle: "@seedance" },
      { handle: "@runway" },
      { handle: "@kling" },
    ],
    creator: [
      { handle: "@claude" },
      { handle: "@deepseek" },
      { handle: "@gemini" },
      { handle: "@gpt" },
      { handle: "@glm" },
      { handle: "@qwen" },
      { handle: "@hunyuan" },
    ],
  },
} as const;


export const CAPABILITIES = {
  roman: "II.",
  meta: ["Capabilities · Promises", "2 kept by all"],
  label: "Capabilities",
  ix: "· Nº 02",
  // Two promises, not four: the other two cards were features of single tools
  // (CapyWrapped's export, CapyImagine's engines), which their catalog
  // blurbs already describe, and the headline had to hedge to hold them.
  headline: [
    { text: "Two promises " },
    { text: "every", em: true },
    { text: " tool keeps" },
  ] as Headline,
  lead: "The architecture is the privacy policy. Each tool is small enough to read in one sitting and quiet enough to leave open all day.",
  ribbon: "CAPYTOOLS · CAPABILITIES MATRIX",
  cards: [
    {
      num: "01",
      tag: "Every tool",
      icon: "browser",
      title: ["Runs on", "your machine"],
      copy: "Browser tools compute in this tab; two fetch public data through a route that stores nothing. CapyExpense runs on your desktop.",
    },
    {
      num: "02",
      tag: "Every tool",
      icon: "privacy",
      title: ["Keeps nothing", "of yours"],
      copy: "No signup, no cookies, no account. Browser memory stays in localStorage; CapyExpense keeps its files on your disk, never ours.",
    },
  ],
  /** Don't take the cards' word for it. */
  check: {
    lead: "Check it yourself:",
    text: "open your browser's developer tools on the Network tab, then type into the demos at the top of this page. Nothing you type is sent.",
    link: { label: "back to the demos", href: "#proof" },
  },
} as const;

export type LabCategory = "browser" | "desktop";

export const LABS = {
  roman: "III.",
  // ponytail: "coming" = the desktop category, true while CapyExpense is its
  // only member and has no builds; give SUITE a shipped flag when that changes.
  meta: [
    "Labs / Tool Catalog",
    `${countByCategory("browser")} of ${SUITE_INDEX} shipped · ${countByCategory("desktop")} coming`,
  ],
  label: "Labs",
  ix: "· Nº 03",
  headline: [
    { text: `${SUITE_WORD_CAP} quiet tools, each one ` },
    { text: "finished", em: true },
    { text: " before the next begins" },
  ] as Headline,
  pills: [
    { id: "all", label: "All", count: SUITE_INDEX },
    { id: "browser", label: "Browser", count: pad2(countByCategory("browser")) },
    { id: "desktop", label: "Desktop", count: pad2(countByCategory("desktop")) },
  ] as { id: "all" | LabCategory; label: string; count: string }[],
  residence: {
    ring: SUITE_INDEX,
    title: "Tools in residence",
    sub: [`one suite, ${SUITE_WORD} small rooms,`, "no lobby, no queue"],
  },
  foot: `${SUITE_INDEX} / ${SUITE_INDEX} TOOLS`,
  /** Promises the whole suite, so it opens the index — not one tool. */
  cta: `See all ${SUITE_WORD} tools`,
  tools: SUITE.map((tool, i) => ({
    badge: tool.badge,
    no: `Nº ${pad2(i + 1)}`,
    name: tool.name,
    blurb: tool.blurb,
    href: tool.href,
    cat: tool.cat,
    plate: tool.plate,
  })),
} as const;

export const METHOD = {
  roman: "IV.",
  meta: ["Method / House Rules", "04 steps, always"],
  label: "Method",
  ix: "· Nº 04",
  headline: [
    { text: "Arrive, compute, " },
    { text: "forget", em: true },
    { text: ", keep" },
  ] as Headline,
  aside:
    "Every tool follows the same house rules — settled on arrival, silent about you, generous on the way out.",
  foot: "Small files. Quiet loops. Honest promises.",
  steps: [
    {
      num: "01",
      title: "Arrive",
      arrow: true,
      copy: "Open a tab and the tool is already settled. No account, no cookie banner, no onboarding tour.",
      plate: { src: "/plates/method-1.webp", width: 816, height: 816 },
    },
    {
      num: "02",
      title: "Compute",
      arrow: true,
      copy: "Your files and text are processed in your browser. No uploads, no queue.",
      plate: { src: "/plates/method-2.webp", width: 816, height: 816 },
    },
    {
      num: "03",
      title: "Forget",
      arrow: true,
      copy: "CapyStrip helps photos forget their metadata; the suite forgets you the moment the tab closes.",
      plate: { src: "/plates/method-3.webp", width: 816, height: 816 },
    },
    {
      num: "04",
      title: "Keep",
      arrow: false,
      copy: "Download the PNG, keep the file. Desktop tools state their own promise: stored on your machine, never ours.",
      plate: { src: "/plates/method-4.webp", width: 1024, height: 1024 },
    },
  ],
} as const;


export const COLOPHON = {
  roman: "V.",
  meta: ["Colophon / First Line", "Quoted verbatim"],
  label: "From the first line",
  ix: "· Nº 05",
  // A verbatim quote from the project README, so the count in it is NOT derived
  // — "eleven" here is a quotation, and tests/landing.test.tsx asserts this
  // string against the README itself so the two cannot drift apart silently.
  quote: [
    { text: "“A home for " },
    { text: "small, quiet tools.", em: true },
    { text: " Eleven so far. Ten run in your browser and keep nothing; one lives on your desktop and keeps your files there.”" },
  ] as Headline,
  author: {
    name: "Capytools, README",
    sub: "First line, quoted verbatim",
  },
  readMore: { label: "Read the notes", href: "/notes" },
} as const;

export const CTA = {
  roman: "VI.",
  meta: ["Contact / Open Tabs", "One click, no signup"],
  label: "Begin quietly",
  ix: "· Nº 06",
  headline: [
    { text: "Your data stays " },
    { text: "yours", em: true },
    { text: ", your tools stay " },
    { text: "calm", em: true },
  ] as Headline,
  lead: "Open any tool in a browser tab and simply start — no account, no cookie banner, no setup. CapyExpense lives on your desktop and your disk, never ours.",
  primary: { label: `See all ${SUITE_WORD} tools`, href: "/tools" },
  secondary: { label: "Open an issue", href: "/notes#issues" },
  foot: ["No account needed", "v0.1.0 / Apache-2.0"],
  ribbon: "CAPYTOOLS · FIN.",
  plate: { src: "/plates/cta.webp", width: 1024, height: 1024 },
} as const;

export const LANDING_FOOTER = {
  blurb: `Calm little tools that run on your machine and keep nothing. Named after the capybara — calm, unhurried, at home in any water. Suite of ${SUITE_WORD}, Apache-licensed, version 0.1.0.`,
  getExpense: {
    label: "CapyExpense, soon",
    sub: "Desktop · writes only to your disk",
    href: "/capyexpense",
  },
  columns: [
    {
      title: "Suite",
      links: SUITE.map((tool) => ({ label: tool.name, href: tool.href })),
    },
    {
      title: "Project",
      links: [
        { label: "Project notes", href: "/notes" },
        { label: "Apache License", href: "/license" },
        { label: "Design notes", href: "/design" },
        { label: "Issues", href: "/notes#issues" },
      ],
    },
    {
      title: "On this page",
      links: [
        { label: "Try it here", href: "#proof" },
        { label: `${SUITE_WORD_CAP} tools`, href: "#labs" },
        { label: "House rules", href: "#method" },
        { label: "From the README", href: "#readme" },
      ],
    },
  ],
  status: [
    `Capytools · Apache-2.0 · 2026 / Vol. 01 / Issue Nº ${SUITE_INDEX}`,
    "In your browser",
    "♥ MMXXVI",
  ],
  mega: [
    { text: "Quiet by " },
    { text: "default", em: true },
  ] as Headline,
} as const;

/** The plates the page ships, for the asset-existence test. */
export const PLATES = [
  "hero",
  "capabilities",
  "cta",
  "testimonial",
  "lab-1",
  "lab-2",
  "lab-3",
  "lab-4",
  "lab-5",
  "lab-6",
  "lab-7",
  "lab-8",
  "lab-9",
  "method-1",
  "method-2",
  "method-3",
  "method-4",
] as const;

export const HERO_PLATE = { src: "/plates/hero.webp", width: 1024, height: 1024 };
export const CAPABILITIES_PLATE = {
  src: "/plates/capabilities.webp",
  width: 1024,
  height: 1024,
};
export const TESTIMONIAL_PLATE = {
  src: "/plates/testimonial.webp",
  width: 1024,
  height: 1024,
};
