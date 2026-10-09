/**
 * CapyInvoice — money primitives.
 *
 * Pure module. No React, no DOM, no storage.
 *
 * **The one rule of this tool: every money amount is an integer number of
 * minor units** — cents, pence, yen, the smallest unit of the currency — from
 * the moment a user's input is parsed to the moment it is printed. Floating
 * point never holds an amount: 0.1 + 0.2 in a binary float is 0.30000000000000004,
 * and an invoice that prints that is broken. Parsing rounds once, at the
 * input; arithmetic between parse and print is integer-only.
 *
 * **Rounding, stated once and used everywhere:** round half away from zero
 * ("half up" on positive amounts). It is what most invoicing software does and
 * it is symmetric, so a credit line (a negative amount) rounds the same way
 * as a charge. Tax is computed per line (see ./compute.ts); this module only
 * owns the primitives those rules are built from.
 *
 * Quantities are the one non-integer in the model — hours can be 3.5 — and
 * they are rounded exactly once, when the line amount is formed.
 */

/** Round half away from zero: 2.5 → 3, 3.5 → 4, −2.5 → −3. */
export function roundHalfAwayFromZero(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

const CURRENCY_CODE = /^[A-Za-z]{3}$/;

/** A loose check: three letters is the ISO 4217 shape. Whether the code exists is Intl's business. */
export function isCurrencyCode(input: string): boolean {
  return CURRENCY_CODE.test(input.trim());
}

/**
 * The currency's minor-unit exponent from ISO 4217, via Intl: USD → 2, JPY → 0,
 * KWD → 3. `Intl` is the source of truth here so a currency the table below
 * (there is none) would miss still resolves correctly; the try/catch covers a
 * well-formed but unknown code, which keeps its default of 2.
 */
export function currencyMinorDigits(currency: string): number {
  const code = currency.trim().toUpperCase();
  if (!CURRENCY_CODE.test(code)) return 2;
  try {
    const resolved = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).resolvedOptions();
    return resolved.maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/**
 * `1234` minor units of USD → "$12.34"; of JPY → "¥1,234"; of KWD → "KWD 1.234"
 * (in a locale that renders it so). The integer minor units are divided by
 * 10^digits only at this last step, for the formatter — never for arithmetic.
 * An unparseable currency code falls back to 2 digits rather than throwing.
 */
export function formatMoney(minor: number, currency: string): string {
  const digits = currencyMinorDigits(currency);
  const code = currency.trim().toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(
      minor / 10 ** digits,
    );
  } catch {
    return (minor / 10 ** digits).toFixed(digits);
  }
}

/** `2000` basis points → "20%"; `1250` → "12.5%". Rates carry at most two decimals. */
export function formatRate(bp: number): string {
  return `${(bp / 100).toString()}%`;
}

// ---------------------------------------------------------------------------
// Parsing — the single boundary where a typed string becomes an integer
// ---------------------------------------------------------------------------

/**
 * One decimal lexer for every numeric input. The separator rules, in order:
 *
 * 1. Both "." and "," present — the LAST separator is the decimal mark and
 *    every earlier one is grouping, which reads "1,234.56" (en) and
 *    "1.234,56" (de) correctly.
 * 2. Only commas — a comma with 1–2 digits after it is the decimal mark
 *    ("12,5"); with three it is a thousands grouping ("1,234", "12,345").
 * 3. Only one dot — it is the decimal mark ("12.5", "12.345"); more than one
 *    dot is grouping all the way ("1.234.567"), because a number has one
 *    decimal mark.
 *
 * Spaces and apostrophes group digits, parentheses or a leading minus make a
 * negative, and currency symbols are stripped. Returns null for anything that
 * is not one number.
 */
export function parseDecimalInput(raw: string): {
  neg: boolean;
  int: string;
  frac: string;
} | null {
  let text = raw.trim();
  if (!text) return null;

  let neg = false;
  if (/^\(.*\)$/.test(text)) {
    neg = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith('-')) {
    neg = true;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }
  text = text.replace(/[\s'’_£$€¥₹]/g, '');
  if (!text) return null;

  const dots = (text.match(/\./g) ?? []).length;
  const commas = (text.match(/,/g) ?? []).length;

  let int: string;
  let frac: string;
  if (dots > 0 && commas > 0) {
    const lastSep = Math.max(text.lastIndexOf('.'), text.lastIndexOf(','));
    int = text.slice(0, lastSep);
    frac = text.slice(lastSep + 1);
  } else if (dots > 1 || commas > 1) {
    // Many separators of one kind, no separator of the other: groupings.
    // The single-separator cases below are what decide a decimal mark.
    int = text;
    frac = '';
  } else if (commas === 1) {
    const at = text.lastIndexOf(',');
    if (text.length - at - 1 >= 1 && text.length - at - 1 <= 2) {
      int = text.slice(0, at);
      frac = text.slice(at + 1);
    } else {
      int = text;
      frac = '';
    }
  } else if (dots === 1) {
    const at = text.lastIndexOf('.');
    int = text.slice(0, at);
    frac = text.slice(at + 1);
  } else {
    int = text;
    frac = '';
  }

  int = int.replace(/[.,]/g, '');
  frac = frac.replace(/[.,]/g, '');

  if (!/^\d*$/.test(int) || !/^\d*$/.test(frac)) return null;
  if (!int && !frac) return null;
  // A number whose integer part cannot be held exactly in a float64 is not an
  // amount anyone is invoicing; refuse it rather than round silently.
  if (int.length > 15) return null;

  return { neg, int: int || '0', frac };
}

/** Scale a parsed decimal to an integer with `digits` fraction digits, half away from zero. */
function toScaledInt(parsed: { neg: boolean; int: string; frac: string }, digits: number): number {
  const kept = parsed.frac.slice(0, digits).padEnd(digits, '0');
  const roundUp = parsed.frac.length > digits && parsed.frac[digits] >= '5';
  const value = Number(parsed.int) * 10 ** digits + Number(kept || '0') + (roundUp ? 1 : 0);
  return parsed.neg ? -value : value;
}

/**
 * A typed amount → integer minor units, rounded half away from zero at the
 * currency's own precision: "12.345" of USD → 1235 (of 12.345 → .5 up), of
 * JPY → 12. Returns null for empty or unparseable input, so the caller keeps
 * the last good value instead of storing NaN.
 */
export function parseMinorUnits(raw: string, digits: number): number | null {
  const parsed = parseDecimalInput(raw);
  if (!parsed) return null;
  return toScaledInt(parsed, Math.max(0, Math.min(6, digits)));
}

/** A typed quantity → a number. Quantities are not negative; null on junk. */
export function parseQuantity(raw: string): number | null {
  const parsed = parseDecimalInput(raw);
  if (!parsed || parsed.neg) return null;
  const value = Number(`${parsed.int}.${parsed.frac || '0'}`);
  return Number.isFinite(value) ? value : null;
}

/** A typed percent → basis points (12.5% → 1250), half up at two decimals. Not negative. */
export function parsePercentToBp(raw: string): number | null {
  const parsed = parseDecimalInput(raw);
  if (!parsed || parsed.neg) return null;
  return toScaledInt(parsed, 2);
}
