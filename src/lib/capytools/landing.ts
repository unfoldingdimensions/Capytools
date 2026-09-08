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
 * - The export linked back to capytools.vercel.app from the site itself, and
 *   out to GitHub for project meta; every link here now routes natively
 *   (/notes, /design, /license are real pages). The landing renders zero
 *   external hrefs — only the /notes page links out, for contributions.
 * - Editorial-lite: side rails, FIG/coordinate annotations, pagination
 *   counters, the hero index and the inert work arrows did not survive
 *   the port.
 */

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

export const HERO = {
  label: "Calm little tool suite",
  ix: "· Nº 05",
  headline: [
    { text: "Calm " },
    { text: "little tools", em: true },
    { text: ", quiet by " },
    { text: "default", em: true },
  ] as Headline,
  lead: "Five small tools — CapyWrapped, CapyImagine, CapyCreator, CapyStrip and CapyExpense — that run entirely in your browser and keep nothing. No signup, no cookies, no telemetry, no server. Named after the capybara: calm, unhurried, at home anywhere.",
  primary: { label: "Open the tools", href: "#labs" },
  secondary: { label: "CapyExpense desktop", href: "/capyexpense" },
  stats: [
    { value: "05", label: "tools", sub: "in the suite", tone: "solid" },
    { value: "0", label: "bytes", sub: "stored by us", tone: "plain" },
    { value: "100%", label: "client-side", sub: "no uploads", tone: "clay" },
  ] as { value: string; label: string; sub: string; tone: string }[],
  meta: "↳ one quiet tab · nothing leaves it",
} as const;

export const WIRE = {
  title: "The suite, live",
  sub: "Five tools · zero servers · one tab",
  tools: [
    { no: "Nº 01", name: "CapyWrapped" },
    { no: "Nº 02", name: "CapyImagine" },
    { no: "Nº 03", name: "CapyCreator" },
    { no: "Nº 04", name: "CapyStrip" },
    { no: "Nº 05", name: "CapyExpense" },
  ],
  /** Real engine lists: src/lib/promptgen/criteria.ts + capycreator/profiles.ts. */
  engines: {
    imagine: [
      { handle: "@gemini", href: "/capyimagine" },
      { handle: "@midjourney", href: "/capyimagine" },
      { handle: "@flux", href: "/capyimagine" },
      { handle: "@sdxl", href: "/capyimagine" },
      { handle: "@seedance", href: "/capyimagine" },
      { handle: "@runway", href: "/capyimagine" },
      { handle: "@kling", href: "/capyimagine" },
    ],
    creator: [
      { handle: "@claude", href: "/capycreator" },
      { handle: "@deepseek", href: "/capycreator" },
      { handle: "@gemini", href: "/capycreator" },
      { handle: "@gpt", href: "/capycreator" },
      { handle: "@glm", href: "/capycreator" },
      { handle: "@qwen", href: "/capycreator" },
      { handle: "@hunyuan", href: "/capycreator" },
    ],
  },
} as const;

export const ABOUT = {
  roman: "II.",
  meta: ["About / Manifesto", "Capytools / Volume 01"],
  label: "About the suite",
  ix: "· Nº 02",
  headline: [
    { text: "Settled like a " },
    { text: "capybara", em: true },
    { text: " in " },
    { text: "warm water", em: true },
  ] as Headline,
  lead: "Everything runs 100% in your browser — the one documented exception is CapyExpense, a desktop app that writes only to your own disk. Where a tool needs memory it uses localStorage, and nothing else exists to store.",
  cta: { label: "Read the design notes", href: "/design" },
  footer: "No signup · No cookies · No telemetry · No server",
  sideNote:
    "Every tool states its own promise — browser tools keep nothing, desktop tools keep it on your machine.",
  caption: ["Studies in quiet software.", "(Capytools, MMXXVI)"],
  plate: { src: "/plates/about.webp", width: 1024, height: 1024 },
} as const;

