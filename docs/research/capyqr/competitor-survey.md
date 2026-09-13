# CapyQR competitor survey — seven more generators, ranked adaptions, and the free/Pro question

*Prepared 2026-09-13 by a reviewer session. All seven sites inspected live on 2026-09-13
(features, defaults, storage, network posture); pricing via each site's own pages. Companion to
[`./miniqr-competitive-analysis.md`](./miniqr-competitive-analysis.md), which covers MiniQR in
depth — that analysis's UTF-8 finding is restated in the ranking below.*

---

## 1. The seven, one paragraph each

**[Ente QR](https://qr.ente.com)** — qr.ente.com. The encrypted-photos company's goodwill tool:
"QR codes in seconds", no ads / no tracking / no sign-ups. Radical hero (one input) that opens
into a focused editor: three named styles (Rounded / Ink / Bloom), dot/corner/eye shape pickers,
curated color swatches per part (code, eyes, background) + hex, four frame shapes with a "SCAN
ME" label, logo upload with size/padding/**white backing**, 1024 px export dropdown, and a
Web-Share sheet with an optional caption. **Zero localStorage** (verified), no accounts, no
pricing anywhere — it is marketing for ente.com. Its one line of scannability copy is the best
in the field: *"high contrast scans best. Test at arm's length."*

**[QArt Coder](https://research.swtch.com/qr/draw/)** — research.swtch.com/qr/draw/. Russ Cox's
research playground for [QArt codes](https://research.swtch.com/qart): dithers a picture **into
the data pixels themselves** (not a centered logo), with QR size / image size / placement
controls, dither and random-pixel toggles, and a "show controllable pixels" debug view. Go
compiled to WebAssembly; "(The image is not uploaded anywhere; this page executes entirely in
your browser)". Not a product — it is the canonical proof that halftone image-QRs can be made to
scan, which is exactly our plan §10's "custom module art" viral seam.

**[QRcodly](https://www.qrcodly.de)** — qrcodly.de. German, open source, "free forever":
URL / text / Wi-Fi / vCard / email / location / event / **bank (SEPA)** content types, style +
templates tabs, **CSV bulk creation**, and a **dynamic QR toggle with sign-in** ("Save in
Collection" / "Save as template" are account features). The dynamic half — redirect server,
stored links — is permanently anti-ethos for us; the static half is a solid mainstream feature
set.

**[QRCode Monkey](https://www.qrcode-monkey.com)** — the incumbent. Fourteen payload tabs (URL,
text, email, phone, SMS, vCard, **MECARD**, location, Facebook, Twitter, YouTube, Wi-Fi, event,
crypto…), colors/logo/design accordions, a 100–1000+ px quality slider, PNG free plus **SVG,
PDF and EPS** vector exports ("no support for color gradients" on the vector paths), a
templates gallery, and "Statistics and Editability" — a toggle that hands you to a separate
pro platform (app.qr-code-generator.com) behind a sign-up. Also sells a developer **API**, runs
a cookie-and-ads banner ("targeted ads"), and hosts **files behind QRs** ("Upload MP3, PDF or
any file"). Free static generation is genuinely free and good — it is the bar our free tier
must clear.

**[ZapQR](https://zapqr.net/en)** — the closest ethos neighbour. No signup for the static
generator; text / URL / email / phone / SMS / Wi-Fi / vCard / location / event; a rich
**body-shape grid** (square, rounded, circle, diamond, star, heart, triangle, plus, bars,
slashes, flower, leaf, gear, clover…) with separate eye-frame and eyeball pickers; PNG/JPG/SVG
download; and an **honest metadata panel** by the preview: output size, error-correction level,
margin, and estimated file size. Its analytics ask is opt-in and content-excluding by wording
("QR content, URLs you enter, Wi-Fi details… are never sent"). The money is on the other tab:
[Dynamic QR](https://zapqr.net/en/dynamic-qr-code-generator) — free beta, **account required**,
stable short link + scan tracking (5,000 tracked scans/month); its own copy draws the exact
line we do: static "keeps data in-browser, can't be edited or tracked".

**[FreeQRApp](https://freeqrapp.com/#generator)** — a lean SEO play: URL / Wi-Fi / contact /
email / phone / social tabs, collapsible customize panel, PNG + copy, live updates as you type,
and a content-marketing skeleton (Features / How It Works / Blogs). Nothing technically novel;
it exists to rank and run ads.

**[2QR](https://2qr.info)** — 2qr.info. An indie ultra-minimalist (Moritz Glantz): one input,
a gear for Wi-Fi/vCard templating, generate, PNG download. No accounts, no noise. The floor of
the market: proof that a *calm* generator is viable, and a reminder that minimalism alone does
not differentiate — Ente occupies the same ground with far more polish.

## 2. What the market charges for — and what that means for us

Every static generator above is free. All the money in this market sits in four places, and
three of them are permanently closed to us:

1. **Dynamic QR subscriptions** — editable destinations + scan statistics + campaign folders,
   behind accounts and a redirect server (QRCode Monkey's pro upsell, ZapQR's dynamic beta,
   QRcodly's accounts, Bitly). This is the industry's entire paid tier, and it is the one thing
   our ethos forbids: a redirect server, stored destinations, scan tracking. **We will never
   charge for this, because we will never build it — and that refusal is the positioning.**
2. **Developer APIs** (QRCode Monkey's API) — a server product. Closed to us.
3. **Ads / cookies / affiliate upsells** (QRCode Monkey, FreeQRApp) — closed to us.
4. **Bulk / batch creation** — the one demand signal that survives our ethos: QRcodly ships CSV
   bulk in the free open-source tier, ZapQR has a batch generator, MiniQR has batch export, and
   QRCode Monkey sells bulk inside its pro platform. Static batch is pure client-side work
   (CapyResize already ships a client-side ZIP writer).

So the honest answer to "could we charge for anything?" is: **not yet, and only ever for batch
convenience — never for the code itself.** The owner's standing model (traction-first; one-time
license key + Gumroad packs, only past ~10–50K visits/month, no accounts, no subscriptions)
already matches this market's shape: the only defensible paid features are the ones in §4's Pro
list, and none of them should be built until the traffic exists.

## 3. Ethos scorecard

| Site | Storage | Network by design | Self-verification | Accounts | Ads/cookies |
|---|---|---|---|---|---|
| Ente QR | none (verified) | no | no (one honest hint line) | no | no |
| QArt Coder | none | no | n/a (debug pixel view) | no | no |
| QRcodly | accounts | dynamic redirects | no | yes | no |
| QRCode Monkey | cookies | dynamic platform, file hosting | no | for dynamic | yes |
| ZapQR | opt-in analytics only | dynamic beta | no | for dynamic | opt-in, content-excluding |
| FreeQRApp | — | — | no | no | SEO/ads |
| 2QR | none | no | no | no | no |
| **CapyQR (ours)** | **none** | **no** | **yes — proof chip + guards** | **no** | **none** |

No competitor verifies its own output. Ente and ZapQR approach the ethos; only we prove it.

## 4. Ranked adaptions

Ranked by demand signal × build-ease × ethos fit; each tagged **Free** or **Pro**. "Pro" means
a candidate for the future one-time-license tier — documented now, built only when traffic
justifies it (owner's deferred-monetization stance stands).

### Must add — free

1. **UTF-8 multibyte correctness.** Not a feature — a correctness gap MiniQR closed and we
   have not (Byte mode truncates to Latin-1; CJK/emoji/é mangle inside the engine). Mechanism
   for our stack is specified in [`./miniqr-competitive-analysis.md`](./miniqr-competitive-analysis.md)
   §4.1: payload-level pre-encoding, because qr-code-styling bundles its own encoder. Everything
   else on this page is worth less than this one.
2. **tel / geo / event payload types.** Five of the eight surveyed sites ship them (Monkey,
   ZapQR, QRcodly, MiniQR, FreeQRApp-with-social); they are schema strings + fields + tests —
   the cheapest demand-backed addition we have. Matches plan §10's v2 backlog (SMSTO stays out
   until it grows a spec).
3. **Frame + caption, v0.** Ente (four frame shapes + "SCAN ME" label), MiniQR (frame presets +
   caption text/position), Monkey (templates): the frame is the print use case — stickers,
   flyers, table tents — and the most-demanded styling feature we lack. Our version must compose
   through the existing quiet-zone math and pass the proof chip like everything else. Plan §10's
   template-pack seam; ship the simple frame free first.

### Should add — free

4. **ZapQR's honest export spec line.** Error-correction level, margin, output size and
   estimated file size, printed beside the download. We already show ECC and quiet px; the
   estimated-KB figure is the one new fact, and the whole line extends the honesty brand.
   Trivial.
5. **Curated color swatches + a randomize button** (Ente's swatch rows + rainbow chip; MiniQR's
   randomize). Our pickers are raw hex today; curated swatches on house tokens plus a
   randomize-within-the-guards button is cheap delight that keeps codes scannable by
   construction.
6. **Ente's plain-language scannability hint.** "high contrast scans best. Test at arm's
   length." under the preview — one line of copy that says in seven words what our guard strip
   says in thirty. Complements the proof chip; do not replace it.
7. **Simple/Full progressive disclosure** (MiniQR) for Card 2, our densest surface. Cosmetic;
   do it whenever Card 2 next gets touched.

### Good to have — free

8. **Image-in-QR halftone art** (QArt-style; plan §10's "CapyQR but make it a capybara"). The
   viral feature, and the one only we can do *safely* — the proof chip would verify each
   dithered code before export, which no competitor bothers to. Real engineering (dithering,
   ECC-aware pixel assignment); the payoff is marketing, so it ships free whenever built.
9. **ASCII/TXT export** (MiniQR) — zero-dependency, README-friendly. Small.
10. **PDF/EPS vector exports** (Monkey) — print-shop formats with a known no-gradient caveat.
    SVG already covers most needs; add only if print users ask.
11. **Web Share sheet with caption** (Ente) — mobile-first "share the QR" via
    `navigator.share`. Small, nice on phones.
12. **A scanner/decoder as a future separate tool** (MiniQR's Scan tab; camera/upload/paste) —
    a `CapyScan`, not CapyQR scope. Free whenever it exists.
13. **PWA offline + i18n** — real reach, real infrastructure (Crowdin for 30+ locales, service
    worker under the Cloudflare deployment). Defer until there is traffic to serve.

### Never — the market's money is here, and we leave it there

- **Dynamic QR** (editable destinations, scan statistics, campaign folders): redirect server +
  stored data + accounts. The industry's whole subscription tier; permanently out.
- **File-hosting QRs** (Monkey's "Upload MP3, PDF or any file") and **URL shorteners**
  (QRcodly): server storage. Out.
- **Cookie/ads analytics** (Monkey, FreeQRApp): out. ZapQR's opt-in, content-excluding consent
  dialog is a graceful pattern worth remembering if our own analytics wording ever needs
  strengthening — our Vercel analytics is already cookieless and content-blind.

### Pro candidates — the free/Pro split

| Tier | What | When |
|---|---|---|
| **Free, forever** | Everything CapyQR does today plus items 1–7 above; halftone art and any future scanner; SVG/PNG/JPEG export; no watermark (QRcodly's "no watermarks" is table stakes — so is ours) | now |
| **Pro candidate 1** | **Batch CSV→ZIP** — the only proven willingness-to-pay that survives our ethos. Client-side (CapyResize's client-zip is already in the tree). One-time license key, verified offline; never a subscription — we have no server to gate and do not want one | build only past ~10–50K visits/mo |
| **Pro candidate 2** | **Saved brand kits** (named presets in localStorage) — plan §10's seam. Requires honest wording on the tool's promise ("kept on your device, never ours") since the browser-tool page copy says "nothing stored" today | after batch, same gate |
| **Pro candidate 3** | **Frame/caption template packs** (Gumroad pack per the owner's model) — content, not code gating | opportunistic |
| **Never Pro** | Higher resolutions, vector export, the proof scan, the guards, any current free feature. Monkey gives SVG/EPS away free; paywalling those would make us worse than the free incumbent. And dynamic anything is never built at all | — |

The one-line version: **our free tier must beat the free incumbent (it already does on
verification and privacy; frames and payloads are the gap), and the only things we could ever
honestly charge for are bulk convenience and saved preferences — later, once, and keyless.**

## 5. Sources

All inspected 2026-09-13: [qr.ente.com](https://qr.ente.com) (editor, share sheet, localStorage
probe), [research.swtch.com/qr/draw](https://research.swtch.com/qr/draw/),
[qrcodly.de](https://www.qrcodly.de), [qrcode-monkey.com](https://www.qrcode-monkey.com)
(landing incl. its monetization copy and vector-export notes),
[zapqr.net/en](https://zapqr.net/en) and [its dynamic-QR page](https://zapqr.net/en/dynamic-qr-code-generator)
(free-beta terms: account + 5,000 tracked scans/mo),
[freeqrapp.com](https://freeqrapp.com/#generator), [2qr.info](https://2qr.info). MiniQR depth:
[`./miniqr-competitive-analysis.md`](./miniqr-competitive-analysis.md).
