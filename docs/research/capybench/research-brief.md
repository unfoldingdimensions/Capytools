# CapyBench research brief

Researched 2026-09-12. Every number below was read that day from the cited official page
(vendor docs for pricing and token accounting; Vercel docs; MDN/WHATWG/FFmpeg for media).
Rates for all models, with per-model tier notes, live in [pricing.json](./pricing.json);
every `[n]` resolves to [sources.json](./sources.json).

## A. Pricing (recorded in pricing.json)

All 18 entries were priced from the three vendors' own pricing pages [1][7][12]. Exact API
model IDs, max output tokens and context windows come from each vendor's model docs [2][8]
and, for Gemini, from the ten per-model pages (65,536 output / 1,048,576 input on every one)
[13][14][15][16][17][18][19][20][21][22][23]. Selection rule: every model the vendor's own docs present as the current
text-model lineup — Anthropic's four [2], OpenAI's four GPT-6/5.6 flagships [8], and the
Gemini text models currently listed, excluding the one the pricing page itself labels
"our legacy Flash model", gemini-3-flash-preview [12][13]. Entries are shaped to
bench/prices.json's schema (`vendor` matches run.mjs's adapter keys; `google` marks the
native-shape Gemini entries the runner cannot call yet). Exceptions are listed under
"Could not verify".

## Could not verify

Flagged up front, per the rule that a guessed rate is worse than a missing one.

