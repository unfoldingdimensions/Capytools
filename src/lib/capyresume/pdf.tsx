/**
 * CapyResume — PDF export.
 *
 * @react-pdf/renderer builds the PDF from the same block list as the DOCX
 * exporter, which is why the file has a **real text layer**: every line is
 * selectable, copyable and machine-readable. Printing a canvas (html2canvas →
 * image PDF) would look similar and parse as nothing — the exact mistake this
 * module exists to avoid.
 *
 * No watermark, no attribution, no page furniture. The document contains what
 * the user wrote and nothing else.
 *
 * Import this from a client component only; the renderer is browser code.
 *   const { buildResumePdf } = await import('@/lib/capyresume/pdf');
 */

import { Document, Link, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { composeDocument, type DocBlock } from './document';
import { getTemplate, type TemplateSpec } from './templates';
import { PDF_FONT_BASE, registerLiberationFonts } from '../capytools/pdf-fonts';
import type { ResumeDoc, TemplateId } from './types';

export type PaperSize = 'A4' | 'LETTER';

export interface PdfOptions {
  templateId?: TemplateId;
  paperSize?: PaperSize;
  /** Where the embedded fonts are fetched from; a file path in the Node verify script. */
  fontBase?: string;
}

/**
 * The PDF's real faces — Liberation Sans and Serif, registered by the shared
 * module (`src/lib/capytools/pdf-fonts.ts`) that CapyInvoice's exporter uses
 * too. The family-name mapping is the only CapyResume-specific part left: it
 * turns a template's `fontFamily` into the registered family.
 */
const PDF_FAMILY: Record<TemplateSpec['fontFamily'], string> = {
  Helvetica: 'Liberation Sans',
  'Times-Roman': 'Liberation Serif',
};

function registerFonts(base: string): void {
  registerLiberationFonts(base);
}

function buildStyles(spec: TemplateSpec) {
  const family = PDF_FAMILY[spec.fontFamily];
  return StyleSheet.create({
    page: {
      paddingTop: 40,
      paddingBottom: 40,
      paddingHorizontal: 44,
      fontFamily: family,
      fontSize: spec.fontSize,
      lineHeight: spec.lineHeight,
      color: spec.accent,
    },
    name: {
      fontFamily: family,
      fontWeight: 'bold',
      fontSize: spec.fontSize + 7,
      marginBottom: 5,
    },
    contact: { fontSize: spec.fontSize - 0.5, marginBottom: 1 },
    links: { fontSize: spec.fontSize - 0.5, marginBottom: 1 },
    headingWrap: spec.headingRule
      ? {
          borderBottomWidth: 0.75,
          borderBottomColor: spec.accent,
          paddingBottom: 2,
          marginBottom: 6,
          marginTop: spec.entryGap + 6,
        }
      : { marginBottom: 5, marginTop: spec.entryGap + 6 },
    heading: { fontFamily: family, fontWeight: 'bold', fontSize: spec.fontSize + 1 },
    entryBlock: { marginBottom: spec.entryGap },
    entryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    entryTitle: { fontFamily: family, fontWeight: 'bold', fontSize: spec.fontSize },
    entryRange: { fontSize: spec.fontSize - 0.5 },
    entryMeta: { fontSize: spec.fontSize - 0.5, marginBottom: 2 },
    paragraph: { marginBottom: 3 },
    bulletRow: { flexDirection: 'row', marginBottom: 1.5 },
    bulletGlyph: { width: 12 },
    bulletText: { flex: 1 },
    tags: { marginBottom: 2 },
  });
}

type Styles = ReturnType<typeof buildStyles>;

function renderBlock(block: DocBlock, index: number, styles: Styles, spec: TemplateSpec) {
  switch (block.kind) {
    case 'header':
      return (
        <View key={index} style={styles.entryBlock}>
          {block.name ? <Text style={styles.name}>{block.name}</Text> : null}
          {block.contact.map((line, i) => (
            <Text key={`c${i}`} style={styles.contact}>
              {line}
            </Text>
          ))}
          {block.links.map((line, i) => {
            const href = block.linkHrefs[i];
            return (
              <Text key={`l${i}`} style={styles.links}>
                {href ? (
                  <Link src={href} style={{ color: spec.accent, textDecoration: 'none' }}>
                    {line}
                  </Link>
                ) : (
                  line
                )}
              </Text>
            );
          })}
        </View>
      );

    case 'heading':
      return (
        // Never the last thing on a page: a heading needs room for what it heads.
        <View key={index} style={styles.headingWrap} minPresenceAhead={48}>
          <Text style={styles.heading}>{block.text}</Text>
        </View>
      );

    case 'entry':
      return (
        // Title, dates and employer stay together, and keep a line of what follows.
        <View key={index} style={styles.entryBlock} wrap={false} minPresenceAhead={24}>
          <View style={styles.entryRow}>
            <Text style={styles.entryTitle}>{block.title ?? ''}</Text>
            <Text style={styles.entryRange}>{block.range ?? ''}</Text>
          </View>
          {block.meta ? <Text style={styles.entryMeta}>{block.meta}</Text> : null}
        </View>
      );

    case 'paragraph':
      return (
        <Text key={index} style={styles.paragraph}>
          {block.text}
        </Text>
      );

    case 'bullet':
      return (
        <View key={index} style={styles.bulletRow}>
          <Text style={styles.bulletGlyph}>{spec.bulletChar}</Text>
          <Text style={styles.bulletText}>{block.text}</Text>
        </View>
      );

    case 'tags':
      return (
        <Text key={index} style={styles.tags}>
          {block.text}
        </Text>
      );

    default:
      return null;
  }
}

/** The PDF document as a React element. Exported so it can be inspected in tests. */
export function ResumePdfDocument({
  doc,
  templateId,
  paperSize = 'A4',
}: {
  doc: ResumeDoc;
  templateId?: TemplateId;
  paperSize?: PaperSize;
}) {
  const spec = getTemplate(templateId ?? doc.templateId);
  const styles = buildStyles(spec);
  const blocks = composeDocument(doc, spec);
  const name = doc.contact.name.trim();

  return (
    <Document
      title={name ? `${name} \u2013 Resume` : 'Resume'}
      author={name || undefined}
      subject="Resume"
      keywords="resume, cv"
      creator="CapyResume"
      producer="CapyResume"
    >
      <Page size={paperSize} style={styles.page} wrap>
        {blocks.map((block, index) => renderBlock(block, index, styles, spec))}
      </Page>
    </Document>
  );
}

/** Render the résumé to a PDF Blob, ready to hand to a download link. */
export async function buildResumePdf(doc: ResumeDoc, options: PdfOptions = {}): Promise<Blob> {
  const templateId = options.templateId ?? doc.templateId;
  registerFonts(options.fontBase ?? PDF_FONT_BASE);
  const instance = pdf(
    <ResumePdfDocument doc={doc} templateId={templateId} paperSize={options.paperSize ?? 'A4'} />
  );
  return instance.toBlob();
}
