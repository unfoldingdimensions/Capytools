#!/usr/bin/env node
/**
 * CapyInvoice — end-to-end PDF verification.
 *
 * Same shape as scripts/verify-capyresume-pdf.mjs (the unit tests mock
 * @react-pdf/renderer, so the *real* render is proven here, against the real
 * engine): compile src/lib/capyinvoice to CommonJS, render the demo invoice,
 * assert the bytes are a real PDF, extract the text layer, and assert the
 * ARITHMETIC arrived in the file — the demo's hand-checked totals from
 * tests/capyinvoice-compute.test.ts, extracted back out of the rendered PDF.
 *
 * Run: node scripts/verify-capyinvoice-pdf.mjs
 * Exits non-zero with a readable message if any assertion fails.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// The library is compiled to CommonJS below, so it is loaded the CommonJS way.
const load = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'node_modules', '.cache', 'capyinvoice-pdfverify');
// The browser fetches the embedded fonts from /pdf-fonts/; here they are read from disk.
const FONT_BASE = path.join(ROOT, 'public', 'pdf-fonts') + path.sep;
const SRC_DIR = path.join(ROOT, 'src', 'lib', 'capyinvoice');

const ENTRIES = ['types', 'money', 'format', 'compute', 'schema', 'json', 'demo', 'pdf'];

function fail(message) {
  console.error(`\n  FAIL  ${message}\n`);
  process.exit(1);
}

function step(label) {
  console.log(`  ..    ${label}`);
}

function ok(label) {
  console.log(`  ok    ${label}`);
}

// ---------------------------------------------------------------------------
// 1. Compile the library to CommonJS
// ---------------------------------------------------------------------------

step(`compiling lib/capyinvoice -> ${path.relative(ROOT, OUT_DIR)}`);

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const tsc = path.join(path.dirname(load.resolve('typescript/package.json')), 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [
      tsc,
      ...ENTRIES.map((name) => path.join(SRC_DIR, `${name}.ts`)).map((file) =>
        fs.existsSync(file) ? file : file.replace(/\.ts$/, '.tsx')
      ),
      '--outDir',
      OUT_DIR,
      // The library reaches shared modules under src/lib/capytools, so the
      // common root is src/ and the output lands under OUT_DIR/lib/...
      '--rootDir',
      path.join(ROOT, 'src'),
      '--module',
      'commonjs',
      '--moduleResolution',
      'node',
      '--target',
      'es2022',
      '--lib',
      'es2022,dom',
      '--jsx',
      'react-jsx',
      '--esModuleInterop',
      '--skipLibCheck',
      '--strict',
    ],
    { stdio: 'pipe', cwd: ROOT },
  );
} catch (error) {
  const output = `${error.stdout || ''}${error.stderr || ''}`.trim();
  fail(`tsc failed while compiling the library:\n${output}`);
}

const compiledPdf = path.join(OUT_DIR, 'lib', 'capyinvoice', 'pdf.js');
if (!fs.existsSync(compiledPdf)) fail(`expected ${compiledPdf} to exist after compilation`);
ok('library compiled');

// ---------------------------------------------------------------------------
// 2. Render for real
// ---------------------------------------------------------------------------

const { buildInvoicePdf } = load(compiledPdf);
const { DEMO_INVOICE } = load(path.join(OUT_DIR, 'lib', 'capyinvoice', 'demo.js'));

/**
 * Extract the text layer with pdfjs-dist — already a Capytools dependency (CapyRead
 * renders PDFs with it), so this check needs no package of its own. The legacy
 * build is the one that runs in Node.
 */
async function extractText(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // In pdf.js v6 `destroy()` lives on the loading task, not the document.
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await task.promise;
  try {
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      pages.push(content.items.map((item) => item.str).join(' '));
    }
    return pages.join('\n');
  } finally {
    await task.destroy();
  }
}

function blobToBuffer(blob) {
  return blob.arrayBuffer().then((buf) => Buffer.from(buf));
}

