import { TEMPLATE_PAGE_COPY, templatePageTitle } from '@/lib/capyresume/seo/templates';
import { TEMPLATE_LIST } from '@/lib/capyresume/templates';

/**
 * The claims §6.3 forbids outright. "ATS friendly" is an approved keyword; a
 * guarantee about what a system does with someone's résumé never is.
 */
const FORBIDDEN = [/passes ATS/i, /ATS-approved/i, /guaranteed to be read/i];

describe('showcase copy — coverage and uniqueness', () => {
  it('has a page for every template, and no page without a template', () => {
    expect(Object.keys(TEMPLATE_PAGE_COPY).sort()).toEqual(
      TEMPLATE_LIST.map((spec) => spec.id).sort()
    );
  });

  it('keeps headings, descriptions and titles distinct', () => {
    const entries = TEMPLATE_LIST.map((spec) => TEMPLATE_PAGE_COPY[spec.id]);
    const headings = entries.map((entry) => entry.heading);
    const descriptions = entries.map((entry) => entry.description);
    const titles = entries.map((entry) => templatePageTitle(entry));

    expect(new Set(headings).size).toBe(headings.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('writes real intros, not a line of filler', () => {
    for (const entry of Object.values(TEMPLATE_PAGE_COPY)) {
      expect(entry.intro.length).toBeGreaterThan(80);
      expect(entry.bullets.length).toBeGreaterThanOrEqual(3);
      for (const bullet of entry.bullets) expect(bullet.length).toBeGreaterThan(10);
    }
  });
});

describe('showcase copy — the claims rule (plan 6.3)', () => {
  it('never promises what a parser will do with the document', () => {
    const everything = JSON.stringify(TEMPLATE_PAGE_COPY);
    for (const pattern of FORBIDDEN) {
      expect(pattern.test(everything)).toBe(false);
    }
  });
});
