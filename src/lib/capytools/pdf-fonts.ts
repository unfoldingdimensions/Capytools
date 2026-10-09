/**
 * The PDF faces both document tools register.
 *
 * CapyResume and CapyInvoice both print PDFs with @react-pdf/renderer, whose
 * standard-14 Helvetica and Times only cover WinAnsi — ł, ő, Cyrillic and
 * Greek came out blank, and they were never set bold. Liberation Sans and
 * Serif (SIL OFL, public/pdf-fonts/LICENSE-Liberation.txt) are
 * metric-compatible with them, so every layout keeps its line breaks.
 *
 * ponytail: Latin, Cyrillic and Greek only — Devanagari, Arabic and CJK need
 * Noto faces (and RTL shaping for Arabic) once a document is offered in them.
 */

import { Font } from '@react-pdf/renderer';

/** Where the embedded fonts are fetched from; a file path in the Node verify script. */
export const PDF_FONT_BASE = '/pdf-fonts/';

let registeredBase: string | null = null;

/** Idempotent: registering the same base twice is a no-op. */
export function registerLiberationFonts(base: string = PDF_FONT_BASE): void {
  if (registeredBase === base) return;
  for (const [family, file] of [
    ['Liberation Sans', 'LiberationSans'],
    ['Liberation Serif', 'LiberationSerif'],
  ] as const) {
    Font.register({
      family,
      fonts: [
        { src: `${base}${file}-Regular.ttf` },
        { src: `${base}${file}-Bold.ttf`, fontWeight: 'bold' },
      ],
    });
  }
  registeredBase = base;
}
