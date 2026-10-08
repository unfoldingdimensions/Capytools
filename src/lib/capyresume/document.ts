/**
 * CapyResume — the shared document composer.
 *
 * `composeDocument()` turns a résumé + template into an ordered list of plain
 * blocks. Both exporters (PDF and DOCX) render *this list*, so the two files can
 * never disagree about what the résumé says — the failure mode where a template
 * quietly drops a section only has to be fixed once, here.
 *
 * Pure and DOM-free: no React, no jsPDF, no docx, no filesystem.
 */

import { formatDateRange, normaliseBullet } from './format';
import { headingText, type TemplateSpec } from './templates';
import type { Entry, ResumeDoc, Section } from './types';

export type DocBlock =
  | {
      kind: 'header';
      name: string;
      contact: string[];
      links: string[];
      /** A safe href for each line of `links`, same index; undefined when it isn't one. */
      linkHrefs: Array<string | undefined>;
    }
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'entry'; title?: string; meta?: string; range?: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'tags'; text: string };

function nonBlank(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value && value.trim().length > 0));
}

/**
 * A link a reader may click: http(s) as typed, a bare domain given https, anything
 * else (javascript:, data:, file:) not a link at all — it stays plain text.
 */
export function safeHref(url: string | undefined): string | undefined {
  const value = url?.trim() ?? '';
  if (/^https?:\/\/[^\s]+$/i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+(\/[^\s]*)?$/i.test(value)) return `https://${value}`;
  return undefined;
}

/** The contact block: name, then one line of details, then one line of links. */
export function composeHeader(doc: ResumeDoc): DocBlock[] {
  const { contact } = doc;
  const contactLine = nonBlank([contact.email, contact.phone, contact.location]);
  const shown = contact.links
    .map((link) => ({
      text: nonBlank([link.label, link.url]).join(': '),
      href: safeHref(link.url),
    }))
    .filter((link) => link.text.length > 0);

  const blocks: DocBlock[] = [
    {
      kind: 'header',
      name: (contact.name || '').trim(),
      contact: contactLine,
      links: shown.map((link) => link.text),
      linkHrefs: shown.map((link) => link.href),
    },
  ];
  return blocks;
}

export function entryBullets(entry: Entry): string[] {
  return entry.bullets
    .map((bullet) => normaliseBullet(bullet.text))
    .filter((text) => text.length > 0);
}

export function entryTags(entry: Entry): string[] {
  return entry.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}

/** An entry the user has not filled in yet must not produce an empty row. */
export function isEntryEmpty(entry: Entry): boolean {
  return (
    !entry.title?.trim() &&
    !entry.organisation?.trim() &&
    !entry.text?.trim() &&
    !entry.location?.trim() &&
    !entry.startDate?.trim() &&
    entryBullets(entry).length === 0 &&
    entryTags(entry).length === 0
  );
}

/** A section with nothing to say produces no heading at all. */
export function isSectionEmpty(section: Section): boolean {
  return section.entries.every(isEntryEmpty);
}

/** Compose one entry into blocks, in reading order. */
export function composeEntry(entry: Entry): DocBlock[] {
  if (isEntryEmpty(entry)) return [];

  const blocks: DocBlock[] = [];

  const title = entry.title?.trim();
  const meta = nonBlank([entry.organisation, entry.location]).join(' \u00b7 ');
  const range = formatDateRange(entry.startDate, entry.endDate, entry.current);

  if (title || meta || range) {
    blocks.push({
      kind: 'entry',
      title: title || undefined,
      meta: meta || undefined,
      range: range || undefined,
    });
  }

  const paragraph = entry.text?.trim();
  if (paragraph) blocks.push({ kind: 'paragraph', text: paragraph });

  for (const text of entryBullets(entry)) blocks.push({ kind: 'bullet', text });

  const tags = entryTags(entry);
  if (tags.length > 0) blocks.push({ kind: 'tags', text: tags.join(', ') });

  return blocks;
}

/**
 * The full document, in the user's section order. Every section type is
 * rendered for every template — sections are never dropped by a layout.
 */
export function composeDocument(doc: ResumeDoc, spec: TemplateSpec): DocBlock[] {
  return [
    ...composeHeader(doc),
    ...composeSections(doc, spec).flatMap((section) => [
      section.heading,
      ...section.entries.flatMap((entry) => entry.blocks),
    ]),
  ];
}

/** One rendered section, its blocks still grouped by the entry that produced them. */
export interface ComposedSection {
  sectionId: string;
  heading: DocBlock;
  entries: { entryId: string; blocks: DocBlock[] }[];
}

/**
 * The sections of `composeDocument`, keeping which entry each block came from, so
 * the live preview can point at the entry being edited. `composeDocument` is built
 * from this, so the two cannot disagree about what is dropped.
 */
export function composeSections(doc: ResumeDoc, spec: TemplateSpec): ComposedSection[] {
  return doc.sections
    .filter((section) => !isSectionEmpty(section))
    .map((section) => ({
      sectionId: section.id,
      heading: { kind: 'heading', text: headingText(spec, section.title) },
      entries: section.entries
        .map((entry) => ({ entryId: entry.id, blocks: composeEntry(entry) }))
        .filter((entry) => entry.blocks.length > 0),
    }));
}

/** Extract the plain text of the composed document — used by tests and the "copy" action. */
export function blocksToPlainText(blocks: readonly DocBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case 'header':
        lines.push(block.name, ...block.contact, ...block.links);
        break;
      case 'heading':
        lines.push(block.text);
        break;
      case 'paragraph':
      case 'bullet':
      case 'tags':
        lines.push(block.text);
        break;
      case 'entry':
        lines.push(...([block.title, block.meta, block.range].filter(Boolean) as string[]));
        break;
    }
  }
  return lines.join('\n');
}