export const CAPABILITIES = {
  roman: "III.",
  meta: ["Capabilities · Promises", "4 held by all"],
  label: "Capabilities",
  ix: "· Nº 03",
  headline: [
    { text: "Four promises, held by " },
    { text: "every", em: true },
    { text: " tool in the suite" },
  ] as Headline,
  lead: "The architecture is the privacy policy. Each tool is small enough to read in one sitting and quiet enough to leave open all day.",
  ribbon: "CAPYTOOLS · CAPABILITIES MATRIX",
  cards: [
    {
      num: "01",
      tag: "Browser",
      icon: "browser",
      title: ["Runs in", "your tab"],
      copy: "Every computation is client-side. The one documented exception is CapyExpense, a desktop app on your own disk.",
      href: "/capyexpense",
    },
    {
      num: "02",
      tag: "Privacy",
      icon: "privacy",
      title: ["Stores", "nothing"],
      copy: "No signup, no cookies, no telemetry. Where a tool needs memory it stays in localStorage.",
      href: "/capystrip",
    },
    {
      num: "03",
      tag: "Export",
      icon: "export",
      title: ["Take it", "with you"],
      copy: "Wrapped cards download as PNG — wide and square, light and dark — or post straight to X.",
      href: "/capywrapped",
    },
    {
      num: "04",
      tag: "Engines",
      icon: "engines",
      title: ["Speaks your", "dialect"],
      copy: "Prompts tuned per engine — Gemini, Midjourney, Flux, SDXL, Kling, Runway, Seedance.",
      href: "/capyimagine",
    },
  ],
} as const;

export type LabCategory = "browser" | "desktop";

export const LABS = {
  roman: "IV.",
  meta: ["Labs / Tool Catalog", "05 of 05 shipped"],
  label: "Labs",
  ix: "· Nº 04",
  headline: [
    { text: "Five quiet tools, each one " },
    { text: "finished", em: true },
    { text: " before the next begins" },
  ] as Headline,
  pills: [
    { id: "all", label: "All", count: "05" },
    { id: "browser", label: "Browser", count: "04" },
    { id: "desktop", label: "Desktop", count: "01" },
  ] as { id: "all" | LabCategory; label: string; count: string }[],
  residence: {
    ring: "05",
    title: "Tools in residence",
    sub: ["one suite, five small rooms,", "no lobby, no queue"],
  },
  foot: "05 / 05 TOOLS",
  tools: [
    {
      badge: "Wrapped",
      no: "Nº 01",
      year: "2026",
      name: "CapyWrapped",
      blurb:
        "Your GitHub year in a calm little card — contributions, a month-by-month trendline, stars and top languages.",
      href: "/capywrapped",
      cat: "browser" as LabCategory,
      plate: { src: "/plates/lab-1.webp", width: 896, height: 1200 },
    },
    {
      badge: "Imagine",
      no: "Nº 02",
      year: "2026",
      name: "CapyImagine",
      blurb:
        "Random image and video prompts, tuned in your engine's dialect — ratios, frames and negative clauses included.",
      href: "/capyimagine",
      cat: "browser" as LabCategory,
      plate: { src: "/plates/lab-2.webp", width: 896, height: 1200 },
    },
    {
      badge: "Create",
      no: "Nº 03",
      year: "2026",
      name: "CapyCreator",
      blurb:
        "Model-aware prompt engineering scaled from flash to frontier — intent elucidation, assembly, optional polish.",
      href: "/capycreator",
      cat: "browser" as LabCategory,
      plate: { src: "/plates/lab-3.webp", width: 896, height: 1200 },
    },
    {
      badge: "Strip",
      no: "Nº 04",
      year: "2026",
      name: "CapyStrip",
      blurb:
        "Photos talk; this helps them forget. Reads every metadata trail, strips it in-tab, then proves the strip.",
      href: "/capystrip",
      cat: "browser" as LabCategory,
      plate: { src: "/plates/lab-4.webp", width: 896, height: 1200 },
    },
    {
      badge: "Desktop",
      no: "Nº 05",
      year: "2026",
      name: "CapyExpense",
      blurb:
        "The one that lives on your machine — a Tauri desktop app writing only to your own disk.",
      href: "/capyexpense",
      cat: "desktop" as LabCategory,
      plate: { src: "/plates/lab-5.webp", width: 896, height: 1200 },
    },
  ],
} as const;

