import type { ReactNode } from 'react';

import { AmbientBackground } from '@/components/site/AmbientBackground';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';

/**
 * The site shell. Marketing, guide and legal pages share one skeleton here: the
 * ambient washes behind everything, the banner and contentinfo outside `main`, and the
 * skip link's target inside it.
 *
 * The builder at /capyresume deliberately sits outside this group. It is an
 * application rather than a page — its own header, its own footer, its own full-width
 * column — and it must not inherit a marketing frame.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AmbientBackground />
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
