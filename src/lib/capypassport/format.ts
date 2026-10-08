/**
 * Millimetres, pixels and bytes — the unit conversions every readout prints.
 * Pure and node-testable (plan §5.1: one place, so a mm in the UI is the same
 * mm the sheet printer puts on paper).
 */

export const MM_PER_INCH = 25.4;

/** mm → px at the given dpi, rounded to whole pixels. A 413-px cell at 300 dpi
 *  prints 34.96 mm — the nearest a raster can come to 35; nothing more exact
 *  exists short of a vector press. */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

/** px → mm at the given dpi (the honest inverse of a rounded mmToPx). */
export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH;
}

/** `34.97` — one decimal is finer than scissors and quieter than `34.968503`. */
export function formatMm(mm: number): string {
  return (Math.round(mm * 10) / 10).toFixed(1);
}

/** The readout form: value + unit, one decimal. */
export function mmLabel(mm: number): string {
  return `${formatMm(mm)} mm`;
}

/** `1.2 MB` / `640 kB` — the honest byte counts CapyResize's family uses. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 kB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(Math.round((bytes / (1024 * 1024)) * 10) / 10).toFixed(1)} MB`;
}

/** A percentage that never prints `-0%` or nine decimals. */
export function formatPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
