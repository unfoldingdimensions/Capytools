/**
 * @jest-environment node
 *
 * The site chrome (DESIGN.md §Chrome): what the header and footer must contain, and
 * the landmark order that keeps `banner`/`contentinfo` outside `main`.
 *
 * `next/link` needs a router context this test doesn't mount, so it is stubbed down to
 * a plain anchor — the point here is the markup we author, not Next's prefetching.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';

import SiteLayout from '@/app/(site)/layout';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname?: string };
    children: React.ReactNode;
  }) => (
    <a href={typeof href === 'string' ? href : (href?.pathname ?? '#')} {...rest}>
      {children}
    </a>
  ),
}));

const header = renderToStaticMarkup(<SiteHeader />);
const footer = renderToStaticMarkup(<SiteFooter />);

const hrefsIn = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

describe('site header', () => {
  it('is a sticky, translucent bar on the shared column', () => {
    expect(header).toContain('sticky');
    expect(header).toContain('bg-background/80');
    expect(header).toContain('backdrop-blur');
    expect(header).toContain('max-w-4xl');
    expect(header).toContain('px-6');
    expect(header).toContain('py-5');
  });

  it('marks the wordmark as the way home and keeps the mark decorative', () => {
    expect(header).toContain('href="/"');
    expect(header).toContain('CapyResume');
    expect(header).toMatch(/<svg[^>]*aria-hidden/);
  });

  it('carries the nav under a labelled region, in lowercase', () => {
    expect(header).toContain('aria-label="primary"');
    const nav = hrefsIn(header);
    expect(nav).toEqual(
      expect.arrayContaining([
        '/templates',
        '/ats-resume-format',
        '/resume-templates',
        '/free-cv-builder',
      ])
    );
    expect(header).not.toMatch(/>\s*[A-Z][a-z]+\s+[A-Z][a-z]+</); // no Title Case labels
  });

  it('keeps exactly one high-emphasis action: the builder', () => {
    expect(header).toContain('href="/capyresume"');
    expect(header).toContain('open the builder');
    // One element carries the sage fill for itself; `hover:bg-primary/80` is a hover tint.
    expect(header.match(/\sbg-primary\s/g) ?? []).toHaveLength(1);
  });
});

describe('site footer', () => {
  it('groups links under the three labelled navs', () => {
    for (const title of ['product', 'guides', 'legal']) {
      expect(footer).toContain(`aria-label="${title}"`);
      expect(footer).toContain(`>${title}</p>`);
    }
  });

  it('links every policy and both hubs', () => {
    expect(hrefsIn(footer)).toEqual(
      expect.arrayContaining([
        '/capyresume',
        '/templates',
        '/ats-resume-format',
        '/resume-templates',
        '/free-cv-builder',
        '/privacy',
        '/terms',
        '/cookies',
      ])
    );
  });

  it('states the licence and keeps a contact channel', () => {
    expect(footer).toContain('Apache-2.0 licence');
    expect(footer).toContain('open an issue');
    expect(footer).toContain('https://github.com/unfoldingdimensions/CapyResume/issues');
  });
});

describe('site shell landmarks', () => {
  const shell = renderToStaticMarkup(
    <SiteLayout>
      <h1>a page</h1>
    </SiteLayout>
  );

  it('keeps banner and contentinfo outside a single main', () => {
    expect(shell.match(/<main/g) ?? []).toHaveLength(1);
    const header = shell.indexOf('<header');
    const main = shell.indexOf('<main');
    const footer = shell.indexOf('<footer');
    expect(header).toBeGreaterThanOrEqual(0);
    expect(main).toBeGreaterThan(header);
    expect(footer).toBeGreaterThan(main);
  });

  it('gives the skip link a target and paints the ambient layer behind it', () => {
    expect(shell).toContain('id="main-content"');
    expect(shell).toContain('pointer-events-none fixed inset-0 -z-10 overflow-hidden');
    expect(shell).toContain('ambient-wash-a');
  });
});

describe('builder landmarks', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'components', 'tool', 'CapyResume.tsx'),
    'utf8'
  );

  it('owns exactly one main, with its own chrome outside it', () => {
    expect(source.match(/<main/g) ?? []).toHaveLength(1);
    expect(source).toContain('<main id="main-content"');
    expect(source.indexOf('<header')).toBeLessThan(source.indexOf('<main'));
    expect(source.indexOf('<footer')).toBeGreaterThan(source.indexOf('</main>'));
  });
});
