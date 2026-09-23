/**
 * @jest-environment node
 *
 * The design language, enforced by machine.
 *
 * Every rule here exists because a human review missed it at least once: a `gray-500`
 * that survived a re-skin, a `transition-all` that quietly dragged layout into a hover,
 * a `filter: blur()` that re-sampled the backdrop on every frame, four routes with no
 * canonical. A reviewer catches these sometimes; a test catches them every time.
 *
 * Two files may name colours literally, for two different reasons:
 *   app/globals.css — it *is* the token file, and the hex lives on as provenance.
 *   app/layout.tsx  — `themeColor` is browser-chrome metadata, and metadata cannot read
 *                     a CSS custom property.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** The document layer is a different medium — a PDF's colours belong to the PDF. */
const SKIP_DIRS = ['node_modules', '.next', `lib${path.sep}capyresume`];
const COLOUR_LITERAL_ALLOWED = ['app/globals.css', 'app/layout.tsx'];

/**
 * A résumé preview is not chrome: it is the document, drawn on screen, and it has to be
 * white paper with black ink in both themes so that what you see is what the PDF holds.
 * The exemption is named per file rather than widened into the regex.
 */
const PAPER_ALLOWED = [
  'app/(site)/templates/[id]/page.tsx',
  'components/tool/CapyResume.tsx',
  'components/tool/BlockView.tsx',
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.includes(entry)) continue;
    const full = path.join(dir, entry);
    if (SKIP_DIRS.some((skip) => full.endsWith(skip))) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|css)$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'components'))];
const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join('/');
const read = (file: string) => readFileSync(file, 'utf8');
const stripComments = (value: string) => value.replace(/\/\*[\s\S]*?\*\//g, '');

/** The rules judge code, not prose: comments are blanked, but their newlines and columns
 * survive, so `file:line` in a failure still points at the real line. `//` after a colon
 * is left alone — that is a URL, not a comment. */
function code(file: string): string {
  const source = read(file);
  const blank = (match: string) => match.replace(/[^\n]/g, ' ');
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (file.endsWith('.css')) return withoutBlocks;
  return withoutBlocks.replace(/(?<![:\w])\/\/[^\n]*/g, blank);
}

/** Every offender, as `file:line: snippet`, so a failure points at the work. */
function offenders(pattern: RegExp, files = FILES): string[] {
  return files.flatMap((file) =>
    code(file)
      .split('\n')
      .flatMap((line, index) => {
        const found = line.match(pattern);
        return found ? [`${rel(file)}:${index + 1}: ${found[0]}`] : [];
      })
  );
}

describe('design language conformance', () => {
  it('uses the palette, not the ramps Tailwind ships', () => {
    const ramps =
      /\b(?:bg|text|border|border-[trblxy]|from|via|to|ring|stroke|fill|divide|placeholder|outline|decoration|caret|accent|shadow)-(?:zinc|slate|gray|grey|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b/g;
    const absolutes = /\b(?:bg|text|border|from|via|to|ring|stroke|fill|divide)-(?:white|black)\b/g;
    const ui = FILES.filter((file) => !PAPER_ALLOWED.includes(rel(file)));
    expect(offenders(ramps)).toEqual([]);
    expect(offenders(absolutes, ui)).toEqual([]);
  });

  it('names no colour outside the token file', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/g;
    const files = FILES.filter((file) => !COLOUR_LITERAL_ALLOWED.includes(rel(file)));
    expect(offenders(hex, files)).toEqual([]);
  });

  it('transitions the properties that change, never `all`', () => {
    expect(offenders(/transition-all\b/g)).toEqual([]);
  });

  it('never blurs a backdrop with a filter', () => {
    const css = FILES.filter((file) => file.endsWith('.css')).map(code);
    for (const sheet of css) expect(sheet).not.toMatch(/filter:\s*blur\(/);
  });

  it('decides the theme from the class, never from the OS', () => {
    // The washes and the palette are both theme-driven; a prefers-color-scheme query is
    // how the two get out of step with the toggle.
    for (const file of FILES.filter((f) => f.endsWith('.css'))) {
      expect(stripComments(read(file))).not.toMatch(/prefers-color-scheme/);
    }
  });

  it('has retired the legacy brand ramp for good', () => {
    // It was a compatibility shim for four components; they are on semantic tokens now,
    // and a dead ramp is how a palette forks.
    for (const file of FILES) expect(read(file)).not.toMatch(/--brand-\d|brand-\d{2,3}\b/);
  });

  it('levels every card grid', () => {
    // Cards in a grid stretch within their own row, so a two-row grid of six cards ends
    // up with a shorter second row — visible as a mistake, and measured at 23px on the
    // landing page before `auto-rows-fr` went on. Card grids are the ones with `gap-4`;
    // the hero list (gap-3) and the step columns (gap-8) are prose, not cards.
    const offenders = FILES.filter((file) => rel(file).startsWith('app/')).flatMap((file) =>
      [...code(file).matchAll(/className="([^"]*\bgrid\b[^"]*)"/g)]
        .map((m) => m[1] ?? '')
        .filter(
          (cls) => /grid-cols-/.test(cls) && /\bgap-4\b/.test(cls) && !cls.includes('auto-rows-fr')
        )
        .map((cls) => `${rel(file)}: ${cls}`)
    );
    expect(offenders).toEqual([]);
  });
});
