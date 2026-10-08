// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
/**
 * @jest-environment node
 *
 * The live preview has to stay visible while the form scrolls. That is a layout
 * contract, and it is asserted here on the markup we author — the same way the
 * design guards assert the palette and the register.
 *
 * The real proof is geometry measured in a browser (see the plan,
 * `.hermes/plans/2026-09-24_120000-sticky-preview.md`): on `/capyresume` at
 * 1440x900 the paper is 521x1056 inside a 900px viewport, and before this the
 * preview sat 3623px above the viewport top once the form was scrolled. These
 * assertions are what keep that from silently going back.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.join(process.cwd(), 'src/components/tool/CapyResume.tsx'), 'utf8');

/** The "2. The page" card — everything from its marker to the next card's. */
function pageCard(): string {
  const start = source.indexOf('card 2');
  const end = source.indexOf('card 3', start);
  if (start < 0 || end < 0) throw new Error('could not locate the preview card in CapyResume.tsx');
  return source.slice(start, end);
}

/** The pinned section's own className, not the whole card. */
/** The pinned pane is the StageCard (sticky, offset, self-start) plus its first
 *  inner column (viewport cap, flex): read both, as the browser applies both. */
function pageSectionClassName(): string {
  const card = pageCard();
  const outer = card.match(/<StageCard[^>]*className="([^"]+)"/)?.[1];
  const inner = card.match(/<StageCard[\s\S]*?<div className="([^"]+)"/)?.[1];
  if (!outer || !inner) throw new Error('could not read the preview card classNames');
  return `${outer} ${inner}`;
}

const classes = pageSectionClassName();

describe('the live preview is pinned on large screens', () => {
  it('sticks below the top of the viewport with a gap', () => {
    expect(classes).toMatch(/\blg:sticky\b/);
    expect(classes).toMatch(/\blg:top-\d/);
  });

  it('is allowed to travel, which requires opting out of the grid stretch', () => {
    // Without `self-start` the grid item stretches to its row height, the item
    // fills the row, and `sticky` has no distance left to move.
    expect(classes).toMatch(/\blg:self-start\b/);
  });

  it('never exceeds the viewport, so nothing in the pane is cut off', () => {
    expect(classes).toMatch(/\blg:max-h-\[calc\(100dvh/);
    expect(classes).toMatch(/\blg:flex\b/);
    expect(classes).toMatch(/\blg:flex-col\b/);
  });

  it('scrolls the paper inside the pane instead of clipping it', () => {
    const card = pageCard();
    expect(card).toMatch(/\blg:flex-1\b/);
    expect(card).toMatch(/\blg:overflow-y-auto\b/);
    // `min-h-0` is what lets a flex child shrink below its content size and
    // become scrollable; without it the pane grows and the viewport cap loses.
    expect(card).toMatch(/\blg:min-h-0\b/);
  });

  it('leaves the document surface as paper in both themes', () => {
    expect(pageCard()).toMatch(/bg-white text-black/);
  });

  it('adds no motion and no chrome to the pinned pane', () => {
    expect(classes).not.toMatch(/transition|animate|shadow/);
  });
});
