// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  emptyEntry,
  emptyResume,
  isResumeDoc,
  isEntryEmpty,
  isResumeEmpty,
  migrate,
  uid,
} from '@/lib/capyresume/schema';
import { RESUME_SCHEMA_VERSION, type ResumeDoc } from '@/lib/capyresume/types';

describe('capyresume/schema — emptyResume', () => {
  it('produces a structurally valid, current-version document', () => {
    const doc = emptyResume();
    expect(isResumeDoc(doc)).toBe(true);
    expect(doc.version).toBe(RESUME_SCHEMA_VERSION);
    expect(doc.templateId).toBe('classic');
    expect(doc.contact.name).toBe('');
    expect(doc.contact.links).toEqual([]);
    expect(doc.sections.length).toBeGreaterThan(0);
    expect(() => new Date(doc.updatedAt).toISOString()).not.toThrow();
  });

  it('starts with the ATS-recommended section order', () => {
    expect(emptyResume().sections.map((s) => s.type)).toEqual([
      'summary',
      'experience',
      'education',
      'skills',
      'projects',
      'certifications',
    ]);
  });

  it('gives every generated node a distinct id', () => {
    const doc = emptyResume();
    const ids = [
      doc.sections.map((s) => s.id),
      [emptyEntry().id, emptyEntry().id, uid('x')],
    ].flat();
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('capyresume/schema — migrate never throws and always yields a valid doc', () => {
  const junk: unknown[] = [
    null,
    undefined,
    0,
    false,
    '',
    '   ',
    '{not json',
    '[]',
    '[1,2,3]',
    '"a string"',
    {},
    { version: 'nope' },
    { sections: 'not-an-array' },
    { contact: 42, sections: [null, 'x', 7] },
  ];

  it.each(junk)('returns a valid doc for %p', (input) => {
    let doc: ResumeDoc | undefined;
    expect(() => {
      doc = migrate(input);
    }).not.toThrow();
    expect(isResumeDoc(doc)).toBe(true);
    expect(doc!.version).toBe(RESUME_SCHEMA_VERSION);
  });

  it('upgrades a document saved under an older version', () => {
    const legacy = {
      version: 0,
      contact: { name: 'Old Name' },
      sections: [{ id: 's1', type: 'experience', title: 'Experience', entries: [] }],
    };

    const doc = migrate(legacy);

    expect(doc.version).toBe(RESUME_SCHEMA_VERSION);
    expect(doc.contact.name).toBe('Old Name');
    expect(doc.contact.links).toEqual([]);
    expect(doc.sections).toHaveLength(1);
  });

  it('repairs a corrupted body without discarding intact fields', () => {
    const corrupted = {
      version: 1,
      templateId: 'not-a-template',
      contact: { name: 'Maya', links: [{ label: 'LinkedIn', url: 'example.com' }, null, 'junk'] },
      sections: [
        {
          id: 'keep',
          type: 'experience',
          title: 'Experience',
          entries: [
            {
              id: 'e1',
              title: 'Analyst',
              bullets: ['Led the migration', { id: 'b2', text: 'Cut costs' }, 99],
            },
          ],
        },
        null,
        { id: 'bad-type', type: 'nonsense', title: 'Weird', entries: 'nope' },
      ],
    };

    const doc = migrate(corrupted);

    expect(doc.templateId).toBe('classic');
    expect(doc.contact.links).toEqual([{ label: 'LinkedIn', url: 'example.com' }]);

    const experience = doc.sections[0]!;
    expect(experience.entries[0]!.title).toBe('Analyst');
    // A legacy bare-string bullet is upgraded to the object shape.
    expect(experience.entries[0]!.bullets.map((b) => b.text)).toEqual([
      'Led the migration',
      'Cut costs',
    ]);
    expect(
      experience.entries[0]!.bullets.every((b) => typeof b.id === 'string' && b.id.length > 0)
    ).toBe(true);

    // Unknown section types fall back to `custom`, and a bad entries value becomes [].
    expect(doc.sections[1]!.type).toBe('custom');
    expect(doc.sections[1]!.entries).toEqual([]);
  });

  it('falls back to default sections when none survive', () => {
    const doc = migrate({ sections: [null, 'junk'] });
    expect(doc.sections.map((s) => s.type)).toContain('experience');
  });

  it('is idempotent', () => {
    const once = migrate({ version: 0, contact: { name: 'A' }, sections: [] });
    const twice = migrate(once);
    expect(twice).toEqual(once);
  });

  it('rejects non-string optional fields rather than writing NaN into them', () => {
    const doc = migrate({ contact: { name: 'A', email: 42, phone: null }, sections: [] });
    expect(doc.contact.email).toBeUndefined();
    expect(doc.contact.phone).toBeUndefined();
  });
});

describe('capyresume/schema — isResumeEmpty', () => {
  it('treats a fresh document as empty', () => {
    expect(isResumeEmpty(emptyResume())).toBe(true);
  });

  it('is not empty once a name is set', () => {
    const doc = emptyResume();
    doc.contact.name = 'Maya';
    expect(isResumeEmpty(doc)).toBe(false);
  });

  it('is not empty once an entry has a bullet', () => {
    const doc = emptyResume();
    doc.sections[1]!.entries.push({
      ...emptyEntry(),
      bullets: [{ id: 'b', text: 'Did a thing' }],
    });
    expect(isResumeEmpty(doc)).toBe(false);
  });

  it('ignores whitespace-only content', () => {
    const doc = emptyResume();
    doc.contact.name = '   ';
    doc.sections[3]!.entries.push({ ...emptyEntry(), tags: ['', '  '] });
    expect(isResumeEmpty(doc)).toBe(true);
  });
});

describe('capyresume/schema — isEntryEmpty', () => {
  const blank = { id: 'e', bullets: [], tags: [] } as unknown as Parameters<typeof isEntryEmpty>[0];
  it('treats a fresh entry and whitespace as empty, so it deletes without asking', () => {
    expect(isEntryEmpty(blank)).toBe(true);
    expect(isEntryEmpty({ ...blank, title: '  ', tags: [' '] })).toBe(true);
  });
  it('treats any typed field, bullet or tag as content worth confirming', () => {
    expect(isEntryEmpty({ ...blank, organisation: 'Acme' })).toBe(false);
    expect(isEntryEmpty({ ...blank, bullets: [{ id: 'b', text: 'Led a team' }] })).toBe(false);
    expect(isEntryEmpty({ ...blank, tags: ['SQL'] })).toBe(false);
  });
});

describe('capyresume/schema — isEntryEmpty counts every typed field', () => {
  const blank = { id: 'e', bullets: [], tags: [] } as unknown as Parameters<typeof isEntryEmpty>[0];
  it('a location or a date alone is content worth confirming', () => {
    expect(isEntryEmpty({ ...blank, location: 'Pune' })).toBe(false);
    expect(isEntryEmpty({ ...blank, startDate: '2021-03' })).toBe(false);
  });
});
