import type { TemplateId } from '@/lib/capyresume/types';

/**
 * Copy for one showcase page per template (`/capyresume/templates/[id]`).
 *
 * Lives as data rather than inside the page component so tests can enforce the
 * rules that matter: every template has a page, no two pages share a title or
 * description, and nothing anywhere claims a parser guarantees anything
 * (implementation plan §6.3 — "passes ATS" and "ATS-approved" are banned
 * outright).
 *
 * Each intro is written from the template's actual spec values, not from
 * marketing adjectives: the numbers quoted here come out of TEMPLATES.
 */
export interface TemplatePageCopy {
  readonly id: TemplateId;
  /** The H1 on the page. Unique across all templates. */
  readonly heading: string;
  /** Meta description. Unique across all templates. */
  readonly description: string;
  /** 2–4 real sentences about who this template suits and why. */
  readonly intro: string;
  /** What the page claims about the layout — each line checkable against the spec. */
  readonly bullets: readonly string[];
}

export const TEMPLATE_PAGE_COPY: Record<TemplateId, TemplatePageCopy> = {
  classic: {
    id: 'classic',
    heading: 'Classic resume template',
    description:
      'Single-column resume template: upper-case section headings, a hairline rule under each, Helvetica throughout.',
    intro:
      'Classic is where most people should start. Every section sits in one column, headings are set in capitals with a thin rule beneath them, and nothing on the page depends on colour or graphics to make sense — so what a reader sees on screen is what a text extractor pulls out of the PDF.',
    bullets: [
      'One column, no tables, no text baked into images',
      'Helvetica — a font every PDF reader already ships',
      'Upper-case headings with a hairline rule',
      '10.5pt on a 1.35 line-height, 8pt between entries',
    ],
  },
  compact: {
    id: 'compact',
    heading: 'Compact resume template',
    description:
      'Compact resume template: the same single column with tighter leading, for fitting a long career onto one page.',
    intro:
      'Compact keeps the Classic structure and tightens everything inside it — 9.5pt type, a shorter line-height, and five points between entries instead of eight. It is the one to reach for when you have ten years of work history and a single page to put it on.',
    bullets: [
      'Tighter leading and smaller gaps between roles',
      '9.5pt type on a 1.25 line-height',
      'Still one column, still free of tables',
      'The same upper-case headings and rule as Classic',
    ],
  },
  serif: {
    id: 'serif',
    heading: 'Serif resume template',
    description:
      'Serif resume template: Times Roman with title-case headings, for traditional, academic and public-sector applications.',
    intro:
      'Serif sets the page in Times Roman with title-case headings — the register that committees, academic panels and older institutions are used to reading. The structure is otherwise the same as Classic: one column, text only, and nothing that a printed copy could lose in translation.',
    bullets: [
      'Times Roman throughout',
      'Title-case headings instead of capitals',
      'En-dash bullets',
      'One column with a hairline rule under each heading',
    ],
  },
  air: {
    id: 'air',
    heading: 'Air resume template',
    description:
      'Air resume template: title-case headings with no rules beneath them and wide gaps — a one-page CV that breathes.',
    intro:
      'Air drops the rules and opens up the spacing. Headings are title-case with nothing underneath them, entries sit ten points apart, and the body runs a little larger at 11pt. It reads as a modern one-page CV without giving up the single column that keeps the file easy to extract.',
    bullets: [
      'No rules under headings — whitespace does the separating',
      '11pt type on a 1.4 line-height, 10pt between entries',
      'En-dash bullets',
      'One column, table-free, Helvetica',
    ],
  },
  executive: {
    id: 'executive',
    heading: 'Executive resume template',
    description:
      'Executive resume template: a larger type scale and more air between roles, for senior and leadership applications.',
    intro:
      'Executive is for people whose name and recent roles matter more than the detail beneath them. The name is set seven points above body text, headings one point above, and each entry keeps nine points of space — so a short, senior page still reads as deliberate rather than half-finished.',
    bullets: [
      'Name set 7pt above body text, headings 1pt above',
      '11.5pt body on a 1.4 line-height',
      'Upper-case headings with the hairline rule',
      'One column, table-free, Helvetica',
    ],
  },
  journal: {
    id: 'journal',
    heading: 'Journal resume template',
    description:
      'Journal resume template: Times Roman with upper-case headings and no rules — a written-forward serif page.',
    intro:
      'Journal is the serif page without the ruled headings: Times Roman, capitals for section titles, and middot bullets instead of dashes. It suits written-forward applications — journalism, communications, research — where the type should feel like a document rather than a form.',
    bullets: [
      'Times Roman with upper-case headings',
      'No rules under headings',
      'Middot bullets',
      '10.5pt on a 1.35 line-height, one column',
    ],
  },
};

/** `<title>` for a template page: heading plus product, never duplicated by hand. */
export function templatePageTitle(copy: TemplatePageCopy): string {
  return `${copy.heading} — CapyResume`;
}
