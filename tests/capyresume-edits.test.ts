// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  addBullet,
  addEntry,
  addLink,
  addSection,
  moveEntry,
  moveSection,
  removeBullet,
  removeEntry,
  removeLink,
  removeSection,
  setBullet,
  setContactField,
  setEntryField,
  setLink,
  setSectionTitle,
  setTags,
} from '@/lib/capyresume/edits';
import { emptyResume } from '@/lib/capyresume/schema';
import type { ResumeDoc } from '@/lib/capyresume/types';

/**
 * The document-mutation module.
 *
 * These edits previously lived inline in `components/tool/CapyResume.tsx` and had
 * no direct test surface at all — the component is rendered statically in one
 * suite, so a broken `moveEntry` or a spread that dropped `bullets` would only
 * show up by hand. The interface is now the test surface: every function is
 * called with a document and asserted on the document it returns.
 *
 * Two properties are asserted across the whole module rather than per-function,
 * because they are the contract callers rely on:
 *
 * - **Purity.** The input document is never mutated. `setContactField` returning a
 *   new object while also writing through to the argument is the classic way this
 *   breaks, and nothing else here would notice.
 * - **Identity when nothing changed.** A no-op must return the *same* reference,
 *   because the caller persists whatever it gets back. A fresh reference would
 *   mean a storage write and a new `updatedAt` for a keypress that changed nothing.
 */
function docWithEntry(): ResumeDoc {
  const base = emptyResume();
  const section = base.sections.find((s) => s.type === 'experience')!;
  const withEntry = addEntry(base, section.id);
  return withEntry;
}

/** Deep-freeze so a mutation anywhere in the tree throws instead of passing. */
function frozen(doc: ResumeDoc): ResumeDoc {
  const walk = (value: unknown): void => {
    if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(walk);
      Object.freeze(value);
    }
  };
  walk(doc);
  return doc;
}

describe('capyresume/edits — contact', () => {
  it('sets a text field without touching the rest of the contact', () => {
    const doc = emptyResume();
    const next = setContactField(doc, 'name', 'Ada Lovelace');
    expect(next.contact.name).toBe('Ada Lovelace');
    expect(next.contact.links).toEqual(doc.contact.links);
    expect(next.sections).toBe(doc.sections);
  });

  it('round-trips every editable contact field', () => {
    const fields = ['name', 'email', 'phone', 'location'] as const;
    let doc = emptyResume();
    for (const field of fields) doc = setContactField(doc, field, `value-${field}`);
    for (const field of fields) expect(doc.contact[field]).toBe(`value-${field}`);
  });

  it('adds, edits and removes links by index', () => {
    let doc = emptyResume();
    doc = addLink(doc);
    doc = addLink(doc);
    expect(doc.contact.links).toEqual([
      { label: '', url: '' },
      { label: '', url: '' },
    ]);

    doc = setLink(doc, 1, 'label', 'GitHub');
    doc = setLink(doc, 1, 'url', 'https://github.com/ada');
    expect(doc.contact.links[1]).toEqual({ label: 'GitHub', url: 'https://github.com/ada' });
    // The untouched sibling is left alone.
    expect(doc.contact.links[0]).toEqual({ label: '', url: '' });

    doc = removeLink(doc, 0);
    expect(doc.contact.links).toEqual([{ label: 'GitHub', url: 'https://github.com/ada' }]);
  });

  it('ignores a link index that is out of range instead of inventing a link', () => {
    const doc = addLink(emptyResume());
    expect(setLink(doc, 7, 'label', 'nope')).toBe(doc);
    expect(removeLink(doc, 7)).toBe(doc);
    expect(removeLink(doc, -1)).toBe(doc);
  });
});

