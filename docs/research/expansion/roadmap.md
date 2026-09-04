# Capytools Expansion Roadmap (Research Brief)

*Researched 2026-09-05. Companion citation ledger: [`roadmap.sources.json`](./roadmap.sources.json) — inline `[n]` keys resolve there.*

**Question:** what do we build next on top of CapyWrapped / CapyImagine / CapyCreator, optimized for
(a) easy 100%-client-side builds, (b) real market demand, (c) a monetization path that never breaks the
"no signup, no cookies, nothing stored" ethos?

---

## 1. Where the codebase stands

### The three shipped tools

| Tool | What it is | State | Reusable asset it contributed |
|---|---|---|---|
| **CapyWrapped** (`/capywrapped`) | GitHub year-recap share card. GitHub API + two thin server proxies (`/api/contributions`, `/api/languages`), client-side stats (`src/lib/github/stats.ts`), Satori-compatible card pipeline (`card/CardArt|CardScaled|CardComposer`), PNG export via `html-to-image`, share pages at `/u/[username]` with OG images (`/api/og/[username]`). | Complete, committed | The **share-card engine**: canonical-size render + CSS scale, Satori-safe styling, static/live sparkline, font pipeline, export. |
| **CapyImagine** (`/capyimagine`) | Zero-network random prompt generator; one pick-set formatted into 5 engine dialects (Gemini, Midjourney, Flux, SDXL, Video). Backed by a hand-maintained ~808-option criteria layer (`src/lib/promptgen/criteria.ts`) with cited research in `docs/research/prompt-generator/`. | Complete, committed | The **research methodology**: parallel briefs + `.sources.json` ledgers + citation-verification gate. Per-engine AI knowledge (negatives, ratios, living-artist policy). |
| **CapyCreator** (`/capycreator`) | Model-aware prompt engineer. 7 model families with capability tiers 1–5 (`src/lib/capycreator/profiles.ts`), 7-dimension intent questionnaire, tier-scaled assembly, multi-provider LLM polish (`src/lib/capycreator/polish.ts`). | Complete but **uncommitted** (commit first) | The **LLM polish layer**: 5 provider presets (OpenCode-Go, OpenRouter, Nous Portal, Cohere, custom OpenAI-compatible), BYO keys in localStorage, `stripThinkingTags`, connection test. Tool-agnostic except its storage key — extract to `src/lib/capytools/llm.ts`. |

### Adding a tool is a solved recipe (per AGENTS.md)

1. Pure TS lib in `src/lib/<name>/`.
2. `"use client"` component in `src/components/tool/<ToolName>.tsx`.
3. Page at `src/app/capy<name>/page.tsx` (copy the CapyImagine page shape; eyebrow `Capy<Name> · tool no. N`).
4. Register in `TOOLS` in `src/app/page.tsx` **and** `src/components/header.tsx`; bump the hero count sentence.
5. `tests/<name>.test.ts` (plus a Satori render test if the tool builds card art).
6. Optional: extract/share the polish layer for any LLM-flavored tool.

**Key constraint insight:** only CapyWrapped needs server routes (CORS proxies + OG). Consumer file/image/color
tools need **zero** backend — which is exactly the market's favorite claim.

---

## 2. Three load-bearing market findings

