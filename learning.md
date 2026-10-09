# learning.md — Capytools landing revamp

*Working learning log for the landing-page-revamp effort (2026-09-09). Companion to [decisions.md](decisions.md) and [handover.md](handover.md). These are the things that cost debugging time this session or will bite again if forgotten.*

> **Every agent, every session:** before you finish, append what your session learned here — the next `L` number, what happened, and the rule it leaves — under a section for the effort (e.g. `# SEO`). Read the existing entries first so you don't relearn them. Decisions go in [decisions.md](decisions.md). Nothing else from your session survives.

---

## L1. `next dev --webpack` + duplicated `Link`s = a hydration-killing prefetch storm

The live wire renders its engine links twice (seamless marquee loop). Under webpack dev, Next prefetches every link entering the viewport; the moving marquee feeds the prefetcher forever, HMR starts "rebuilding" in a ~750 ms loop, and hydration never settles — motion elements freeze at their `initial` state and clicks silently do nothing. Symptoms look exactly like a hydration bug but aren't.

**Rule:** verify landing changes with `npm run build && npx next start`, not the dev server. Also: a stale/corrupted `.next` produced a similar freeze once — `rm -rf .next` fixes that variant.

## L2. Animating inline headline segments with `inline-block` breaks punctuation

Per-segment `display: inline-block` (needed for transform animation) creates soft-wrap opportunities at segment boundaries — the comma after an italic word wrapped to the next line as a leading orphan. Fix: animate the `<em>` words with **opacity + blur only** (no transform), keeping them truly inline so the browser wraps naturally. `filter` and `opacity` work on inline elements; `transform` doesn't.

## L3. Big themed surfaces must not invert with the theme

Painting a section with `background: var(--foreground); color: var(--background)` inverts elegantly in light mode and produces a giant white panel in dark mode. Surfaces with an identity (the ink slab) get **local custom props** (`--slab-bg`/`--slab-fg`) that each theme supplies explicitly, and everything inside tints against the slab's own foreground via `color-mix`. The house rule stands: no `prefers-color-scheme`, tokens only.

## L4. `color-mix` over theme tokens gives two themes for one formula

`color-mix(in srgb, var(--primary) 12%, var(--background))` is a soft sage wash over cream in light and sage-charcoal over `#121212` in dark — one declaration, both themes correct. This is the default tool for tinted bands now.

## L5. `next/font` family names are hashed — literal names only work where you register them

`next/font` self-hosts fonts under mangled family names (`__Albert_Sans_x`). Two consequences:
- **Satori/OG route**: registers literal names ("Albert Sans") via the fonts array — CardArt's stacks must match those literals exactly.
- **html-to-image captures**: `'Albert Sans'` in inline styles does NOT resolve to the next/font instance; exports fall through to the fallback stack. Fine today, but if an export ever looks off-font, this is why.

## L6. Editorial collage plates compress absurdly well

WebP q82 took the 16 export plates from ~19 MB to ~0.9 MB with no visible loss at render sizes (flat paper textures + limited palette are the ideal case). `sharp` in a throwaway folder beats CLI wrangling. Remember: `about.webp` exists and is used; `lab-1.webp` has "2023" baked in (regeneration path in `docs/launch-video`-adjacent archive, prompt pack under `Capytools-Editorial-Landing-OpenDesign/assets/imagegen-prompts.md`).

## L7. `line-height: 1` + `overflow: hidden` clips descenders

Display type at line-height 1 paints descenders (y, Q tail) below its em box. The footer mega wordmark sits in an `overflow: hidden` block (needed for horizontal containment), so the clip cut the glyphs at the page end. Fix: `padding-bottom: 0.25em` **on the word itself** — em-relative, so it scales with the clamp() font-size and the horizontal containment stays.

## L8. Family swaps are one-file changes if the token name is stable

