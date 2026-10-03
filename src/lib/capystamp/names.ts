import { extensionFor } from "@/lib/capyresize/render";
import type { OutputFormat } from "@/lib/capyresize/types";

/**
 * Output filenames: `<base>-stamped.<ext>`, de-duplicated in drop order
 * (`photo-stamped.jpg`, `photo-stamped-2.jpg`), and the batch ZIP's name.
 * Pure — the node tests table-test the odd shapes (no extension, dots,
 * unicode) here so the browser path stays thin.
 */

/** The source name without its last extension; `""` or `.jpg` → "image". */
export function stampBaseName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base || "image";
}

/**
 * One output name; `taken` carries the names already used this run so a
 * batch of two `photo.jpg`s becomes `photo-stamped.jpg` and
 * `photo-stamped-2.jpg` instead of a silent overwrite in the ZIP.
 */
export function stampFilename(name: string, format: OutputFormat, taken?: Set<string>): string {
  const base = stampBaseName(name);
  const ext = extensionFor(format);
  const first = `${base}-stamped.${ext}`;
  if (!taken || !taken.has(first)) {
    taken?.add(first);
    return first;
  }
  let n = 2;
  while (taken.has(`${base}-stamped-${n}.${ext}`)) n += 1;
  const next = `${base}-stamped-${n}.${ext}`;
  taken.add(next);
  return next;
}

/** The batch ZIP: `capystamp-7-images.zip`. One image never zips. */
export function zipName(count: number): string {
  return `capystamp-${Math.max(1, count)}-images.zip`;
}
