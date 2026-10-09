/**
 * CapyInvoice — PDF export.
 *
 * @react-pdf/renderer builds the PDF as real text — every line selectable,
 * copyable and machine-readable, exactly the property CapyResume's exporter
 * exists to protect. No watermark, no attribution: the document contains what
 * the user wrote and the arithmetic they asked for, and nothing else.
 *
 * The page renders the SAME `Totals` object the tool's live summary shows
 * (see ./compute.ts), so a changed figure can never appear in one and not the
 * other. The rounding statement rides in the fine print, because an invoice
 * that explains its own arithmetic is one an accountant can check.
 *
 * Import this from a client component only; the renderer is browser code.
 *   const { buildInvoicePdf } = await import('@/lib/capyinvoice/pdf');
 */

import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { PDF_FONT_BASE, registerLiberationFonts } from '../capytools/pdf-fonts';
import { computeTotals, roundingNote, type Totals } from './compute';
import { formatDay } from './format';
import { formatMoney } from './money';
import type { DocKind, InvoiceDoc } from './types';

export type PaperSize = 'A4' | 'LETTER';

export interface PdfOptions {
  paperSize?: PaperSize;
  /** Where the embedded fonts are fetched from; a file path in the Node verify script. */
  fontBase?: string;
}

const INK = '#1a1a1a';
const MUTED = '#6b6a66';
const HAIRLINE = '#d8d6cf';
const SAGE = '#8e9b7e';

const KIND_WORD: Record<DocKind, string> = {
  invoice: 'Invoice',
  quote: 'Quote',
  receipt: 'Receipt',
};

function buildStyles() {
  return StyleSheet.create({
    page: {
      paddingTop: 48,
      paddingBottom: 40,
      paddingHorizontal: 48,
      fontFamily: 'Liberation Sans',
      fontSize: 9.5,
      lineHeight: 1.45,
      color: INK,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    kindWord: { fontFamily: 'Liberation Sans', fontWeight: 'bold', fontSize: 24, color: SAGE },
    logo: { maxHeight: 64, maxWidth: 160, objectFit: 'contain' },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    metaLine: { fontSize: 9 },
    partyRow: { flexDirection: 'row', marginTop: 18 },
    partyBlock: { width: '50%', paddingRight: 12 },
    partyLabel: { fontFamily: 'Liberation Sans', fontWeight: 'bold', fontSize: 8, color: MUTED, marginBottom: 3 },
    partyName: { fontFamily: 'Liberation Sans', fontWeight: 'bold' },
    partyDetail: { fontSize: 9 },
    table: { marginTop: 20 },
    headRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: INK,
      paddingBottom: 3,
      marginBottom: 4,
    },
    headCell: { fontFamily: 'Liberation Sans', fontWeight: 'bold', fontSize: 8, color: MUTED },
    itemRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: HAIRLINE,
      paddingVertical: 4,
    },
    cellDescription: { flex: 1, paddingRight: 8 },
    cellQty: { width: 44, textAlign: 'right' },
    cellUnit: { width: 76, textAlign: 'right' },
    cellTax: { width: 44, textAlign: 'right' },
    cellAmount: { width: 84, textAlign: 'right' },
    totalsBlock: { marginTop: 14, alignSelf: 'flex-end', width: 220 },
    totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
    totalsLabel: { color: MUTED },
    totalsValue: { textAlign: 'right' },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: INK,
      marginTop: 4,
      paddingTop: 5,
      fontFamily: 'Liberation Sans',
      fontWeight: 'bold',
    },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: '#f1f2ec',
      borderRadius: 3,
      marginTop: 5,
      paddingVertical: 5,
      paddingHorizontal: 6,
      fontFamily: 'Liberation Sans',
      fontWeight: 'bold',
      fontSize: 11,
    },
    footnote: { fontSize: 7.5, color: MUTED, lineHeight: 1.4 },
    footnoteBlock: { position: 'absolute', bottom: 28, left: 48, right: 48 },
    sectionTitle: { fontFamily: 'Liberation Sans', fontWeight: 'bold', fontSize: 8, color: MUTED, marginBottom: 2 },
    sectionText: { fontSize: 9 },
  });
}

type Styles = ReturnType<typeof buildStyles>;

/** A quantity the way it was typed: whole numbers without a decimal tail. */
function formatQty(qty: number): string {
  return String(qty);
}