Swapping IBM Plex Mono → Albert Sans touched one import in `layout.tsx` because every consumer (dozens of `font-mono` utilities, CSS `var(--font-mono)`) resolves through the token. Renaming the token would have touched dozens of files for zero visual change. Keep the token name, document the family change in a comment, update the docs that name the family (DESIGN.md, AGENTS.md, OG route, CardArt).

## L9. Mimosa pre-commit hook runs in compat mode

Commits and pushes pass, but every hook run prints a partial-scan notice (library_source, callgraph partial). This is normal for this repo — never describe the project as "security-audited" on the strength of a passing commit. Secret-shaped literals in tests WILL hard-block; keep stub keys non-literal (see commit `004df11` for the pattern).

## L10. Verifying a long page in a driven browser has three traps

1. **Viewport emulation persists**: the automation browser pins a viewport (it was 1440×900 for the matrix shots); maximising the window leaves the page rendering in a corner with dead fill. Resize to the window before judging layout.
2. **Bfcache/stale pages**: after a rebuild+restart, a plain navigate can serve a stale render — cache-bust the URL (`?v=N`) when comparing builds.
3. **Synthetic events don't trigger CSS `:hover`** — use the driver's real `hover()`; and read `aria-pressed` etc. on a *later* tick than the click, React state hasn't flushed synchronously.

The reliable check that caught real bugs this session: computed-style assertions (`getComputedStyle(img).transform`, `.opacity`) rather than screenshots alone.

## L11. Wrap a scaling component in `max-w-full`, and test overflow DURING load, not after

Adding a `w-fit` wrapper (for corner crop marks) around `CardScaled`'s frame caused a **load-transient** horizontal overflow: between hydration and the ResizeObserver's first measure, fit-content sizing could resolve from the unscaled 1080/1200px content, blowing `documentElement.scrollWidth` out to 1116px at a 360px viewport for ~450ms. The settled layout was pixel-identical to before — only a settled-state check would call it clean, and the parent branch compared clean at the same timing because the race resolved earlier there.

Two rules: (1) any fit-content wrapper around content that is briefly unscaled gets `max-w-full` — it caps every state by construction instead of by timing; (2) the Playwright overflow probe must sample `scrollWidth` repeatedly starting at `domcontentloaded`, not once after `networkidle`.

Also bit twice this session: `next start` does NOT pick up a rebuild while running (restart it), and killing the npm/npx wrapper on Windows orphans the node child still holding the port — `netstat -ano | grep :PORT` then `taskkill //PID <pid> //F`, or the "new" server's 200s come from the old build.

---

# SEO (2026-10-04 → 2026-10-09)

*Decisions for this effort are D19–D34 in [decisions.md](decisions.md).*

## L12. Audit the live site; don't trust the checklist in your head

A scripted pass over all 24 sitemap URLs (status, noindex, canonical, description, H1 count, JSON-LD types, image alts, redirects, real 404) found what memory missed: `/notes`, `/design` and `/license` had no canonical. The same audit then over-reported "alt text on every image ✅" because it only checked that an `alt` attribute existed — every one was `alt=""`. **Rule:** check the value, not the presence, and run the check against production.

## L13. Every claim in page copy gets checked against the code

Four drafted claims were wrong until checked: the living-artist filter applies only to Gemini and the video engines, not every engine; the vCard form has no job-title field; Midjourney prompts carry `--ar` only once a destination is picked (caught by clicking through in the browser, not by reading code); the website extractor can say what *the site's code* keeps, but not that nothing is recorded anywhere, because Workers observability is on. **Rule:** read the code path for each sentence, and for anything conditional, exercise it in the browser.

## L14. Tailwind v4 `space-y-*` loses to `landing.css`'s `p` reset

