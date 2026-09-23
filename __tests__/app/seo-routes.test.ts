import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
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

  it('lists the static routes and every template, absolutely and uniquely', () => {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain(`${ORIGIN}/`);
    expect(urls).toContain(`${ORIGIN}/capyresume`);
    expect(urls).toContain(`${ORIGIN}/privacy`);
    for (const spec of TEMPLATE_LIST) {
      expect(urls).toContain(`${ORIGIN}/templates/${spec.id}`);
    }
    // Duplicate URLs in a sitemap are a crawler warning, not a hint.
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(url.startsWith(`${ORIGIN}/`)).toBe(true);
  });
});
