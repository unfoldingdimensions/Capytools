import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';

import * as toolPage from '@/app/capyresume/page';
import * as atsResumeFormat from '@/app/(site)/ats-resume-format/page';
import * as cookiesPolicy from '@/app/(site)/cookies/page';
import * as freeCvBuilderHub from '@/app/(site)/free-cv-builder/page';
import * as landing from '@/app/(site)/page';
import * as privacyPolicy from '@/app/(site)/privacy/page';
import * as resumeTemplatesHub from '@/app/(site)/resume-templates/page';
import * as templatesIndex from '@/app/(site)/templates/page';
import * as termsOfService from '@/app/(site)/terms/page';
import robots from '@/app/robots';
import sitemap, { STATIC_PATHS } from '@/app/sitemap';
import { COUNTRY_PAGES } from '@/lib/capyresume/seo/countries';
import { ROLE_PAGES } from '@/lib/capyresume/seo/roles';
import { TEMPLATE_LIST } from '@/lib/capyresume/templates';

const ORIGIN = 'https://capyresume.example';

describe('seo routes', () => {
  const PREVIOUS = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (PREVIOUS === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = PREVIOUS;
  });

  it('advertises a sitemap only when there is a real origin', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(robots().sitemap).toBeUndefined();

    process.env.NEXT_PUBLIC_SITE_URL = `${ORIGIN}/`;
    expect(robots().sitemap).toBe(`${ORIGIN}/sitemap.xml`);
  });

  it('lets everything crawlable', () => {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
    expect(robots().rules).toEqual({ userAgent: '*', allow: '/' });
  });

  it('is empty while the origin is unknown', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(sitemap()).toEqual([]);
  });

  it('lists every prerendered route, absolutely and uniquely', () => {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
    const urls = sitemap().map((entry) => entry.url);

    for (const path of STATIC_PATHS) expect(urls).toContain(`${ORIGIN}${path}`);
    for (const spec of TEMPLATE_LIST) expect(urls).toContain(`${ORIGIN}/templates/${spec.id}`);
    for (const page of ROLE_PAGES)
      expect(urls).toContain(`${ORIGIN}/resume-templates/${page.slug}`);
    for (const page of COUNTRY_PAGES) {
      expect(urls).toContain(`${ORIGIN}/free-cv-builder/${page.slug}`);
    }

    // Nothing prerendered may be missing, and nothing invented may appear.
    expect(urls).toHaveLength(
      STATIC_PATHS.length + TEMPLATE_LIST.length + ROLE_PAGES.length + COUNTRY_PAGES.length
    );
    // Duplicate URLs in a sitemap are a crawler warning, not a hint.
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(url.startsWith(`${ORIGIN}/`)).toBe(true);
  });

  it('ships a social card at the size the crawlers want', () => {
    for (const name of ['opengraph-image.png', 'twitter-image.png']) {
      const png = readFileSync(path.join(process.cwd(), 'app', name));
      // PNG magic, then the IHDR width and height — no image library required.
      expect(png.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );
      expect(png.readUInt32BE(16)).toBe(1200);
      expect(png.readUInt32BE(20)).toBe(630);
    }
  });

  it('declares a self-canonical on every static route', () => {
    // A missing canonical is invisible in a rendered page and expensive to find later,
    // which is exactly how four routes (/capyresume, /privacy, /terms, /cookies) shipped
    // without one until a live crawl caught it. The table is asserted against
    // STATIC_PATHS, so a new route has to arrive with its canonical.
    const table: [string, Metadata['alternates']][] = [
      ['/', landing.metadata.alternates],
      ['/capyresume', toolPage.metadata.alternates],
      ['/privacy', privacyPolicy.metadata.alternates],
      ['/terms', termsOfService.metadata.alternates],
      ['/cookies', cookiesPolicy.metadata.alternates],
      ['/templates', templatesIndex.metadata.alternates],
      ['/ats-resume-format', atsResumeFormat.metadata.alternates],
      ['/resume-templates', resumeTemplatesHub.metadata.alternates],
      ['/free-cv-builder', freeCvBuilderHub.metadata.alternates],
    ];

    expect(table.map(([route]) => route)).toEqual([...STATIC_PATHS]);
    for (const [route, alternates] of table) {
      expect({ route, canonical: alternates?.canonical }).toEqual({ route, canonical: route });
    }
  });
});
