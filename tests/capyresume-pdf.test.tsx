// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
/**
 * PDF exporter tests.
 *
 * `@react-pdf/renderer` ships ESM-only and cannot be transformed by this
 * Jest/SWC setup, so the renderer surface is mocked here and we assert the
 * *document tree we build*: which blocks reach the page, the template-driven
 * styles, and the absence of any watermark.
 *
 * The real byte-level render (a genuine PDF with an extractable text layer) is
 * verified end-to-end by `scripts/verify-pdf-text-layer.cjs`, which runs outside
 * Jest against the real engine.
 */

vi.mock('@react-pdf/renderer', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  const passthrough = (name: string) => {
    const Component = (props: Record<string, unknown>) => React.createElement(name, props);
    Component.displayName = name;
    return Component;
  };

  return {
    Document: passthrough('Document'),
    Page: passthrough('Page'),
    Text: passthrough('Text'),
    View: passthrough('View'),
    StyleSheet: { create: (styles: unknown) => styles },
    Font: { register: () => undefined },
    Link: passthrough('Link'),
    pdf: (element: unknown) => ({
      __element: element,
      toBlob: () => Promise.resolve(new Blob(['%PDF-1.7\n'], { type: 'application/pdf' })),
    }),
  };
});

import { buildResumePdf, ResumePdfDocument } from '@/lib/capyresume/pdf';
import { emptyResume } from '@/lib/capyresume/schema';
import { TEMPLATE_LIST } from '@/lib/capyresume/templates';
import { DEMO_RESUME } from '@/lib/capyresume/demo';
import type { ResumeDoc, TemplateId } from '@/lib/capyresume/types';

interface ElementLike {
  type: string | (((...args: never[]) => unknown) & { displayName?: string });
  props: { children?: unknown; style?: Record<string, unknown>; [key: string]: unknown };
}

function isElement(value: unknown): value is ElementLike {
  return typeof value === 'object' && value !== null && 'type' in value && 'props' in value;
}

/**
 * The renderer's components are mocked as functions, so an element's `type` is
 * the component itself rather than a string. Match on `displayName`.
 */
function elementName(node: ElementLike): string | undefined {
  if (typeof node.type === 'string') return node.type;
  return (node.type as { displayName?: string }).displayName;
}

/** Every visible string in the tree, in document order. */
function collectStrings(node: unknown, out: string[] = []): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectStrings(child, out);
    return out;
  }
  if (isElement(node)) collectStrings(node.props.children, out);
  return out;
}

function findElements(node: unknown, name: string, out: ElementLike[] = []): ElementLike[] {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (Array.isArray(node)) {
    for (const child of node) findElements(child, name, out);
    return out;
  }
  if (isElement(node)) {
    if (elementName(node) === name) out.push(node);
    findElements(node.props.children, name, out);
  }
  return out;
}

function page(doc: ResumeDoc, templateId?: TemplateId): ElementLike {
  const tree = ResumePdfDocument({ doc, templateId });
  const pages = findElements(tree, 'Page');
  expect(pages).toHaveLength(1);
  return pages[0]!;
}

function text(doc: ResumeDoc, templateId?: TemplateId): string {
  return collectStrings(ResumePdfDocument({ doc, templateId })).join('\n');
}

