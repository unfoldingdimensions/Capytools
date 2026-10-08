// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { BlockView, previewPaperStyle } from '@/components/capyresume/BlockView';
import { composeDocument } from '@/lib/capyresume/document';
import { DEMO_RESUME } from '@/lib/capyresume/demo';
import { getTemplate } from '@/lib/capyresume/templates';

type Style = Record<string, string | number | undefined>;

/** Same walk as pdf.test.tsx's collectStrings, applied to style objects. */
function collectStyles(node: unknown, out: Style[] = []): Style[] {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) collectStyles(child, out);
    return out;
  }
  const el = node as { props?: { style?: Style; children?: unknown } };
  if (el.props?.style) out.push(el.props.style);
  if (el.props && 'children' in el.props) collectStyles(el.props.children, out);
  return out;
}

function collectStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    out.push(node);
    return out;
  }
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) collectStrings(child, out);
    return out;
  }
  const el = node as { props?: { children?: unknown } };
  if (el.props && 'children' in el.props) collectStrings(el.props.children, out);
  return out;
}

/** The first block of `kind` from the demo document, with its style tree. */
function blockOf(
  kind: 'header' | 'heading' | 'entry' | 'paragraph' | 'bullet' | 'tags',
  id: string
) {
  const spec = getTemplate(id);
  const block = composeDocument(DEMO_RESUME, spec).find((b) => b.kind === kind);
  if (!block) throw new Error(`the demo document has no ${kind} block`);
  const styles = collectStyles(BlockView({ block, spec }));
  const first = styles[0];
  if (!first) throw new Error(`the ${kind} block rendered with no style`);
  return { spec, block, styles, first };
}

describe('preview mirrors pdf.tsx', () => {
  it('derives the paper style from the spec', () => {
    const spec = getTemplate('classic');
    expect(previewPaperStyle(spec)).toEqual({
      color: spec.accent,
      fontFamily: spec.fontFamily,
      fontSize: `${spec.fontSize}pt`,
      lineHeight: spec.lineHeight,
    });
  });

  it('spaces headings with entryGap + 6, the way pdf.tsx does', () => {
    // Executive has entryGap 9: the old hard-coded '14pt' only coincidentally
    // matched classic (8 + 6), so every other template was mis-spaced.
    const { spec, first } = blockOf('heading', 'executive');
    expect(first.marginTop).toBe(`${spec.entryGap + 6}pt`);
  });

  it('colours and sizes the heading from the spec', () => {
    const { spec, first } = blockOf('heading', 'executive');
    expect(first.borderBottom).toBe(`0.75pt solid ${spec.accent}`);
    expect(first.fontSize).toBe(`${spec.fontSize + 1}pt`);
    expect(first.marginBottom).toBe('6pt');
  });

  it('drops the rule and shortens the gap when the template says none', () => {
    const { spec, first } = blockOf('heading', 'air'); // headingRule: false
    expect(spec.headingRule).toBe(false);
    expect(first.borderBottom).toBeUndefined();
    expect(first.paddingBottom).toBeUndefined();
    expect(first.marginBottom).toBe('5pt');
  });

  it('spaces entries with the template rhythm, not a constant', () => {
    // Classic entryGap is 8; the preview used a hard-coded 6pt, so it disagreed
    // with the PDF for every template.
    const { spec, first } = blockOf('entry', 'classic');
    expect(first.marginBottom).toBe(`${spec.entryGap}pt`);
  });

  it('sizes the header the way the PDF does', () => {
    const { spec, first, styles } = blockOf('header', 'classic');
    expect(first.marginBottom).toBe(`${spec.entryGap}pt`); // entryBlock wrapper
    expect(styles.some((s) => s.fontSize === `${spec.fontSize + 7}pt`)).toBe(true); // name
    expect(styles.some((s) => s.fontSize === `${spec.fontSize - 0.5}pt`)).toBe(true); // contact
    expect(styles.some((s) => s.marginBottom === '1pt')).toBe(true);
  });

  it('keeps paragraph, bullet and tag spacing in sync with the renderer', () => {
    expect(blockOf('paragraph', 'classic').first.marginBottom).toBe('3pt');
    const bullet = blockOf('bullet', 'classic');
    expect(bullet.first.marginBottom).toBe('1.5pt');
    expect(bullet.styles.some((s) => s.width === '12pt')).toBe(true);
    expect(blockOf('tags', 'classic').first.marginBottom).toBe('2pt');
  });

  it('uses the template bullet glyph', () => {
    const { spec, block } = blockOf('bullet', 'serif');
    expect(collectStrings(BlockView({ block, spec }))).toContain(spec.bulletChar);
    expect(spec.bulletChar).toBe('\u2013');
  });
});
