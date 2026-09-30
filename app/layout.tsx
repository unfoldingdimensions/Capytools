import type { Metadata } from 'next';
import localFont from 'next/font/local';

import './globals.css';
import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { SkipLink } from '@/components/ui/SkipLink';
import { siteUrl } from '@/lib/site';

// The type system is self-hosted. These three families were previously loaded
// through the Google font loader, which fetches from fonts.googleapis.com and
// fonts.gstatic.com at build time — so every build, CI run and deploy depended on
// reaching Google's CDN. When that fetch failed, the build resolved a `gstatic.com`
// URL as a module and died with a module-not-found error. The files are now
// committed, so the build is offline and deterministic.
//
// Referred to by description, not by module path: the guard in
// __tests__/design/font-hosting.test.ts reads this file as text and fails on any
// import of that loader, so naming it exactly here would trip the tripwire.
//
// Each file is the variable font, so one file covers the whole weight axis rather
// than one file per weight: 4 files, ~100 KB, `latin` subset only — the same
// coverage the previous `subsets: ['latin']` gave. Paths must stay literal
// strings: the font loader reads them at compile time and rejects an expression.

// The Capytools type system (DESIGN.md): Fraunces for titles, Plus Jakarta Sans at
// weight 500 for all UI, Albert Sans as the label voice. The token names are the
// suite's — --font-display / --font-sans / --font-mono — so one utility maps each role.
const sans = localFont({
  src: '../app/fonts/plus-jakarta-sans-latin-var.woff2',
  variable: '--font-sans',
  // The axis runs 200–800; 500–800 is the range the original Google request asked for.
  weight: '500 800',
  display: 'swap',
  preload: true,
});

// Italic is loaded deliberately: the brief's headline voice carries an <em> emphasis
// word, and a synthesized oblique would undo the whole point of a light serif.
const display = localFont({
  src: [
    { path: '../app/fonts/fraunces-latin-var.woff2', weight: '100 900', style: 'normal' },
    { path: '../app/fonts/fraunces-latin-italic-var.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-display',
  display: 'swap',
  preload: true,
});

// The label voice (eyebrows, tags, code). The token keeps its `--font-mono` name, so
// every `font-mono` utility resolves to Albert Sans in one place. Its axis is 100–900.
const label = localFont({
  src: '../app/fonts/albert-sans-latin-var.woff2',
  variable: '--font-mono',
  weight: '100 900',
  display: 'swap',
  preload: true,
});

/** Absolute URLs — canonical, Open Graph, sitemap — resolve against this when set. */
const origin = siteUrl();
const metadataBase = origin ? new URL(origin) : undefined;

export const metadata: Metadata = {
  metadataBase,
  title: 'CapyResume — free resume builder in your browser',
  description:
    'Build a clean, single-column resume and export a real PDF or DOCX — no signup, no watermark. Your details never leave this tab.',
  keywords:
    'free resume builder, resume maker, CV template free, ATS friendly resume, resume builder no signup, free CV builder pdf',
  authors: [{ name: 'CapyResume' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'CapyResume',
    title: 'CapyResume — free resume builder in your browser',
    description:
      'Build a clean, single-column resume and export a real PDF or DOCX — no signup, no watermark.',
  },
  // The image itself comes from the file convention (app/opengraph-image.png), which
  // Next wires in automatically; this only sets the card shape.
  twitter: {
    card: 'summary_large_image',
    title: 'CapyResume — free resume builder in your browser',
    description:
      'Build a clean, single-column resume and export a real PDF or DOCX — no signup, no watermark.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${display.variable} ${label.variable} font-sans antialiased`}
      >
        <SkipLink />
        {/* No `disableTransitionOnChange`: the 150ms colour interpolation IS the design
            language (DESIGN.md §Layout), and it never touches layout properties. */}
        {/* The landmark itself lives in each shell, never here — the site group puts
            banner and contentinfo outside its `main`, and the builder owns its own. */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
