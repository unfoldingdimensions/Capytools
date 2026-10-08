import { describe, it, expect, vi } from 'vitest';
/**
 * @jest-environment node
 *
 * The two index hubs: twelve children each, one sentence-case headline each, lowercase
 * leads, and a canonical that matches the route. `next/link` is stubbed - no router here.
 */
import { renderToStaticMarkup } from 'react-dom/server';

import FreeCvBuilderIndexPage, {
  metadata as countriesMetadata,
} from '@/app/capyresume/(guides)/free-cv-builder/page';
import ResumeTemplatesIndexPage, {
  metadata as rolesMetadata,
} from '@/app/capyresume/(guides)/resume-templates/page';
import { COUNTRY_PAGES } from '@/lib/capyresume/seo/countries';
import { ROLE_PAGES } from '@/lib/capyresume/seo/roles';

vi.mock('next/link', () => ({
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

const plain = (value: string) =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const hubs = [
  {
    name: 'resume templates by role',
    html: renderToStaticMarkup(<ResumeTemplatesIndexPage />),
    canonical: rolesMetadata.alternates?.canonical,
    childHref: '/capyresume/resume-templates/',
    children: ROLE_PAGES.map((page) => page.slug),
  },
  {
    name: 'free cv builder by country',
    html: renderToStaticMarkup(<FreeCvBuilderIndexPage />),
    canonical: countriesMetadata.alternates?.canonical,
    childHref: '/capyresume/free-cv-builder/',
    children: COUNTRY_PAGES.map((page) => page.slug),
  },
] as const;

describe.each(hubs)('$name hub', ({ html, canonical, childHref, children }) => {
  it('opens with one sentence-case headline over a lowercase lead', () => {
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    const heading = plain(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '');
    expect(heading).toMatch(/^[A-Z]/);
    // Sentence case, not Title Case: at most one proper noun keeps its capital.
    const later = heading
      .split(' ')
      .slice(1)
      .filter((word) => /^[A-Z]/.test(word));
    expect(later.length).toBeLessThanOrEqual(1);

    // ToolPageShell sets the lead in its own lp-lead paragraph under the headline.
    const lead = plain(html.match(/class="lp-lead[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '');
    expect(lead.length).toBeGreaterThan(40);
    expect(lead).toMatch(/^[a-z]/);
  });

  it('links every child page exactly once', () => {
    const linked = [...html.matchAll(new RegExp(`href="${childHref}([a-z-]+)"`, 'g'))].map(
      (match) => match[1]
    );
    expect(linked).toHaveLength(children.length);
    expect(new Set(linked)).toEqual(new Set(children));
  });

  it('declares its own canonical and no sales vocabulary', () => {
    expect(canonical).toBe(childHref.replace(/\/$/, ''));
    const text = plain(html).toLowerCase();
    for (const word of ['premium', 'upgrade', 'paid tier', 'pro', 'guarantee']) {
      expect(text).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });
});
