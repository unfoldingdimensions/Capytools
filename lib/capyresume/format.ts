/**
 * CapyResume — pure formatting helpers.
 *
 * No React, no DOM, no storage. Everything here is a deterministic function of
 * its arguments so it can be unit-tested without a browser.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `2020-03` → `Mar 2020`; `2020` → `2020`; anything else is returned trimmed. */
export function formatMonth(value?: string): string {
  if (!value) return '';
  const raw = value.trim();
  if (!raw) return '';

  const ym = /^(\d{4})-(\d{1,2})$/.exec(raw);
  if (ym) {
    const monthIndex = Number(ym[2]) - 1;
    if (monthIndex >= 0 && monthIndex < 12) return `${MONTHS[monthIndex]} ${ym[1]}`;
  }

  const y = /^(\d{4})$/.exec(raw);
  if (y) return y[1]!;

  return raw;
}

/**
 * `Mar 2020 – Present`, `Mar 2020 – Jun 2022`, or a single bound.
 * Uses an en dash, which every reader and parser treats as plain text.
 */
export function formatDateRange(start?: string, end?: string, current?: boolean): string {
  const from = formatMonth(start);
  const to = current ? 'Present' : formatMonth(end);
  if (from && to) return `${from} \u2013 ${to}`;
  return from || to || '';
}

const LEADING_BULLET = /^[\s\u2022\u25CF\u25AA\u00B7\-*\u2013\u2014]+/;

/**
 * Normalise a bullet for output: drop any bullet glyph the user typed or that
 * came in from a paste, collapse runs of whitespace, trim.
 */
export function normaliseBullet(text: string): string {
  if (!text) return '';
  return text.replace(LEADING_BULLET, '').replace(/\s+/g, ' ').trim();
}

/** Drop empty bullets and normalise the rest, preserving order. */
export function normaliseBullets(texts: readonly string[]): string[] {
  return texts.map(normaliseBullet).filter((text) => text.length > 0);
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
  return `${rounded} ${units[unit]}`;
}

/**
 * A safe download filename stem: lowercased, non-alphanumerics collapsed to
 * single dashes, length-capped, and never empty.
 */
export function fileNameSafe(input: string, fallback = 'resume'): string {
  const stem = (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return stem || fallback;
}

/** True when the entry contributes nothing the user would recognise as content. */
export function isBlank(value?: string): boolean {
  return !value || value.trim().length === 0;
}
