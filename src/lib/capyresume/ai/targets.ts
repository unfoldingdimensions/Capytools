/**
 * CapyResume — find and replace the AI-improvable text in a document.
 *
 * Pure and unit-tested, which is the point: "improve this text" needs a stable
 * way to name a piece of the résumé and write a replacement back, and getting
 * that wrong silently mangles someone's CV. It is also what keeps the UI thin.
 */

import type { ResumeDoc } from '../types';

export type TargetKind = 'summary' | 'bullet';

export interface TextTarget {
  /** Stable within a document: `${sectionId}/${entryId}/text` or `.../bullets/${bulletId}`. */
  id: string;
  kind: TargetKind;
  /** Where it lives, e.g. "Summary" or "Experience · Analyst — bullet 2". */
  label: string;
  /** The prose to hand to the model. */
  text: string;
  sectionId: string;
  entryId: string;
  bulletId?: string;
}

/**
 * Everything worth improving, in document order. Skips empty text and the
 * heading-like fields (titles, organisations, dates, tags), because those are
 * facts rather than prose — rewriting them is how a model ends up inventing a
 * job title.
 */
export function collectTextTargets(doc: ResumeDoc): TextTarget[] {
  const targets: TextTarget[] = [];

  for (const section of doc.sections) {
    for (const entry of section.entries) {
      const who = [entry.title, entry.organisation].filter(Boolean).join(', ');
      const base = who ? `${section.title} · ${who}` : section.title;

      if (entry.text !== undefined && entry.text.trim().length > 0) {
        targets.push({
          id: `${section.id}/${entry.id}/text`,
          kind: 'summary',
          label: `${base} — description`,
          text: entry.text,
          sectionId: section.id,
          entryId: entry.id,
        });
      }

      entry.bullets.forEach((bullet, index) => {
        if (bullet.text.trim().length === 0) return;
        targets.push({
          id: `${section.id}/${entry.id}/bullets/${bullet.id}`,
          kind: 'bullet',
          label: `${base} — bullet ${index + 1}`,
          text: bullet.text,
          sectionId: section.id,
          entryId: entry.id,
          bulletId: bullet.id,
        });
      });
    }
  }

  return targets;
}

export function findTarget(doc: ResumeDoc, id: string): TextTarget | undefined {
  return collectTextTargets(doc).find((target) => target.id === id);
}

/**
 * Write `next` into the target, returning a new document. Returns the input
 * unchanged when the target no longer exists — the user may have deleted the
 * bullet while a request was in flight, and a stale id must never create or
 * move content.
 */
export function replaceTargetText(doc: ResumeDoc, id: string, next: string): ResumeDoc {
  const target = findTarget(doc, id);
  if (target === undefined) return doc;
  // Applying a suggestion that matches the text already there is not an edit. Returning
  // `doc` unchanged keeps the reference stable, which is what lets the caller skip a
  // storage write and a re-render — the same no-op contract `lib/capyresume/edits.ts`
  // keeps. Without it this is the one caller that rebuilds an identical document.
  if (target.text === next) return doc;

  return {
    ...doc,
    sections: doc.sections.map((section) => {
      if (section.id !== target.sectionId) return section;

      return {
        ...section,
        entries: section.entries.map((entry) => {
          if (entry.id !== target.entryId) return entry;

          if (target.kind === 'summary') {
            return { ...entry, text: next };
          }

          return {
            ...entry,
            bullets: entry.bullets.map((bullet) =>
              bullet.id === target.bulletId ? { ...bullet, text: next } : bullet
            ),
          };
        }),
      };
    }),
  };
}
