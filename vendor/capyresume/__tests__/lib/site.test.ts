import { SITE, siteUrl } from '@/lib/site';

describe('siteUrl', () => {
  const PREVIOUS = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (PREVIOUS === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = PREVIOUS;
  });

  it('reads the origin from the environment', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://capyresume.example';
    expect(siteUrl()).toBe('https://capyresume.example');
  });

  it('drops trailing slashes so joining never doubles them', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://capyresume.example///';
    expect(siteUrl()).toBe('https://capyresume.example');
  });

  it('is empty rather than invented when unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteUrl()).toBe('');
  });

  it('keeps the contact channel pointing at this repository', () => {
    // The repository was renamed to CapyResume; site.ts is where a future
    // rename has to be reflected, and a legal page reads it directly.
    expect(SITE.repo).toBe('https://github.com/unfoldingdimensions/CapyResume');
    expect(SITE.issues).toBe('https://github.com/unfoldingdimensions/CapyResume/issues');
  });
});
