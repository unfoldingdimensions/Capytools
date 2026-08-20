"use client";

import { toPng } from "html-to-image";
import { formatNumber } from "@/lib/capytools/demo";
import { SITE_URL } from "@/lib/utils";
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
    pixelRatio: 2, // retina download; width/height stay the CSS size
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
    const dataUrl = await toPng(node, { width, height, pixelRatio: 2, cacheBust: true });
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

  if (node && typeof ClipboardItem !== "undefined") {
    try {
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
    } catch {
      // Browser rejected multi-MIME/image write; fall through to text copy.
    }
  }

  const textCopied = await copyText(text);
  return { ok: textCopied, withImage: false };
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
  )} repos. Create your card at ${url}`;
}

/**
 * Share URLs for the card's shareable page.
 *
 * X's web intent accepts only text/url/hashtags/via — a link can never carry an
 * image, which is why `postToX` below reaches for the OS share sheet first.
 * `SITE_URL` rather than the current origin: a localhost link is unreachable by
 * X's crawler, so no preview card would render.
 */
export function shareIntents(username: string): { url: string; x: string } {
  const url = `${SITE_URL}/u/${username}`;
  const text = `My GitHub year, wrapped in a calm little card. Create your card at`;
  return {
    url,
    x: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  };
}

/** True when this browser can put an actual file into a share sheet. */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({
      files: [new File([new Uint8Array(1)], "probe.png", { type: "image/png" })],
    });
  } catch {
    return false;
  }
}

/**
 * Whether the OS share sheet is worth opening.
 *
 * On phones it lists the installed apps — X included — so it posts the image
 * directly. On Windows/macOS the same API opens the *desktop* sheet, which
 * offers Paint, Outlook and Nearby Sharing and no social targets at all: a dead
 * end that hijacks the click. Restrict it to touch-primary devices.
 */
export function prefersNativeShare(): boolean {
  return (
    canShareFiles() &&
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

export type PostResult = "shared" | "clipboard" | "text";

/**
 * Post the card to X *with* the PNG attached, as far as the platform allows.
 *
 * There is no way to attach media through a web intent URL — X dropped that
 * years ago. Two real paths remain:
 *
 *  1. On touch devices, `navigator.share({ files })` — that sheet lists X and
 *     attaches the image directly. See `prefersNativeShare`: deliberately NOT
 *     used on desktop, where the same call opens the OS sheet (Paint, Outlook,
 *     Nearby Sharing) and never reaches X.
 *  2. Everywhere else: put the PNG on the clipboard and open the composer, so
 *     the post needs one paste. The caller should say so in the UI.
 *
 * `openIntent` is invoked synchronously by the caller in path 2 to dodge popup
 * blockers, which reject a window opened after an await.
 */
export async function postToX(
  node: HTMLElement | null,
  stats: WrappedStats,
  url: string,
  size: { width: number; height: number },
): Promise<PostResult> {
  const text = shareLine(stats, url);
  const blob = node ? await capturePngBlob(node, size.width, size.height) : null;

  if (blob && prefersNativeShare()) {
    const file = new File([blob], `wrapped-${stats.username}.png`, { type: "image/png" });
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (err) {
      // The user dismissing the sheet is not a failure — don't then spam the
      // clipboard and a new tab behind their back.
      if (err instanceof Error && err.name === "AbortError") return "shared";
    }
  }

  if (blob && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return "clipboard";
    } catch {
      // fall through to text-only
    }
  }

  return (await copyText(text)) ? "text" : "text";
}
