#!/usr/bin/env node
/**
 * CapyResume — end-to-end PDF verification.
 *
 * The unit tests mock `@react-pdf/renderer` (it is ESM-only and cannot be
 * transformed by this Jest/SWC setup), so the *real* render has to be proven
 * somewhere. This script does that, against the real engine:
 *
 *   1. compiles `lib/capyresume` to CommonJS in a cache directory
 *   2. renders the demo résumé to an actual PDF via the shipped `buildResumePdf`
 *   3. asserts the bytes are a real PDF ("%PDF-")
 *   4. extracts the text with `pdf-parse` and asserts the résumé's content is
 *      present — i.e. the file has a genuine **text layer**, not an image
 *   5. asserts no watermark/attribution leaked into the rendered text
 *
 * Run: node scripts/verify-pdf-text-layer.cjs
 * Exits non-zero with a readable message if any assertion fails.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'node_modules', '.cache', 'capyresume-pdfverify');
// The browser fetches the embedded fonts from /pdf-fonts/; here they are read from disk.
const FONT_BASE = path.join(ROOT, 'public', 'pdf-fonts') + path.sep;
const SRC_DIR = path.join(ROOT, 'lib', 'capyresume');

const ENTRIES = ['types', 'format', 'schema', 'templates', 'document', 'json', 'demo', 'pdf'];

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

step(`compiling lib/capyresume -> ${path.relative(ROOT, OUT_DIR)}`);

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const tsc = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');

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
    { stdio: 'pipe', cwd: ROOT }
  );
} catch (error) {
  const output = `${error.stdout || ''}${error.stderr || ''}`.trim();
  fail(`tsc failed while compiling the library:\n${output}`);
}

const compiledPdf = path.join(OUT_DIR, 'pdf.js');
if (!fs.existsSync(compiledPdf)) fail(`expected ${compiledPdf} to exist after compilation`);
ok('library compiled');

// ---------------------------------------------------------------------------
// 2. Render for real
// ---------------------------------------------------------------------------

const { buildResumePdf } = require(compiledPdf);
const { DEMO_RESUME } = require(path.join(OUT_DIR, 'demo.js'));
const { TEMPLATE_LIST } = require(path.join(OUT_DIR, 'templates.js'));
const pdfParseModule = require('pdf-parse');

/**
 * Extract the text layer, tolerating both pdf-parse majors:
 *   v1 — the module itself is `async (buffer) => ({ text })`
 *   v2 — the module exports a `PDFParse` class with `getText()`
 */
async function extractText(buffer) {
  if (typeof pdfParseModule === 'function') {
    const parsed = await pdfParseModule(buffer);
    return parsed.text || '';
  }

  const PDFParse = pdfParseModule.PDFParse;
  if (typeof PDFParse === 'function') {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text || '';
    } finally {
      if (typeof parser.destroy === 'function') await parser.destroy();
    }
  }

  throw new Error('Unsupported pdf-parse module shape');
}

function blobToBuffer(blob) {
  // Node's Blob supports arrayBuffer().
  return blob.arrayBuffer().then((buf) => Buffer.from(buf));
}

(async () => {
  step('rendering the demo resume with the real renderer');

  let buffer;
  try {
    const blob = await buildResumePdf(DEMO_RESUME, { fontBase: FONT_BASE });
    buffer = await blobToBuffer(blob);
  } catch (error) {
    fail(`buildResumePdf threw: ${error && error.message ? error.message : error}`);
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
  // 4. It has a text layer (the entire point)
  // -------------------------------------------------------------------------

  step('extracting the text layer');

  let text = '';
  try {
    text = await extractText(buffer);
  } catch (error) {
    fail(`pdf-parse could not read the PDF: ${error && error.message ? error.message : error}`);
  }

  const normalised = text.replace(/\s+/g, ' ');
  const expectations = [
    'Maya Okafor',
    'maya.okafor@example.com',
    'EXPERIENCE',
    'Senior Operations Analyst',
    'Northwind Logistics',
    'Rebuilt the monthly close process',
    'SQL',
  ];

  const missing = expectations.filter((needle) => !normalised.includes(needle));
  if (missing.length > 0) {
    console.error('\n--- extracted text ---\n' + normalised.slice(0, 1200) + '\n');
    fail(
      `the PDF has no usable text layer: ${missing.length} expected string(s) missing -> ${missing.join(', ')}`
    );
  }
  ok(`text layer verified (${expectations.length} strings found, ${text.length} chars total)`);

  // -------------------------------------------------------------------------
  // 5. No watermark
  // -------------------------------------------------------------------------

  const forbidden = ['Handcraft', 'Generated by', 'capy.tools', 'watermark', 'Powered by'];
  const leaked = forbidden.filter((needle) => normalised.includes(needle));
  if (leaked.length > 0) fail(`watermark text found in the rendered PDF: ${leaked.join(', ')}`);
  ok('no watermark or attribution in the rendered document');

  // -------------------------------------------------------------------------
  // 6. Every template renders
  // -------------------------------------------------------------------------

  step('rendering every template');

  for (const spec of TEMPLATE_LIST) {
    const blob = await buildResumePdf(DEMO_RESUME, { templateId: spec.id, fontBase: FONT_BASE });
    const bytes = await blobToBuffer(blob);
    if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
      fail(`template "${spec.id}" did not render a PDF`);
    }
    const parsedText = await extractText(bytes);
    if (!/maya okafor/i.test(parsedText)) {
      fail(`template "${spec.id}" rendered a PDF with no extractable content`);
    }
    ok(`template "${spec.id}" -> ${bytes.length} bytes, text extractable`);
  }

  // 7. Beyond WinAnsi: the standard-14 fonts dropped these glyphs
  // -------------------------------------------------------------------------

  step('rendering Polish, Hungarian and Cyrillic text');

  const intlName = 'Łucja Wójcik Őrsi Ирина';
  const intl = { ...DEMO_RESUME, contact: { ...DEMO_RESUME.contact, name: intlName } };
  for (const spec of TEMPLATE_LIST) {
    const bytes = await blobToBuffer(
      await buildResumePdf(intl, { templateId: spec.id, fontBase: FONT_BASE })
    );
    const parsedText = await extractText(bytes);
    if (!parsedText.includes(intlName)) {
      fail(`template "${spec.id}" lost non-WinAnsi characters: ${parsedText.slice(0, 80)}`);
    }
  }
  ok('Ł, ó, ő and Cyrillic survive in every template');

  console.log('\n  All PDF checks passed.\n');
})().catch((error) => fail(error && error.stack ? error.stack : String(error)));
