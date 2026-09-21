import {
  exportResumeJson,
  importResumeJson,
  looksLikeResumeJson,
  resumeFileName,
} from '@/lib/capyresume/json';
import { emptyResume, isResumeDoc, migrate } from '@/lib/capyresume/schema';
import { DEMO_RESUME } from '@/lib/capyresume/demo';
import { RESUME_SCHEMA_VERSION, type ResumeDoc } from '@/lib/capyresume/types';

/** `JSON.parse` returns `any`; parse into an unknown-keyed record for the assertions. */
function parseJson(text: string): Record<string, unknown> {
  return JSON.parse(text) as Record<string, unknown>;
}

describe('capyresume/json — export', () => {
  it('pretty-prints so the user can read and hand-edit their own data', () => {
    const text = exportResumeJson(DEMO_RESUME);
    expect(text).toContain('\n  "contact"');
    expect(text.endsWith('\n')).toBe(true);
  });

  it('stamps the current schema version', () => {
    const doc = { ...emptyResume(), version: 0 };
    expect(parseJson(exportResumeJson(doc)).version).toBe(RESUME_SCHEMA_VERSION);
  });

  it('does not mutate the input document', () => {
    const doc = { ...emptyResume(), version: 0 };
    exportResumeJson(doc);
    expect(doc.version).toBe(0);
  });

  it('produces valid JSON for a document with optional fields missing', () => {
    const doc = emptyResume();
    doc.sections[1]!.entries.push({
      id: 'e',
      bullets: [{ id: 'b', text: 'Did a thing' }],
      tags: ['SQL'],
    });
    expect(() => {
      void parseJson(exportResumeJson(doc));
    }).not.toThrow();
  });
});

describe('capyresume/json — import round-trip', () => {
  it('round-trips a non-trivial résumé exactly', () => {
    const restored = importResumeJson(exportResumeJson(DEMO_RESUME));
    expect(restored).toEqual(migrate(DEMO_RESUME));
    expect(restored.contact.name).toBe('Maya Okafor');
    expect(restored.sections).toHaveLength(DEMO_RESUME.sections.length);
  });

  it('is stable across a second round-trip', () => {
    const once = importResumeJson(exportResumeJson(DEMO_RESUME));
    const twice = importResumeJson(exportResumeJson(once));
    expect(twice).toEqual(once);
  });

  it('accepts a document written by an older schema', () => {
    const legacy = JSON.stringify({
      version: 0,
      contact: { name: 'Legacy Person' },
      sections: [{ id: 's', type: 'experience', title: 'Experience', entries: [] }],
    });
    const restored = importResumeJson(legacy);
    expect(restored.contact.name).toBe('Legacy Person');
    expect(restored.version).toBe(RESUME_SCHEMA_VERSION);
  });
});

describe('capyresume/json — import is total', () => {
  const junk = ['', '   ', 'not json at all', '{ broken', '[]', 'null', '42', '<html></html>'];

  it.each(junk)('degrades %p to a valid document instead of throwing', (input) => {
    let doc: ResumeDoc | undefined;
    expect(() => {
      doc = importResumeJson(input);
    }).not.toThrow();
    expect(isResumeDoc(doc)).toBe(true);
    expect(doc!.sections.length).toBeGreaterThan(0);
  });
});

describe('capyresume/json — filenames', () => {
  it('names the backup after the person', () => {
    expect(resumeFileName(DEMO_RESUME, 'pdf')).toBe('maya-okafor.pdf');
    expect(resumeFileName(DEMO_RESUME, '.docx')).toBe('maya-okafor.docx');
    expect(resumeFileName(DEMO_RESUME, 'json')).toBe('maya-okafor.json');
  });

  it('falls back to "resume" when there is no name yet', () => {
    expect(resumeFileName(emptyResume(), 'pdf')).toBe('resume.pdf');
  });
});

describe('capyresume/json — looksLikeResumeJson', () => {
  it('recognises an object-shaped payload', () => {
    expect(looksLikeResumeJson(exportResumeJson(emptyResume()))).toBe(true);
    expect(looksLikeResumeJson('  {"a":1}  ')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(looksLikeResumeJson('')).toBe(false);
    expect(looksLikeResumeJson('[]')).toBe(false);
    expect(looksLikeResumeJson('hello')).toBe(false);
  });
});
