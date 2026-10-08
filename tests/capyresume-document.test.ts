// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  blocksToPlainText,
  composeDocument,
  composeHeader,
  composeSections,
  entryBullets,
  entryTags,
  isEntryEmpty,
  isSectionEmpty,
  safeHref,
} from '@/lib/capyresume/document';

describe('capyresume/document — safeHref', () => {
  it('makes http(s) and bare domains clickable, and nothing else', () => {
    expect(safeHref('https://maya.dev')).toBe('https://maya.dev');
    expect(safeHref('linkedin.com/in/maya')).toBe('https://linkedin.com/in/maya');
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref('data:text/html,hi')).toBeUndefined();
    expect(safeHref('my portfolio')).toBeUndefined();
    expect(safeHref(undefined)).toBeUndefined();
  });
});
import { emptyEntry, emptyResume, migrate } from '@/lib/capyresume/schema';
import { TEMPLATE_LIST, TEMPLATES } from '@/lib/capyresume/templates';
import { DEMO_RESUME } from '@/lib/capyresume/demo';
import type { Entry, ResumeDoc } from '@/lib/capyresume/types';

/** A document that exercises every section type at once. */
function fullResume(): ResumeDoc {
  return migrate({
    ...DEMO_RESUME,
    sections: [
      ...DEMO_RESUME.sections,
      {
        id: 'demo-custom',
        type: 'custom',
        title: 'Volunteering',
        entries: [
          { id: 'v1', title: 'Treasurer', organisation: 'Local club', bullets: [], tags: [] },
        ],
      },
    ],
  });
}

function kinds(doc: ResumeDoc, templateId: Parameters<typeof composeDocument>[1]['id']) {
  return composeDocument(doc, TEMPLATES[templateId]).map((block) => block.kind);
}

describe('capyresume/document — header', () => {
  it('opens with the header block', () => {
    const blocks = composeDocument(DEMO_RESUME, TEMPLATES.classic);
    expect(blocks[0]!.kind).toBe('header');
    expect((blocks[0] as Extract<(typeof blocks)[0], { kind: 'header' }>).name).toBe('Maya Okafor');
  });

  it('splits contact details and links onto separate lines', () => {
    const header = composeDocument(DEMO_RESUME, TEMPLATES.classic)[0] as Extract<
      ReturnType<typeof composeDocument>[0],
      { kind: 'header' }
    >;
    expect(header.contact).toEqual([
      'maya.okafor@example.com',
      '+61 400 000 000',
      'Melbourne, Australia',
    ]);
    expect(header.links).toEqual([
      'LinkedIn: linkedin.com/in/mayaokafor',
      'Portfolio: mayaokafor.example.com',
    ]);
  });

  it('omits blank contact fields rather than emitting empty lines', () => {
    const doc = emptyResume();
    doc.contact.name = 'Solo';
    doc.contact.email = '   ';
    const header = composeDocument(doc, TEMPLATES.classic)[0] as Extract<
      ReturnType<typeof composeDocument>[0],
      { kind: 'header' }
    >;
    expect(header.contact).toEqual([]);
    expect(header.links).toEqual([]);
  });
});

describe('capyresume/document — sections are never dropped', () => {
  it.each(TEMPLATE_LIST)(
    '$name renders every non-empty section, including projects and certifications',
    (spec) => {
      // Regression guard: in the previous build two of three templates silently
      // omitted Projects and Certifications from the exported file.
      const blocks = composeDocument(fullResume(), spec);
      const headings = blocks
        .filter(
          (block): block is Extract<typeof block, { kind: 'heading' }> => block.kind === 'heading'
        )
        .map((block) => block.text);

      expect(headings).toHaveLength(7); // summary, experience, education, skills, projects, certifications, custom
      expect(headings.join(' | ')).toMatch(/PROJECTS|Projects/);
      expect(headings.join(' | ')).toMatch(/CERTIFICATIONS|Certifications/);
      expect(headings.join(' | ')).toMatch(/VOLUNTEERING|Volunteering/);
    }
  );

  it("keeps the user's section order", () => {
    const headings = composeDocument(fullResume(), TEMPLATES.classic)
      .filter((b) => b.kind === 'heading')
      .map((b) => b.text);
    expect(headings[0]).toBe('SUMMARY');
    expect(headings[headings.length - 1]).toBe('VOLUNTEERING');
  });

  it('emits no heading for an empty section', () => {
    const doc = emptyResume();
    expect(composeDocument(doc, TEMPLATES.classic).some((b) => b.kind === 'heading')).toBe(false);
  });

  it('skips a section whose entries are all blank', () => {
    const doc = migrate({
      contact: { name: 'A' },
      sections: [
        {
          id: 's',
          type: 'experience',
          title: 'Experience',
          entries: [{ id: 'e', bullets: [], tags: [] }],
        },
      ],
    });
    expect(composeDocument(doc, TEMPLATES.classic).map((b) => b.kind)).toEqual(['header']);
  });
});