describe('capyresume/edits — sections', () => {
  it('appends a section carrying the label the picker showed', () => {
    const doc = emptyResume();
    const next = addSection(doc, 'custom', 'Volunteering');
    expect(next.sections).toHaveLength(doc.sections.length + 1);
    expect(next.sections.at(-1)).toMatchObject({
      type: 'custom',
      title: 'Volunteering',
      entries: [],
    });
  });

  it('removes by id only, and leaves other sections by reference', () => {
    const doc = emptyResume();
    const [first, second] = doc.sections;
    const next = removeSection(doc, first!.id);
    expect(next.sections.some((s) => s.id === first!.id)).toBe(false);
    // Untouched sections keep their identity: React keys and memoised children survive.
    expect(next.sections.find((s) => s.id === second!.id)).toBe(second);
  });

  it('moves a section both ways and refuses to move past either end', () => {
    const doc = emptyResume();
    const ids = doc.sections.map((s) => s.id);

    const down = moveSection(doc, ids[0]!, 1);
    expect(down.sections.map((s) => s.id).slice(0, 2)).toEqual([ids[1], ids[0]]);

    const up = moveSection(down, ids[0]!, -1);
    expect(up.sections.map((s) => s.id)).toEqual(ids);

    // At the edges there is no move, so there is no edit.
    expect(moveSection(doc, ids[0]!, -1)).toBe(doc);
    expect(moveSection(doc, ids.at(-1)!, 1)).toBe(doc);
    expect(moveSection(doc, 'no-such-section', 1)).toBe(doc);
  });

  it('preserves every section when moving, losing none', () => {
    const doc = emptyResume();
    const ids = doc.sections.map((s) => s.id);
    const moved = moveSection(doc, ids.at(-1)!, -1);
    expect([...moved.sections.map((s) => s.id)].sort()).toEqual([...ids].sort());
    expect(moved.sections).toHaveLength(doc.sections.length);
  });
});

describe('capyresume/edits — entries', () => {
  it('adds an entry to the named section only', () => {
    const doc = emptyResume();
    const target = doc.sections.find((s) => s.type === 'experience')!;
    const other = doc.sections.find((s) => s.type === 'education')!;

    const next = addEntry(doc, target.id);
    expect(next.sections.find((s) => s.id === target.id)!.entries).toHaveLength(1);
    expect(next.sections.find((s) => s.id === other.id)).toBe(other);
  });

  it('ignores an unknown section id', () => {
    const doc = emptyResume();
    expect(addEntry(doc, 'no-such-section')).toBe(doc);
    expect(removeEntry(doc, 'no-such-section', 'no-such-entry')).toBe(doc);
  });

  it('sets fields including the boolean `current` flag', () => {
    let doc = docWithEntry();
    const section = doc.sections.find((s) => s.type === 'experience')!;
    const entryId = section.entries[0]!.id;

    doc = setEntryField(doc, section.id, entryId, 'title', 'Analyst');
    doc = setEntryField(doc, section.id, entryId, 'organisation', 'Analytical Engines');
    doc = setEntryField(doc, section.id, entryId, 'current', true);

    const entry = doc.sections.find((s) => s.id === section.id)!.entries[0]!;
    expect(entry.title).toBe('Analyst');
    expect(entry.organisation).toBe('Analytical Engines');
    expect(entry.current).toBe(true);
  });

  it('moves an entry within its section and refuses to move past the ends', () => {
    let doc = docWithEntry();
    const section = doc.sections.find((s) => s.type === 'experience')!;
    doc = addEntry(doc, section.id);
    const [first, second] = doc.sections.find((s) => s.id === section.id)!.entries;

    const swapped = moveEntry(doc, section.id, first!.id, 1);
    const after = swapped.sections.find((s) => s.id === section.id)!.entries;
    expect(after.map((e) => e.id)).toEqual([second!.id, first!.id]);

    expect(moveEntry(doc, section.id, first!.id, -1)).toBe(doc);
    expect(moveEntry(doc, section.id, second!.id, 1)).toBe(doc);
    expect(moveEntry(doc, section.id, 'no-such-entry', 1)).toBe(doc);
  });

  it('removes an entry without disturbing its siblings', () => {
    let doc = docWithEntry();
    const section = doc.sections.find((s) => s.type === 'experience')!;
    doc = addEntry(doc, section.id);
    const [first, second] = doc.sections.find((s) => s.id === section.id)!.entries;

    const next = removeEntry(doc, section.id, first!.id);
    const entries = next.sections.find((s) => s.id === section.id)!.entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toBe(second);
  });
});

