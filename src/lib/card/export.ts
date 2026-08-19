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

/** Render a node to an exact-size PNG Blob (used for the clipboard image copy). */
export async function capturePngBlob(
  node: HTMLElement,
  width: number,
  height: number,
): Promise<Blob | null> {
  await document.fonts.ready;
  try {
    const dataUrl = await toPng(node, { width, height, pixelRatio: 1, cacheBust: true });
    return await (await fetch(dataUrl)).blob();
  } catch {
    return null;
  }
}

/**
 * Copy the share line AND the PNG image as a single clipboard payload, so a
 * paste into X/IG/LinkedIn carries the card image ready to post (with the
 * caption as text). Falls back to copying just the text if the image/clipboard
 * APIs aren't available.
 */
export async function copyPost(
  node: HTMLElement | null,
  stats: WrappedStats,
  url: string,
  size: { width: number; height: number },
): Promise<{ ok: boolean; withImage: boolean }> {
  const text = shareLine(stats, url);
  try {
    if (node && typeof ClipboardItem !== "undefined") {
      const blob = await capturePngBlob(node, size.width, size.height);
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
        return { ok: true, withImage: true };
      }
    }
    await copyText(text);
    return { ok: true, withImage: false };
  } catch {
    return { ok: false, withImage: false };
  }
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

/**
 * Share intent URLs for the card's shareable page. X + LinkedIn support clean
 * web intents. Instagram has no web share intent (only the native app), so it
 * is intentionally not represented here.
 */
export function shareIntents(username: string): {
  url: string;
  x: string;
  linkedin: string;
} {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/u/${username}`;
  const text = `My GitHub year, wrapped in a calm little card — no signup, no tracking, nothing stored.`;
  return {
    url,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  };
}
