import Link from 'next/link';

import { CapyMark } from '@/components/site/CapyMark';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/site';

/** Lowercase, plain words — the register the chrome speaks in (DESIGN.md §Voice). */
const NAV = [
  { href: '/templates', label: 'templates' },
  { href: '/ats-resume-format', label: 'ats resume format' },
  { href: '/resume-templates', label: 'by role' },
  { href: '/free-cv-builder', label: 'by country' },
] as const;

/**
 * The site header: sticky, `max-w-4xl`, `px-6 py-5`, on a translucent canvas with a
 * backdrop blur so content scrolls under it without colliding. One high-emphasis
 * action lives here (the builder); everything else is a quiet text link.
 *
 * On a phone there is no room for the nav beside the wordmark, so it wraps onto its own
 * row rather than disappearing. A footer is not a navigation bar: hiding the only four
 * links on the site's smallest screens and calling them "reachable" was the wrong call,
 * and a measured pass is what caught it.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-foreground">
          <CapyMark className="h-7 w-7 text-primary" />
          <span className="hidden font-display text-title-sm sm:inline">{SITE.name}</span>
        </Link>

        {/* `order-last w-full` puts the nav on its own row below `md`; from `md` up it
            sits inline between the wordmark and the action. `py-1.5` keeps every link
            past the 24px minimum target size. */}
        <nav
          aria-label="primary"
          className="order-last flex w-full flex-wrap items-center gap-x-5 gap-y-1 md:order-none md:w-auto"
        >
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="py-1.5 text-ui-sm text-muted-foreground transition-colors duration-fade ease-ui hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild>
            <Link href="/capyresume">open the builder</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