describe('capyresume/pdf — document tree', () => {
  it('wraps the resume in a Document with a single Page', () => {
    const tree = ResumePdfDocument({ doc: DEMO_RESUME }) as unknown as ElementLike;
    expect(elementName(tree)).toBe('Document');
    expect(findElements(tree, 'Page')).toHaveLength(1);
  });

  it('renders the contact block, headings and entries', () => {
    const body = text(DEMO_RESUME);

    expect(body).toContain('Maya Okafor');
    expect(body).toContain('maya.okafor@example.com');
    expect(body).toContain('LinkedIn: linkedin.com/in/mayaokafor');
    expect(body).toContain('EXPERIENCE');
    expect(body).toContain('Senior Operations Analyst');
    expect(body).toContain('Northwind Logistics \u00b7 Melbourne, VIC');
  });

  it('renders every non-empty section, including projects and certifications', () => {
    const body = text(DEMO_RESUME);
    for (const heading of [
      'SUMMARY',
      'EXPERIENCE',
      'EDUCATION',
      'SKILLS',
      'PROJECTS',
      'CERTIFICATIONS',
    ]) {
      expect(body).toContain(heading);
    }
  });

  it('renders the bullet glyph as its own run, with the bullet text intact', () => {
    const glyphs = findElements(ResumePdfDocument({ doc: DEMO_RESUME }), 'Text').filter(
      (el) => el.props.children === '\u2022'
    );
    expect(glyphs.length).toBeGreaterThan(0);
    expect(text(DEMO_RESUME)).toContain('Rebuilt the monthly close process');
  });

  it('renders a blank resume without throwing', () => {
    expect(() => ResumePdfDocument({ doc: emptyResume() })).not.toThrow();
    expect(text(emptyResume())).not.toContain('undefined');
  });

  it.each(TEMPLATE_LIST)('$name produces readable body text', (spec) => {
    const body = collectStrings(ResumePdfDocument({ doc: DEMO_RESUME, templateId: spec.id }))
      .join('\n')
      .toLowerCase();
    expect(body).toContain('maya okafor');
    expect(body).toContain('experience');
  });
});

describe('capyresume/pdf — template-driven styling', () => {
  it('embeds the template font (Liberation, metric twin of the standard-14 face)', () => {
    expect((page(DEMO_RESUME, 'classic').props.style as Record<string, unknown>).fontFamily).toBe(
      'Liberation Sans'
    );
    expect((page(DEMO_RESUME, 'serif').props.style as Record<string, unknown>).fontFamily).toBe(
      'Liberation Serif'
    );
  });

  it('falls back to the document template when none is passed', () => {
    const doc: ResumeDoc = { ...DEMO_RESUME, templateId: 'serif' };
    expect((page(doc).props.style as Record<string, unknown>).fontFamily).toBe('Liberation Serif');
  });

  it('falls back to the default template for an unknown document template', () => {
    const doc = { ...DEMO_RESUME, templateId: 'nope' as TemplateId };
    expect((page(doc).props.style as Record<string, unknown>).fontFamily).toBe('Liberation Sans');
  });

  it('applies the template heading casing', () => {
    expect(text(DEMO_RESUME, 'classic')).toContain('EXPERIENCE');
    expect(text(DEMO_RESUME, 'serif')).toContain('Experience');
  });

  it('sizes the page for the requested paper size', () => {
    const a4 = ResumePdfDocument({ doc: DEMO_RESUME, paperSize: 'A4' }) as unknown as ElementLike;
    const letter = ResumePdfDocument({
      doc: DEMO_RESUME,
      paperSize: 'LETTER',
    }) as unknown as ElementLike;
    expect(findElements(a4, 'Page')[0]!.props.size).toBe('A4');
    expect(findElements(letter, 'Page')[0]!.props.size).toBe('LETTER');
  });
});

describe('capyresume/pdf — no watermark', () => {
  it.each(TEMPLATE_LIST)('$name adds no branding to the visible document', (spec) => {
    const body = collectStrings(ResumePdfDocument({ doc: DEMO_RESUME, templateId: spec.id })).join(
      '\n'
    );
    for (const forbidden of [
      'Handcraft',
      'Generated by',
      'capy.tools',
      'watermark',
      'Powered by',
    ]) {
      expect(body).not.toContain(forbidden);
    }
  });

  it('puts the page count nowhere: no footer furniture is emitted', () => {
    // There is no footer block type at all, so nothing can be appended.
    const body = text(DEMO_RESUME);
    expect(body).not.toMatch(/page \d+ of \d+/i);
  });
});

describe('capyresume/pdf — buildResumePdf', () => {
  it('returns a PDF blob', async () => {
    const blob = await buildResumePdf(DEMO_RESUME);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('honours an explicit template override', async () => {
    const blob = await buildResumePdf(DEMO_RESUME, { templateId: 'serif' });
    expect(blob.size).toBeGreaterThan(0);
  });

  it('builds a blank resume too', async () => {
    await expect(buildResumePdf(emptyResume())).resolves.toBeInstanceOf(Blob);
  });
});
