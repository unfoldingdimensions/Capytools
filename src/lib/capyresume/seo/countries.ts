import type { PaperSize } from '@/lib/capyresume/prefs';

/**
 * Child pages under `/capyresume/free-cv-builder/{country}` — plan §8.4's
 * "free CV builder {country}" family.
 *
 * Only two facts are asserted about each country, and both are checkable: the
 * paper size it conventionally uses, and whether employers say "CV" or
 * "resume". No claims about visas, parsing, or what any system will do with
 * the document — §6.3 applies to this file exactly as it does to the
 * template pages.
 */
export interface CountryPageCopy {
  readonly slug: string;
  /** The H1, matching the phrase people search for. */
  readonly heading: string;
  readonly description: string;
  readonly intro: string;
  /** The paper size this country conventionally prints on. */
  readonly paper: PaperSize;
}

export const COUNTRY_PAGES: readonly CountryPageCopy[] = [
  {
    slug: 'united-kingdom',
    heading: 'Free CV builder for the United Kingdom',
    description:
      'Free UK CV builder: A4 page, no signup, no watermark. Your CV stays in your browser and exports as a real PDF or DOCX.',
    intro:
      'The United Kingdom prints on A4 and calls the document a CV rather than a resume. CapyResume defaults to A4, keeps what you type in your own browser, and exports a PDF with selectable text — so a recruiter can copy your details straight out of it. No account, no watermark, nothing sent anywhere.',
    paper: 'A4',
  },
  {
    slug: 'united-states',
    heading: 'Free resume builder for the United States',
    description:
      'Free US resume builder: US Letter page, one column, no signup or watermark. Exports to PDF and DOCX.',
    intro:
      'The United States prints on US Letter and calls it a resume. Pick Letter in the builder and the page matches the paper in the tray. Everything is kept in this browser tab, the PDF exports with a real text layer, and there is no account to create and no watermark to remove.',
    paper: 'LETTER',
  },
  {
    slug: 'canada',
    heading: 'Free resume builder for Canada',
    description:
      'Free Canadian resume builder: US Letter page, bilingual-friendly single column, no signup, no watermark.',
    intro:
      'Canada conventionally prints on US Letter, and most employers say resume — with CV used more often in academic and public-sector settings. Choose Letter in the builder, keep the layout single-column so both languages read the same way, and export a PDF whose text stays selectable.',
    paper: 'LETTER',
  },
  {
    slug: 'australia',
    heading: 'Free CV builder for Australia',
    description:
      'Free Australian CV builder: A4 page, no signup, no watermark. Your CV stays in your browser and exports as PDF or DOCX.',
    intro:
      'Australia prints on A4, and both CV and resume are used depending on the sector. The builder starts on A4, keeps your writing local to the browser, and exports a PDF or DOCX with no account and no watermark on the page.',
    paper: 'A4',
  },
  {
    slug: 'germany',
    heading: 'Free Lebenslauf builder for Germany',
    description:
      'Free German CV builder: A4 page, single column, no signup or watermark. Exports to PDF and DOCX.',
    intro:
      'Germany prints on A4 and the document is a Lebenslauf. This builder keeps the layout to one plain column — the structure German applications expect — sets the page to A4 by default, and exports a PDF whose text remains selectable. What you type never leaves your browser.',
    paper: 'A4',
  },
  {
    slug: 'france',
    heading: 'Free CV builder for France',
    description:
      'Free French CV builder: A4 page, single column, no signup or watermark. Exports to PDF and DOCX.',
    intro:
      'France prints on A4 and the document is simply a CV. The builder opens on A4 with a single column, exports to PDF or DOCX without a watermark, and stores what you write in this browser rather than on a server — no account, no upload.',
    paper: 'A4',
  },
  {
    slug: 'india',
    heading: 'Free CV builder for India',
    description:
      'Free India CV builder: A4 page, one column, no signup and no watermark. Exports to PDF and DOCX.',
    intro:
      'India prints on A4, and both resume and CV are used in everyday hiring. The builder keeps one column so long role titles and institution names wrap predictably, starts on A4, and exports a real PDF — no account, no watermark, nothing uploaded.',
    paper: 'A4',
  },
  {
    slug: 'south-africa',
    heading: 'Free CV builder for South Africa',
    description:
      'Free South African CV builder: A4 page, single column, no signup or watermark. Exports to PDF and DOCX.',
    intro:
      'South Africa prints on A4 and calls it a CV. This builder opens on A4, keeps the page single-column for easy reading and printing, and exports a PDF with selectable text — with everything stored locally in your browser instead of on a server.',
    paper: 'A4',
  },
  {
    slug: 'netherlands',
    heading: 'Free CV builder for the Netherlands',
    description:
      'Free Dutch CV builder: A4 page, single column, no signup or watermark. Exports to PDF and DOCX.',
    intro:
      'The Netherlands prints on A4 and the document is a CV, usually written in English or Dutch depending on the employer. The builder keeps one column so a bilingual page stays aligned, starts on A4, and exports a watermark-free PDF or DOCX from your own browser.',
    paper: 'A4',
  },
  {
    slug: 'ireland',
    heading: 'Free CV builder for Ireland',
    description:
      'Free Irish CV builder: A4 page, no signup, no watermark. Your CV stays in your browser and exports as PDF or DOCX.',
    intro:
      'Ireland prints on A4 and uses CV, as the UK does. The builder defaults to A4, keeps your text in this tab, and exports a PDF with selectable text — no account, no watermark, and nothing sent to a server.',
    paper: 'A4',
  },
  {
    slug: 'united-arab-emirates',
    heading: 'Free CV builder for the United Arab Emirates',
    description:
      'Free UAE CV builder: A4 page, single column, no signup or watermark. Exports to PDF and DOCX.',
    intro:
      'The UAE prints on A4 and hiring runs on CVs, often screened across several sectors at once. This builder keeps a single column that survives being forwarded or printed, opens on A4, and exports without a watermark — and your details never leave the browser.',
    paper: 'A4',
  },
  {
    slug: 'singapore',
    heading: 'Free CV builder for Singapore',
    description:
      'Free Singapore CV builder: A4 page, single column, no signup or watermark. Exports to PDF and DOCX.',
    intro:
      'Singapore prints on A4 and uses CV in most hiring contexts, with English the working language. The builder starts on A4, keeps one column for clean printing, and exports a real PDF or DOCX with no account and no watermark.',
    paper: 'A4',
  },
];

/** Look a country page up by its URL slug. */
export function countryPage(slug: string): CountryPageCopy | undefined {
  return COUNTRY_PAGES.find((page) => page.slug === slug);
}