- **Claude Mythos 5.1 / Mythos 5.** The pricing page lists rates ($10/$50, "limited
  availability") [1] but the models overview has no table row, no API model ID and no specs
  for either [2]. No entry in pricing.json — we cannot key a model whose API ID we have not
  seen published.
- **Anthropic legacy models.** Fable 5, Opus 4.5–4.8 and Sonnet 4.5/4.6 are still priced
  (Opus 4.5–4.8 at $5/$25; Sonnet 4.5/4.6 at $3/$15) [1] but the models overview classifies
  them as legacy, not the current lineup, and does not list their IDs [2]. Excluded from
  pricing.json; their IDs would need to be read from each model's own page before use.
- **Anthropic truncation billing.** No page states explicitly "tokens generated before a
  max_tokens cut-off are billed". What is verifiable: `stop_reason: "max_tokens"` is an
  official value [5], and the extended-thinking page describes `usage.output_tokens` as the
  *billed* output tokens [3]. Treat "truncated generations are billed" as a well-supported
  inference, not a quoted fact.
- **Google: is `thoughtsTokenCount` inside `candidatesTokenCount`?** The API reference
  defines them separately ("number of tokens of thoughts for thinking models" vs "total
  number of tokens across all the generated response candidates") [26] without stating the
  subset relationship. Two official statements imply thoughts are *inside* the output total:
  output prices are listed as "including thinking tokens" [12] and `max_output_tokens`
  applies to "the combined total of thinking tokens and output tokens" [24]. Bill
  `candidatesTokenCount` at the output rate and report `thoughtsTokenCount` as a subset —
  and sanity-check one real response (candidates − thoughts ≥ 0, and both billed once)
  before the first published run.
- **OpenAI previous-gen models.** gpt-5.5/5.4/5.2/5.1/5 families, the o-series, gpt-4.1 and
  gpt-4o remain purchasable with published rates [7], but the current models page specs only
  the four GPT-6/5.6 flagships [8]. They are excluded from pricing.json as not
  current-lineup; rates are in [7] if a retrospective run ever wants them.
- **Vercel static-asset size caps.** The only published per-file numbers are for CLI source
  uploads (100 MB Hobby / 1 GB Pro, 15,000 files) [28]; Vercel states there is "no upper
  limit for output files created during a build" [28] and publishes no total-deployment-size
  or git-repo-size cap on the current limits or git pages. There is no number to cite for
  those two — the honest position is "not published", not "unlimited".
- **Vimeo cookie behaviour.** vimeo.com/privacy would not fetch (nav shell / 404 on the
  cookie policy path), so the claim "a Vimeo embed sets cookies" goes uncited here.
- **Safari edge cases.** Low Power Mode autoplay behaviour and the precise "iPhone will not
  play inline without `playsinline`" formulation are documented on WebKit properties, which
  are outside the MDN/WHATWG set consulted; the `playsinline` requirement is cited via MDN
  only as "required for autoplay in Safari" [48].
- **bench/run.mjs cannot call Google models yet.** It implements only the `anthropic` and
  `openai-compatible` vendors [src: bench/run.mjs]. Google's documented OpenAI-compatible
  path is `/v1beta/openai/chat/completions` [27], which does not fit the runner's
  `{baseUrl}/v1/chat/completions` template — a small adapter (or a Google-native one) is a
  prerequisite for any Gemini entry in pricing.json to actually run.

---

## B. Token accounting quirks

**One-paragraph answer.** For all three vendors, reasoning/thinking tokens are billed at
the output rate and are already *inside* the output token total the runner reads, so
`tokens × rate` never double-bills reasoning [3][9][12][24]. They differ on cached input:
Anthropic caching never engages without explicit `cache_control` [4]; OpenAI caching is
on by default [10]; Google implicit caching is on by default [25] — so a cache *discount*
can silently appear on OpenAI and Google invoices. Truncated generations still bill the
tokens generated: OpenAI says so outright [9], and for Anthropic/Google it follows from
output tokens being the billed quantity [3][26].

### Anthropic

1. **Thinking tokens are included in the reported output count.** Cost tracking goes
   through `usage.output_tokens_details.thinking_tokens`, which "reports how many of the
   billed output tokens were internal reasoning" [3]. With streaming, the breakdown only
   appears on the final `message_delta` event [3]. The Messages response also exposes
   `cache_creation_input_tokens`, `cache_read_input_tokens` and `input_tokens` [4][5].
2. **Billed at the output rate** — they *are* output tokens per the billing language [3];
   the pricing page's single output rate applies [1].
3. **Cached input fields:** `cache_creation_input_tokens` (written) and
   `cache_read_input_tokens` (read). Cached tokens are **excluded** from the main
   `input_tokens`, which "represents only the tokens that come after the last cache
   breakpoint"; total = read + creation + uncached [4].
4. **No silent caching.** "There are two ways to enable prompt caching" and both require a
   `cache_control` breakpoint [4]. The runner sends none, so no cache discount can silently
   appear. (Note: in Anthropic's OpenAI-SDK compatibility mode, prompt caching is "not
   supported" at all [6].)
5. **Truncation:** the response `stop_reason` union includes `"max_tokens"` [5]. Generated
   tokens land in `usage.output_tokens` — the field the thinking docs call *billed* output
   [3] — so they bill; the explicit sentence is missing (see "could not verify").
6. **Minimums:** `budget_tokens` has "minimum of 1,024 tokens. The API rejects smaller
   values", and it is "a target rather than a strict cap" — the model may stop early [3].
   Thinking counts toward `max_tokens` [3]. No minimum billed output is documented.

### OpenAI

1. **Reasoning tokens are inside `completion_tokens`.** The usage object reports
   `completion_tokens_details.reasoning_tokens` — "tokens generated by the model for
   reasoning" [11] — nested under the output total [9]. (Responses-API responses carry the
   equivalent in `output_tokens_details`.)
2. **Billed at the output rate:** reasoning tokens "occupy space in the model's context
   window and are billed as output tokens" [9].
3. **Cached input:** `usage.prompt_tokens_details.cached_tokens` — "cached tokens present
   in the prompt" [11]. Cached tokens are **included** in `prompt_tokens`: the caching
   guide's own cost example computes `ordinaryInputTokens = inputTokens - cachedTokens -
   cacheWriteTokens` [10]. GPT-5.6+ additionally reports `cache_write_tokens` [10].
4. **Silent caching: yes.** "Prompt caching is enabled by default for supported OpenAI
   models"; a prefix becomes cacheable at a minimum of 1,024 tokens on GPT-5.6 and later
   [10]. Reads cost 0.1× input, writes 1.25× (GPT-5.6+; earlier models have a model-dependent
   cached rate and no write charge), TTL 30 minutes on GPT-5.6+ [7][10]. A cache discount can
   therefore appear with no directive from us.
5. **Truncation:** `finish_reason: "length"` — "the maximum number of tokens specified in
   the request was reached" [11]. Truncated generations bill: truncation "might occur before
   any visible output tokens are produced, meaning you could incur costs for input and
   reasoning tokens without receiving a visible response" [9]. (Responses API equivalent:
   `status: "incomplete"` with reason `max_output_tokens` [9].)
6. **Minimums:** none documented. The guide's "reserve at least 25,000 tokens for reasoning
   and outputs" is advice, not a billing floor [9].

### Google (Gemini API)

1. **Thinking tokens are reported separately but inside the output price.** The response's
   `usageMetadata` carries `thoughtsTokenCount` ("number of tokens of thoughts for thinking
   models") alongside `candidatesTokenCount` ("total number of tokens across all the
   generated response candidates") [26]. Output prices are listed as "including thinking
   tokens" [12] — subset reasoning flagged in "could not verify".
2. **Billed at the output rate:** "Pricing is based on the full thought tokens the model
   needs to generate, despite only the summary being output" [24].
3. **Cached input:** `usageMetadata.cachedContentTokenCount` — "number of tokens in the
   cached part of the prompt"; `promptTokenCount` "is still the total effective prompt size
   meaning this includes the number of tokens in the cached content" [26] — i.e. cached
   tokens are **included** in the main count. (SDKs surface hits as
   `usage.total_cached_tokens` [25].)
4. **Silent caching: yes.** "Implicit caching is enabled by default for all Gemini 2.5 and
   newer models… We automatically pass on cost savings if your request hits caches. There is
   nothing you need to do in order to enable this" [25]. Minimums: 4,096 prompt tokens on
   the 3.x models, 2,048 on Gemini 2.5 Pro/Flash [25].
5. **Truncation:** `finishReason: "MAX_TOKENS"` — "the maximum number of tokens as
   specified in the request was reached" [26]. The generated tokens are counted in
   `candidatesTokenCount` [26], which the output price covers [12] — same inference caveat
   as Anthropic.
6. **Minimums:** no minimum billed thinking is documented anywhere on the thinking page;
   the cost lever it documents is `thinking_level` (lower it to `low`/`medium` rather than
   shrinking `max_output_tokens`, which "can truncate responses") [24].

### What this means for bench/run.mjs

- The runner's core assumption — reasoning is a subset of output, billed once — is correct
  for all three vendors [3][9][12][24].
- Its cost math (all input at the standard rate) is *exact* on Anthropic (no caching can
  engage) and *conservative* on OpenAI/Google: the real invoice can come in lower when the
  automatic caches hit. Its existing "cached input tokens reported; cost ignores cache
  discounts" warning covers exactly this case.
- One asymmetry to remember when writing the comparison page: Anthropic reports cached
  tokens *excluded* from its input count while OpenAI/Google include them, so a
  cross-vendor "input tokens" column compares slightly different quantities. The published
  USD cost is unaffected.

---

## C. Publishing the videos

**One-paragraph answer.** Commit the videos to the repo and serve them from `/public`.
Total payload is ~100–300 MB (20–40 clips × 3–8 MB), which is far inside what Vercel
builds and serves — the only published size caps are on CLI source *uploads*, and build
output has "no upper limit" [28]. Static responses count against Fast Data Transfer
whether cached or not [30]: Hobby includes 100 GB/month and pauses if exceeded [29][30];
Pro includes 1 TB/month, then "starting at $0.15 per GB" (regional range $0.15–$0.35) [30][31].
Vercel Blob avoids the bandwidth line (storage $0.023/GB-month; Blob transfer $0.05–$0.117/GB,
claimed "3x more cost-efficient than Fast Data Transfer") [31][34] but adds a second billable
service, an account-scoped store, and real ambiguity about Hobby limits (access is cut when
the free allowances are exceeded [34], and the pricing page's own BDT row contradicts the
regional page for Pro). Third-party players are out: the YouTube embed "collects and shares
some basic user data with YouTube" [36], Mux prices in minutes and ships a player/SDK stack
[37], and Vimeo could not be verified at all — any of them puts a third party and likely
cookies between the visitor and the video, which the brand promise forbids.

1. **Repo-side limits.** Per-file: no published cap for build/static output ("no upper
   limit for output files created during a build"); the 100 MB Hobby / 1 GB Pro numbers
   apply to CLI source uploads, max 15,000 files [28]. Total deployment size and git repo
   size: no current published cap (see "could not verify"). Build cache is 1 GB [28] — a
   few hundred MB of videos in `next build` output is routine.
2. **Bandwidth.** Hobby: 100 GB/month included [29][30]; fair-use wording "up to 100 GB"
   [32]; exceeding it pauses the site rather than billing [29]. Pro: 1 TB/month included,
   then "starting at $0.15 per GB" [30] ($0.15–$0.35/GB by region [31]). Static assets
   count against it, cached or not [30]. Videos served from `/public` are static assets, so
   yes — they count. Budget sense: 40 videos × 5 MB = 200 MB per *full* viewing of the
   whole wall; ~100 GB absorbs ~500,000 complete run-throughs. Vercel's own KB warns
   "large video files can often lead to excessive bandwidth usage" and suggests Blob or
   third parties for video-heavy sites [35] — that concern is about video-*heavy* sites,
   not a 200 MB static wall.
3. **The three options, honestly.**
   - *Commit to repo, serve from `/public`.* Cost: $0 beyond the bandwidth above; git
     history carries every re-encode forever (the one real cost — mitigated by encoding
     tightly and not re-encoding casually). Works with zero new accounts, zero cookies, zero
     third parties: the video request goes to the same Vercel origin the page already came
     from. Consistent with how the repo already ships 16 WebP plates.
   - *Vercel Blob.* Cost at our scale: ~0.5–1 GB stored ≈ $0.01–0.03/month; egress would be
     the cheaper meter if the regional numbers hold [31][34]. Public URLs need no auth
     [33]. But: the store is account-scoped (writes need auth [33]), the pricing story is
     internally inconsistent (Pro card says Blob transfer is included in the flat-rate CDN;
     the regional page bills it [30][31]), Hobby overage *cuts access* rather than billing
     [34], and the URLs live on a different domain (`*.public.blob.vercel-storage.com`),
     which is a small but real brand/consistency smell for a "calm little tools" page. It
     does not break the privacy promise — it's still Vercel — it just adds moving parts for
     no benefit at our scale.
   - *Third-party video host.* YouTube embeds share user data with Google by design [36];
     Mux is priced for app builders, in minutes, with its own player [37]; Vimeo's player
     cookie claims could not be verified from primary pages this pass. All of them break
     "no cookies, no telemetry, nothing leaves the user's machine" in spirit and possibly
     in letter. Not candidates.
4. **Recommendation: commit to the repo and serve from `/public`.** At 20–40 short clips the
   bandwidth math is a rounding error inside the Hobby allowance, storage is free, the
   privacy promise stays literally true (one party, no player, no cookies), and there is
   nothing new to operate. Revisit Blob only if the wall grows past a few GB or traffic
   makes 100 GB/month real — and revisit it with the Pro tier, since Hobby overage pauses
   the whole site [29].

---

## D. Video format and side-by-side playback

**One-paragraph answer.** Encode every recording once, identically: H.264 High in MP4
(the only format that plays everywhere — 97.26% global, iOS Safari since 3.2 [41][38]),
`-crf 21 -preset slow -tune animation -pix_fmt yuv420p` with a fixed 2-second GOP and
`+faststart` [42]. That preserves small HUD text far better than consumer-video bitrates
because screen content is flat colour + hard edges, which CRF handles at low bitrate.
Play N `<video muted playsinline preload="auto">` elements from one `performance.now()`
master clock with a requestAnimationFrame drift-correction loop (hard-seek beyond ~80 ms,
rate-nudge beyond ~30 ms), gating start and scrub on all `seeked` events [44][45][46][47].
Muted autoplay works on desktop and mobile with exactly `autoplay muted playsinline`
[48][49].

1. **Codec.** H.264/AVC: "all versions of Chrome, Edge, Firefox, Opera, and Safari"
   (Firefox via OS codecs) [38], 97.26% per caniuse [41]. VP9/WebM: also "all versions",
   but iOS Safari is full only from 17.4 [38][40] (96.91%). AV1: 95.02%, but "support in
   Safari is limited to devices that feature a hardware decoder" (Safari 17+, M3 Macs,
   iPhone 15 Pro and later) [38][39]. Verdict (craft): H.264/MP4 as the single shipped
   format — universal, and at CRF ≈ 18–21 it holds small text cleanly at a few MB per
   minute. If a future re-encode needs smaller files, add an AV1 copy as a second
   `<source>`; browsers take the first they support, and screen content compresses
   dramatically better in AV1 — at the cost of maintaining two artefacts.
2. **Encoding settings.**
   ```
   ffmpeg -i input.mov -c:v libx264 -preset slow -crf 21 -tune animation \
     -profile:v high -pix_fmt yuv420p -g 120 -keyint_min 60 \
     -movflags +faststart -an output.mp4        # 60 fps source → 2 s GOP
   ```
   `-crf 21` sits in the wiki's "subjectively sane" 17–28 band near the sharp end because
   text edges are the casualty of starved rate; the range and meaning are the wiki's [42].
   `-preset slow` buys compression offline (slower preset = better quality per byte) [42].
   `-tune animation` suits canvas content — cartoons and HUDs, "higher deblocking and more
   reference frames" [42] — which suppresses ringing around small glyphs. `-pix_fmt
   yuv420p` is non-negotiable: some players decode only 4:2:0 H.264 [42]. `-profile:v high`
   is the efficient profile and universal on anything modern [38]. The fixed short GOP
   (`-g 120` at 60 fps) is craft: it makes seek-and-resync cost uniform and small across
   every recording, which the sync loop below depends on. `-movflags +faststart` moves the
   index to the file head so a static host can stream progressively (craft). `-an` drops
   the silent audio track. If a smaller file is ever mandatory: `libvpx-vp9 -crf 28 -b:v 0
   -row-mt 1` in WebM (VP9's CRF band is 15–35, 31 recommended for 1080p) [43] — roughly
   30% smaller, slower to encode, slightly worse Safari coverage.
3. **Synchronising two `<video>` elements without a library.** Craft, built on documented
   behaviour: a precise `currentTime` seek sets "the current playback position to the new
   playback position" and the UA decodes "enough data to play back that position" [44];
   seeks outside the seekable range clamp to the nearest position [44]; `seeked` fires when
   the seek completes [46]; `waiting` fires when readyState drops below HAVE_FUTURE_DATA
   mid-play [44]. Recipe: pick one clock (`performance.now()`), `await Promise.all(v.play())`,
   then every frame compute each video's delta from the clock; |Δ| > 0.08 s → hard
   `currentTime = t`, 0.03–0.08 s → nudge `playbackRate` ±3%, else leave alone; on any
   `waiting`, pause all and resync on resume; for scrubbing, set all `currentTime` values
   and wait for every `seeked` before playing again.
   **Known failure modes:** (a) drift — `currentTime` is "an approximation" with
   browser-dependent update frequency [45], so two decoders wander apart without periodic
   correction; (b) keyframe intervals change *seek latency*, not seek accuracy — the UA
   always lands on the requested time but must decode from the previous keyframe first [44],
   so mismatched GOPs make one video visibly stall longer on resync (fixed short GOPs keep
   recovery symmetric); (c) start latency differs per element, hence gating on all
   `play()` promises; (d) rAF is paused in background tabs [47] — expect one hard snap back
   on tab return, which is the loop working as designed; (e) mismatched *durations* let a
   seek clamp a longer track onto a shorter one's end [44].
   **Are identical encodings required?** No — nothing in the mechanism compares frame
   indices; everything is seconds-based [44][45], and the correction loop enforces
   alignment on non-identical files. Identical settings (fps, GOP, duration) are simply
   cheap insurance: equal seek costs, no duration clamping, one encode recipe to audit.
   Matching *duration* is the one property to enforce per comparison pair.
4. **Autoplay.** Muted autoplay is permitted: Chrome — "Muted autoplay is always allowed"
   [49]; Firefox — muted autoplay allowed by default (`media.autoplay.allow-muted`) [48];
   Safari — requires `playsinline` for autoplay [48]. Ship `<video autoplay muted
   playsinline preload="auto">` (audio absent also satisfies policies [48]). For elements
   attached after load, call `.play()` and treat a rejected `NotAllowedError` as "show the
   play button" — that is the documented contract [48].

---

## E. Prior art

**FlappyBench.** Published as a writeup inside a GitHub showcase [50]: each model's
one-shot output ships as a real, runnable HTML game file, cost per model is listed plainly
(DeepSeek-V4-Pro at $0.0008 up to Opus 5 at ~$0.2539, a few flagged as formula estimates),
wall-clock time is *not* shown, and judging is the author's — a line-by-line code read
cited to file and line, selective playtests, and an automated 600-frame smoke test feeding
1–5 category scores plus a quality-per-dollar ranking. One-shot claims are kept honest by
logging exceptions inline ("8 prompts" for one model). What we should copy: the real
artifact one click away, and cost published next to every model. What we should not copy:
the authored verdict layer — we publish recordings and mechanical facts and let the
visitor's eyes be the judge; a scored rubric would put us back in the game we explicitly
opted out of.

**Goldie Bench (game task).** A wall of tiles where each opens "that model's actual
one-shot HTML in a new tab" — live artifacts, not recordings [51]. No cost or time is
published (occasional file sizes instead); scoring is the author's three axes (0–10 each),
backed by automated smoke tests that report pixel diffs. Its one-shot claim survives an
honest blemish log (a "RETRY @ 24K tokens" annotation). Copy: nothing beats "run the real
thing" — our synced videos are the closest a recording format can get, and the blemish log
is worth stealing verbatim in spirit. Do not copy: the paid-community marketing framing and
exit popups wrapped around the results, which are anti-thesis to "calm little tools".

**Design Arena.** A crowdsourced leaderboard: human votes distilled into Elo ratings and
win rates per model across categories [52]. Per-row cost and time are absent, but two
scatter charts plot "Preference vs Price (log scale)" and "Preference vs Speed" — cost and
latency *are* presented, just visually. Outputs are viewable through its build/compare
tool, and the leaderboard itself renders only via a JS app. Copy: the price-vs-preference
scatter is a genuinely good idea for a future CapyBench iteration once visitors supply
preference data — our published USD/time columns are exactly the axes it needs. Do not
copy: the JS-gated leaderboard (a static page should render every number server-side, the
way Capytools already does everything) and, implicitly, the crowdsourced-vote dependency —
our v1 deliberately ships no voting and no accounts.

**Cross-cutting takeaway.** All three get credit for showing the true artifact; the two
things none of them publish together are *cost per run* and *unchanged mechanical facts
next to the artifact* — which is precisely the gap CapyBench's "time, tokens, USD, no
score" wall occupies.
