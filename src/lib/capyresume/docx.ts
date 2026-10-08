/**
 * CapyResume — DOCX export.
 *
 * Builds the Word file from the same composed block list as the PDF exporter
 * (./document.ts), so the two files a user downloads always say the same thing.
 *
 * DOCX is the format recruiting systems handle most reliably, which is why it
 * ships alongside the PDF rather than instead of it.
 */

import {
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  type IParagraphOptions,
} from 'docx';
import { composeDocument, type DocBlock } from './document';
import { getTemplate, type TemplateSpec } from './templates';
import type { ResumeDoc, TemplateId } from './types';

export interface DocxOptions {
  templateId?: TemplateId;
  /** The page the file is laid out on; defaults to A4, like the PDF. */
  paperSize?: 'A4' | 'LETTER';
}

type NonHeaderBlock = Exclude<DocBlock, { kind: 'header' }>;

/** docx sizes are half-points. */
function halfPoints(fontSize: number): number {
  return Math.round(fontSize * 2);
}

/** Map the template's standard-14 PDF font onto a ubiquitous Word font. */
function wordFont(spec: TemplateSpec): string {
  return spec.fontFamily === 'Times-Roman' ? 'Times New Roman' : 'Arial';
}

/** Page sizes in twips (1/20 pt). */
const PAGE = { A4: { width: 11906, height: 16838 }, LETTER: { width: 12240, height: 15840 } };

/** The PDF's margins (44 pt sides, 40 pt top/bottom), in twips. */
const MARGIN = { side: 880, edge: 800 };

/** The right-aligned date tab sits on the text column's right edge for this page. */
function rightTab(paperSize: 'A4' | 'LETTER'): number {
  return PAGE[paperSize].width - 2 * MARGIN.side;
}

function headingParagraph(text: string, spec: TemplateSpec): Paragraph {
  const options: IParagraphOptions = {
    children: [
      new TextRun({ text, bold: true, font: wordFont(spec), size: halfPoints(spec.fontSize + 1) }),
    ],
    spacing: { before: Math.round((spec.entryGap + 6) * 20), after: 60 },
    // `border` is readonly on IParagraphOptions, so it has to be set at construction.
    ...(spec.headingRule
      ? {
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '111111', space: 1 },
          },
        }
      : {}),
  };

  return new Paragraph(options);
}

function headerParagraphs(
  block: Extract<DocBlock, { kind: 'header' }>,
  spec: TemplateSpec
): Paragraph[] {
  const font = wordFont(spec);
  const paragraphs: Paragraph[] = [];

  if (block.name) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: block.name, bold: true, font, size: halfPoints(spec.fontSize + 7) }),
        ],
        spacing: { after: 60 },
      })
    );
  }

  for (const line of [...block.contact, ...block.links]) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: line, font, size: halfPoints(spec.fontSize - 0.5) })],
        spacing: { after: 20 },
      })
    );
  }

  return paragraphs;
}

function blockToParagraphs(block: NonHeaderBlock, spec: TemplateSpec, tab: number): Paragraph[] {
  const font = wordFont(spec);
  const size = halfPoints(spec.fontSize);

  switch (block.kind) {
    case 'heading':
      return [headingParagraph(block.text, spec)];

    case 'entry': {
      const children: TextRun[] = [];
      if (block.title) {
        children.push(new TextRun({ text: block.title, bold: true, font, size }));
      }
      if (block.range) {
        // A tab to the right-aligned stop keeps the date off the title without
        // introducing a second column or a table.
        children.push(
          new TextRun({ text: `\t${block.range}`, font, size: halfPoints(spec.fontSize - 0.5) })
        );
      }
      const title = new Paragraph({
        children,
        tabStops: [{ type: TabStopType.RIGHT, position: tab }],
        spacing: { after: block.meta ? 0 : 40 },
      });
      if (!block.meta) return [title];
      // Organisation and location, on their own line under the title, as in the PDF.
      return [
        title,
        new Paragraph({
          children: [
            new TextRun({ text: block.meta, font, size: halfPoints(spec.fontSize - 0.5) }),
          ],
          spacing: { after: 40 },
        }),
      ];
    }

    case 'bullet':
      return [
        new Paragraph({
          children: [new TextRun({ text: block.text, font, size })],
          bullet: { level: 0 },
          spacing: { after: 20 },
        }),
      ];

    case 'paragraph':
    case 'tags':
      return [
        new Paragraph({
          children: [new TextRun({ text: block.text, font, size })],
          spacing: { after: 60 },
        }),
      ];
  }
}

/**
 * Build the Word document. Returns a Blob so the caller can download it without
 * ever touching the filesystem.
 */
export async function buildResumeDocx(doc: ResumeDoc, options: DocxOptions = {}): Promise<Blob> {
  const spec = getTemplate(options.templateId ?? doc.templateId);
  const blocks = composeDocument(doc, spec);
  const paperSize = options.paperSize ?? 'A4';
  const tab = rightTab(paperSize);

  const children: Paragraph[] = [];
  for (const block of blocks) {
    if (block.kind === 'header') {
      children.push(...headerParagraphs(block, spec));
    } else {
      children.push(...blockToParagraphs(block, spec, tab));
    }
  }

  const document = new Document({
    creator: 'CapyResume',
    title: doc.contact.name ? `${doc.contact.name} \u2013 Resume` : 'Resume',
    description: 'Resume',
    sections: [
      {
        properties: {
          page: {
            size: PAGE[paperSize],
            margin: {
              top: MARGIN.edge,
              bottom: MARGIN.edge,
              left: MARGIN.side,
              right: MARGIN.side,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(document);
}
