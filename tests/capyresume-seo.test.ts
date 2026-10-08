// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { TEMPLATE_PAGE_COPY, templatePageTitle } from '@/lib/capyresume/seo/templates';
import { COUNTRY_PAGES, countryPage } from '@/lib/capyresume/seo/countries';
import { ROLE_PAGES, ROLE_TEMPLATE_SUGGESTIONS, rolePage } from '@/lib/capyresume/seo/roles';
import { PAPER_SIZES } from '@/lib/capyresume/prefs';
import { TEMPLATE_LIST, TEMPLATES } from '@/lib/capyresume/templates';

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
    // Every shipped page's copy goes through the same filter, including the
    // role and country child pages added for plan 8.4.
    const everything = JSON.stringify({ TEMPLATE_PAGE_COPY, ROLE_PAGES, COUNTRY_PAGES });
    for (const pattern of FORBIDDEN) {
      expect(pattern.test(everything)).toBe(false);
    }
  });
});

describe('role child pages (plan 8.4)', () => {
  it('ships twelve roles with unique slugs, headings and descriptions', () => {
    expect(ROLE_PAGES).toHaveLength(12);
    const slugs = ROLE_PAGES.map((page) => page.slug);
    const headings = ROLE_PAGES.map((page) => page.heading);
    const descriptions = ROLE_PAGES.map((page) => page.description);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(headings).size).toBe(headings.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('links every role to exactly two real templates — and no orphan keys', () => {
    for (const page of ROLE_PAGES) {
      const suggested = ROLE_TEMPLATE_SUGGESTIONS[page.slug];
      expect(suggested).toHaveLength(2);
      for (const id of suggested ?? []) expect(TEMPLATES[id]).toBeDefined();
    }
    for (const slug of Object.keys(ROLE_TEMPLATE_SUGGESTIONS)) {
      expect(rolePage(slug)).toBeDefined();
    }
  });

  it('writes real intros and resolves slugs', () => {
    for (const page of ROLE_PAGES) expect(page.intro.length).toBeGreaterThan(80);
    expect(rolePage('nurse')?.slug).toBe('nurse');
    expect(rolePage('definitely-not-a-role')).toBeUndefined();
  });
});

describe('country child pages (plan 8.4)', () => {
  it('ships twelve countries with unique slugs, headings and descriptions', () => {
    expect(COUNTRY_PAGES).toHaveLength(12);
    const slugs = COUNTRY_PAGES.map((page) => page.slug);
    const headings = COUNTRY_PAGES.map((page) => page.heading);
    const descriptions = COUNTRY_PAGES.map((page) => page.description);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(headings).size).toBe(headings.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('claims only paper sizes the builder actually offers', () => {
    for (const page of COUNTRY_PAGES) expect(PAPER_SIZES).toContain(page.paper);
    expect(countryPage('germany')?.paper).toBe('A4');
    expect(countryPage('united-states')?.paper).toBe('LETTER');
  });

  it('writes real intros and resolves slugs', () => {
    for (const page of COUNTRY_PAGES) expect(page.intro.length).toBeGreaterThan(80);
    expect(countryPage('india')?.slug).toBe('india');
    expect(countryPage('atlantis')).toBeUndefined();
  });
});
