<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:capytools-architecture-rules -->

# Capytools Architecture & Design Guidelines

### 1. Brand Ethos & Execution Model
- **"Calm little tools"**: No signup, no cookies, nothing stored.
- All tools must execute **100% in-browser** (client-side TypeScript / Web APIs).
- Sensitive configs (API keys, preferences) reside solely in browser `localStorage`.
- Tool naming: `Capy<Name>` (e.g., `CapyWrapped`, `CapyImagine`, `CapyCreator`).
- Tool eyebrow: `font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground` (`Capy<Name> · tool no. X`).

### 2. Design System & Tokens
- **Canvas**: Cream `#f9f9f7` (light) / Deep charcoal `#121212` (dark).
- **Sage Palette**: Primary `#8e9b7e` / `#9aab8d`, Warm Clay `#c07952` (required/alerts), Water `#5f7a72` (links/secondary), Gold `#d9a441` (milestones/sparkles).
- **Typography**:
  - Titles: `font-display` (Fraunces serif, font-light, italic emphasis `<em className="italic">`).
  - UI: `font-sans` (Plus Jakarta Sans).
  - Eyebrows, Code & Tags: `font-mono` (IBM Plex Mono uppercase tracking-[0.24em]).
- **Surfaces**: `rounded-3xl` for main cards, `rounded-2xl` for inset wells, `rounded-full` for pills/buttons.
- **Atmosphere**: Use `AmbientBackground` + `CapyMark` mascot on every tool page.

### 3. React 19 / Next.js 16 Client Hydration Pattern
To hydrate client-only values (`localStorage`, random seeds) without hydration mismatch or `react-hooks/set-state-in-effect` errors:
```tsx
// Hydrate stored values on client mount
const hydrateValues = useCallback(() => {
  setValue(getStoredValue());
}, []);

// eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(hydrateValues, [hydrateValues]);
```

### 4. Multi-Provider LLM Polish Standard
When supporting optional LLM generation or polish:
- Supported providers: OpenCode-Go (`qwen3.8-flash`), OpenRouter, Nous Portal (`hermes-3`), Command Code, and custom OpenAI-compatible endpoints.
- Save keys exclusively in `localStorage`.
- Always strip reasoning tags defensively (`stripThinkingTags` for `<think>...</think>`).

### 5. Registering New Tools
1. Create tool page at `src/app/capy<name>/page.tsx`.
2. Implement client component in `src/components/tool/<ToolName>.tsx`.
3. Add tool to `TOOLS` list in `src/app/page.tsx` and adjust grid (`sm:grid-cols-2 lg:grid-cols-3`).
4. Add unit tests in `tests/<name>.test.ts`.

<!-- END:capytools-architecture-rules -->
