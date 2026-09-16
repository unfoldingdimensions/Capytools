# Capytools

A home for small, quiet tools. Eleven so far. All run in your browser and keep nothing.

**[capytools.vercel.app](https://capytools.vercel.app)**

No signup, no cookie banner, no onboarding tour. Open a tool, use it, close the tab.

## House rules

1. **Arrive** — no account, no cookie banner, no onboarding tour.
2. **Compute** — every byte is processed in your browser.
3. **Forget** — the suite forgets you the moment the tab closes.
4. **Keep** — download the file. Desktop tools keep it on your disk.

## 1. CapyWrapped

Your GitHub year, wrapped in a calm little card. Named after the capybara.

Paste a GitHub username and you get a card showing:
- **Total public contributions** for the year
- **A trendline** of the year, month by month, with your busiest month marked
- **Stars** earned across your repositories
- **Your top languages**, and your most-starred repo

Download it as a PNG, or post it straight to X. Wide and square formats, light and dark. No signup, no cookies, nothing stored.

## 2. CapyImagine

Random image and video prompts, tuned in your engine's dialect (Gemini, Midjourney, Flux, SDXL, Kling, Runway, Seedance).

- Tuned aspect ratios, platform destination frames, living-artist filters, and engine-specific negative clauses.
- Completely client-side generation.

## 3. CapyCreator

Model-aware prompt engineering, scaled for flash and frontier models (Claude, DeepSeek, Gemini, GLM, GPT, Hunyuan, Qwen).

- **Intent Elucidation**: Interrogates vague asks with a task-type-aware questionnaire whose required depth scales with model capability tier (flash models require rigid constraints; frontier models skip them).
- **Capability-Scaled Assembly**: Injects role, numbered steps, negative constraints, and output schema for small models; stays intent-first for reasoning/frontier models.
- **Multi-Provider LLM Polish**: Optional polishing pass supporting OpenCode-Go, OpenRouter, Nous Portal, Command Code, and custom OpenAI-compatible endpoints with API keys saved locally in your browser.

## 4. CapyStrip

Your photos talk. This one helps them forget.

Drop, paste or pick a photo and CapyStrip reads everything the file carries — GPS coordinates, device make/model/serials, timestamps, editing software, and AI-generation fingerprints (IPTC digital-source declarations, Stable Diffusion prompts, ComfyUI/NovelAI recipes, C2PA content credentials) — then decodes and re-encodes the image through a canvas so no metadata survives, and re-scans its own output to prove it. Full reports for HEIC and TIFF. Your photo never leaves this tab.

## 5. CapyExpense

A local-first expense dashboard that reads a spreadsheet you type into yourself. The suite's documented desktop exception: a Tauri app with no network code that writes only to your own disk — stored on your machine, never ours. Everything else in the suite still runs 100% in your browser.

## 6. CapyOG

A card worth sharing. Compose Open Graph images and social cards right in the browser: four templates, six size presets from the 1200×630 link card to Pinterest's 1000×1500 pin, four accents, light and dark.

- **Honest sizes**: each preset carries what the platform actually documents (X crops to 2:1, LinkedIn needs ≥1200×627, Facebook accepts ≤8 MB) — not the folklore.
- **What you see is what exports**: the preview is the card at its canonical pixel size, scaled to fit; the download captures a full-size copy of those exact pixels.
- **Export your way**: PNG at 1×/2×/3×, JPEG with a quality slider, or copy the image straight to the clipboard for a paste into any composer.

No server route renders your card, nothing is uploaded, nothing is stored.

## 7. CapyQR

A code worth scanning. Compose styled QR codes right in the browser: link and text, Wi-Fi with spec-exact escaping, vCard contacts, and mailto — styled with dot shapes, corner treatments, colors, gradients, a quiet-zone slider and a center logo. Five Capy presets get you started.

- **Proved, not promised**: the tool scans its own output in-tab before you export and shows what decoded, next to a "verified scannable" chip.
- **Honest guards**: WCAG-style contrast, quiet zone measured in modules, payload capacity and logo-size notes — heuristics labeled as heuristics.
- **Export your way**: PNG or JPEG at 512–2048 px, or vector SVG when no logo is set.

No server route shortens or tracks your codes, nothing is uploaded, nothing is stored.

## 8. CapyResize

Every size it needs to be. Drop one image and either dial a target width or generate the whole favicon pack, right in the browser.

- **Resize & convert**: target width with an aspect lock, PNG/JPEG/WebP output, a quality slider, and JPEG alpha flattening onto a color you pick. Downscales go through progressive halving — repeated ~50% steps, the technique production tools ship — so fine lines survive.
- **Favicon pack**: one square-ish logo in, a ZIP out — `favicon.ico` (16/32/48, PNG frames), `apple-touch-icon.png` (180), the 192 and 512 icons Chrome's install criteria name, a separate maskable 512 with the art inside the 40% safe zone, `manifest.webmanifest`, and the exact four-line `<head>` snippet.
- **Proof before you ship**: honest before/after byte counts that only appear after real encoding, a 16/32 px strip showing whether your logo survives the tab, and notes that say what actually happened — animated GIFs take their first frame, and Safari's silent WebP-to-PNG fallback is named, not hidden.

No server route resizes anything, nothing is uploaded, nothing is stored.

## 9. CapyToken

Count before you spend. Paste the prompt you are about to send and CapyToken counts it exactly under both OpenAI encodings — `o200k_base` (GPT-5/4o era) and `cl100k_base` (GPT-4 era) — then prices it across a curated rate card of chat models: GPT-5.x and o-series, Claude, Gemini, Grok, DeepSeek, Llama 4, Qwen and Mistral.

- **Exact where exact exists**: the counts come from real BPE ranks, loaded lazily on first count; OpenAI's own rule-of-thumb (chars ÷ 4, words × ¾) sits beside them as the cross-check, and an optional +6 toggle adds per-message chat framing.
- **Honest where nothing is exact**: Claude, Gemini and the other non-OpenAI rows wear their label in plain sight — "estimate — OpenAI-tokenizer equivalent, not verified" — with Claude's own docs' ~+30% era note as the only quoted multiplier. Never a folklore number.
- **Costed like you'll be billed**: per-1M rates, input and planned-output costs, a calls-per-dollar read, and context-window bars that turn clay past 80% and name the model when your input won't fit.
- **Dated on purpose**: the rate card carries a "prices verified 2026-09" stamp and the LiteLLM commit it was snapped from — a snapshot you can check, not a promise it can't keep.

No server route counts or prices anything, no key is asked for, nothing is uploaded, nothing is stored.
## 10. CapyPixel

Pictures, in chunks. Drop a photo or an SVG logo and one of six measured styles turns it into pixel art, right in the tab.

- **Six styles, measured presets**: faithful (the image's own colours), portrait (subject separations with dither off, palette bins and an outline), whale (the seven-blue brand ramp with tile gaps), Game Boy (the four greens), 1-bit (solid areas, dither only in transitions) and 1-bit halftone — honestly labelled a halftone, not 1-bit drawing.
- **Honest levers**: grid width, colour count, dither band, black/white points, gamma, outline and auto-levels — each with its explanation on the page. Live preview is capped for interactivity and says so; export always runs your full grid at integer scale, so tiles stay crisp.
- **The maths is ported, not invented**: palette matching in Oklab, contrast-modulated dither, percentile levels and an outline pass — every default benchmarked against a research prototype, with determinism asserted by tests (same image, same bytes, every run).

No server route quantizes anything, nothing is uploaded, nothing is stored.

## 11. CapyTone

Type a feeling, get a poster. Pick a mood pill — or land from a shared link — and a hand-tuned lexicon builds a deterministic five-role palette (field, mid, accent, surface, ink), then renders it as a poster card you can download, copy or tokenise.

- **Constructed, not filtered**: every palette is built to pass the guardrails — WCAG-AA ink-on-field contrast, capped chroma, hue harmony within ±30° — before a pixel is drawn. Same phrase, same seed, same card, forever (FNV-1a seed + mulberry32; no `Math.random()` anywhere in a render path).
- **Honest about its brain**: there is no AI here. 31 hand-tuned mood anchors, six synonyms and 30 start-colour stops across six families — unmatched phrases say so and improvise inside the guardrails instead of pretending to understand.
- **Start from a colour**: "start from warm orange" pins the palette to a real hex — the generated field lands on the tapped colour (±20° hue, ±0.14 lightness, asserted by tests), not merely in its neighbourhood.
- **Posters worth keeping**: two layouts (editorial poster, album-cover minimal), wide and square formats, retina preview and 2× export, seeded film grain, and copy-outs for CSS variables, Tailwind tokens and share text.
- **Generate mode, a second palette family**: pick a base colour and a harmony — complementary, split-complementary, analogous, triadic, tetradic or monochromatic — and hues land exactly on the rule's offsets, chroma is clamped per lightness and hue (culori's CSS-Color-4 gamut search), and the ink still clears 4.5:1. Same base, same rule, same variation, every time. The mood engine's ±30° spread rule deliberately does not apply here: a complementary pair is 180° apart by definition.
- **Check mode, both rulers**: the WCAG 2.x ratio — the conformance standard, with AA/AAA verdicts per text size — beside APCA 0.1.9 Lc, which is guidance, a candidate standard, not a law; the labels say exactly that, polarity included. The card's own ink-on-field pair is one tap away.
- **Blend mode, gradients that say how they blend**: two or three stops in linear, radial or conic shape, interpolated in oklab, oklch, oklch with the longer hue arc, or srgb — emitted as the modern `in`-syntax string plus a dense hex-stop fallback that samples the same ramp for engines that would drop the declaration.
- **Extract mode, a website's palette, read honestly**: paste a public page and CapyTone reads its static source — the html, up to five stylesheets, declared theme colours and manifest — ranks the colours it finds, and merges near-duplicates by CIEDE2000. The fetch is guarded end to end (DNS validated against reserved ranges on every redirect hop, byte-capped, time-boxed), nothing is stored, and the copy admits the gap: colours painted by JavaScript are invisible to it.

Colour math runs on [culori](https://github.com/Evercoder/culori) (ISC); contrast guidance uses [apca-w3](https://github.com/Myndex/apca-w3) 0.1.9 (Andrew Somers, Limited W3 License — used for web-content accessibility guidance, polarity preserved as its license requires); extraction parses CSS with [css-tree](https://github.com/csstree/csstree) (MIT) and fetches through [request-filtering-agent](https://github.com/azu/request-filtering-agent) (MIT).

No server route resolves a mood — the palette engine never touches a server. The one exception is Extract's `/api/extract-palette`, which fetches exactly the public URL you hand it, refuses private address ranges before and during the fetch, and returns counts and hexes while keeping nothing.

## Privacy

Nothing you type, drop or upload into a tool leaves the tab. There is no account to make and no database to leak.

The one documented exception is CapyTone's Extract mode: the address you paste is fetched by the site's server (through the guarded route described in CapyTone's section) so it can read the page's colours on your behalf. Only counts and hexes come back — the fetched content is never stored, logged, or echoed.

Vercel's cookieless analytics counts page views and load times for the site itself. It sees none of your file.

## Contributing

Bug reports and pull requests are welcome — start with [CONTRIBUTING.md](CONTRIBUTING.md), which covers the promise each tool keeps, the design system, and how to add a tool.

Found something broken? [Open an issue](https://github.com/unfoldingdimensions/Capytools/issues) with the tool name and what you expected.

## License

[Apache-2.0](LICENSE). Copyright 2026 unfoldingdimensions.