function PartyBlock({
  styles,
  label,
  name,
  details,
}: {
  styles: Styles;
  label: string;
  name: string;
  details: string;
}) {
  const lines = details.split('\n').filter((line) => line.trim().length > 0);
  if (!name.trim() && lines.length === 0) return null;
  return (
    <View style={styles.partyBlock}>
      <Text style={styles.partyLabel}>{label}</Text>
      {name.trim() ? <Text style={styles.partyName}>{name}</Text> : null}
      {lines.map((line, index) => (
        <Text key={index} style={styles.partyDetail}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function TotalsView({
  styles,
  totals,
  kind,
  money,
}: {
  styles: Styles;
  totals: Totals;
  kind: DocKind;
  money: (minor: number) => string;
}) {
  return (
    <View style={styles.totalsBlock} wrap={false}>
      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Subtotal</Text>
        <Text style={styles.totalsValue}>{money(totals.subtotalMinor)}</Text>
      </View>
      {totals.discountMinor > 0 ? (
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Discount</Text>
          <Text style={styles.totalsValue}>{`−${money(totals.discountMinor)}`}</Text>
        </View>
      ) : null}
      {totals.taxGroups.map((group) => (
        <View key={group.bp} style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>
            {group.bp === 0 ? 'Tax (0%)' : `Tax at ${(group.bp / 100).toString()}%`}
          </Text>
          <Text style={styles.totalsValue}>{money(group.taxMinor)}</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text>Total</Text>
        <Text>{money(totals.totalMinor)}</Text>
      </View>
      {kind !== 'quote' ? (
        <>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Amount paid</Text>
            <Text style={styles.totalsValue}>{money(totals.amountPaidMinor)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text>Balance due</Text>
            <Text>{money(totals.balanceMinor)}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

/** The PDF document as a React element. Exported so tests can inspect the tree. */
export function InvoicePdfDocument({
  doc,
  paperSize = 'A4',
}: {
  doc: InvoiceDoc;
  paperSize?: PaperSize;
}) {
  const styles = buildStyles();
  const totals = computeTotals(doc);
  const kindWord = KIND_WORD[doc.kind];
  const dueLabel = doc.kind === 'quote' ? 'Valid until' : 'Due';
  const numberLabel = doc.kind === 'quote' ? 'Quote no.' : doc.kind === 'receipt' ? 'Receipt no.' : 'Invoice no.';
  const money = (minor: number) => formatMoney(minor, doc.currency);

  return (
    <Document
      title={doc.number.trim() ? `${kindWord} ${doc.number.trim()}` : kindWord}
      author={doc.fromName.trim() || undefined}
      subject={kindWord}
      keywords={`${doc.kind}, ${kindWord.toLowerCase()}`}
      creator="CapyInvoice"
      producer="CapyInvoice"
    >
      <Page size={paperSize} style={styles.page}>
        {/* Head: the word, the number and the dates; the logo above if there is one. */}
        <View style={styles.headerRow} wrap={false}>
          <View>
            <Text style={styles.kindWord}>{kindWord}</Text>
            {doc.number.trim() ? <Text style={styles.metaLine}>{`${numberLabel}: ${doc.number.trim()}`}</Text> : null}
          </View>
          {doc.logoDataUrl ? (
            // A PDF image carries no alt attribute — the a11y rule below targets HTML.
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.logo} src={doc.logoDataUrl} />
          ) : null}
        </View>
        {doc.issueDate || (doc.kind !== 'receipt' && doc.dueDate) ? (
          <View style={styles.metaRow} wrap={false}>
            {doc.issueDate ? (
              <Text style={styles.metaLine}>{`Issued ${formatDay(doc.issueDate)}`}</Text>
            ) : null}
            {doc.kind !== 'receipt' && doc.dueDate ? (
              <Text style={styles.metaLine}>{`${dueLabel} ${formatDay(doc.dueDate)}`}</Text>
            ) : null}
          </View>
        ) : null}

        {/* The parties. */}
        <View style={styles.partyRow} wrap={false}>
          <PartyBlock styles={styles} label="From" name={doc.fromName} details={doc.fromDetails} />
          <PartyBlock styles={styles} label="To" name={doc.toName} details={doc.toDetails} />
        </View>

        {/* Items. */}
        <View style={styles.table}>
          <View style={styles.headRow} wrap={false}>
            <Text style={[styles.headCell, styles.cellDescription]}>Description</Text>
            <Text style={[styles.headCell, styles.cellQty]}>Qty</Text>
            <Text style={[styles.headCell, styles.cellUnit]}>Unit price</Text>
            <Text style={[styles.headCell, styles.cellTax]}>Tax</Text>
            <Text style={[styles.headCell, styles.cellAmount]}>Amount</Text>
          </View>
          {totals.lines.map((entry, index) => {
            const { line } = entry;
            const empty = !line.description.trim() && entry.amountMinor === 0 && line.taxBp === 0;
            if (empty) return null;
            return (
              <View key={line.id ?? index} style={styles.itemRow} wrap={false}>
                <Text style={styles.cellDescription}>{line.description.trim()}</Text>
                <Text style={styles.cellQty}>{formatQty(line.qty)}</Text>
                <Text style={styles.cellUnit}>{money(line.unitPriceMinor)}</Text>
                <Text style={styles.cellTax}>{line.taxBp === 0 ? '—' : `${(line.taxBp / 100).toString()}%`}</Text>
                <Text style={styles.cellAmount}>{money(entry.amountMinor)}</Text>
              </View>
            );
          })}
        </View>

        <TotalsView styles={styles} totals={totals} kind={doc.kind} money={money} />

        {/* Payment details, notes, terms — each only when written. */}
        {doc.paymentDetails.trim() ? (
          <View style={{ marginTop: 22 }} wrap={false}>
            <Text style={styles.sectionTitle}>Payment details</Text>
            {doc.paymentDetails.split('\n').filter((l) => l.trim()).map((line, index) => (
              <Text key={index} style={styles.sectionText}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
        {doc.notes.trim() ? (
          <View style={{ marginTop: 14 }} wrap={false}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.sectionText}>{doc.notes}</Text>
          </View>
        ) : null}
        {doc.terms.trim() ? (
          <View style={{ marginTop: 14 }} wrap={false}>
            <Text style={styles.sectionTitle}>Terms</Text>
            <Text style={styles.sectionText}>{doc.terms}</Text>
          </View>
        ) : null}

        {/* The arithmetic, stated where it can be checked. */}
        <View style={styles.footnoteBlock}>
          <Text style={styles.footnote}>
            {`All amounts in ${doc.currency}. ${roundingNote(totals.currencyDigits)}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/** Render the document to a PDF Blob, ready to hand to a download link. */
export async function buildInvoicePdf(doc: InvoiceDoc, options: PdfOptions = {}): Promise<Blob> {
  registerLiberationFonts(options.fontBase ?? PDF_FONT_BASE);
  const instance = pdf(<InvoicePdfDocument doc={doc} paperSize={options.paperSize ?? 'A4'} />);
  return instance.toBlob();
}
