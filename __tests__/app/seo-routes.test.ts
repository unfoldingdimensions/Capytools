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
});
