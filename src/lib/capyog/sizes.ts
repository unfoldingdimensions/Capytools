/**
 * The size presets, with the honest crop/limit line for each.
 *
 * The social-card size advice on blogs is mostly wrong; these notes carry what
 * the platforms themselves document. The facts (verified 2026-09-05, ledger in
 * docs/research/capyog/sources.json): Facebook asks for "at least 1200×630";
 * LinkedIn's minimum is 1200×627 in a 1.91:1 center-crop frame; X publishes no
 * recommended size at all — only bounds and a 2:1 card that center-crops (the
 * famous "1200×628" was never an official X number); Discord, Slack and
 * Bluesky publish no pixel dimensions; Instagram wants ≥1080 px wide with
 * ratios 1.91:1–3:4; YouTube now recommends 4K and caps mobile thumbnails at
 * 2 MB; Pinterest documents exactly 1000×1500 and cuts taller pins in feed.
 */

export interface OgSizePreset {
  /** "link" | "square" | "portrait" | "story" | "wide" | "pin" */
  id: string;
  label: string;
  platforms: string;
  width: number;
  height: number;
  note: string;
}

export const SIZE_PRESETS: OgSizePreset[] = [
  {
    id: "link",
    label: "Link card",
    platforms: "X · LinkedIn · Facebook · Discord · Slack",
    width: 1200,
    height: 630,
    note: "X crops to 2:1 · LinkedIn needs ≥ 1200×627 · Facebook accepts ≤ 8 MB",
  },
  {
    id: "square",
    label: "Square",
    platforms: "Instagram · anywhere",
    width: 1080,
    height: 1080,
    note: "Instagram documents ≥ 1080 px wide; square sits inside its 1.91:1–3:4 range",
  },
  {
    id: "portrait",
    label: "Portrait",
    platforms: "Instagram feed",
    width: 1080,
    height: 1350,
    note: "IG's 4:5 — inside the documented 1.91:1–3:4 range",
  },
  {
    id: "story",
    label: "Story",
    platforms: "Instagram Stories · Reels",
    width: 1080,
    height: 1920,
    note: "The de-facto 9:16 story frame; at 3× this is ~18.7 MP of canvas",
  },
  {
    id: "wide",
    label: "Wide 16:9",
    platforms: "YouTube thumbnails · slides · docs",
    width: 1280,
    height: 720,
    note: "YouTube recommends 4K now, and caps mobile thumbnails at 2 MB — prefer JPEG here",
  },
  {
    id: "pin",
    label: "Pin",
    platforms: "Pinterest",
    width: 1000,
    height: 1500,
    note: "Exactly Pinterest's documented 2:3; taller pins get cut in the feed",
  },
];

export const DEFAULT_SIZE_ID = "link";

export function getSize(id: string): OgSizePreset {
  return SIZE_PRESETS.find((preset) => preset.id === id) ?? SIZE_PRESETS[0];
}
