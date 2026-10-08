/**
 * CapyResume — every change a user can make to the résumé document.
 *
 * ## Why this module exists
 *
 * These edits used to live inline in `components/tool/CapyResume.tsx`, as ~20
 * arrow functions each rebuilding the part of the tree it touched. The problem
 * was not their length: it was that the shape of `ResumeDoc` (`doc.sections[i]`
 * → `entries[j]` → `bullets[k]`) was known in all twenty places at once. Adding a
 * field meant finding every spread that rebuilt its parent, and two of them had
 * already drifted into re-implementing the same list-reorder by hand.
 *
 * So this is a **deep module**: a small, uniform interface — `(doc, …) => doc` —
 * over the whole nested update. Callers name the edit they want and never see the
 * navigation. That gives the component leverage (one line per handler, no spreads)
 * and maintainers locality (the tree shape is known here and nowhere else).
 *
 * ## The contract every function keeps
 *
 * - **Pure.** Never mutates its argument. Every changed path is copied.
 * - **Identity when nothing changed.** An edit that would be a no-op returns the
 *   *same* document reference. Callers persist the result, and a new reference
 *   means a pointless write and a new `updatedAt`; `moveEntry` out of bounds must
 *   not register as an edit. The one case that breaks this is documented on
 *   `setTags`, where identity is preserved only if the parsed tags are equal.
 * - **Structure-preserving.** Ids never change, so an open editor, a React key and
 *   a selection all survive an edit. Order changes only in the move functions.
 *
 * Persistence is deliberately *not* here: these return documents, the caller
 * decides to save. See `lib/capyresume/store.ts` for the write itself.
 */

import { emptyBullet, emptyEntry, emptySection } from './schema';
import type { Entry, ResumeDoc, ResumeLink, Section, SectionType } from './types';

/** Which contact fields are plain text. `links` is edited through its own trio. */
export type ContactField = 'name' | 'email' | 'phone' | 'location';

/**
 * Move the item at `index` by `delta`, returning a new array, or `null` when the
 * move would leave the array.
 *
 * This exists because `moveSection` and `moveEntry` had each hand-rolled the same
 * bounds check, splice-out and splice-in. Two copies of an off-by-one is one copy
 * too many; a move is a move whatever it holds.
 */
function moveInArray<T>(items: readonly T[], index: number, delta: number): T[] | null {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= items.length) return null;
  const next = [...items];
  const [moved] = next.splice(index, 1);
  if (moved === undefined) return null;
  next.splice(target, 0, moved);
  return next;
}

/**
 * Apply `fn` to one section, returning the same document when nothing changed.
 *
 * Identity propagates both ways: an unmatched id returns `doc`, and a matched id
 * whose `fn` returns the *same* section also returns `doc`. The second case is what
 * `removeEntry`, an out-of-bounds `moveEntry` and a no-op `setBullet` rely on —
 * "the id existed" is not the same as "something changed", and conflating them
 * made every one of those write to storage for no reason.
 */
function mapSection(
  doc: ResumeDoc,
  sectionId: string,
  fn: (section: Section) => Section
): ResumeDoc {
  let changed = false;
  const sections = doc.sections.map((section) => {
    if (section.id !== sectionId) return section;
    const next = fn(section);
    if (next !== section) changed = true;
    return next;
  });
  return changed ? { ...doc, sections } : doc;
}

/** Apply `fn` to one entry inside one section. Same identity rule as `mapSection`. */
function mapEntry(
  doc: ResumeDoc,
  sectionId: string,
  entryId: string,
  fn: (entry: Entry) => Entry
): ResumeDoc {
  return mapSection(doc, sectionId, (section) => {
    let changed = false;
    const entries = section.entries.map((entry) => {
      if (entry.id !== entryId) return entry;
      const next = fn(entry);
      if (next !== entry) changed = true;
      return next;
    });
    return changed ? { ...section, entries } : section;
  });
}

// -------------------------------------------------------------------- contact

export function setContactField(doc: ResumeDoc, field: ContactField, value: string): ResumeDoc {
  if (doc.contact[field] === value) return doc;
  return { ...doc, contact: { ...doc.contact, [field]: value } };
}

export function addLink(doc: ResumeDoc): ResumeDoc {
  return {
    ...doc,
    contact: { ...doc.contact, links: [...doc.contact.links, { label: '', url: '' }] },
  };
}

export function setLink(
  doc: ResumeDoc,
  index: number,
  field: keyof ResumeLink,
  value: string
): ResumeDoc {
  const current = doc.contact.links[index];
  if (!current || current[field] === value) return doc;
  return {
    ...doc,
    contact: {
      ...doc.contact,
      links: doc.contact.links.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    },
  };
}

