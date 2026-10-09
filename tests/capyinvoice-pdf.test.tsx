// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
/**
 * CapyInvoice PDF exporter tests.
 *
 * Same harness as `capyresume-pdf.test.tsx`: `@react-pdf/renderer` is ESM-only
 * and cannot be transformed by this setup, so the renderer surface is mocked
 * and we assert the *document tree we build* — which values reach the page,
 * the kind-specific labels, and the absence of any watermark. The real
 * byte-level render is verified in the browser during delivery.
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
    Image: passthrough('Image'),
    StyleSheet: { create: (styles: unknown) => styles },
    Font: { register: () => undefined },
    pdf: (element: unknown) => ({
      __element: element,
      toBlob: () => Promise.resolve(new Blob(['%PDF-1.7\n'], { type: 'application/pdf' })),
    }),
  };
});

import { buildInvoicePdf, InvoicePdfDocument } from '@/lib/capyinvoice/pdf';
import { DEMO_INVOICE } from '@/lib/capyinvoice/demo';
import { emptyInvoiceDoc } from '@/lib/capyinvoice/schema';
import type { InvoiceDoc } from '@/lib/capyinvoice/types';

interface ElementLike {
  type: string | (((...args: never[]) => unknown) & { displayName?: string });
  props: { children?: unknown; style?: Record<string, unknown>; src?: string; size?: string; [key: string]: unknown };
}

function isElement(value: unknown): value is ElementLike {
  return typeof value === 'object' && value !== null && 'type' in value && 'props' in value;
}

function elementName(node: ElementLike): string | undefined {
  if (typeof node.type === 'string') return node.type;
  return node.type.displayName;
}

/**
 * Flatten the mocked element tree. Function components (PartyBlock,
 * TotalsView, and the mocked leaves themselves) are pure, so the walker calls
 * them with their props and walks ONLY what they return — their props.children
 * appear inside that output, and walking both would count everything twice.
 */
function collectText(node: unknown, into: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, into);
    return into;
  }
  if (!isElement(node)) return into;
  if (typeof node.type === 'function') {
    collectText(node.type(node.props as never), into);
    return into;
  }
  const { children } = node.props;
  if (typeof children === 'string') into.push(children);
  else if (children !== undefined && children !== null) collectText(children, into);
  return into;
}

function findAll(node: unknown, name: string, into: ElementLike[] = []): ElementLike[] {
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, name, into);
    return into;
  }
  if (!isElement(node)) return into;
  if (typeof node.type === 'function') {
    findAll(node.type(node.props as never), name, into);
    return into;
  }
  if (elementName(node) === name) into.push(node);
  const { children } = node.props;
  if (children !== undefined && children !== null) findAll(children, name, into);
  return into;
}

function renderDoc(doc: InvoiceDoc, paperSize: 'A4' | 'LETTER' = 'A4') {
  return InvoicePdfDocument({ doc, paperSize }) as unknown as ElementLike;
}

