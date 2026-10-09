import { describe, expect, it } from 'vitest';
import {
  currencyMinorDigits,
  formatMoney,
  formatRate,
  isCurrencyCode,
  parseDecimalInput,
  parseMinorUnits,
  parsePercentToBp,
  parseQuantity,
  roundHalfAwayFromZero,
} from '@/lib/capyinvoice/money';

describe('roundHalfAwayFromZero — the one rounding rule', () => {
  it('rounds ties away from zero', () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(3.5)).toBe(4);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(roundHalfAwayFromZero(-3.5)).toBe(-4);
    expect(roundHalfAwayFromZero(0.5)).toBe(1);
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
  });

  it('leaves non-ties to the nearest side', () => {
    expect(roundHalfAwayFromZero(2.4)).toBe(2);
    expect(roundHalfAwayFromZero(2.6)).toBe(3);
    expect(roundHalfAwayFromZero(-2.4)).toBe(-2);
    expect(roundHalfAwayFromZero(125.625)).toBe(126);
  });

  it('differs from Math.round on negative ties, which round toward +∞ there', () => {
    // Math.round(-2.5) === -2. The invoice rule is symmetric: away from zero.
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(Math.round(-2.5)).toBe(-2); // the contrast, pinned
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
  });
});

describe('currencyMinorDigits — ISO 4217 exponents via Intl', () => {
  it('knows the currencies whose minor unit is not a hundredth', () => {
    expect(currencyMinorDigits('USD')).toBe(2);
    expect(currencyMinorDigits('EUR')).toBe(2);
    expect(currencyMinorDigits('JPY')).toBe(0); // yen has no minor unit
    expect(currencyMinorDigits('KWD')).toBe(3); // dinars trade in thousandths
    expect(currencyMinorDigits('BHD')).toBe(3);
    expect(currencyMinorDigits('BIF')).toBe(0);
  });

  it('is case-insensitive and trims', () => {
    expect(currencyMinorDigits(' jpy ')).toBe(0);
  });

  it('degrades to 2 digits rather than throwing on an unknown code', () => {
    expect(currencyMinorDigits('XYZ')).toBe(2);
    expect(currencyMinorDigits('')).toBe(2);
    expect(currencyMinorDigits('dollars')).toBe(2);
  });
});

describe('formatMoney — minor units only become text at print time', () => {
  // Assertions use the en-US rendering (the test and CI locale); the point is
  // the grouping of minor units, not the symbol's side.
  it('places the decimal point at the currency\'s exponent', () => {
    expect(formatMoney(1234, 'USD')).toContain('12.34');
    expect(formatMoney(1234, 'JPY')).toContain('1,234');
    expect(formatMoney(1234, 'JPY')).not.toContain('12.34');
    expect(formatMoney(1234, 'KWD')).toContain('1.234');
  });

  it('prints zero and negatives honestly', () => {
    expect(formatMoney(0, 'USD')).toContain('0.00');
    expect(formatMoney(-250, 'USD')).toMatch(/-\D?2\.50/); // the sign, then the amount
  });

  it('falls back to a plain fixed format when Intl rejects the currency', () => {
    expect(formatMoney(1234, 'zz')).toBe('12.34');
  });
});

describe('isCurrencyCode', () => {
  it('accepts the three-letter shape and nothing else', () => {
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode(' usd ')).toBe(true);
    expect(isCurrencyCode('us$')).toBe(false);
    expect(isCurrencyCode('US')).toBe(false);
    expect(isCurrencyCode('USDX')).toBe(false);
    expect(isCurrencyCode('')).toBe(false);
  });
});