export const METHOD = {
  roman: "V.",
  meta: ["Method / House Rules", "04 steps, always"],
  label: "Method",
  ix: "· Nº 05",
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
      copy: "Every byte is processed in your browser. No server round-trips, no uploads, no queue.",
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

export const WORK = {
  roman: "VI.",
  meta: ["Selected Tools · 2026", "Edited by Capytools"],
  headline: [
    { text: "Tools that trade noise for " },
    { text: "calm", em: true },
    { text: " and clutter for " },
    { text: "cards", em: true },
  ] as Headline,
  link: { label: "All five tools", href: "#labs" },
  cards: [
    {
      kicker: "Featured tool",
      index: "01 / 05",
      name: "CapyWrapped",
      copy: "Your GitHub year, wrapped in a calm little card — contributions, a month-by-month trendline, stars and top languages. Named after the capybara.",
      href: "/capywrapped",
      meta: ["2026 · BROWSER", "WRAPPED"],
      plate: { src: "/plates/work-1.webp", width: 768, height: 1024 },
    },
    {
      kicker: "Privacy tool",
      index: "04 / 05",
      name: "CapyStrip",
      copy: "Drop, paste or pick a photo. CapyStrip reads GPS, device serials, editing software and AI fingerprints, strips everything in-tab, then re-scans its own output to prove it.",
      href: "/capystrip",
      meta: ["2026 · BROWSER", "STRIP"],
      plate: { src: "/plates/work-2.webp", width: 768, height: 1024 },
    },
  ],
} as const;

export const COLOPHON = {
  roman: "VII.",
  meta: ["Colophon / First Line", "Quoted verbatim"],
  label: "From the first line",
  ix: "· Nº 07",
  quote: [
    { text: "“A home for " },
    { text: "small, quiet tools.", em: true },
    { text: " Five so far. All run in your browser and keep nothing.”" },
  ] as Headline,
  author: {
    initial: "C",
    name: "Capytools, README",
    sub: "First line, quoted verbatim",
  },
  partnersLead: "The whole suite, one glyph each — every tool one click from the last.",
  readMore: { label: "Read the notes", href: "/notes" },
  partners: [
    {
      name: "CapyWrapped",
      small: "GitHub year",
      href: "/capywrapped",
    },
    {
      name: "CapyImagine",
      small: "Prompt roulette",
      href: "/capyimagine",
    },
    {
      name: "CapyCreator",
      small: "Model-aware",
      href: "/capycreator",
    },
    {
      name: "CapyStrip",
      small: "Metadata off",
      href: "/capystrip",
    },
    {
      name: "CapyExpense",
      small: "On your disk",
      href: "/capyexpense",
    },
  ],
} as const;

export const CTA = {
  roman: "VIII.",
  meta: ["Contact / Open Tabs", "One click, no signup"],
  label: "Begin quietly",
  ix: "· Nº 08",
  headline: [
    { text: "Your data stays " },
    { text: "yours", em: true },
    { text: ", your tools stay " },
    { text: "calm", em: true },
  ] as Headline,
  lead: "Open the suite in any browser tab and simply start — no account, no cookie banner, no telemetry. CapyExpense lives on your desktop and your disk, never ours.",
  primary: { label: "Open the suite", href: "#labs" },
  secondary: { label: "Open an issue", href: "/notes#issues" },
  foot: ["● Live", "v0.1.0 / Apache-2.0"],
  ribbon: "CAPYTOOLS · FIN.",
  plate: { src: "/plates/cta.webp", width: 1024, height: 1024 },
} as const;

export const LANDING_FOOTER = {
  blurb:
    "Calm little tools that run entirely in your browser and keep nothing. Named after the capybara — calm, unhurried, at home in any water. Suite of five, Apache-licensed, version 0.1.0.",
  getExpense: {
    label: "Get CapyExpense",
    sub: "Desktop · writes only to your disk",
    href: "/capyexpense",
  },
  columns: [
    {
      title: "Suite",
      links: [
        { label: "CapyWrapped", href: "/capywrapped" },
        { label: "CapyImagine", href: "/capyimagine" },
        { label: "CapyCreator", href: "/capycreator" },
        { label: "CapyStrip", href: "/capystrip" },
        { label: "CapyExpense", href: "/capyexpense" },
      ],
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
      title: "Colophon",
      links: [
        { label: "Five tools", href: "#labs" },
        { label: "House rules", href: "#method" },
        { label: "First line", href: "#testimonial" },
      ],
    },
  ],
  status: ["Capytools · Apache-2.0 · 2026 / Vol. 01 / Issue Nº 05", "In your browser", "♥ MMXXVI"],
  mega: [
    { text: "Quiet by " },
    { text: "default", em: true },
  ] as Headline,
} as const;

/** The plates the page ships, for the asset-existence test. */
export const PLATES = [
  "about",
  "hero",
  "capabilities",
  "cta",
  "testimonial",
  "work-1",
  "work-2",
  "lab-1",
  "lab-2",
  "lab-3",
  "lab-4",
  "lab-5",
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