describe('capyresume/document — entry composition', () => {
  it('emits an entry line, then bullets', () => {
    const blocks = composeDocument(DEMO_RESUME, TEMPLATES.classic);
    const entry = blocks.find((b) => b.kind === 'entry') as Extract<
      (typeof blocks)[0],
      { kind: 'entry' }
    >;

    expect(entry.title).toBe('Senior Operations Analyst');
    expect(entry.meta).toBe('Northwind Logistics \u00b7 Melbourne, VIC');
    expect(entry.range).toBe('Mar 2022 \u2013 Present');
    expect(kinds(DEMO_RESUME, 'classic')).toContain('bullet');
  });

  it('renders an open-ended role as Present', () => {
    const blocks = composeDocument(DEMO_RESUME, TEMPLATES.classic);
    const ranges = blocks
      .filter((b): b is Extract<typeof b, { kind: 'entry' }> => b.kind === 'entry')
      .map((b) => b.range);
    expect(ranges).toContain('Mar 2022 \u2013 Present');
    expect(ranges).toContain('Jul 2019 \u2013 Feb 2022');
  });

  it('renders a summary as a paragraph, not a bullet', () => {
    const blocks = composeDocument(DEMO_RESUME, TEMPLATES.classic);
    const summaryIndex = blocks.findIndex((b) => b.kind === 'paragraph');
    const firstHeading = blocks.findIndex((b) => b.kind === 'heading');
    expect(summaryIndex).toBeGreaterThan(firstHeading);
  });

  it('renders skills as a comma-separated tag line', () => {
    const tags = composeDocument(DEMO_RESUME, TEMPLATES.classic).filter(
      (b): b is Extract<typeof b, { kind: 'tags' }> => b.kind === 'tags'
    );
    expect(tags[0]!.text).toContain('SQL');
    expect(tags[0]!.text).toContain(', ');
  });

  it('normalises bullets so a pasted glyph cannot double up', () => {
    const entry: Entry = { ...emptyEntry(), bullets: [{ id: 'b', text: '  \u2022 Led it  ' }] };
    expect(entryBullets(entry)).toEqual(['Led it']);
  });

  it('drops blank tags', () => {
    const entry: Entry = { ...emptyEntry(), tags: ['SQL', '  ', ''] };
    expect(entryTags(entry)).toEqual(['SQL']);
  });

  it('detects a blank entry', () => {
    expect(isEntryEmpty(emptyEntry())).toBe(true);
    expect(isEntryEmpty({ ...emptyEntry(), tags: ['   '] })).toBe(true);
    expect(isEntryEmpty({ ...emptyEntry(), title: 'Analyst' })).toBe(false);
  });

  it('detects a blank section', () => {
    expect(isSectionEmpty({ id: 's', type: 'custom', title: 'X', entries: [] })).toBe(true);
    expect(
      isSectionEmpty({
        id: 's',
        type: 'custom',
        title: 'X',
        entries: [{ ...emptyEntry(), text: 'hi' }],
      })
    ).toBe(false);
  });
});

describe('capyresume/document — output hygiene', () => {
  it('adds no watermark, attribution or branding to any template', () => {
    for (const spec of TEMPLATE_LIST) {
      const text = blocksToPlainText(composeDocument(fullResume(), spec));
      for (const forbidden of [
        'Handcraft',
        'CapyResume',
        'Generated by',
        'capy.tools',
        'watermark',
      ]) {
        expect(text).not.toContain(forbidden);
      }
    }
  });

  it('serialises to plain text in reading order', () => {
    const text = blocksToPlainText(composeDocument(DEMO_RESUME, TEMPLATES.classic));
    expect(text.indexOf('Maya Okafor')).toBeLessThan(text.indexOf('SUMMARY'));
    expect(text.indexOf('SUMMARY')).toBeLessThan(text.indexOf('EXPERIENCE'));
  });
});

describe('capyresume/document — composeSections', () => {
  it('is composeDocument grouped by entry, so the preview can point at one', () => {
    const spec = TEMPLATE_LIST[0];
    const sections = composeSections(DEMO_RESUME, spec);
    const flat = [
      ...composeHeader(DEMO_RESUME),
      ...sections.flatMap((s) => [s.heading, ...s.entries.flatMap((e) => e.blocks)]),
    ];
    expect(flat).toEqual(composeDocument(DEMO_RESUME, spec));
    const first = DEMO_RESUME.sections.find((s) => !isSectionEmpty(s))!;
    expect(sections[0].sectionId).toBe(first.id);
    expect(sections[0].entries.map((e) => e.entryId)).toEqual(
      first.entries.filter((e) => !isEntryEmpty(e)).map((e) => e.id),
    );
  });
});
