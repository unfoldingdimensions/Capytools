/**
 * CapyInvoice — pure formatting helpers.
 *
 * No React, no DOM, no storage. Deterministic functions of their arguments,
 * unit-testable without a browser. `fileNameSafe` and `formatBytes` match
 * CapyResume's (the per-tool convention: capyread and capypassport carry
 * their own copies too).
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-10-09` → `9 Oct 2026`; anything else is returned trimmed. */
export function formatDay(value?: string): string {
  const raw = value?.trim();
  if (!raw) return '';
  const parts = raw.split('-');
  if (parts.length !== 3) return raw;
  const [year, month, day] = parts;
  if (year === undefined || month === undefined || day === undefined) return raw;
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return raw;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return raw;
  return [String(Number(day)), MONTHS[monthIndex], year].join(' ');
}

/** Today as `YYYY-MM-DD` in the user's local time — the date inputs' shape. */
export function todayIso(): string {
  const now = new Date();
  const month = `0${now.getMonth() + 1}`.slice(-2);
  const day = `0${now.getDate()}`.slice(-2);
  return [String(now.getFullYear()), month, day].join('-');
}

/** `1536` → `1.5 KB`. Used for export notices. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 ? String(Math.round(value)) : value.toFixed(1);
  const out = [rounded, units[unit]].join(' ');
  return out;
}

/**
 * A safe download filename stem: lowercased, non-alphanumerics collapsed to
 * single dashes, length-capped, and never empty.
 */
export function fileNameSafe(input: string, fallback = 'invoice'): string {
  const stem = (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return stem || fallback;
}

/** True when the string is blank or whitespace-only. */
export function isBlank(value?: string): boolean {
  return !value || value.trim().length === 0;
}
