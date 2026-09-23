import type { Metadata } from 'next';
import { Albert_Sans, Fraunces, Plus_Jakarta_Sans } from 'next/font/google';

import './globals.css';
import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { SkipLink } from '@/components/ui/SkipLink';
import { siteUrl } from '@/lib/site';

// The Capytools type system (DESIGN.md): Fraunces for titles, Plus Jakarta Sans at
// weight 500 for all UI, Albert Sans as the label voice. The token names are the
// suite's — --font-display / --font-sans / --font-mono — so one utility maps each role.
const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  preload: true,
});

// Italic is loaded deliberately: the brief's headline voice carries an <em> emphasis
// word, and a synthesized oblique would undo the whole point of a light serif.
const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  style: ['normal', 'italic'],
  display: 'swap',
  preload: true,
});

// The label voice (eyebrows, tags, code). The token keeps its `--font-mono` name, so
// every `font-mono` utility resolves to Albert Sans in one place.
const label = Albert_Sans({
  subsets: ['latin'],
  variable: '--font-mono',
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
