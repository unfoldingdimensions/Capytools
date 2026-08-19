"use client";

import { toPng } from "html-to-image";
import { formatNumber } from "@/lib/capytools/demo";
import type { WrappedStats } from "@/lib/github/types";

/** Capture a rendered node to an exact-size PNG and trigger a download. */
export async function exportNodePng(
  node: HTMLElement,
  opts: { width: number; height: number; filename: string },
) {
  await document.fonts.ready; // Fraunces/PJS/Plex must be loaded before capture
  const dataUrl = await toPng(node, {
    width: opts.width,
    height: opts.height,
    pixelRatio: 1,
    cacheBust: true,
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = opts.filename;
  a.click();
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Plain-language share line for the "copy post" button. */
export function shareLine(stats: WrappedStats, url: string): string {
  return `My GitHub year, wrapped ✨ ${formatNumber(stats.totalStars)} stars across ${formatNumber(
    stats.totalRepos,
  )} repos — busiest ${stats.activity.busiestWeekday}. Make yours free, no tracking: ${url}`;
}
