import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

import './globals.css';
import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { SkipLink } from '@/components/ui/SkipLink';

// Optimized font loading with next/font (no render-blocking, automatic preload)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
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
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased`}>
        <SkipLink />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main id="main-content">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
