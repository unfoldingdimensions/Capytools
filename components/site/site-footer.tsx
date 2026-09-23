import Link from 'next/link';

import { SITE } from '@/lib/site';

const GROUPS = [
  {
    title: 'product',
    links: [
      { href: '/capyresume', label: 'the builder' },
      { href: '/templates', label: 'templates' },
    ],
  },
  {
    title: 'guides',
    links: [
      { href: '/ats-resume-format', label: 'ats resume format' },
      { href: '/resume-templates', label: 'by role' },
      { href: '/free-cv-builder', label: 'by country' },
    ],
  },
  {
    title: 'legal',
    links: [
      { href: '/privacy', label: 'privacy' },
      { href: '/terms', label: 'terms' },
      { href: '/cookies', label: 'cookies' },
    ],
  },
] as const;

/**
 * The site footer: three link groups (product / guides / legal) plus the licence line.
 * Each group is its own `nav` with an eyebrow label rather than a heading — the footer
 * shouldn't interrupt a page's heading outline to say "legal".
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-3">
          {GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="eyebrow-micro">{group.title}</p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-ui-sm text-muted-foreground transition-colors duration-fade ease-ui hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-12 text-body-sm text-muted-foreground">
          {SITE.name} is free and open source under the Apache-2.0 licence.{' '}
          <a
            href={SITE.issues}
            className="underline underline-offset-4 transition-colors duration-fade ease-ui hover:text-foreground"
          >
            open an issue
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
