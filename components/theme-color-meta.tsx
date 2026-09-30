'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Keeps `<meta name="theme-color">` matching the theme actually in use.
 *
 * `app/layout.tsx` declares two media-keyed metas:
 *
 *   { media: '(prefers-color-scheme: light)', color: '#f9f9f7' }
 *   { media: '(prefers-color-scheme: dark)',  color: '#121212' }
 *
 * Those are right only while the theme follows the system. The toggle offers
 * `light`, `dark` and `system` as explicit choices, and `attribute="class"` applies
 * them as a class — so a user on a light OS who picks `dark` gets a `#121212` page
 * while the browser still tints its chrome `#f9f9f7`. On mobile, where this colours
 * the address bar, that is a visible seam between the app and the browser.
 *
 * There is no CSS mechanism to select a meta tag by an ancestor class, so this is
 * the one place JS is the right tool: read the background the browser actually
 * resolved and write it onto a single metas-less tag. Reading the computed value
 * rather than looking up the two hexes means a palette change flows through
 * automatically instead of silently drifting.
 *
 * The media-keyed tags stay in place for the pre-hydration paint, then are removed
 * here — otherwise the media rule and this tag would compete and the wrong one would
 * win in the very case this exists to fix.
 */
export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const content = getComputedStyle(document.body).backgroundColor;
    if (!content) return;

    // Drop the media-keyed fallbacks so they cannot override the applied theme.
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.parentNode?.removeChild(meta));

    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = content;
    document.head.appendChild(meta);

    return () => {
      meta.parentNode?.removeChild(meta);
    };
    // `resolvedTheme` is the theme in force; `theme` alone stays 'system'.
  }, [resolvedTheme]);

  return null;
}
