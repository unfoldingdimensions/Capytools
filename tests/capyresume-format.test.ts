import {
  fileNameSafe,
  formatBytes,
  formatDateRange,
  formatMonth,
  isBlank,
  normaliseBullet,
  normaliseBullets,
} from '@/lib/capyresume/format';

describe('capyresume/format — formatMonth', () => {
  it('renders YYYY-MM as a short month and year', () => {
    expect(formatMonth('2020-03')).toBe('Mar 2020');
    expect(formatMonth('1999-12')).toBe('Dec 1999');
    expect(formatMonth('2026-01')).toBe('Jan 2026');
  });

  it('accepts a bare year and single-digit months', () => {
    expect(formatMonth('2020')).toBe('2020');
    expect(formatMonth('2020-3')).toBe('Mar 2020');
  });

  it('returns "" for missing values and passes unrecognised input through', () => {
    expect(formatMonth(undefined)).toBe('');
    expect(formatMonth('')).toBe('');
    expect(formatMonth('   ')).toBe('');
    expect(formatMonth('Spring 2020')).toBe('Spring 2020');
    expect(formatMonth('2020-13')).toBe('2020-13');
  });
});

describe('capyresume/format — formatDateRange', () => {
  it('uses an en dash between bounds', () => {
    expect(formatDateRange('2020-03', '2022-06')).toBe('Mar 2020 \u2013 Jun 2022');
  });

  it('renders an open-ended role as Present', () => {
    expect(formatDateRange('2020-03', undefined, true)).toBe('Mar 2020 \u2013 Present');
    // `current` wins over a stale end date.
    expect(formatDateRange('2020-03', '2021-01', true)).toBe('Mar 2020 \u2013 Present');
  });

  it('degrades to whichever bound exists', () => {
    expect(formatDateRange('2020-03')).toBe('Mar 2020');
    expect(formatDateRange(undefined, '2022-06')).toBe('Jun 2022');
    expect(formatDateRange(undefined, undefined)).toBe('');
  });
});

describe('capyresume/format — bullets', () => {
  it('strips a leading bullet glyph the user typed or pasted', () => {
    expect(normaliseBullet('  \u2022 Led the team  ')).toBe('Led the team');
    expect(normaliseBullet('- Cut costs by 11%')).toBe('Cut costs by 11%');
    expect(normaliseBullet('* Shipped it')).toBe('Shipped it');
    expect(normaliseBullet('\u2022\u2022 Double')).toBe('Double');
  });

  it('collapses internal whitespace so pasted text does not break layout', () => {
    expect(normaliseBullet('Led   the\n\tteam')).toBe('Led the team');
  });

  it('drops empty bullets and preserves order', () => {
    expect(normaliseBullets(['  ', '\u2022 One', '', 'Two'])).toEqual(['One', 'Two']);
  });
});

describe('capyresume/format — formatBytes', () => {
  it('scales through units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('capyresume/format — fileNameSafe', () => {
  it('builds a safe download stem from a résumé name', () => {
    expect(fileNameSafe('Maya Okafor - Resume')).toBe('maya-okafor-resume');
    expect(fileNameSafe('Maya Okafor \u2013 R\u00e9sum\u00e9!!')).toBe('maya-okafor-r-sum');
  });

  it('never returns an empty stem', () => {
    expect(fileNameSafe('')).toBe('resume');
    expect(fileNameSafe('!!!')).toBe('resume');
    expect(fileNameSafe('---')).toBe('resume');
    expect(fileNameSafe('', 'cv')).toBe('cv');
  });

  it('caps length and never ends on a dash', () => {
    const long = 'a'.repeat(200);
    const out = fileNameSafe(long);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith('-')).toBe(false);
  });
});

describe('capyresume/format — isBlank', () => {
  it('treats whitespace-only as blank', () => {
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank('')).toBe(true);
    expect(isBlank('   ')).toBe(true);
    expect(isBlank('x')).toBe(false);
  });
});
