import { readFileSync } from 'node:fs';
import path from 'node:path';

import config from '../../tailwind.config';

/**
 * The type contract from DESIGN.md: Fraunces for titles, Plus Jakarta Sans at weight
 * 500 for all UI, Albert Sans as the label voice, and the suite's size ramp.
 *
 * These assertions are deliberately about the wiring rather than rendered styles —
 * Tailwind never runs inside jsdom, so a computed-style assertion here would pass for
 * the wrong reasons. The live computed check (body 500 / h1 700, real families) belongs
 * to the browser pass.
 */
const globals = readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8');

const extend = config.theme?.extend as {
  fontFamily?: Record<string, string[]>;
  fontSize?: Record<string, [string, ...unknown[]]>;
};

describe('type system', () => {
  it('maps the three families onto the suite token names', () => {
    expect(extend.fontFamily?.sans?.[0]).toBe('var(--font-sans)');
    expect(extend.fontFamily?.display?.[0]).toBe('var(--font-display)');
    expect(extend.fontFamily?.mono?.[0]).toBe('var(--font-mono)');
  });

  it('carries the full size ramp, with nothing below 10px', () => {
    const ramp: Record<string, [string, ...unknown[]]> = extend.fontSize ?? {};
    const expected = [
      'label-micro',
      'label-caps',
      'caption',
      'ui-sm',
      'body-sm',
      'ui-md',
      'body-md',
      'lead-lg',
      'title-sm',
      'title-md',
      'display-md',
      'display-sm',
      'display-lg',
      'display-tool',
      'display-xl',
      'numeral-lg',
      'numeral-xl',
    ];
    expect(Object.keys(ramp).sort()).toEqual([...expected].sort());

    for (const [name, value] of Object.entries(ramp)) {
      const px = parseFloat(value[0]) * 16;
      expect({ name, tooSmall: px < 10 }).toEqual({ name, tooSmall: false });
    }

    // Spot-check against the brief's YAML rather than trusting a rewritten table.
    const sizeOf = (token: string) => {
      const entry = ramp[token];
      if (!entry) throw new Error(`size ramp is missing the ${token} token`);
      return entry[0];
    };
    expect(sizeOf('label-micro')).toBe('0.625rem');
    expect(sizeOf('body-sm')).toBe('0.875rem');
    expect(sizeOf('display-xl')).toBe('3.75rem');
    expect(sizeOf('numeral-xl')).toBe('4.5rem');
  });

  it('sets the base weights the brief specifies', () => {
    expect(globals).toMatch(/body\s*\{[^}]*font-weight:\s*500/s);
    expect(globals).toMatch(/h1,\s*h2,\s*h3,\s*h4\s*\{[^}]*font-weight:\s*700/s);
  });

  it('ships the label utilities in the uppercase tracked style', () => {
    expect(globals).toMatch(/\.eyebrow\s*\{[^}]*uppercase[^}]*tracking-\[0\.24em\]/s);
    expect(globals).toMatch(/\.eyebrow-micro\s*\{[^}]*uppercase[^}]*tracking-\[0\.18em\]/s);
  });

  it('has dropped Inter from the UI entirely', () => {
    expect(globals).not.toMatch(/--font-inter/);
    expect(globals).not.toMatch(/--font-outfit/);
    expect(JSON.stringify(extend.fontFamily)).not.toMatch(/inter|outfit/i);
  });
});
