/**
 * CapyResume — non-blocking completeness hints for the editor.
 *
 * The plan asks for "live validation hints (not blocking)". That word matters:
 * nothing here prevents an export, and nothing here judges the writing. These
 * are observations about structure — an empty section that will silently vanish
 * from the PDF, a bullet so long nobody will read it — because a résumé builder
 * that refuses to export your document is worse than one that exports it with a
 * note.
 *
 * Pure and unit-tested. Advice about *content* (add metrics, use stronger verbs)
 * is deliberately absent: that is opinion, the AI assist covers it on request,
 * and a tool that nags about your phrasing is not a tool people keep using.
 */

import type { ResumeDoc, Section, SectionType } from './types';

/** Sections whose content is one block of prose rather than titled rows. */
const PROSE_SECTIONS: ReadonlySet<SectionType> = new Set<SectionType>(['summary', 'custom']);

/** Beyond this, a "bullet" is a paragraph and recruiters stop reading it. */
const LONG_BULLET = 240;

/** Two or three lines of summary is the practical ceiling. */
const LONG_SUMMARY = 700;

export type HintTone = 'attention' | 'suggestion';

export interface ResumeHint {
  /** Stable across renders, so React keys do not churn. */
  id: string;
  tone: HintTone;
  message: string;
  /** Set when the hint points at one section, so the UI can group or order it. */
  sectionId?: string;
}

function characters(text: string): number {
  return text.trim().length;
}

function sectionHints(section: Section): ResumeHint[] {
  const hints: ResumeHint[] = [];
  const isProse = PROSE_SECTIONS.has(section.type);

  if (section.entries.length === 0) {
    hints.push({
      id: `${section.id}:empty-section`,
      tone: 'suggestion',
      sectionId: section.id,
      message: `“${section.title}” has no entries yet, so it will be left out of the export.`,
    });
    return hints;
  }

  if (isProse) {
    const text = section.entries
      .map((entry) => entry.text ?? '')
      .join(' ')
      .trim();

    if (characters(text) === 0) {
      hints.push({
        id: `${section.id}:empty-prose`,
        tone: 'suggestion',
        sectionId: section.id,
        message: `“${section.title}” is empty, so it will be left out of the export.`,
      });
    } else if (characters(text) > LONG_SUMMARY) {
      hints.push({
        id: `${section.id}:long-prose`,
        tone: 'suggestion',
        sectionId: section.id,
        message: `“${section.title}” runs to ${characters(text)} characters. Two or three lines is usually enough to be read.`,
      });
    }
    return hints;
  }

  section.entries.forEach((entry, index) => {
    const title = (entry.title ?? '').trim();
    const organisation = (entry.organisation ?? '').trim();
    const hasDates =
      (entry.startDate ?? '').trim().length > 0 ||
      (entry.endDate ?? '').trim().length > 0 ||
      entry.current === true;
    const hasBullets = entry.bullets.some((bullet) => characters(bullet.text) > 0);
    const hasProse = (entry.text ?? '').trim().length > 0;
    const hasTags = entry.tags.some((tag) => tag.trim().length > 0);

    /**
     * An entry can be complete without a single bullet: Education and
     * Certifications legitimately carry an institution, a place and a date
     * range instead. Treating those as unfinished nagged the shipped demo
     * résumé, so "has structure" is part of every test below.
     */
    const hasStructure =
      organisation.length > 0 || hasDates || (entry.location ?? '').trim().length > 0;

    const label = title || organisation || `entry ${index + 1}`;

    if (title.length === 0 && !hasStructure && !hasBullets && !hasProse && !hasTags) {
      hints.push({
        id: `${section.id}:${entry.id}:empty`,
        tone: 'suggestion',
        sectionId: section.id,
        message: `An entry in “${section.title}” has no details yet and will be left out of the export.`,
      });
      return;
    }

    if (title.length > 0 && !hasStructure && !hasBullets && !hasProse && !hasTags) {
      hints.push({
        id: `${section.id}:${entry.id}:no-detail`,
        tone: 'suggestion',
        sectionId: section.id,
        message: `“${label}” has a title but nothing under it yet.`,
      });
      return;
    }

    if (title.length === 0 && (hasBullets || hasProse)) {
      hints.push({
        id: `${section.id}:${entry.id}:no-title`,
        tone: 'suggestion',
        sectionId: section.id,
        message: `An entry in “${section.title}” has details but no role or qualification name.`,
      });
    }
  });

  // Aggregated per section: a hint per long bullet would bury everything else.
  const longBullets = section.entries.reduce(
    (count, entry) =>
      count + entry.bullets.filter((bullet) => characters(bullet.text) > LONG_BULLET).length,
    0
  );

  if (longBullets > 0) {
    hints.push({
      id: `${section.id}:long-bullets`,
      tone: 'suggestion',
      sectionId: section.id,
      message:
        longBullets === 1
          ? `A bullet under “${section.title}” is longer than ${LONG_BULLET} characters. Consider splitting it — skimmed bullets stop being read.`
          : `${longBullets} bullets under “${section.title}” are longer than ${LONG_BULLET} characters. Consider splitting them.`,
    });
  }

  return hints;
}

/**
 * Every hint for a document, attention items first. Never throws and never
 * blocks: the caller renders these as notes, not errors.
 */
export function lintResume(doc: ResumeDoc): ResumeHint[] {
  const hints: ResumeHint[] = [];

  if (doc.contact.name.trim().length === 0) {
    hints.push({
      id: 'contact:name',
      tone: 'attention',
      message: 'Add your name — it heads the document, and the export is named after it.',
    });
  }

  const hasEmail = (doc.contact.email ?? '').trim().length > 0;
  const hasPhone = (doc.contact.phone ?? '').trim().length > 0;

  if (!hasEmail && !hasPhone) {
    hints.push({
      id: 'contact:reachable',
      tone: 'attention',
      message: 'Add an email address or phone number, so someone can actually reach you.',
    });
  }

  const hasAnyContent =
    doc.sections.some((section) => section.entries.length > 0) ||
    doc.contact.name.trim().length > 0;

  if (!hasAnyContent) {
    hints.push({
      id: 'document:empty',
      tone: 'attention',
      message: 'There is nothing to export yet — add a section and fill something in.',
    });
  }

  for (const section of doc.sections) {
    hints.push(...sectionHints(section));
  }

  const order: Record<HintTone, number> = { attention: 0, suggestion: 1 };
  return hints.sort((a, b) => order[a.tone] - order[b.tone]);
}
