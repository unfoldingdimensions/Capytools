/**
 * CapyResume — the template registry.
 *
 * A template is *data*, not a fork: the renderers (./pdf.tsx, ./docx.ts) read
 * one of these specs and the shared composer (./document.ts), so adding a
 * template is a row, never a new code path.
 *
 * Every spec is single-column and table-free by construction. That is the whole
 * "parse-friendly" claim: ATS parsers strip columns, tables and graphics, so a
 * layout that never introduces them cannot be broken by them. We never claim a
 * system will accept the résumé — only that the file is built the way parsers
 * handle best.
 */

import type { TemplateId } from './types';

export interface TemplateSpec {
  readonly id: TemplateId;
  readonly name: string;
  readonly description: string;
  /** Literal 1. A single-column layout is the entire ATS-safety guarantee. */
  readonly columns: 1;
  /** Literal false. Tables are what break text extraction. */
  readonly usesTables: false;
  /**
   * A PDF standard-14 font. Nothing is embedded, so no font licence can be
   * breached and every reader can render the file. (Swapping in an OFL family
   * is a later change: it needs the font binary shipped alongside.)
   */
  readonly fontFamily: 'Helvetica' | 'Times-Roman';
  readonly headingCase: 'upper' | 'title';
  /** Thin rule beneath section headings. */
  readonly headingRule: boolean;
  /** Vertical rhythm. */
  readonly density: 'comfortable' | 'compact';
  /** Kept near-black so printing stays legible and parsing is unaffected. */
  readonly accent: string;
  readonly bulletChar: string;
  readonly fontSize: number;
  /** Points of space between an entry and the next. */
  readonly entryGap: number;
  readonly lineHeight: number;
}

export const TEMPLATES: Record<TemplateId, TemplateSpec> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Single column, upper-case headings, a hairline rule under each. The safest default.',
    columns: 1,
    usesTables: false,
    fontFamily: 'Helvetica',
    headingCase: 'upper',
    headingRule: true,
    density: 'comfortable',
    accent: '#111111',
    bulletChar: '\u2022',
    fontSize: 10.5,
    entryGap: 8,
    lineHeight: 1.35,
  },
  compact: {
    id: 'compact',
    name: 'Compact',
    description: 'The same single column with tighter leading — for a long career on one page.',
    columns: 1,
    usesTables: false,
    fontFamily: 'Helvetica',
    headingCase: 'upper',
    headingRule: true,
    density: 'compact',
    accent: '#111111',
    bulletChar: '\u2022',
    fontSize: 9.5,
    entryGap: 5,
    lineHeight: 1.25,
  },
  serif: {
    id: 'serif',
    name: 'Serif',
    description: 'Times-based and title-case, for traditional and academic applications.',
    columns: 1,
    usesTables: false,
    fontFamily: 'Times-Roman',
    headingCase: 'title',
    headingRule: true,
    density: 'comfortable',
    accent: '#111111',
    bulletChar: '\u2013',
    fontSize: 10.5,
    entryGap: 8,
    lineHeight: 1.35,
  },
};

export const TEMPLATE_LIST: readonly TemplateSpec[] = [
  TEMPLATES.classic,
  TEMPLATES.compact,
  TEMPLATES.serif,
];

export const DEFAULT_TEMPLATE_ID: TemplateId = 'classic';

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TEMPLATES, value);
}

/** Never returns undefined: an unknown or missing id falls back to the default. */
export function getTemplate(id?: string | null): TemplateSpec {
  return isTemplateId(id) ? TEMPLATES[id] : TEMPLATES[DEFAULT_TEMPLATE_ID];
}

/** Apply the template's heading casing. Pure, so both renderers agree. */
export function headingText(spec: TemplateSpec, text: string): string {
  return spec.headingCase === 'upper' ? text.toUpperCase() : text;
}
