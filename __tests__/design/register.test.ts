/**
 * @jest-environment node
 *
 * The register, as a rule that can be run: sentence case where a page speaks in titles,
 * lowercase everywhere the interface speaks to you — buttons, field labels, chips, status
 * lines, screen-reader text. That is the difference between a voice and a form letter.
 *
 * This file covers the surfaces the page-level tests don't reach: the builder itself, the
 * calls to action scattered across the guide pages, and the text only a screen reader
 * hears. It exists because a sweep of 36 Title Case labels was done by hand once, and
 * nothing stopped number 37 from arriving.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** Words that keep their case, because they are names rather than labels. `YYYY-MM` is a
 * format token: it is uppercase because that is what the field accepts. */
const KEEPS_CASE =
  /^(YYYY-MM|AI|API|ATS|A4|CV|DOCX|JSON|PDF|URL|US|UK|CapyResume|LinkedIn|Google|Microsoft|Word)\b/;

/** If any word is a proper noun, the capital is earned — "How CapyResume is built". */
const PROPER_NOUN =
  /\b(CapyResume|ATS|PDF|DOCX|JSON|API|URL|AI|CV|LinkedIn|Google|Microsoft|US|UK|A4|Word|Chrome|Edge|Firefox|Safari)\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    // `__tests__` holds fixtures, not shipped copy: a placeholder named "Name" in a
    // component test is not the interface speaking.
    if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const ROOT_FILES = walk(ROOT);
const APP_FILES = ROOT_FILES.filter((f) => /[/\\]app[/\\]/.test(f));
const TOOL_FILES = ROOT_FILES.filter((f) => /[/\\]components[/\\]tool[/\\]/.test(f));

const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join('/');
const read = (file: string) => readFileSync(file, 'utf8');

/** Short user-facing text between tags: a label, not a sentence. */
function labelsIn(source: string): string[] {
  const nodes = [...source.matchAll(/>\s*([^<>{}\n]{1,64}?)\s*</g)].map((m) => (m[1] ?? '').trim());
  const props = [
    ...source.matchAll(
      /\b(?:placeholder|aria-label|title|label|confirmText|cancelText)\s*=\s*"([^"]{1,64})"/g
    ),
  ].map((m) => (m[1] ?? '').trim());
  return [...nodes, ...props].filter(
    (text) => text && /^[A-Z]/.test(text) && text.split(/\s+/).length <= 3 && !KEEPS_CASE.test(text)
  );
}

describe('register', () => {
  it('speaks lowercase in the builder, where every label is an instruction', () => {
    const offenders = TOOL_FILES.flatMap((file) =>
      labelsIn(read(file)).map((text) => `${rel(file)}: "${text}"`)
    );
    expect(offenders).toEqual([]);
  });

  it('never slips into Title Case on the guide pages', () => {
    // Their headings are sentence case, so a run of two Capitalised words is always a
    // label that lost the register.
    const offenders = APP_FILES.flatMap((file) =>
      [...read(file).matchAll(/>\s*([A-Z][a-z]+ [A-Z][a-z]+[^<>{}\n]{0,40}?)\s*</g)]
        .map((m) => (m[1] ?? '').trim())
        .filter((text) => !PROPER_NOUN.test(text))
        .map((text) => `${rel(file)}: "${text}"`)
    );
    expect(offenders).toEqual([]);
  });

  it('labels every icon-only control in lowercase, for the screen reader', () => {
    const offenders = ROOT_FILES.flatMap((file) =>
      [...read(file).matchAll(/aria-label="([^"]+)"/g)]
        .map((m) => m[1] ?? '')
        .filter((value) => /^[A-Z]/.test(value) && !KEEPS_CASE.test(value))
        .map((value) => `${rel(file)}: aria-label="${value}"`)
    );
    expect(offenders).toEqual([]);
  });

  it('keeps screen-reader-only text lowercase', () => {
    const offenders = ROOT_FILES.flatMap((file) =>
      [...read(file).matchAll(/sr-only[^>]*>\s*([^<]{1,40}?)\s*</g)]
        .map((m) => (m[1] ?? '').trim())
        .filter((text) => /^[A-Z]/.test(text) && !KEEPS_CASE.test(text))
        .map((text) => `${rel(file)}: sr-only "${text}"`)
    );
    expect(offenders).toEqual([]);
  });

  it('verbs the calls to action in lowercase', () => {
    const source = ROOT_FILES.map(read).join('\n');
    for (const phrase of ['open the builder', 'start writing', 'load demo', 'add entry']) {
      expect(source).toContain(phrase);
    }
  });
});
