import { addBullet, addEntry, setBullet, setEntryField } from '@/lib/capyresume/edits';
import { emptyResume } from '@/lib/capyresume/schema';
import type { ResumeDoc } from '@/lib/capyresume/types';

/**
 * Bullet text is edited with `setBullet`, not `setEntryField(…, 'text', …)`.
 *
 * Those two look interchangeable and are not: an `Entry` has its own prose `text`
 * field (used by summary and custom sections) *and* a `bullets` array whose members
 * each have a `text`. Passing 'text' to `setEntryField` writes the entry's prose, so
 * the bullet is untouched, React re-renders the controlled input back to its stored
 * value, and typing into an achievement appears to do nothing at all.
 *
 * That is exactly the bug a refactor of the editor's rows introduced, and the browser
 * check that missed it is why these assertions exist.
 */
const experience = (doc: ResumeDoc) => doc.sections.find((s) => s.type === 'experience')!;

function docWithBullet(): { doc: ResumeDoc; sectionId: string; entryId: string; bulletId: string } {
  const base = emptyResume();
  const sectionId = experience(base).id;
  const withEntry = addEntry(base, sectionId);
  const entryId = experience(withEntry).entries[0]!.id;
  const withBullet = addBullet(withEntry, sectionId, entryId);
  const bulletId = experience(withBullet).entries[0]!.bullets[0]!.id;
  return { doc: withBullet, sectionId, entryId, bulletId };
}

describe('capyresume/edits — bullet text is its own edit', () => {
  it('writes the bullet, not the enclosing entry prose', () => {
    const { doc, sectionId, entryId, bulletId } = docWithBullet();
    const next = setBullet(doc, sectionId, entryId, bulletId, 'Shipped the thing');

    const entry = experience(next).entries[0]!;
    expect(entry.bullets[0]!.text).toBe('Shipped the thing');
    // The entry's own prose must be left alone; conflating the two is the bug.
    expect(entry.text).toBeUndefined();
  });

  it('is what setEntryField gets wrong, so the difference is pinned', () => {
    const { doc, sectionId, entryId } = docWithBullet();
    // The wrong call: 'text' on an Entry sets the entry's prose field.
    const wrong = setEntryField(doc, sectionId, entryId, 'text', 'Shipped the thing');
    const entry = experience(wrong).entries[0]!;
    expect(entry.text).toBe('Shipped the thing');
    expect(entry.bullets[0]!.text).toBe('');
  });

  it('leaves other bullets and the entry identity alone', () => {
    const { doc, sectionId, entryId, bulletId } = docWithBullet();
    const withSecond = addBullet(doc, sectionId, entryId);
    const second = experience(withSecond).entries[0]!.bullets[1]!;

    const next = setBullet(withSecond, sectionId, entryId, bulletId, 'Edited');
    const entry = experience(next).entries[0]!;
    expect(entry.bullets[1]!.text).toBe(second.text);
    expect(entry.bullets[0]!.text).toBe('Edited');
  });

  it('is a no-op when the bullet already holds that text', () => {
    const { doc, sectionId, entryId, bulletId } = docWithBullet();
    expect(setBullet(doc, sectionId, entryId, bulletId, '')).toBe(doc);
  });
});
