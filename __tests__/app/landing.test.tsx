/**
 * @jest-environment node
 *
 * The landing page's contract: the register (sentence-case headline, lowercase lead), the
 * house hero style, one builder verb, every free template linked, and no marketing claim
 * the code doesn't keep. `next/link` is stubbed because this test doesn't mount a router.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';

import LandingPage from '@/app/(site)/page';

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

const html = renderToStaticMarkup(<LandingPage />);
const text = html
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const source = readFileSync(path.join(process.cwd(), 'app', '(site)', 'page.tsx'), 'utf8');
const plain = (value: string) =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/&rsquo;|&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

describe('landing page', () => {
  it('opens with a short sentence-case headline that starts uppercase', () => {
    const heading = plain(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '');
    expect(heading).toMatch(/^[A-Z]/);
    expect(heading).toMatch(/[.]$/);
    expect(heading.split(' ').length).toBeLessThanOrEqual(12);
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
  });

  it('wears the hero display style with one italic emphasis', () => {
    const tag = html.match(/<h1[^>]*>/)?.[0] ?? '';
    expect(tag).toContain('font-display');
    expect(tag).toContain('text-display-xl');
    expect(tag).toContain('font-light');
    expect(html).toMatch(/<h1[^>]*>[^<]*<em>/);
  });

  it('answers the headline in lowercase', () => {
    const lead = plain(html.match(/<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '');
    expect(lead.length).toBeGreaterThan(40);
    expect(lead).toMatch(/^[a-z]/);
  });

  it('sends the builder verb to the tool and the browse verb to the templates', () => {
    expect(html).toContain('href="/capyresume"');
    expect(html).toContain('open the builder');
    expect(html).toContain('href="/templates"');
  });

  it('links every free template once, and none of the gated packs', () => {
    const linked = [...html.matchAll(/href="\/templates\/([a-z-]+)"/g)].map((m) => m[1]);
    expect(linked).toHaveLength(6);
    expect(new Set(linked).size).toBe(6);
  });

  it('leaves the guide hubs one click from home', () => {
    for (const href of ['/ats-resume-format', '/resume-templates', '/free-cv-builder']) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it('never sells, upsells or invents a guarantee', () => {
    for (const word of ['premium', 'upgrade', 'paid tier', 'pro', 'guarantee', 'guaranteed']) {
      expect(text.toLowerCase()).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });

  it('is a page now, not a redirect, and stays a server component', () => {
    expect(source).not.toContain('redirect(');
    expect(source).not.toContain('use client');
  });
});
