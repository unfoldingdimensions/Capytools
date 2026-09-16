/**
 * Card exports — PNG download, clipboard, and copyable tokens.
 *
 * Everything here is pure client-side: no network, no storage. The PNG is
 * taken straight from the rendered canvas (the same pixels the user sees).
 */

import type { MoodPalette } from "./types";

export function pngFilename(palette: MoodPalette): string {
  return `capytone-${palette.slug}.png`;
}

/** Download the canvas as a PNG file. */
export function downloadPng(canvas: HTMLCanvasElement, palette: MoodPalette): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pngFilename(palette);
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

/** Copy the canvas PNG to the clipboard; falls back to a download. */
export async function copyPngToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
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

/** CSS custom properties, ready to paste into a :root block. */
export function cssTokens(palette: MoodPalette): string {
  const slug = palette.slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return [
    `--capytone-${palette.slug}-bg: ${palette.bg};`,
    `--capytone-${palette.slug}-mid: ${palette.mid};`,
    `--capytone-${palette.slug}-accent: ${palette.accent};`,
    `--capytone-${palette.slug}-surface: ${palette.surface};`,
    `--capytone-${palette.slug}-ink: ${palette.ink};`,
    `/* camelCase alias: ${slug} */`,
  ].join("\n");
}

/** Tailwind theme extension snippet. */
export function tailwindTokens(palette: MoodPalette): string {
  return [
    `// tailwind.config — theme.extend.colors`,
    `"${palette.slug}": {`,
    `  bg: "${palette.bg}",`,
    `  mid: "${palette.mid}",`,
    `  accent: "${palette.accent}",`,
    `  surface: "${palette.surface}",`,
    `  ink: "${palette.ink}",`,
    `},`,
  ].join("\n");
}

/** Plain-language share text — the X-post voice. */
export function shareText(palette: MoodPalette, url: string): string {
  return `"${palette.mood}" → this little poster. made in my browser, no AI, no signup: ${url}`;
}