describe('capyresume/edits — bullets and tags', () => {
  it('adds, edits and removes a bullet inside one entry', () => {
    let doc = docWithEntry();
    const section = doc.sections.find((s) => s.type === 'experience')!;
    const entryId = section.entries[0]!.id;

    doc = addBullet(doc, section.id, entryId);
    const bulletId = doc.sections.find((s) => s.id === section.id)!.entries[0]!.bullets[0]!.id;

    doc = setBullet(doc, section.id, entryId, bulletId, 'Shipped the thing');
    expect(doc.sections.find((s) => s.id === section.id)!.entries[0]!.bullets[0]!.text).toBe(
      'Shipped the thing'
    );

    doc = removeBullet(doc, section.id, entryId, bulletId);
    expect(doc.sections.find((s) => s.id === section.id)!.entries[0]!.bullets).toEqual([]);
  });

  it('ignores an unknown bullet id or an unknown entry id', () => {
    const doc = docWithEntry();
    const section = doc.sections.find((s) => s.type === 'experience')!;
    const entryId = section.entries[0]!.id;
    expect(addBullet(doc, section.id, 'no-such-entry')).toBe(doc);
    expect(setBullet(doc, section.id, entryId, 'no-such-bullet', 'x')).toBe(doc);
    expect(removeBullet(doc, section.id, entryId, 'no-such-bullet')).toBe(doc);
    expect(addBullet(doc, 'no-such-section', entryId)).toBe(doc);
  });

  it('parses the comma-separated tag input, trimming and dropping empties', () => {
    const doc = docWithEntry();
    const section = doc.sections.find((s) => s.type === 'experience')!;
    const entryId = section.entries[0]!.id;

    const next = setTags(doc, section.id, entryId, ' React, TypeScript ,, Jest , ');
    expect(next.sections.find((s) => s.id === section.id)!.entries[0]!.tags).toEqual([
      'React',
      'TypeScript',
      'Jest',
    ]);
  });

  it('treats a re-parse that yields the same tags as no change', () => {
    // `"a, b"` and `"a,b"` are the same tags, so an extra keystroke must not write.
    const doc = docWithEntry();
    const section = doc.sections.find((s) => s.type === 'experience')!;
    const entryId = section.entries[0]!.id;

    const typed = setTags(doc, section.id, entryId, 'a, b');
    const respaced = setTags(typed, section.id, entryId, 'a,b');
    expect(respaced).toBe(typed);
  });
});