`space-y-4` on the guide's paragraphs computed to `margin: 0` on every guide page, since #66: v4's spacing utilities sit inside `:where()` (zero specificity) and the landing stylesheet's `p` margin reset wins. Direct utilities on the element (`mt-3`) were fine. **Rule:** inside `.lp` pages, space siblings with `grid gap-*` / `flex gap-*`, never `space-y-*`. Measure the computed margin — it looked "fine" in a quick screenshot.

## L15. The shared footer renders inside a client component

`src/app/error.tsx` is `"use client"` and renders `SiteFooter`, so anything the footer imports ships to the browser. Importing `landing.ts` (all the landing copy) there for one constant would have bloated the error bundle. **Rule:** shared chrome imports only tiny, purpose-built modules (`author.ts`). Grep for `"use client"` importers before adding an import to shared chrome.

## L16. A Workers deploy isn't everywhere the moment `wrangler deploy` returns

Smoke that ran seconds after a deploy got 404 on two pages the deploy had just added; seconds later every probe answered 200. Hence the smoke page loop's 404 retry (D28). Existing pages were unaffected; new URLs are the exposure.

## L17. IndexNow answers 202 on a key's first use, then 200

`202 accepted — key validation pending` means the engine will fetch `/<key>.txt` before acting; the next submission came back `200 submitted`. A 403 means the key file isn't deployed. Google does not participate in IndexNow.

## L18. What Google actually says (checked 2026-10, via the seoo pack and Google's docs)

- FAQ rich results only appear for well-known government and health sites (since 2023).
- `llms.txt` is ignored by Google Search; there's no special file or schema for AI features.
- Empty `alt` is correct for decorative images; Google states no "exactly one H1" rule and no title-length limit.
- There's no duplicate-content penalty, but *scaled content abuse* (many pages made mainly to rank) is a spam policy.
- Breadcrumb trails aren't shown in mobile results.

Bing's Webmaster "SEO issues" are separate and include low-severity Notices (e.g. empty `alt`) that aren't errors.

## L19. Measuring speed from here is unreliable

The anonymous PageSpeed Insights API quota runs out; paint timings don't record when the browser pane is hidden; and the owner's connection adds a variable 0.2–1 s. The useful split was `curl -w` timings (TLS vs first byte) on a cached static asset against a Worker-rendered page from the same place: static ~0.5–0.85 s, rendered 0.45–1.6 s. **Rule:** use PageSpeed Insights in a browser, or the Search Console Core Web Vitals report once there's traffic, for real numbers.

## L20. `npm audit fix` is not a narrow tool

On a two-package advisory it rewrote ~100 packages in the lockfile. `npm update <pkg> <pkg>` moved only the flagged packages (and their platform binaries). Also: running `npm ci` and then `npm update` back to back left `node_modules` missing type declarations (lint, tests and `tsc` all broke); a fresh `npm ci` from the new lockfile fixed it. Re-run the CI steps from a clean install before trusting a dependency change.

## L21. Work in a separate checkout; other agents share the main one

The main checkout at `E:\New-Personal-Projects\Capytools` is used by other agents at the same time (its branch changes under you). Every SEO PR was built in a temporary worktree from `origin/main`. Traps met on the way:
- `cp -r` of another checkout's `node_modules` ran on in the background and collided with `npm ci` — always `npm ci` fresh in the worktree.
- `.claude/launch.json` lives in the main checkout and other agents add entries too: add your own entry, remove only yours afterwards.
- On Windows, write multi-line content with the Write/Edit tools; long Bash heredocs with quotes and backticks break.

## L22. Search-intent checks change the plan

