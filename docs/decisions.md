# Decisions

Deliberate deviations and trade-offs, recorded so a future reader can tell a
choice from an oversight. The original implementation plan lives elsewhere and
was written against a different repository; where this build diverges from it,
that is noted here.

---

## PDF fonts: standard-14 instead of an embedded OFL family

**Plan said:** register an OFL-licensed font family (Inter, Source Sans) and embed
it, so the PDF carries its own typography.

**We do:** use the PDF standard fonts (`Helvetica`, `Times-Roman`) referenced by
name, with no embedded font file.

**Why:** the plan's concern was licensing — do not embed a font whose licence
forbids redistribution. Standard-14 avoids the question entirely: they are
referenced rather than embedded, every renderer already has them, and no font
binaries ship in the bundle or bloat the output. The trade-off is real but
acceptable: the PDF renders in Helvetica/Times on every device rather than in a
chosen webfont, and the template axis is _density and heading rules_, not
typography.

**Consequence:** the templates differentiate on spacing, heading case, rules and
serif-versus-sans, not on a custom typeface. Revisit only if a requested template
genuinely needs custom type — and pick an OFL family when that happens.

## Layout: `lib/` and `app/` at the repository root

**Plan said:** `src/lib/capyresume/*`, `src/app/capyresume/page.tsx`, against the
sibling-tool conventions of the repository it was written for.

**We do:** keep the existing root layout (`app/`, `components/`, `lib/`) because
this codebase was already structured that way and the `@/*` path alias maps to
the repository root.

**Why:** moving to `src/` would be churn for a path prefix, and it would mean
rewriting every alias for no functional gain. The plan's file _names_ are
honoured; only the prefix differs.

## Registration items that do not apply

**Plan said:** register the tool in a `SUITE` catalogue, add a landing plate,
bump every `/NN` denominator in `tests/tool-pages.test.tsx`, and match the
`CapyMark` / `AmbientBackground` / `ErrorCard` component conventions.

**We do:** none of these, because they belong to a different repository's
multi-tool system. This is a standalone application, not a tool inside a suite.

**Consequence:** the equivalent obligations were met directly — `README.md`,
`package.json` name and description, `LICENSE`, and the legal pages. If this ever
becomes a tool inside that suite, the registration work is the list above.

## AI assistance ships in v1

**Plan said:** no AI writing or rewriting in v1 (§9.2 item 6: "defer; the polish
layer exists if wanted later").

**We do:** ship it, as an optional BYOK feature.

**Why:** product direction changed. The explicit instruction was that BYOK is in
v1 because users need it to format their résumé.

**Consequence, and the reason this entry matters:** because the plan's default was
"no AI in v1", it never specified _how_ AI should behave here. The honesty rules
in `lib/capyresume/ai/prompts.ts` — no invented facts, no manufactured metrics,
no rewriting of titles or dates — are therefore a new decision, not a plan
inheritance. They are pinned by tests so they cannot quietly erode.

## Versioned storage key: a schema change orphans stored résumés

**Plan said:** namespace the storage key by schema version, so a shape change
cannot read a stale entry back as if it were current.

**We do:** exactly that — `capyresume.resume.v1`. `migrate()` is total and never
throws, but it only ever sees data that reaches it, which on the local-storage
path is data written under the _current_ key.

**Consequence, stated plainly because it affects users:** bumping
`RESUME_SCHEMA_VERSION` makes previously stored résumés invisible, because the key
they were written under is no longer read. The JSON export is the migration path
— import restores a document written under an older version, and `migrate()`
repairs it on the way in. If a future version needs to migrate rather than drop,
that is a change to `store.ts` (read the old key, migrate, write the new one), not
a change to `migrate()`.

## `eslint-config-next` is still v15 while Next is v16

**Cause:** `eslint-config-next@16` requires `eslint >= 9`, and this project is on
ESLint 8 with a legacy `.eslintrc.json`.

**Consequence:** linting works and the gate is green, but the Next-specific rules
are one major behind the framework. Fixing it means migrating to ESLint 9's flat
config (`eslint.config.mjs`), which is a self-contained change rather than
something to fold into another fix. Deferred deliberately.

## Paper size is a UI preference, not document data

Paper size currently lives in component state plus a `localStorage` preference, so
it survives a reload but is not part of the document.

**Why not in the schema:** it arguably belongs alongside `templateId`, but adding
it means bumping `RESUME_SCHEMA_VERSION` and orphaning stored résumés (see the
versioned-key entry above) — too high a cost for a display preference.

**Consequence:** if paper size ever becomes per-document or per-export-preset, it
belongs in `ResumeData` at the next version bump, with `migrate()` defaulting
existing documents to A4.

## Content-Security-Policy: a floor, not an AI-provider allowlist

**Finding of the review:** no CSP at all; HSTS, `X-Frame-Options` and `nosniff`
were set, framing and sniffing were covered, but nothing bound what the page was
allowed to load or contact.

**We do:** send a full policy from `next.config.ts` — `default-src 'self'`,
`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`,
`form-action 'self'`, and a `connect-src` permitting `https:` plus localhost
while forbidding remote cleartext `http:`.

**The decision worth recording** is what `connect-src` deliberately is _not_: an
allowlist of OpenAI, Gemini and Anthropic. The BYOK client lets a user point at
any OpenAI-compatible endpoint — OpenRouter, an LM Studio box, a local Ollama —
and a fixed list would break that feature the moment it shipped. What the policy
guarantees instead is narrower but worth having: an API key can never be sent to
a remote host in the clear.

**Why not nonce plus `strict-dynamic`:** a nonce needs per-request middleware,
which would make these pages dynamic and forfeit static generation. For an
application with no third-party scripts and no server-rendered user HTML, that
is too high a price, so `'unsafe-inline'` is accepted in `script-src` and
`style-src`. `'unsafe-eval'` is dev-only.

**Verified, not assumed:** the header is served on all five routes; a probe for a
URI that `img-src` forbids raises a real `securitypolicyviolation` event in the
browser, so the policy is enforced rather than decorative; and the page still
hydrates under it — typing into the name input re-renders the preview.