describe('parseDecimalInput — one lexer for every numeric field', () => {
  it('takes the last separator as the decimal mark when both kinds appear', () => {
    expect(parseDecimalInput('1,234.56')).toEqual({ neg: false, int: '1234', frac: '56' });
    expect(parseDecimalInput('1.234,56')).toEqual({ neg: false, int: '1234', frac: '56' });
    expect(parseDecimalInput('1 234,56')).toEqual({ neg: false, int: '1234', frac: '56' });
  });

  it('reads a lone comma with 1–2 digits after it as a decimal mark', () => {
    expect(parseDecimalInput('12,5')).toEqual({ neg: false, int: '12', frac: '5' });
    expect(parseDecimalInput('12,34')).toEqual({ neg: false, int: '12', frac: '34' });
    expect(parseDecimalInput('.5')).toEqual({ neg: false, int: '0', frac: '5' });
  });

  it('reads a lone separator with three digits after it as a grouping', () => {
    expect(parseDecimalInput('1,234')).toEqual({ neg: false, int: '1234', frac: '' });
    expect(parseDecimalInput('12,345')).toEqual({ neg: false, int: '12345', frac: '' });
    expect(parseDecimalInput('1,234,567')).toEqual({ neg: false, int: '1234567', frac: '' });
  });

  it('reads a lone dot as the decimal mark, even with three digits after it', () => {
    // The dot is the decimal mark by default; "12.345" is over-precise, not "twelve thousand".
    expect(parseDecimalInput('12.345')).toEqual({ neg: false, int: '12', frac: '345' });
    expect(parseDecimalInput('1.234')).toEqual({ neg: false, int: '1', frac: '234' });
  });

  it('reads several dots with no comma as groupings', () => {
    expect(parseDecimalInput('1.234.567')).toEqual({ neg: false, int: '1234567', frac: '' });
  });

  it('reads parentheses and a minus as negatives', () => {
    expect(parseDecimalInput('(12.34)')?.neg).toBe(true);
    expect(parseDecimalInput('-12.34')?.neg).toBe(true);
    expect(parseDecimalInput('-(12.34)')).toEqual(null); // only one negation mark is honoured
  });

  it('strips currency symbols a paste might carry', () => {
    expect(parseDecimalInput('£12.34')).toEqual({ neg: false, int: '12', frac: '34' });
    expect(parseDecimalInput('$ 1,234.56')).toEqual({ neg: false, int: '1234', frac: '56' });
    expect(parseDecimalInput('€12,5')).toEqual({ neg: false, int: '12', frac: '5' });
  });

  it('returns null for junk rather than a number', () => {
    expect(parseDecimalInput('')).toBe(null);
    expect(parseDecimalInput('   ')).toBe(null);
    expect(parseDecimalInput('abc')).toBe(null);
    expect(parseDecimalInput('12.3a4')).toBe(null);
    expect(parseDecimalInput('-')).toBe(null);
  });
});

describe('parseMinorUnits — the single boundary between typed text and integers', () => {
  it('scales to the currency\'s digits and never holds a float', () => {
    expect(parseMinorUnits('12.34', 2)).toBe(1234);
    expect(parseMinorUnits('0.01', 2)).toBe(1);
    expect(parseMinorUnits('1200', 0)).toBe(1200);
    expect(parseMinorUnits('1.234', 3)).toBe(1234);
  });

  it('rounds half away from zero at the currency\'s own precision', () => {
    expect(parseMinorUnits('12.345', 2)).toBe(1235); // the third decimal rounds up
    expect(parseMinorUnits('12.344', 2)).toBe(1234);
    expect(parseMinorUnits('12.5', 0)).toBe(13); // JPY: half a yen rounds up
    expect(parseMinorUnits('12.4', 0)).toBe(12);
    expect(parseMinorUnits('-12.5', 0)).toBe(-13); // symmetric on credits
  });

  it('reads groupings as groupings, and stays exact', () => {
    expect(parseMinorUnits('1,234.56', 2)).toBe(123456);
    expect(parseMinorUnits('1.234,56', 2)).toBe(123456);
    expect(parseMinorUnits('12,345', 0)).toBe(12345); // typed JPY with a grouping comma
  });

  it('returns null for empty or unparseable input so the caller keeps the last good value', () => {
    expect(parseMinorUnits('', 2)).toBe(null);
    expect(parseMinorUnits('abc', 2)).toBe(null);
  });
});

describe('parseQuantity', () => {
  it('accepts fractional quantities — hours can be 3.5', () => {
    expect(parseQuantity('3.5')).toBe(3.5);
    expect(parseQuantity('3,5')).toBe(3.5);
    expect(parseQuantity('2')).toBe(2);
    expect(parseQuantity('0')).toBe(0);
  });

  it('refuses negatives and junk', () => {
    expect(parseQuantity('-2')).toBe(null);
    expect(parseQuantity('')).toBe(null);
    expect(parseQuantity('lots')).toBe(null);
  });
});

describe('parsePercentToBp — percents are held in basis points, never floats', () => {
  it('scales to two decimals', () => {
    expect(parsePercentToBp('20')).toBe(2000);
    expect(parsePercentToBp('12.5')).toBe(1250);
    expect(parsePercentToBp('0.5')).toBe(50);
    expect(parsePercentToBp('9.25')).toBe(925);
    expect(parsePercentToBp('1,000')).toBe(100000); // a rate over 100 is a tax on sin, not a parse error
  });

  it('refuses negatives and junk', () => {
    expect(parsePercentToBp('-1')).toBe(null);
    expect(parsePercentToBp('')).toBe(null);
    expect(parsePercentToBp('VAT')).toBe(null);
  });
});

describe('formatRate', () => {
  it('prints basis points the way they were typed', () => {
    expect(formatRate(2000)).toBe('20%');
    expect(formatRate(1250)).toBe('12.5%');
    expect(formatRate(0)).toBe('0%');
    expect(formatRate(925)).toBe('9.25%');
  });
});
