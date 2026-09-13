# CapyQR vs MiniQR — competitive analysis

*Prepared 2026-09-13 by a reviewer session. Subject inspected live:
[mini-qr-code-generator.vercel.app](https://mini-qr-code-generator.vercel.app) (v0.30.0) and its
source at [lyqht/mini-qr](https://github.com/lyqht/mini-qr) (main). Comparand: CapyQR, tool no. 7
on `main` (ba85e29, including the cd16351 certify fix).*

## 1. What MiniQR is

MiniQR is the closest live competitor to CapyQR: a free, client-side styled-QR generator with
colors, logo, presets and export. Same engine family — it is built on `qrcode-generator` (v2) and
a **vendored, rewritten fork of qr-code-styling** (their "internal QR-code rendering lib",
`src/lib/qr-code/`), so the drawing vocabulary is the same dots/corners/gradient surface we ship.
The scanner side uses `html5-qrcode` + `qr-scanner`; batch export uses `jszip`.

- Vue 3 + Vite + Tailwind, shadcn-vue; Vitest + Playwright; Storybook.
- **GPL-3.0** (we are Apache-2.0 — no code flow in either direction, and none contemplated).
- PWA installability (not a Tauri desktop app), Docker self-hosting, ~2.4k stars.
- Crowdin-backed **i18n in 30+ languages**; @vercel/analytics like ours; GitHub Sponsors funding.

## 2. Feature matrix

| | MiniQR | CapyQR (no. 7) |
|---|---|---|
| Payload types | text, URL, email, phone, SMS, Wi-Fi, vCard, location, event, EPC/SEPA payment | link & text, Wi-Fi, vCard contact, email |
| Styling | dots/corners types, per-part colors, gradients, logo (upload **or remote URL**), border radius, arbitrary W×H px | dot/corner types, solid/gradient fg, background, transparent bg, logo upload |
| Presets | named presets + **randomize style** | five Capy presets |
| Quiet zone | "Margin (modules)", **default 0** | slider in modules, **default 4**, live px conversion shown |
| Scannability | — no self-verification of the created code | **proof scan**: the tool decodes its own render in-tab, chip says what decoded (upright vs inverted labeled), guards for contrast/quiet/logo as labeled heuristics |
| Export | PNG / JPG / SVG / **ASCII-TXT**, clipboard, batch CSV→ZIP, arbitrary px (default 200×200) | PNG / JPEG (512–2048, transparent-JPEG flattened with a note) / SVG (logo-free), clipboard |
| Config | **save/load configuration as JSON file**, persists config in localStorage | nothing stored |
| Frames | frame presets + caption text/position/font | — (plan §10 seam) |
| Scanner mode | separate tab: camera / upload / paste decode of *external* codes | — |
| UX extras | Simple/Full settings toggle, dark mode, i18n 30+, changelog badge | house design system, StageCard flow |

## 3. Ethos comparison — where the houses differ

This is the sharpest line between the two products:

1. **Storage.** MiniQR persists `qrCodeConfig` (full config incl. data) and `qrSimpleFields` in
   localStorage — verified live. CapyQR stores nothing, ever; the suite forgets the tab.
2. **Network.** MiniQR's logo field takes **remote image URLs** (its default placeholder is a
   remote asset) — every such render is a network fetch by design. CapyQR is upload-only (object
   URLs, revoked on replace/unmount); the §9 smoke showed zero network requests across
   compose→verify→export.
3. **Verification.** MiniQR scans *other* codes (Scan tab) but never proves the code it just
   built; its default margin of 0 modules sits below our "hard" guard band and would read as
   risky on our page. CapyQR's whole thesis — "proven scannable in-tab" — is the feature they
   do not have, and it is the one that is hardest to bolt on later because it is a *contract*,
   not a control.
4. **Defaults honesty.** MiniQR exposes arbitrary pixel sizes (200×200 default) and 0-margin
   defaults; CapyQR pins preview == export pixels at 512/1024/2048 and computes the quiet zone
   in modules with the px shown.

## 4. What MiniQR has that we should take — ranked

1. **UTF-8 multibyte correctness (the real gap — take this).** Their README advertises "UTF-8
   multibyte support (CJK, Arabic, emoji, Vietnamese)", and they earned it: their vendored engine
   overrides `qrcode.stringToBytes` with
   [`utf8StringToBytes`](https://github.com/lyqht/mini-qr/blob/main/src/lib/qr-code/utf8.ts)
   (`new TextEncoder().encode(s)`). Our engine — qr-code-styling's bundled encoder — truncates
   Byte mode to Latin-1 (`charCodeAt & 0xff`), so a Wi-Fi SSID with é, a vCard with 中文 or any
   emoji is silently corrupted *inside the engine*, and the export is wrong while the preview
   looks plausible. This was flagged as the top fold-back item in PR #15's report; a competitor
   has now shipped the fix.
   **Mechanism for our stack (differs from theirs):** qr-code-styling *bundles its own copy* of
   the encoder, so overriding the standalone `qrcode-generator` module reaches `matrix.ts` but
   **not** the engine. The correct seam for us is at the payload boundary: pre-encode the
   composed payload to a UTF-8 byte-string (`String.fromCharCode(...new TextEncoder().encode(s))`,
   chunked) before handing it to both `matrix.ts` and the engine — phones decode Byte mode as
   UTF-8 bytes, `matrix.ts` then counts the true bytes, ASCII payloads are byte-identical (zero
   regression risk), and the proof chip verifies the round trip. Wi-Fi escaping must stay on the
   *original* text (schema-level), then encode. Estimated: one pure helper + wiring in
   `payloads.ts`/`matrix.ts` + tests, ~60 lines. **Recommended as the next CapyQR branch off
   main, pending owner go-ahead.**
2. **Payload-type breadth (v2 backlog, matches our §10).** tel / geo / event are low-risk
   schema additions; their SEPA (EPC 069-12) row is EU-niche but free to add later. Their
   shipping SMS/phone validates demand while our plan's SMSTO-has-no-spec stance still holds.
3. **Batch CSV→ZIP** — exactly our documented Pro seam (§10). Their execution (jszip + per-row
   frame text) is the shape to copy when the seam opens.
4. **Frame/caption designer** — our §10 template-pack seam. Their "Default Frame + caption
   text/position + font family (18 fonts)" is a reasonable spec to start from.
5. **Config save/load as a file.** MiniQR does JSON download/upload — file-based, nothing
   persisted server-side, so it *can* be made ethos-compatible ("keep" is one of the house
   rules). Owner call; low effort (we already do file downloads everywhere).
6. **Randomize style** — a one-button delight on the same data we already have (random pick
   within the guard-passing space). Cheap.
7. **Simple/Full toggle** — Card 2 is our densest surface; a progressive-disclosure toggle is a
   legitimate UX aid. Cosmetic, optional.
8. **ASCII/TXT export** — zero-dependency quirk, good for terminal READMEs. Low priority.
9. **i18n (30+ languages via Crowdin)** — real reach, real infrastructure cost. Defer.
10. **PWA** — conflicts with nothing but changes the hosting story. Defer.

## 5. What we should not chase

- Remote logo URLs (network by design), localStorage config persistence, 0-margin defaults,
  unverified output. These are MiniQR's conveniences and our anti-ethos; they are also the
  clearest things to say in our copy when someone compares the two.

## 6. Positioning note

MiniQR owns "mini qr code generator" and the cute-codes space, GPL + sponsors. CapyQR's
differentiators — *the tool proves the code scans before you export*, and *keeps nothing* — are
truthful today, test-enforced, and map to §9's smoke. The UTF-8 item in §4.1 is the only place
where their output is *more correct* than ours; close it and the proof loop covers every input
the tool accepts.
