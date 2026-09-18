<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:capytools-architecture-rules -->

# Capytools Architecture & Design Guidelines

### 1. Brand Ethos & Execution Model
- **"Calm little tools"**: No signup, no cookies, nothing leaves the user's machine.
- **Browser tools** (the default) must execute **100% in-browser** (client-side TypeScript / Web APIs) and store nothing.
- **Desktop tools** are a documented exception, introduced by CapyExpense (tool no. 5). They ship as a Tauri app and *do* write files — but only the user's own files, on the user's own disk, with no network code in the binary. A desktop tool must state its own promise ("stored on your machine, never ours") rather than inheriting "nothing stored", which would be false. It must still have no telemetry, no account, and no server.
- Shared UI for a desktop tool lives in `src/components/capyexpense/`-style directories and must import no `next/*`, no `motion`, and no storage: it renders in both the Next site and the app's separate Vite bundle. `tests/capyexpense-boundaries.test.ts` enforces this.
- Sensitive configs (API keys, preferences) reside solely in browser `localStorage`.
- Tool naming: `Capy<Name>` (e.g., `CapyWrapped`, `CapyImagine`, `CapyCreator`).
- Tool eyebrow: `font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground` (`Capy<Name> · tool no. X`).

### 2. Design System & Tokens
- **Canvas**: Cream `#f9f9f7` (light) / Deep charcoal `#121212` (dark).
- **Sage Palette**: Primary `#8e9b7e` / `#9aab8d`, Warm Clay `#c07952` (required/alerts), Water `#5f7a72` (links/secondary), Gold `#d9a441` (milestones/sparkles).
- **Typography**:
  - Titles: `font-display` (Fraunces serif, font-light, italic emphasis `<em className="italic">`).
  - UI: `font-sans` (Plus Jakarta Sans).
  - Eyebrows, Code & Tags: `font-mono` (Albert Sans uppercase tracking-[0.24em]).
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
The recipe lives in **CONTRIBUTING.md, "Adding a tool"** — one copy, so it
cannot drift from the code the way this list did. In short: a page on
`ToolPageShell`, a client component, a row in the `SUITE` registry
(`src/lib/capytools/suite.ts`), a lab plate, a README section, and tests.

`SUITE` is the only registry. There is no `TOOLS` array in `src/app/page.tsx`
and no grid to adjust — the landing, masthead, footer, notes page, sitemap,
every count and the `Nº 06 / 08` sign-off all derive from that one row.

### 6. Hosting & Runtime — Cloudflare Workers
The site runs on **Cloudflare Workers** via `@opennextjs/cloudflare`, not Vercel
and not a Node server. `runtime = "nodejs"` in a route selects the
Node-compatible build under the `nodejs_compat` flag; it does **not** give you a
Node server. The rules below are each a bug that already happened.

- **No filesystem. Ever, including at module scope.** `readFileSync` in a route
  or page is evaluated when the worker imports that module — at request time —
  and there is no disk: the page 500s with `ENOENT`. Read files at build time
  instead (see `scripts/generate-license-text.mjs`, run from `prebuild`).
- **In-memory state does not accumulate.** Module-level Maps are per isolate,
  and isolates are per request far more often than per caller — 60 parallel
  requests were spread across ~17 of them. Never use one for counting,
  rate limiting, or anything that must be shared. Rate limiting is a
  **Cloudflare rule on the zone**, configured in the dashboard, not code.
- **`s-maxage` and `revalidate` are inert** (no incremental cache configured).
  A route whose response should be reused must go through
  `withEdgeCache` (`src/lib/capytools/edge-cache.ts`). Only 200s are stored.
- **A Cloudflare Cache Rule cannot fix that, so do not reach for one.** Cache
  Rules act on requests Cloudflare proxies to an origin, and a Worker on a
  custom domain runs *ahead* of that cache — its output never enters it. Proven
  on the live zone with a rule active: `/_next/static/…js` (assets layer, ahead
  of the Worker) returns `CF-Cache-Status: HIT`, while a Worker-rendered page
  returns **no such header at all**. Caching Worker output means the Cache API
  inside the Worker, which is exactly what `withEdgeCache` is.
- **Outbound `fetch` sends no `User-Agent`.** GitHub's API answers `403 Request
  forbidden by administrative rules` without one — Node's fetch sent one for
  free, workerd does not. See `GITHUB_USER_AGENT` in `src/lib/github/client.ts`.
- **`Accept-Encoding: identity` is not honoured.** Workers manages content
  encoding itself, so a byte cap counts *decoded* bytes. Do not claim a
  compression-bomb guarantee based on that header.
- **`NEXT_PUBLIC_SITE_URL` is inlined at BUILD time.** It must be set in the
  build environment (it is, at workflow level in `ci.yml`). Setting it as a
  Worker secret does nothing, and the failure is silent — wrong share URLs.
- **`public/_headers` carries the security headers for `/_next/static/*`.** The
  assets binding serves those before the Worker runs, so `headers()` in
  `next.config.ts` never sees them. Change one, change both.
- **`wrangler.jsonc` is part of the security surface.** `nodejs_compat` carries
  `node:net`'s `isIP` in `ssrf.ts`, and `global_fetch_strictly_public` is what
  refuses private destinations now that `request-filtering-agent` is gone
  (it answers **403**, it does not throw). No test would catch either flag
  being removed.
- Adding a `routes` entry silently disables `workers_dev` and `preview_urls`;
  both are set explicitly because CI needs them.

**Deploying.** `npm run deploy`. The account is pinned (`account_id` in
`wrangler.jsonc`) and the token is read from a gitignored `.env.cloudflare` —
see `.env.cloudflare.example`. Pushes to `main` deploy through CI and then run
`scripts/smoke.mjs`, which walks every page, not only the ones a diff touched;
that is what catches a page broken by the platform rather than by the change.
Worker version history is the only rollback (`wrangler rollback`).

**On Windows**, orphaned `workerd` processes hold `.open-next` and fail the next
build with `EPERM`. `npm run cf-clean` clears them.

The migration's full record — 30 findings and every deviation — is in
`docs/research/cloudflare-migration/implementation-plan.md`, which is
**gitignored and local to the owner's machine**: it will not be in your
checkout, so treat the rules above as the portable version rather than going
looking for it.

<!-- END:capytools-architecture-rules -->
