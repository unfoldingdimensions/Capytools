# Capytools

A home for small, quiet tools. Six so far. All run in your browser and keep nothing.

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

## Privacy

Nothing you type, drop or upload into a tool leaves the tab. There is no account to make and no database to leak.

Vercel's cookieless analytics counts page views and load times for the site itself. It sees none of your file.

## Contributing

Bug reports and pull requests are welcome — start with [CONTRIBUTING.md](CONTRIBUTING.md), which covers the promise each tool keeps, the design system, and how to add a tool.

Found something broken? [Open an issue](https://github.com/unfoldingdimensions/Capytools/issues) with the tool name and what you expected.

## License

[Apache-2.0](LICENSE). Copyright 2026 unfoldingdimensions.