export function removeLink(doc: ResumeDoc, index: number): ResumeDoc {
  if (index < 0 || index >= doc.contact.links.length) return doc;
  return {
    ...doc,
    contact: { ...doc.contact, links: doc.contact.links.filter((_, i) => i !== index) },
  };
}

// ------------------------------------------------------------------- sections

export function addSection(doc: ResumeDoc, type: SectionType, title: string): ResumeDoc {
  return { ...doc, sections: [...doc.sections, emptySection(type, title)] };
}

export function removeSection(doc: ResumeDoc, sectionId: string): ResumeDoc {
  if (!doc.sections.some((section) => section.id === sectionId)) return doc;
  return { ...doc, sections: doc.sections.filter((section) => section.id !== sectionId) };
}

export function moveSection(doc: ResumeDoc, sectionId: string, delta: number): ResumeDoc {
  const index = doc.sections.findIndex((section) => section.id === sectionId);
  const sections = moveInArray(doc.sections, index, delta);
  return sections ? { ...doc, sections } : doc;
}

export function setSectionTitle(doc: ResumeDoc, sectionId: string, title: string): ResumeDoc {
  return mapSection(doc, sectionId, (section) =>
    section.title === title ? section : { ...section, title }
  );
}

// -------------------------------------------------------------------- entries

export function addEntry(doc: ResumeDoc, sectionId: string): ResumeDoc {
  return mapSection(doc, sectionId, (section) => ({
    ...section,
    entries: [...section.entries, emptyEntry()],
  }));
}

export function removeEntry(doc: ResumeDoc, sectionId: string, entryId: string): ResumeDoc {
  return mapSection(doc, sectionId, (section) => {
    if (!section.entries.some((entry) => entry.id === entryId)) return section;
    return { ...section, entries: section.entries.filter((entry) => entry.id !== entryId) };
  });
}

export function moveEntry(
  doc: ResumeDoc,
  sectionId: string,
  entryId: string,
  delta: number
): ResumeDoc {
  return mapSection(doc, sectionId, (section) => {
    const index = section.entries.findIndex((entry) => entry.id === entryId);
    const entries = moveInArray(section.entries, index, delta);
    return entries ? { ...section, entries } : section;
  });
}

export function setEntryField<K extends keyof Entry>(
  doc: ResumeDoc,
  sectionId: string,
  entryId: string,
  field: K,
  value: Entry[K]
): ResumeDoc {
  return mapEntry(doc, sectionId, entryId, (entry) =>
    entry[field] === value ? entry : { ...entry, [field]: value }
  );
}

// -------------------------------------------------------------------- bullets

export function addBullet(doc: ResumeDoc, sectionId: string, entryId: string): ResumeDoc {
  return mapEntry(doc, sectionId, entryId, (entry) => ({
    ...entry,
    bullets: [...entry.bullets, emptyBullet()],
  }));
}

export function setBullet(
  doc: ResumeDoc,
  sectionId: string,
  entryId: string,
  bulletId: string,
  text: string
): ResumeDoc {
  return mapEntry(doc, sectionId, entryId, (entry) => {
    const target = entry.bullets.find((bullet) => bullet.id === bulletId);
    if (!target || target.text === text) return entry;
    return {
      ...entry,
      bullets: entry.bullets.map((bullet) =>
        bullet.id === bulletId ? { ...bullet, text } : bullet
      ),
    };
  });
}

export function removeBullet(
  doc: ResumeDoc,
  sectionId: string,
  entryId: string,
  bulletId: string
): ResumeDoc {
  return mapEntry(doc, sectionId, entryId, (entry) => {
    if (!entry.bullets.some((bullet) => bullet.id === bulletId)) return entry;
    return { ...entry, bullets: entry.bullets.filter((bullet) => bullet.id !== bulletId) };
  });
}

/**
 * Set an entry's tags from the comma-separated string the input holds.
 *
 * Unlike the rest, identity depends on parsing: `"a, b"` and `"a,b"` and `" a , b "`
 * all produce `['a', 'b']`, so re-rendering after a keystroke that changed no tag
 * must not rewrite storage. Callers that want unconditional identity should compare
 * the parsed array first — or simply accept that a no-op save is invisible.
 */
export function setTags(
  doc: ResumeDoc,
  sectionId: string,
  entryId: string,
  raw: string
): ResumeDoc {
  const tags = raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return mapEntry(doc, sectionId, entryId, (entry) => {
    const unchanged =
      entry.tags.length === tags.length && entry.tags.every((tag, i) => tag === tags[i]);
    return unchanged ? entry : { ...entry, tags };
  });
}
