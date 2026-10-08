// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { emptyResume, emptyEntry, emptySection, migrate } from '@/lib/capyresume/schema';
import { lintResume } from '@/lib/capyresume/hints';
import { DEMO_RESUME } from '@/lib/capyresume/demo';
import type { ContactInfo, ResumeDoc, Section } from '@/lib/capyresume/types';

function docOf(sections: Section[], contact: Partial<ContactInfo> = {}): ResumeDoc {
  return {
    ...emptyResume(),
    contact: { name: '', links: [], ...contact },
    sections,
  };
}

function bullet(text: string) {
  return { id: `b-${text.length}-${text.slice(0, 4)}`, text };
}

function completeDoc(): ResumeDoc {
  const summary = emptySection('summary', 'Summary');
  summary.entries = [{ ...emptyEntry(), text: 'Finance analyst with a focus on clean data.' }];

  const experience = emptySection('experience', 'Experience');
  experience.entries = [
    {
      ...emptyEntry(),
      title: 'Analyst',
      organisation: 'Northwind',
      bullets: [bullet('Rebuilt the monthly close process')],
    },
  ];

  return docOf([summary, experience], {
    name: 'Maya Okafor',
    email: 'maya@example.com',
  });
}

describe('capyresume/hints — the contract is non-blocking', () => {
  it('only ever emits attention or suggestion, never an error', () => {
    // The whole point: nothing here may stop an export.
    const tones = lintResume(docOf([])).map((hint) => hint.tone);
    expect(tones.length).toBeGreaterThan(0);
    expect(tones.every((tone) => tone === 'attention' || tone === 'suggestion')).toBe(true);
  });

  it('returns an empty list for a well-formed document', () => {
    expect(lintResume(completeDoc())).toEqual([]);
  });

  it('returns an empty list for the shipped demo résumé', () => {
    expect(lintResume(DEMO_RESUME)).toEqual([]);
  });

  it('gives every hint a unique id, so React keys do not churn', () => {
    const doc = docOf([emptySection('skills', 'Skills'), emptySection('projects', 'Projects')]);
    const ids = lintResume(doc).map((hint) => hint.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never throws on a repaired document', () => {
    const junk = migrate({ sections: [null, 'nope', { type: 'nonsense' }], contact: 42 });
    expect(() => lintResume(junk)).not.toThrow();
  });
});

describe('capyresume/hints — ordering', () => {
  it('lists attention items before suggestions', () => {
    const doc = docOf([emptySection('skills', 'Skills')]);
    const tones = lintResume(doc).map((hint) => hint.tone);
    const firstSuggestion = tones.indexOf('suggestion');
    expect(firstSuggestion).toBeGreaterThan(0);
    expect(tones.slice(firstSuggestion).every((tone) => tone === 'suggestion')).toBe(true);
  });
});

describe('capyresume/hints — contact', () => {
  it('asks for a name, and says why it matters', () => {
    const hint = lintResume(docOf([])).find((h) => h.id === 'contact:name');
    expect(hint?.tone).toBe('attention');
    expect(hint?.message).toContain('name');
  });

  it('accepts an email as a way to be reached', () => {
    const doc = docOf([], { name: 'Maya', email: 'maya@example.com' });
    expect(lintResume(doc).some((h) => h.id === 'contact:reachable')).toBe(false);
  });

  it('accepts a phone number as a way to be reached', () => {
    const doc = docOf([], { name: 'Maya', phone: '+61 400 000 000' });
    expect(lintResume(doc).some((h) => h.id === 'contact:reachable')).toBe(false);
  });

  it('asks for contact details when neither is present', () => {
    const doc = docOf([], { name: 'Maya' });
    expect(lintResume(doc).some((h) => h.id === 'contact:reachable')).toBe(true);
  });

  it('flags a completely empty document once, not three times', () => {
    expect(lintResume(docOf([])).some((h) => h.id === 'document:empty')).toBe(true);
  });
});

describe('capyresume/hints — empty content that would silently vanish', () => {
  it('says an empty section will be left out, by name', () => {
    const doc = docOf([emptySection('skills', 'Skills')], { name: 'M', email: 'a@b.c' });
    const hint = lintResume(doc).find((h) => h.id.endsWith(':empty-section'));
    expect(hint?.message).toContain('Skills');
    expect(hint?.message).toContain('left out of the export');
  });

  it('flags a prose section whose entry is blank', () => {
    // A prose section with no entries at all is covered by the section-level
    // hint, so this is the case where an entry exists but says nothing.
    const summary = emptySection('summary', 'Summary');
    summary.entries = [{ ...emptyEntry(), text: '   ' }];

    const doc = docOf([summary], { name: 'M', email: 'a@b.c' });
    expect(lintResume(doc).some((h) => h.id.endsWith(':empty-prose'))).toBe(true);
  });

  it('does not nag an education entry that has an institution and dates instead of bullets', () => {
    // The shipped demo résumé does exactly this; flagging it was the bug.
    const education = emptySection('education', 'Education');
    education.entries = [
      {
        ...emptyEntry(),
        title: 'Bachelor of Commerce, Economics',
        organisation: 'University of Melbourne',
        location: 'Melbourne, VIC',
        startDate: '2015',
        endDate: '2018',
      },
    ];

    const doc = docOf([education], { name: 'M', email: 'a@b.c' });
    expect(lintResume(doc)).toEqual([]);
  });

  it('does not nag a certification that has an issuer and a date', () => {
    const certifications = emptySection('certifications', 'Certifications');
    certifications.entries = [
      {
        ...emptyEntry(),
        title: 'Google Data Analytics Certificate',
        organisation: 'Google',
        endDate: '2024',
      },
    ];

    const doc = docOf([certifications], { name: 'M', email: 'a@b.c' });
    expect(lintResume(doc)).toEqual([]);
  });

  it('flags a non-prose entry that has no details at all', () => {
    const experience = emptySection('experience', 'Experience');
    experience.entries = [{ ...emptyEntry(), title: 'Analyst' }];

    const doc = docOf([experience], { name: 'M', email: 'a@b.c' });
    const ids = lintResume(doc).map((h) => h.id);
    // A title with nothing under it, and no bullet list.
    expect(ids.some((id) => id.endsWith(':no-detail'))).toBe(true);
  });

  it('does not complain about an education entry that has a title and a bullet', () => {
    const education = emptySection('education', 'Education');
    education.entries = [
      { ...emptyEntry(), title: 'BSc Economics', bullets: [bullet('First class honours')] },
    ];

    const doc = docOf([education], { name: 'M', email: 'a@b.c' });
    expect(lintResume(doc)).toEqual([]);
  });
});

describe('capyresume/hints — length', () => {
  it('notes a summary that has grown past a readable length', () => {
    const summary = emptySection('summary', 'Summary');
    summary.entries = [{ ...emptyEntry(), text: 'x'.repeat(701) }];

    const doc = docOf([summary], { name: 'M', email: 'a@b.c' });
    const hint = lintResume(doc).find((h) => h.id.endsWith(':long-prose'));
    expect(hint?.message).toContain('701');
  });

  it('leaves a reasonable summary alone', () => {
    const summary = emptySection('summary', 'Summary');
    summary.entries = [{ ...emptyEntry(), text: 'x'.repeat(400) }];

    const doc = docOf([summary], { name: 'M', email: 'a@b.c' });
    expect(lintResume(doc)).toEqual([]);
  });

  it('aggregates long bullets into one hint rather than one per bullet', () => {
    const experience = emptySection('experience', 'Experience');
    experience.entries = [
      {
        ...emptyEntry(),
        title: 'Analyst',
        bullets: [bullet('y'.repeat(241)), bullet('z'.repeat(241)), bullet('short one')],
      },
    ];

    const doc = docOf([experience], { name: 'M', email: 'a@b.c' });
    const long = lintResume(doc).filter((h) => h.id.endsWith(':long-bullets'));
    expect(long).toHaveLength(1);
    expect(long[0]!.message).toContain('2 bullets');
  });

  it('singularises a single long bullet', () => {
    const experience = emptySection('experience', 'Experience');
    experience.entries = [
      { ...emptyEntry(), title: 'Analyst', bullets: [bullet('y'.repeat(241))] },
    ];

    const doc = docOf([experience], { name: 'M', email: 'a@b.c' });
    const long = lintResume(doc).find((h) => h.id.endsWith(':long-bullets'));
    expect(long?.message).toContain('A bullet');
  });

  it('ignores a bullet exactly at the limit', () => {
    const experience = emptySection('experience', 'Experience');
    experience.entries = [
      { ...emptyEntry(), title: 'Analyst', bullets: [bullet('y'.repeat(240))] },
    ];

    const doc = docOf([experience], { name: 'M', email: 'a@b.c' });
    expect(lintResume(doc)).toEqual([]);
  });
});