**2.1 The "collection of client-side tools" category is proven — but unbranded.**
[it-tools](https://github.com/CorentinTh/it-tools) — a Vue collection of small no-backend dev tools — has
**~40.5k GitHub stars** [18] with no brand, mascot, or monetization. Excalidraw (131k) [19], tldraw (50k) [20]
and DiceBear avatars (9.5k) [21] prove appetite for zero-signup in-browser utilities. Nobody owns this category
*with a memorable brand + freemium layer*. That is Capytools' wedge.

**2.2 "100% in-browser" flipped from implementation detail to headline.**
Stirling-PDF (local, no-upload PDF processing) hit **91.3k stars** [2]. A 2025 crop of EXIF removers
(exifremover.com [22], PrivacyStrip [23], Scanly [24]) competes purely on "your files never leave your
device". Mainstream outlets now warn users off upload-based tools: How-To Geek on iLovePDF [36], recurring
Reddit unease about uploading confidential PDFs [33][34], the viral iLovePDF-privacy joke on r/IndiaTech [35],
and devs showcasing "client-side, no file upload" as the entire pitch [37]. The privacy complaints about the
incumbents are loud and mainstream — our architecture *is* the marketing.

**2.3 Free tools monetize without accounts.**
- **TypingMind** (BYO API key, no account, one-time license): **$22K in 7 days** [42], **$500K+ in a year** [43].
- **Photopea** (free tool, ads + premium): **~$3M/yr at ~1M daily users** [52]; monetization came years after traction [49][50][51].
- **remove.bg**: free low-res preview, paid HD → acquired by Canva (2021) [4][44][45].
- **Coolors** (free palette tool): 2M+ daily users, freemium Pro [12][13].
- **ME-QR** (free QR generator): reportedly **millions/yr** from premium tiers [5].

The no-signup promise is not a monetization blocker — it forces monetizing *quality, convenience, and calm*
instead of user data, which is a differentiator.

---

## 3. Candidate tools (ranked)

Scores are ease-of-client-build × demand-evidence. Existing tools occupy nos. 1–3; numbering continues.

| No. | Tool | Effort | Demand anchor | Monetization hook |
|---|---|---|---|---|
| 4 | **CapyStrip** — EXIF/metadata viewer + stripper | Easy (1–2 days) | GPS-leak fear [25]; 2025 competitor crop [22][23][24]; mainstream privacy panic [33–36] | Batch mode as one-time Pro |
| 5 | **CapyOG** — social/OG image generator | Easy–Med | Satori 13.9k stars [91]; proven category; shareable output = viral loop | Template packs (Gumroad) |
| 6 | **CapyQR** — styled QR generator | Easy | ME-QR earns millions/yr [5]; qr-code-styling lib [6] | Logo embed, hi-res SVG, bulk CSV→QR as Pro |
| 7 | **CapyPalette + CapyContrast** | Easy | Coolors: 2M+ daily users, freemium Pro [12][13] | Export packs (Tailwind/ASE/Figma tokens); contrast checker = own SEO page |
| 8 | **CapyResize + CapyFavicon** | Easy | TinyPNG 5.89M visits/mo [58]; Squoosh proves client-side viability [3] | Batch mode Pro; platform-icon ZIP packs |
| 9 | **CapyToken** — offline LLM token counter + cost calculator | Easy–Med | ~80% LLM price drop 2025→26 fueling cost-tool demand [29]; incumbents are server-y [30–32] | Funnel to CapyImagine; sponsor slot later |
| 10 | **CapyCron + CapyForge** mini-tools (JWT decode, hash, base64) | Very easy | crontab.guru single-page dominance; it-tools 40.5k stars [18] | Low ceiling — SEO/star fuel |
| 11 | **CapyStreak** — year-round GitHub stat/streak cards | Easy | github-readme-stats 79.8k [14] + streak-stats 7.1k stars [16] | Custom themes Pro; keeps Wrapped warm off-season |
| 12 | **CapyInvoice** — client-side invoice generator | Medium | Indie invoice tools at $9–$2k+/mo [8][9][10]; SERP full of paywall traps [10]; invoices = data people hate uploading | **Strongest direct play**: one-time Pro = saved clients, branding, recurring presets |

### Per-tool detail

**No. 4 — CapyStrip (EXIF viewer & stripper).** Drop a photo → a card shows everything the file carries
(GPS coordinates, device, timestamps, software, AI-generation tags) → download the cleaned re-encode.
Build: `exifr` (client-side parser) + canvas re-encode. Zero server routes, zero network. The GPS-leak fear
is the hook [25] and every existing competitor's entire marketing is the privacy claim we get for free [22–24].
Brand-perfect story for social content ("your phone is snitching on you"). Pro (one-time license): batch mode.

**No. 5 — CapyOG (social card generator).** Template-based card editor → 1200×630 PNG. We already built
~60% of it: Satori-compatible CardArt, canonical-size rendering, html-to-image export, Google-font pipeline
(all from CapyWrapped). Monetize via Gumroad template packs; output stays free (shareable outputs are the
growth loop).

**No. 6 — CapyQR (styled QR generator).** Styled QR with brand colors, logo embedding, capybara frame
modules; SVG/PNG export; bulk CSV→QR. `qr-code-styling` (2.9k stars) does client-side rendering [6].
ME-QR is the existence proof that free QR generators mint money via premium tiers [5]. Pro: logo embed,
hi-res SVG, bulk mode.

**No. 7 — CapyPalette + CapyContrast.** Palette generator + extractor-from-image (canvas quantization);
sibling WCAG contrast checker sharing the same color lib. Coolors proves both demand (2M+ daily) and the
freemium template [12][13]; competitors market $29 lifetime against Coolors' subscription [46]. Pro:
export-format packs + curated palette packs on Gumroad. The contrast checker is its own evergreen
accessibility SEO page.

**No. 8 — CapyResize + CapyFavicon.** Bulk resize + PNG↔WebP↔AVIF conversion (canvas/OffscreenCanvas);
favicon/app-icon generator emitting the full platform-size ZIP (`zip.js`). TinyPNG-scale demand [58];
Squoosh (25.8k stars) proves the client-side approach works at quality [3]. Pro: batch mode.

**No. 9 — CapyToken (offline LLM cost calculator).** Paste text → token estimate + cost across model price
table; fully offline, no account. Demand driven by the ~80% collapse in LLM API prices [29]; existing
calculators (llm-prices.com [30], Helicone [31], PricePerToken [32]) are server-rendered and crowded — the
BYO-key/offline angle matches CapyImagine's positioning and reuses its per-engine research posture. Doubles
as a funnel into CapyImagine. Needs the polish layer extracted to `src/lib/capytools/llm.ts` first if we add
a live "count my real prompt" mode.

**No. 10 — CapyCron + CapyForge (JWT decode, hash, base64, UUID).** Each mini-tool is one SEO page sharing
one shell. crontab.guru dominates its niche from a single page; it-tools' 40.5k stars [18] proves dev-tool
collections earn attention. Low monetization ceiling — these exist for search surface and GitHub stars.

**No. 11 — CapyStreak (year-round GitHub cards).** Same data layer, cache, and card engine as CapyWrapped;
new card layouts (streak, activity, language mix) usable all year instead of just December. Ecosystem proof:
github-readme-stats 79.8k [14], streak-stats 7.1k [16], profile generators 4.5k [17]. The "Wrapped" playbook
is famously viral but seasonal [26][92]; clones keep spawning every year [27][93][94][28]. Pro: custom themes.

**No. 12 — CapyInvoice (the revenue wedge).** Client-side invoice generator: line items, localStorage
clients/templates, PDF export (`pdf-lib`/`jsPDF`). Invoices are exactly the data category people refuse to
upload [33][34], and the "free invoice generator" SERP is a graveyard of paywalls — a gap indie makers
exploit repeatedly [8][9][10]; even Shopify uses free generators as lead-gen [11]. **Deliberately built
last**: it is the first tool where users have money-adjacent intent, so the one-time Pro upgrade (saved
client library, logo/branding, recurring presets, multi-currency templates) attaches realistically — but it
should launch into existing traffic, not carry the burden of creating it. TypingMind's license-key model
[42][43] is the pattern to copy.

### Explicitly deferred (not recommended now)

- **Background removal** — huge demand, real exits [4], but requires a heavy WASM/ONNX model; not an easy build.
- **Client-side PDF merge/split** — the single biggest demand pool (iLovePDF ~250M visits/mo [1];
  Stirling-PDF 91k stars [2]) and the best long-term "files never leave your browser" attack [33–37], but a
  medium-heavy pdf-lib/WASM build. Strong phase-2 candidate.
- **Password generator** — evergreen demand, trivial build, no differentiation, no monetization ceiling.

---

## 4. Monetization roadmap (phased, ethos-safe)

Ranked models by fit with "no signup, no cookies, nothing stored":

1. **One-time license-key Pro** (batch modes, hi-res/template exports). All client-side features → zero infra
   cost, zero promise broken. TypingMind: $22K week one [42], $500K/yr [43]. remove.bg's free-preview/pay-HD
   boundary carried it to acquisition [44][45][4]. Sell via Gumroad/Lemon Squeezy; key in localStorage.
2. **Digital packs / presets (Gumroad, "name your price")** — palette packs, OG-card template kits, mascot
   sticker packs. Price points $9–47; Easlo built $239K+ on Notion templates alone [47][48].
3. **Cookieless ads + one-time "remove ads forever" — only at scale.** Mediavine needs ~50K sessions/mo,
   Raptive ~100K pageviews [53][54]; premium RPMs $15–50 [55][56]; cookieless networks (EthicalAds/Carbon)
   work earlier at $3–8 RPM. Photopea's ~$8 blended RPM → $3M/yr is the ceiling at massive scale [52].
   **Never** cookied networks — that single move would break the brand.

**Avoid:** account-based subscriptions (Excalidraw+/Coolors-style — needs auth, contradicts ethos) [13][66];
open-core SaaS (Cal.com needed ~$32M and still went closed-source) [60][61]; desktop apps (He3/TinyPNG show
weak solo ROI) [72][73][57]; paid APIs (only if developers ask — TinyPNG's Tinify API is the template [57]);
affiliate (garnish only, ethos risk) [74–76]; sponsorware (works, but needs an existing audience — Porzio's
numbers came with 10K followers) [67][68].

| Phase | Traffic (visits/mo) | Action | Realistic revenue |
|---|---|---|---|
| 0 Build | 0–10K | Ship tools 4–10 free; programmatic-SEO landing copy per tool; Show HN/PH per finished tool; mascot content. No monetization. | $0 |
| 1 Prove | 10–50K | Gumroad packs + one-time Pro license on the 2–3 traffic-winning tools (the 80% rule). | $50–500/mo |
| 2 Scale | 50K+ sessions | Cookieless/premium ads + "remove ads forever" one-time. | $750–4K+/mo |
| 3 Compound | 500K+ | Photopea math; consider API only on developer pull. | $5K–50K+/mo |

---

## 5. Traction playbook (evidence)

- **Programmatic SEO is the engine.** Each tool page targets a keyword ("remove exif data", "og image
  generator", "qr code with logo"). Case studies: +398% organic in 18 months [38]; Zapier's free-tools pages
  are the canonical example [39]; 0→200K monthly organic claims [40]; a 29-tool client-side site built in
  public targeting 50K visits/mo by month 6 (aspirational, cited for the playbook shape, not proof) [78];
  an IH AMA claiming 300–500K organic visits/mo within 12 months on programmatic pages [79]. Expect
  compounding over 6–12 months; watch near-duplicate cannibalization [90].
- **80% of traffic lands on 2–3 tools** regardless of catalog size [78] — ship broad, double down on winners.
- **Launch spikes are real but unreliable.** Show HN: 3.5K–43K visitors when it works, ~90% of posts flop [80].
  Plausible's HN week beat its prior 15 months combined [81][82][83][84] — and Plausible is the strategic
  template: bootstrapped to $1M ARR on "privacy-first alternative" SEO + open source, no paid ads [82][84].
- **The mascot is an underused growth lever.** Duolingo's character strategy is credited with 4.5× DAU growth
  and massive organic reach [86][87][88]; virtually no tool site has a character. CapyMark/CapyScene are
  already scaffolding for this.
- **Collections earn stars; hero tools earn money.** it-tools (40.5k stars, ~$0) [18] vs Photopea ($3M/yr,
  one tool) [52]. Capytools' synthesis: collection for SEO breadth + hero tools (Invoice, QR, OG) for revenue.
- **Timeline calibration:** median indie project ~$500/mo [89]; only ~5% exceed ~$8.3K/mo [77]; one maker:
  $115K over 4 years across 26 projects [41]. Photopea took ~5 years to its first dollar [49]. Plan on
  12–18 months to meaningful revenue.

---

## 6. Recommended build order

1. **CapyStrip** (no. 4) — easiest build, purest brand fit, zero routes.
2. **CapyOG** (no. 5) — maximal infra reuse (Wrapped card engine).
3. **CapyQR** (no. 6) → **CapyPalette + CapyContrast** (no. 7) → **CapyResize/Favicon** (no. 8) — the SEO workhorse cluster.
4. **CapyCron/Forge** (no. 10) + **CapyToken** (no. 9) — dev surface; extract `polish.ts` → `src/lib/capytools/llm.ts` before CapyToken.
5. **CapyStreak** (no. 11) — milks the Wrapped asset year-round.
6. **CapyInvoice** (no. 12) — the revenue wedge, launched into existing traffic.

Monetization switches on per §4 Phase 1, not before.

---

## 7. Accuracy notes

- ME-QR revenue and Coolors "2M+ daily" are vendor/press claims, not audited numbers [5][12].
- ToolMansion's "50K visits by month 6" is a stated goal, not a result [78]; the IH 300–500K AMA is self-reported [79].
- remove.bg's acquisition price was never disclosed [4].
- Cookieless network RPMs are category examples; verify current rates before committing to ads [55][56].
- Median/percentile indie revenue stats are directional [77][89] — plan for the median, not the outliers.
- GitHub star counts were queried 2026-09-05 and drift daily.