(async () => {
  step('rendering the demo invoice with the real renderer');

  let buffer;
  try {
    const blob = await buildInvoicePdf(DEMO_INVOICE, { fontBase: FONT_BASE });
    buffer = await blobToBuffer(blob);
  } catch (error) {
    fail(`buildInvoicePdf threw: ${error && error.message ? error.message : error}`);
  }

  if (buffer.length < 1000) fail(`PDF is suspiciously small (${buffer.length} bytes)`);
  ok(`rendered ${buffer.length} bytes`);

  // -------------------------------------------------------------------------
  // 3. It is a real PDF
  // -------------------------------------------------------------------------

  const magic = buffer.subarray(0, 5).toString('latin1');
  if (magic !== '%PDF-') fail(`expected a "%PDF-" header, got ${JSON.stringify(magic)}`);
  ok('byte header is %PDF- (a real PDF, not a stub)');

  // -------------------------------------------------------------------------
  // 4. It has a text layer, and the arithmetic is IN it
  // -------------------------------------------------------------------------

  step('extracting the text layer');

  let text = '';
  try {
    text = await extractText(buffer);
  } catch (error) {
    fail(`pdf.js could not read the PDF: ${error && error.message ? error.message : error}`);
  }

  const normalised = text.replace(/\s+/g, ' ');
  // Parties and lines the user typed:
  const expectations = [
    'Invoice',
    'INV-2026-041',
    'Meridian Design Studio',
    'VAT GB 372 8841 05',
    'Harbor & Lane Coffee Co.',
    'Brand identity — logo, palette and type sheet',
    '3.5', // the fractional quantity
    'Issued 1 Oct 2026',
    'Due 31 Oct 2026',
    'Payment details',
    'Reference: INV-2026-041',
  ];

  // And the numbers the compute engine produced (hand-checked in
  // tests/capyinvoice-compute.test.ts): subtotal 2195.00, discount 5% =
  // 109.75 spread across the lines, tax grouped by rate (0% and 20% — the
  // two 20% lines' 228.00 and 129.20 sum into one £357.20 row), total
  // 2442.45, balance 1942.45 after the 500.00 deposit.
  const amounts = ['£2,195.00', '£109.75', '£0.00', 'Tax at 20% £357.20', '£2,442.45', '£500.00', '£1,942.45'];

  const missing = [...expectations, ...amounts].filter(
    (needle) => !normalised.includes(needle),
  );
  if (missing.length > 0) {
    console.error('\n--- extracted text ---\n' + normalised.slice(0, 1600) + '\n');
    fail(
      `the PDF is missing ${missing.length} expected string(s) -> ${missing.join(', ')}`,
    );
  }
  ok(`text layer verified (${expectations.length + amounts.length} strings found, ${text.length} chars total)`);

  // -------------------------------------------------------------------------
  // 5. The rounding rules ride in the fine print; no watermark
  // -------------------------------------------------------------------------

  for (const phrase of ['on each line', 'in proportion', 'half up', 'All amounts in GBP']) {
    if (!normalised.includes(phrase)) fail(`the rounding statement is missing "${phrase}"`);
  }
  ok('the rounding statement is printed in the document');

  const forbidden = ['Generated by', 'capy.tools', 'watermark', 'Powered by', 'CapyInvoice'];
  const leaked = forbidden.filter((needle) => normalised.includes(needle));
  if (leaked.length > 0) fail(`watermark/attribution text found in the rendered PDF: ${leaked.join(', ')}`);
  ok('no watermark or attribution in the rendered document');

  // -------------------------------------------------------------------------
  // 6. The other kinds and both paper sizes render with their own words
  // -------------------------------------------------------------------------

  step('rendering quote and receipt, A4 and US Letter');

  const quote = { ...DEMO_INVOICE, kind: 'quote' };
  const quoteText = await extractText(await blobToBuffer(await buildInvoicePdf(quote, { fontBase: FONT_BASE })));
  if (!quoteText.includes('Quote') || !quoteText.includes('Valid until 31 Oct 2026')) {
    fail('the quote did not render its own words');
  }
  if (quoteText.includes('Balance due') || quoteText.includes('Amount paid')) {
    fail('the quote leaked payment rows');
  }
  ok('quote: "Valid until", no payment rows');

  const receipt = { ...DEMO_INVOICE, kind: 'receipt' };
  const receiptText = await extractText(
    await blobToBuffer(await buildInvoicePdf(receipt, { fontBase: FONT_BASE, paperSize: 'LETTER' })),
  );
  if (!receiptText.includes('Receipt') || !receiptText.includes('Amount paid')) {
    fail('the receipt did not render its own words');
  }
  if (receiptText.includes('Due 31 Oct 2026')) fail('the receipt leaked the due date');
  ok('receipt (US Letter): shows the payment, no due date');

  const letter = await blobToBuffer(await buildInvoicePdf(DEMO_INVOICE, { paperSize: 'LETTER', fontBase: FONT_BASE }));
  if (letter.subarray(0, 5).toString('latin1') !== '%PDF-') fail('US Letter did not render a PDF');
  ok(`US Letter invoice -> ${letter.length} bytes`);

  // -------------------------------------------------------------------------
  // 7. Beyond WinAnsi: the standard-14 fonts dropped these glyphs
  // -------------------------------------------------------------------------

  step('rendering Polish, Hungarian and Cyrillic text');

  const intlName = 'Łucja Wójcik Őrsi Ирина';
  const intl = { ...DEMO_INVOICE, fromName: intlName };
  const intlText = await extractText(await blobToBuffer(await buildInvoicePdf(intl, { fontBase: FONT_BASE })));
  if (!intlText.includes(intlName)) {
    fail(`non-WinAnsi characters were lost: ${intlText.slice(0, 120)}`);
  }
  ok('Ł, ó, ő and Cyrillic survive');

  // -------------------------------------------------------------------------
  // 8. A zero-decimal currency stays whole (JPY has no decimal point)
  // -------------------------------------------------------------------------

  step('rendering a JPY document');

  const jpy = { ...DEMO_INVOICE, currency: 'JPY' };
  const jpyText = await extractText(await blobToBuffer(await buildInvoicePdf(jpy, { fontBase: FONT_BASE })));
  // subtotal 219500 minor yen → "¥219,500"; the old WinAnsi failure or a
  // two-digit reading ("2,195.00") would both fail this.
  if (!jpyText.includes('219,500')) fail(`the JPY subtotal printed wrong: ${jpyText.slice(0, 200)}`);
  if (/2,195\.00/.test(jpyText)) fail('the JPY document grew a decimal point');
  ok('JPY amounts print without minor units');

  console.log('\n  All invoice PDF checks passed.\n');
})().catch((error) => fail(error && error.stack ? error.stack : String(error)));
