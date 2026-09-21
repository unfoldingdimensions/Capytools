import { emptyEntry, emptyResume, emptySection } from '@/lib/capyresume/schema';
import { collectTextTargets, findTarget, replaceTargetText } from '@/lib/capyresume/ai/targets';
import { DEMO_RESUME } from '@/lib/capyresume/demo';
import type { ResumeDoc } from '@/lib/capyresume/types';

/**
 * A two-section document: a summary prose entry, plus an experience entry with
 * one real bullet and one blank one (blank bullets must not be offered).
 */
function fixture(): ResumeDoc {
  const base = emptyResume();

  const summary = emptySection('summary', 'Summary');
  summary.entries = [{ ...emptyEntry(), text: 'Finance analyst who likes clean data.' }];

  const experience = emptySection('experience', 'Experience');
  experience.entries = [
    {
      ...emptyEntry(),
      title: 'Analyst',
      organisation: 'Northwind',
      bullets: [
        { id: 'b1', text: 'Rebuilt the monthly close process' },
        { id: 'b2', text: '   ' },
      ],
    },
  ];

  return { ...base, sections: [summary, experience] };
}

describe('capyresume/ai/targets — collecting', () => {
  it('offers prose and non-blank bullets, in document order', () => {
    const targets = collectTextTargets(fixture());

    expect(targets.map((t) => t.kind)).toEqual(['summary', 'bullet']);
    expect(targets[0]!.text).toBe('Finance analyst who likes clean data.');
    expect(targets[1]!.text).toBe('Rebuilt the monthly close process');
  });

  it('skips whitespace-only bullets rather than sending noise to a paid API', () => {
    const targets = collectTextTargets(fixture());
    expect(targets).toHaveLength(2);
    expect(targets.some((t) => t.bulletId === 'b2')).toBe(false);
  });

  it('labels a bullet with its section and role so the model has context', () => {
    const bullet = collectTextTargets(fixture())[1]!;
    expect(bullet.label).toBe('Experience · Analyst, Northwind — bullet 1');
  });

  it('never offers facts as improvable prose', () => {
    // Titles, organisations and dates must stay out: rewriting those is how a
    // model ends up inventing a job title.
    const targets = collectTextTargets(fixture());
    const texts = targets.map((t) => t.text);
    expect(texts).not.toContain('Analyst');
    expect(texts).not.toContain('Northwind');
  });

  it('finds targets in the demo résumé', () => {
    expect(collectTextTargets(DEMO_RESUME).length).toBeGreaterThan(5);
  });
});

describe('capyresume/ai/targets — replacing', () => {
  it('replaces a bullet without touching its siblings or the rest of the document', () => {
    const doc = fixture();
    const target = collectTextTargets(doc).find((t) => t.bulletId === 'b1')!;
    const updated = replaceTargetText(doc, target.id, 'Rebuilt the monthly close in 4 days');

    const entry = updated.sections[1]!.entries[0]!;
    expect(entry.bullets[0]!.text).toBe('Rebuilt the monthly close in 4 days');
    expect(entry.bullets[1]!.text).toBe('   ');
    expect(entry.title).toBe('Analyst');
    expect(entry.bullets[0]!.id).toBe('b1');
  });

  it('replaces summary prose', () => {
    const doc = fixture();
    const target = collectTextTargets(doc).find((t) => t.kind === 'summary')!;
    const updated = replaceTargetText(doc, target.id, 'Analyst with a focus on clean data.');

    expect(updated.sections[0]!.entries[0]!.text).toBe('Analyst with a focus on clean data.');
  });

  it('does not mutate the input document', () => {
    const doc = fixture();
    const before = JSON.stringify(doc);
    const target = collectTextTargets(doc)[0]!;
    replaceTargetText(doc, target.id, 'something else entirely');
    expect(JSON.stringify(doc)).toBe(before);
  });

  it('is a no-op for a stale id, so a target deleted mid-request cannot resurrect', () => {
    // The user can delete a bullet while a request is in flight; the reply must
    // not create content or move it somewhere else.
    const doc = fixture();
    const updated = replaceTargetText(doc, 'gone/gone/bullets/gone', 'injected');
    expect(updated).toBe(doc);
    expect(JSON.stringify(updated)).not.toContain('injected');
  });

  it('findTarget returns undefined for an unknown id instead of throwing', () => {
    expect(findTarget(fixture(), 'nope')).toBeUndefined();
  });
});
