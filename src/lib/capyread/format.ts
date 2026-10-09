/**
 * Small pure formatters for the run's numbers. Byte formatting is NOT here —
 * CapyResize's `formatBytes` is the house one, and CapyRead imports it rather
 * than growing a second copy that drifts.
 */

import type { Bucket } from "./clean";

/** 64200 → "1.1 min" · 8400 → "8.4 s" · 340 → "340 ms" — the honest clock. */
export function formatMs(ms: number): string {
  if (ms >= 90_000) return `${(ms / 60_000).toFixed(1)} min`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms)} ms`;
}

/** The badge's word. Never colour alone — the words card pairs this text
 *  with its tint (production-invariants). */
export function bucketLabel(bucket: Bucket): string {
  switch (bucket) {
    case "high":
      return "High";
    case "fair":
      return "Fair";
    case "unsure":
      return "Unsure";
    case "none":
      return "Nothing read";
  }
}

/** "81" → "81% sure" — the number the badge rounds to, nothing spurious. */
export function confidenceLabel(mean: number | null): string {
  return mean === null ? "No words" : `${mean}% sure`;
}
