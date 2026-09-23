import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ATS resume format, explained | CapyResume',
  description:
    'What an ATS resume format means in practice: one column, real text, standard section headings — and the tricks that do not help.',
  alternates: { canonical: '/ats-resume-format' },
};

const HELPS: readonly { readonly heading: string; readonly body: string }[] = [
  {
    heading: 'One column',
    body: 'A résumé is read in order: down the page, then across the line. Two columns break that order into an interleave, and nobody — software or human — enjoys untangling it. One column is the whole trick.',
  },
  {
    heading: 'A real text layer',
    body: 'Text you typed, not a photograph of text. Typed text can be searched, selected, copied and read aloud; a scanned page cannot do any of those things for you.',
  },
  {
    heading: 'Ordinary section names',
    body: 'Experience, Education, Skills. Unusual titles ask the reader to guess what is behind them, and guessing is where details get missed.',
  },
  {
    heading: 'Fonts every reader already has',
    body: 'Helvetica and Times are part of the PDF standard itself, so nothing has to be embedded and nothing can arrive as substitute glyphs. What you see is what opens everywhere.',
  },
  {
    heading: 'No tables or graphics doing layout work',
    body: 'A table exists to hold tabular data. Used as a layout frame it forces reading order through a grid, and any text inside an image is invisible to anyone who cannot see the image.',
  },
];

const DOES_NOT_HELP: readonly string[] = [
  'Keyword stuffing, repeated phrases, or white text on a white background — a human reads this long before any system does.',
  'Multi-column and sidebar layouts: they interleave the order a reader travels in.',
  'Logos, badges, skill dial graphics and photos carrying information you would miss if they did not render.',
  'Decorative or handwriting-style fonts that substitute unpredictably between readers.',
  'Unprotected PDFs that are password-locked or made of form fields rather than text.',
];

export default function AtsResumeFormatPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Format guide
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold">
        What an ATS resume format actually is
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        &ldquo;ATS format&rdquo; is not a file type and not a template you buy. It describes a
        document shaped so nothing gets lost between the person who wrote it and whoever — or
        whatever — opens it next.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">What actually helps</h2>
      <dl className="mt-4 space-y-5">
        {HELPS.map((item) => (
          <div key={item.heading}>
            <dt className="font-semibold">{item.heading}</dt>
            <dd className="mt-1 text-muted-foreground">{item.body}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 font-display text-xl font-semibold">What does not help</h2>
      <ul className="mt-4 space-y-3">
        {DOES_NOT_HELP.map((line) => (
          <li key={line} className="flex gap-2 text-muted-foreground">
            <span aria-hidden="true" className="text-muted-foreground">
              ✕
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-display text-xl font-semibold">The honest limit</h2>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        No layout can promise what a particular system will do with your document. Systems differ by
        vendor, by version and by configuration, and anybody selling you a guarantee about it is
        selling. What you can control is that nothing in your file makes the job harder: no columns
        to disentangle, no information locked inside an image, no broken text layer. That is the
        whole of the advice worth following.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">How CapyResume is built</h2>
      <ul className="mt-4 space-y-2">
        <li className="flex gap-2 text-sm">
          <span aria-hidden="true" className="text-muted-foreground">
            ✓
          </span>
          <span>
            Single column and table-free are enforced in the document model itself — a template
            cannot introduce them.
          </span>
        </li>
        <li className="flex gap-2 text-sm">
          <span aria-hidden="true" className="text-muted-foreground">
            ✓
          </span>
          <span>PDF standard fonts only, so no font licence and no substitution.</span>
        </li>
        <li className="flex gap-2 text-sm">
          <span aria-hidden="true" className="text-muted-foreground">
            ✓
          </span>
          <span>
            The exported PDF is checked for a selectable text layer before any release, and the file
            carries no watermark.
          </span>
        </li>
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/capyresume"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          open the builder
        </Link>
        <Link
          href="/templates"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
        >
          All templates
        </Link>
      </div>
    </article>
  );
}