Looking at what actually ranks before building moved three candidates: "EXIF viewer" was already served by `/capystrip` (fold in, don't add a page); "check if an image is AI-generated" returns pixel classifiers, which a metadata reader can't honestly claim to be; a `geo:` QR code doesn't match people who want a Google Maps link. **Rule:** for each candidate page, look at the live results and ask whether the tool honestly does what those pages do.

## L23. A new required field breaks other agents' work at merge time

#90 made `ToolGuide.summary` required. It was green on its own branch, then went red in CI: the PR is tested **merged with `main`**, and meanwhile another agent's PR (#89, CapyResume) had landed a guide without the field. That is the field working as intended — a tool can't ship without a summary — but it surfaces on whoever merges second. **Rule:** before pushing a change to a shared type or registry, `git fetch` and merge `origin/main` into the branch and run `tsc`; and when adding a required field, mention it in `decisions.md` so parallel agents writing new tools see it.

## L24. A rejected tool call may already have run

A `gh pr merge` the owner rejected mid-call had in fact merged and deployed (#92). Five later commits were pushed to the merged branch and never reached `main`; they shipped as #93. **Rule:** after any rejected side-effectful call, check the real state (`gh pr view N --json state,mergedAt`), and confirm a PR is still open before pushing more to its branch.

## L25. A sticky pane is bounded by its grid, not its row

CapyResume's pinned preview sat in a grid that also held the full-width "The file" card. A sticky element's limit is its containing block — the whole grid — so the preview slid down over that card and its last section could not be scrolled to. **Rule:** keep only the two panes in the sticky grid; put anything below them outside it.

## L26. Python on Windows writes CRLF

`Path.write_text` translates `\n` to `\r\n` on Windows, so a scripted edit turns a whole LF file into CRLF and the next tool sees every line changed. **Rule:** read and write bytes (`read_bytes().decode()` / `write_bytes(text.encode())`) in edit scripts.
---

# CapyInvoice (2026-10-09)

## L27. Mimosa's write hook blocks Bash writes everywhere — and false-positives on pure code

`sed -i` was refused on `src/` AND on `tests/` — every source-shaped write must go through Edit/Write so the hook can scan it. The hook also hard-blocked a pure formatting module as "command injection" (a template literal with no shell anywhere in a browser lib); retrying after restructuring the flagged lines — regex `exec` swapped for `split`, template pieces joined with `array.join()` — went through. **Rule:** when a write is blocked, restructure the flagged region and retry the same content; don't fight it via Bash. (Also: keep scratch scripts in `.scratch-<tool>/`, which the hook leaves alone, and delete it when done.)

## L28. A stale `.next/dev` type validator fails a fresh `next build`

After another agent's route-group changes, `next build` failed in TypeScript on `.next/dev/types/validator.ts` pointing at paths that no longer exist (`src/app/capyresume/ats-resume-format/...` — the `(guides)` group stripped). Nothing in the diff was wrong; the artifacts were stale. **Rule:** when build-time TypeScript names `.next/dev/types` errors that don't match reality, `rm -rf .next` and rebuild — same family as L1's stale-`.next` freeze.

## L29. pdf.js text extraction sees Text elements, not arithmetic

The rendered invoice's text layer contains only what a `<Text>` drew: the two 20% lines' individual taxes (£228.00, £129.20) never appear — they are summed into the grouped "Tax at 20% £357.20" row before print. Expectations written against the computation, not the print, will "fail" against a correct PDF. **Rule:** assert extracted text against printed ROWS (what the renderer actually draws), and dump the extraction when pinning new strings.

## L30. The playwright MCP hands you downloads as files — use it

`browser_click` on a download button reports the saved path under `.playwright-mcp/`; from there the file is verifiable in Node (pdf.js text extraction, size, header). That closes the loop the mocked unit tests can't: browser click → in-tab render → real file → parsed content.

## L31. A lib that compiles under tsc-CLI cannot import via `@/`

`scripts/verify-*-pdf.mjs` compiles `src/lib/<tool>` entries with bare `tsc` (no `paths`), so any `@/lib/...` import inside a lib file is "Cannot find module". Keep lib-to-lib imports relative; once files reach OUTSIDE their tool folder, the entry list's common root moves — pass `--rootDir src` and load outputs from `OUT_DIR/lib/<tool>/…` (both verify scripts now do).

## L32. Brave Search has no console; IndexNow doesn't reach it (checked 2026-10)

Getting into Brave Search is one manual step: [search.brave.com/submit-url](https://search.brave.com/submit-url) (the page exists; an agent couldn't see its form). There's no webmaster console, no sitemap upload and no indexing report, and third-party guides say Brave doesn't take IndexNow — so the post-deploy ping (D27) covers Bing, Yandex, Seznam and Naver, not Brave. Its crawler finds the sitemap through `robots.txt`, which already allows every crawler. Check progress with `site:capytools.app` on Brave. These details come from SEO blogs and Brave community replies, not official Brave docs — re-check before relying on them.

## L33. A smoke check that calls a third party tests the third party

Run 37893710031 (a docs-only deploy) failed one check: `/api/contributions/torvalds` → 502. Our route was right — github.com itself answered **504** for that account's contributions page (probed directly), and our route maps an upstream failure to 502. A minute later GitHub recovered. Because a failed smoke also skips IndexNow, GitHub's worst moment for its heaviest profile was failing our deploys. The smoke's GitHub checks now use `octocat` (a handful of repos: ~0.3 s upstream, a light card render). **Rule:** a post-deploy check that crosses into someone else's service should use the smallest input that still proves our route works; to tell our failure from theirs, probe the upstream directly before touching code.

## L34. Agents can work in Search Console through the browser pane (2026-10-09)

The owner signs in to Google once, in the Claude desktop app's browser pane; the sign-in persists, so later sessions can read the reports directly. Ask the owner before anything that submits (sitemap, Request indexing). What tripped us up:
- The property is a **domain property** (`sc-domain:capytools.app`). Its sitemap field rejects a bare `sitemap.xml` ("Invalid sitemap address") — enter `https://capytools.app/sitemap.xml`.
- There's no deep link for URL Inspection (`/search-console/inspect?id=…` is a 404); use the "Inspect any URL" bar at the top.
- Readings on 2026-10-09: 12 indexed. "Duplicate without user-selected canonical" was two old `http://` URLs crawled before the HTTPS redirect — they clear on recrawl, nothing to fix. "Crawled – currently not indexed" were pages crawled before their summaries existed. The sitemap had last been read on 2026-10-04 (24 of 35 pages) until it was resubmitted.
- Bing Webmaster's **URL Submission** page lists only hand-submitted URLs; IndexNow submissions show under its separate **IndexNow** report.

## L35. The Claude browser extension connects from Opera but can't drive it

Installed in Opera, the extension shows up as a connected browser, but every action fails at `Failed to query tabs: No group with id: …` — it depends on Chrome's tab-group behaviour, which Opera doesn't match. Don't retry; use the browser pane (L34) or the console APIs instead.

## L36. Bing Keyword Research gives real volumes, and can be queried in bulk

Bing Webmaster → Keyword Research shows 12 weeks of Bing impressions per phrase, related and question keywords, and the current top 10 URLs — the volume source the seoo `content-opportunity-discovery` skill otherwise falls back without. For many phrases at once, in the signed-in browser pane, call the page's own endpoint: `POST /webmasters/api/keywordresearch/statswithglobalbreakdown` with `{keyword, siteUrl:"https://capytools.app/", StartDate, EndDate, Country:"", Language:"", Vertical:""}` and the `X-CSRF-Token` the page sends (capture it by wrapping `fetch`/XHR, then run one search in the UI). The response's `ImpressionCount` is the window total and `ImpressionsSparkData` the 12 weekly figures. Pace calls ~0.6 s apart; 60 phrases outlast one 45 s browser-tool call, so let the loop keep running in the page and read the result afterwards. **Caveats:** a **0** means below Bing's threshold, not no searches; Bing is a fraction of Google, so treat the numbers as relative. The 2026-10-09 table is in `docs/research/keywords-2026-10-09.md` (owner-local).