describe('CapyInvoice PDF — the document', () => {
  it('names the file after the kind, and the kind word leads the page', () => {
    const root = renderDoc(DEMO_INVOICE);
    expect(elementName(root)).toBe('Document');
    expect((root.props as { title?: string }).title).toBe('Invoice INV-2026-041');
    const texts = collectText(root.props.children);
    expect(texts).toContain('Invoice');
  });

  it('renders every filled line with its quantity, unit price, rate and amount', () => {
    const root = renderDoc(DEMO_INVOICE);
    const texts = collectText(root.props.children);
    expect(texts).toContain('Brand identity — logo, palette and type sheet');
    expect(texts).toContain('3.5'); // the fractional quantity
    expect(texts).toContain('£1,200.00');
    expect(texts).toContain('20%');
    expect(texts).toContain('£2,195.00'); // the subtotal the compute tests pin
    expect(texts).toContain('−£109.75'); // the discount row
    expect(texts).toContain('Tax at 20%');
    expect(texts).toContain('£2,442.45'); // the total
    expect(texts).toContain('£1,942.45'); // the balance
  });

  it('skips the empty typing row instead of printing a blank line', () => {
    const draft = emptyInvoiceDoc();
    draft.lines[0]!.description = 'Only this';
    draft.lines.push({ id: 'blank', description: '', qty: 1, unitPriceMinor: 0, taxBp: 0 });
    const root = renderDoc(draft);
    const texts = collectText(root.props.children);
    expect(texts).toContain('Only this');
    expect(texts.filter((text) => text === '')).toHaveLength(0);
  });

  it('a quote says Valid until, and never shows a payment or balance', () => {
    const quote: InvoiceDoc = { ...structuredClone(DEMO_INVOICE), kind: 'quote' };
    const root = renderDoc(quote);
    const texts = collectText(root.props.children);
    expect(texts).toContain('Quote');
    expect(texts).toContain('Valid until 31 Oct 2026');
    expect(texts).not.toContain('Amount paid');
    expect(texts).not.toContain('Balance due');
  });

  it('a receipt leads with Receipt and still shows what was paid', () => {
    const receipt: InvoiceDoc = { ...structuredClone(DEMO_INVOICE), kind: 'receipt' };
    const root = renderDoc(receipt);
    const texts = collectText(root.props.children);
    expect(texts).toContain('Receipt');
    expect(texts).toContain('Receipt no.: INV-2026-041');
    expect(texts).toContain('Amount paid');
    expect(texts).toContain('Balance due');
  });

  it('labels the date line per kind — Due for an invoice', () => {
    const root = renderDoc(DEMO_INVOICE);
    const texts = collectText(root.props.children);
    expect(texts).toContain('Issued 1 Oct 2026');
    expect(texts).toContain('Due 31 Oct 2026');
  });

  it('renders the from and to parties with their multi-line details', () => {
    const root = renderDoc(DEMO_INVOICE);
    const texts = collectText(root.props.children);
    expect(texts).toContain('From');
    expect(texts).toContain('Meridian Design Studio');
    expect(texts).toContain('VAT GB 372 8841 05');
    expect(texts).toContain('To');
    expect(texts).toContain('Harbor & Lane Coffee Co.');
  });

  it('carries the logo only when the user picked one, as a data URL', () => {
    const without = renderDoc(DEMO_INVOICE);
    expect(findAll(without.props.children, 'Image')).toHaveLength(0);

    const withLogo: InvoiceDoc = {
      ...structuredClone(DEMO_INVOICE),
      logoDataUrl: 'data:image/png;base64,AAAA',
    };
    const images = findAll(renderDoc(withLogo).props.children, 'Image');
    expect(images).toHaveLength(1);
    expect(images[0]!.props.src).toBe('data:image/png;base64,AAAA');
  });

  it('prints payment details, notes and terms, each only when written', () => {
    const root = renderDoc(DEMO_INVOICE);
    const texts = collectText(root.props.children);
    expect(texts).toContain('Payment details');
    expect(texts).toContain('Reference: INV-2026-041');
    expect(texts).toContain('Notes');
    expect(texts).toContain('Working files are handed over on final payment.');
    expect(texts).toContain('Terms');

    const sparse = renderDoc({ ...structuredClone(DEMO_INVOICE), notes: '', terms: '', paymentDetails: '' });
    const sparseTexts = collectText(sparse.props.children);
    expect(sparseTexts).not.toContain('Payment details');
    expect(sparseTexts).not.toContain('Notes');
    expect(sparseTexts).not.toContain('Terms');
  });

  it('states the rounding rules in the fine print, with the currency', () => {
    const root = renderDoc(DEMO_INVOICE);
    const texts = collectText(root.props.children);
    const note = texts.find((text) => text.includes('in proportion'));
    expect(note).toBeTruthy();
    expect(note).toContain('All amounts in GBP');
    expect(note).toContain('on each line');
  });

  it('honours the paper size and carries no watermark or tool attribution in the text', () => {
    for (const paperSize of ['A4', 'LETTER'] as const) {
      const root = renderDoc(DEMO_INVOICE, paperSize);
      expect(root.props.children).toBeDefined();
      const page = findAll(root.props.children, 'Page')[0]!;
      expect(page.props.size).toBe(paperSize);
    }
    const texts = collectText(renderDoc(DEMO_INVOICE).props.children);
    const all = texts.join('\n').toLowerCase();
    expect(all).not.toContain('capyinvoice');
    expect(all).not.toContain('watermark');
    expect(all).not.toContain('made with');
  });
});

describe('CapyInvoice PDF — the exporter', () => {
  it('buildInvoicePdf hands back a Blob without touching a network', async () => {
    const blob = await buildInvoicePdf(DEMO_INVOICE, { paperSize: 'LETTER' });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});
