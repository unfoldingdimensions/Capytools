import { readFileSync } from 'node:fs';
import path from 'node:path';

import { cssEase, dur, ease } from '../../lib/capytools/motion';

/**
 * The CSS mirror contract: app/globals.css declares `--ease-*`/`--dur-*` and the ambient
 * keyframes, while lib/capytools/motion.ts carries the same numbers for TypeScript
 * consumers. Neither can read the other, so this test is the seam — when the two drift,
 * the failure lands here instead of in a subtly mistimed animation.
 */
const globals = readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8');

const mirror: [string, string][] = [
  ['--ease-entrance', cssEase.entrance],
  ['--ease-ui', cssEase.ui],
  ['--ease-drift', cssEase.drift],
  ['--dur-fade', `${dur.fade}ms`],
  ['--dur-move', `${dur.move}ms`],
  ['--dur-entrance', `${dur.entrance}ms`],
  ['--dur-hero', `${dur.heroReveal}ms`],
  ['--dur-stagger', `${dur.staggerGap}ms`],
];

describe('motion tokens', () => {
  it.each(mirror)('declares %s in the stylesheet', (token, value) => {
    expect(globals).toContain(`${token}: ${value};`);
  });

  it('keeps the eased tuples and their CSS strings in step', () => {
    const fromTuple = (tuple: readonly number[]) => `cubic-bezier(${tuple.join(', ')})`;
    expect(cssEase.entrance).toBe(fromTuple(ease.slowOut));
    expect(cssEase.ui).toBe(fromTuple(ease.gentle));
    expect(cssEase.drift).toBe(fromTuple(ease.drift));
  });

  it('ships the ambient layer: gradient washes, alternating drift, dark lift', () => {
    expect(globals).toMatch(
      /\.ambient-wash-a\s*\{[^}]*ambient-a 52s var\(--ease-drift\)[^}]*alternate/s
    );
    expect(globals).toMatch(/\.ambient-wash-b\s*\{[^}]*ambient-b 68s var\(--ease-drift\) -14s/s);
    expect(globals).toMatch(/\.ambient-wash-c\s*\{[^}]*ambient-c 44s var\(--ease-drift\) -31s/s);
    expect(globals).toMatch(/\.dark \.ambient-wash\s*\{[^}]*opacity: 0\.18/s);
    expect(globals).toMatch(/@keyframes ambient-a/);
    expect(globals).toMatch(/@keyframes ambient-b/);
    expect(globals).toMatch(/@keyframes ambient-c/);
  });

  it('never blurs an ambient wash (compositor-only rule)', () => {
    expect(globals).not.toMatch(/filter:\s*blur\(/);
  });
});
