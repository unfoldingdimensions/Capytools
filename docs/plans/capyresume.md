# CapyResume — the port into Capytools

*2026-10-08. CapyResume was a standalone Next.js app (its own repo,
`unfoldingdimensions/CapyResume`). This records how it became a Capytools tool,
the decisions the owner made, and what is deliberately left for later.*

## Owner decisions

- **History is kept.** The standalone repo came in by `git subtree add` under
  `vendor/capyresume` (merge `12cf6fc`), and every later commit moved files out
  of that prefix into `src/`. Read a file's earlier life with
  `git log 12cf6fc^2 -- lib/capyresume/<file>` (subtree history sits at the old
  paths). **Merge this PR with a merge commit, never a squash** — a squash
  flattens the subtree into one commit and the history is gone.
- **The AI assist is a planned paid feature.** Its code is kept and documented
  (below) but nothing routes to it: the editor does not render it, and
  `tests/capyresume-boundaries.test.ts` fails if anything outside the AI code
  imports it.
- **The old `.env` files are deleted.** Nothing read them; CapyResume has no
  server config.
- **Preview fonts stay system Helvetica/Times.** The PDF embeds Liberation Sans
  and Serif, their metric twins, so line and page breaks agree; only glyph
  shapes differ slightly. Loading ~800 KB of TTF on every visit to change that
  was not worth it.

## Where things live

| What | Path |
|---|---|
| Tool page | `src/app/capyresume/page.tsx` (ToolPageShell) |
| Editor | `src/components/tool/CapyResume.tsx` — three StageCards |
| Preview, confirm dialog, AI panel | `src/components/capyresume/` |
| Logic (schema, store, edits, exports) | `src/lib/capyresume/` |
| Guide pages | `src/app/capyresume/{templates,resume-templates,free-cv-builder,ats-resume-format}` |
| Guide sitemap list | `src/lib/capyresume/seo/routes.ts` |
| PDF fonts (SIL OFL) | `public/pdf-fonts/` |
| Real-PDF check | `node scripts/verify-capyresume-pdf.mjs` |
| Tests | `tests/capyresume-*.test.ts(x)` |

## The AI assist (paid, not routed)

`src/components/capyresume/AiAssist.tsx` and `src/lib/capyresume/ai/` — bring
your own key, requests go browser → provider directly, the key lives only in
`localStorage`, `<think>` blocks are stripped, a suggestion that went stale is
not applied, plain `http://` is refused except to localhost.

Before it ships as a paid feature:

1. **Providers.** It speaks OpenAI, Google Gemini, Anthropic and any
   OpenAI-compatible endpoint. The house set (AGENTS.md §4) is OpenCode-Go,
   OpenRouter, Nous Portal, Command Code and custom OpenAI-compatible — align
   it to `src/lib/capytools/llm.ts` rather than keeping a second client.
2. **The entitlement check** — gate it on the monetisation platform
   (`docs/research/monetisation/implementation-plan.md`), not on a flag.
3. **Wire it** into card 01 of the editor and delete the boundaries test's
   "routed nowhere" block in the same PR.

## Known limits

- The PDF fonts cover Latin, Cyrillic and Greek. Devanagari, Arabic and CJK
  need Noto faces (and RTL shaping for Arabic) — marked `ponytail:` in
  `src/lib/capyresume/pdf.tsx`.
- No undo; destructive actions (remove a job or section, clear, replace on
  import or demo) confirm first instead.