describe('capyresume/edits — the contract every function keeps', () => {
  const edits: [string, (doc: ResumeDoc) => ResumeDoc][] = [
    ['setContactField', (d) => setContactField(d, 'name', 'Changed')],
    ['addLink', (d) => addLink(d)],
    ['setLink', (d) => setLink(addLink(d), 0, 'label', 'x')],
    ['removeLink', (d) => removeLink(addLink(d), 0)],
    ['addSection', (d) => addSection(d, 'custom', 'X')],
    ['removeSection', (d) => removeSection(d, d.sections[0]!.id)],
    ['moveSection', (d) => moveSection(d, d.sections[0]!.id, 1)],
    ['setSectionTitle', (d) => setSectionTitle(d, d.sections[0]!.id, 'Renamed')],
    ['addEntry', (d) => addEntry(d, d.sections[0]!.id)],
    [
      'setEntryField',
      (d) => {
        const withEntry = addEntry(d, d.sections[0]!.id);
        const entryId = withEntry.sections[0]!.entries[0]!.id;
        return setEntryField(withEntry, withEntry.sections[0]!.id, entryId, 'title', 'T');
      },
    ],
    [
      'removeEntry',
      (d) => {
        const withEntry = addEntry(d, d.sections[0]!.id);
        const entryId = withEntry.sections[0]!.entries[0]!.id;
        return removeEntry(withEntry, withEntry.sections[0]!.id, entryId);
      },
    ],
    [
      'moveEntry',
      (d) => {
        let withEntries = addEntry(d, d.sections[0]!.id);
        withEntries = addEntry(withEntries, withEntries.sections[0]!.id);
        const entryId = withEntries.sections[0]!.entries[0]!.id;
        return moveEntry(withEntries, withEntries.sections[0]!.id, entryId, 1);
      },
    ],
    [
      'addBullet',
      (d) => {
        const withEntry = addEntry(d, d.sections[0]!.id);
        return addBullet(
          withEntry,
          withEntry.sections[0]!.id,
          withEntry.sections[0]!.entries[0]!.id
        );
      },
    ],
    [
      'setBullet',
      (d) => {
        const withEntry = addEntry(d, d.sections[0]!.id);
        const withBullet = addBullet(
          withEntry,
          withEntry.sections[0]!.id,
          withEntry.sections[0]!.entries[0]!.id
        );
        const bulletId = withBullet.sections[0]!.entries[0]!.bullets[0]!.id;
        return setBullet(
          withBullet,
          withBullet.sections[0]!.id,
          withBullet.sections[0]!.entries[0]!.id,
          bulletId,
          'text'
        );
      },
    ],
    [
      'setTags',
      (d) => {
        const withEntry = addEntry(d, d.sections[0]!.id);
        return setTags(
          withEntry,
          withEntry.sections[0]!.id,
          withEntry.sections[0]!.entries[0]!.id,
          'a,b'
        );
      },
    ],
  ];

  it.each(edits)('%s never mutates the document it was given', (_name, apply) => {
    const doc = frozen(emptyResume());
    const before = JSON.stringify(doc);
    // A frozen tree makes any in-place write throw, and the JSON comparison catches
    // a mutation that a spread accidentally routed back into the original.
    expect(() => apply(doc)).not.toThrow();
    expect(JSON.stringify(doc)).toBe(before);
  });

  it.each(edits)('%s returns a new document with the envelope intact', (_name, apply) => {
    const doc = emptyResume();
    const next = apply(doc);
    expect(next).not.toBe(doc);
    expect(next.version).toBe(doc.version);
    expect(next.templateId).toBe(doc.templateId);
    expect(next.updatedAt).toBe(doc.updatedAt);
  });

  it('returns the same reference when a text field is set to its current value', () => {
    // Every keystroke re-runs the handler; an unchanged value must not persist.
    const doc = setContactField(emptyResume(), 'name', 'Ada');
    expect(setContactField(doc, 'name', 'Ada')).toBe(doc);
    expect(setSectionTitle(doc, doc.sections[0]!.id, doc.sections[0]!.title)).toBe(doc);

    // Compare against the SAME intermediate document: calling addLink twice builds
    // two different link objects, so comparing those would fail for the wrong reason.
    const linked = addLink(doc);
    expect(setLink(linked, 0, 'label', linked.contact.links[0]!.label)).toBe(linked);
  });
});

describe('capyresume/edits — the no-op identity the editor relies on', () => {
  /**
   * The editor skips a storage write and a re-render when an edit returns the same
   * reference, so identity is load-bearing rather than an optimisation detail. These
   * assert it for the calls a user can trigger without changing anything.
   */
  const sectionId = (doc: ResumeDoc) => doc.sections[0]!.id;

  it('returns the same document for an out-of-range move', () => {
    const doc = emptyResume();
    expect(moveSection(doc, sectionId(doc), -1)).toBe(doc);
    expect(moveSection(doc, 'no-such-section', 1)).toBe(doc);
    expect(moveEntry(doc, sectionId(doc), 'no-such-entry', 1)).toBe(doc);
  });

  it('returns the same document when a field is set to the value it holds', () => {
    const doc = setContactField(emptyResume(), 'name', 'Ada');
    expect(setContactField(doc, 'name', 'Ada')).toBe(doc);
    expect(setSectionTitle(doc, sectionId(doc), doc.sections[0]!.title)).toBe(doc);
  });

  it('returns the same document when a removal matches nothing', () => {
    const doc = emptyResume();
    expect(removeSection(doc, 'no-such-section')).toBe(doc);
    expect(removeLink(doc, 3)).toBe(doc);
    expect(removeEntry(doc, sectionId(doc), 'no-such-entry')).toBe(doc);
    expect(removeBullet(doc, sectionId(doc), 'no-entry', 'no-bullet')).toBe(doc);
  });

  it('returns the same document when tag text re-parses to the same tags', () => {
    // Ids come from uid(), so two emptyResume() calls never share one. Derive every id
    // from the single document being edited.
    const base = emptyResume();
    const experienceId = base.sections.find((s) => s.type === 'experience')!.id;
    const withEntry = addEntry(base, experienceId);
    const entryId = withEntry.sections.find((s) => s.id === experienceId)!.entries[0]!.id;
    const tagged = setTags(withEntry, experienceId, entryId, 'a,b');
    expect(setTags(tagged, experienceId, entryId, 'a, b')).toBe(tagged);
  });
});
