import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TEMPLATE_ID,
  TEMPLATE_LIST,
  TEMPLATES,
  getTemplate,
  headingText,
  isPackUnlocked,
  isTemplateId,
} from '@/lib/capyresume/templates';

describe('capyresume/templates — registry', () => {
  it('ships six templates: the three free ones plus the expanded pack', () => {
    expect(TEMPLATE_LIST).toHaveLength(6);
    expect(TEMPLATE_LIST.filter((s) => s.pack === 'free')).toHaveLength(3);
  });

  it('keys the registry by the spec id', () => {
    for (const [key, spec] of Object.entries(TEMPLATES)) {
      expect(spec.id).toBe(key);
    }
  });

  it('gives every template a distinct id and label', () => {
    const ids = TEMPLATE_LIST.map((spec) => spec.id);
    const names = TEMPLATE_LIST.map((spec) => spec.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(TEMPLATE_LIST)('$name is single-column and table-free', (spec) => {
    // Property assertions, not snapshots: these two literals *are* the
    // parse-friendliness guarantee.
    expect(spec.columns).toBe(1);
    expect(spec.usesTables).toBe(false);
  });

  it.each(TEMPLATE_LIST)('$name stays on a standard-14 PDF font', (spec) => {
    // Nothing embedded => no font licence can be breached, and every reader can
    // render the file.
    expect(['Helvetica', 'Times-Roman']).toContain(spec.fontFamily);
  });

  it.each(TEMPLATE_LIST)('$name has a usable type scale and rhythm', (spec) => {
    expect(spec.fontSize).toBeGreaterThanOrEqual(9);
    expect(spec.fontSize).toBeLessThanOrEqual(12);
    expect(spec.entryGap).toBeGreaterThan(0);
    expect(spec.lineHeight).toBeGreaterThan(1);
    expect(spec.bulletChar.length).toBeGreaterThan(0);
    expect(spec.accent).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('capyresume/templates — lookup', () => {
  it('resolves a known id', () => {
    expect(getTemplate('serif').id).toBe('serif');
  });

  it('falls back to the default for unknown, empty or missing ids', () => {
    expect(getTemplate('nope').id).toBe(DEFAULT_TEMPLATE_ID);
    expect(getTemplate('').id).toBe(DEFAULT_TEMPLATE_ID);
    expect(getTemplate(null).id).toBe(DEFAULT_TEMPLATE_ID);
    expect(getTemplate(undefined).id).toBe(DEFAULT_TEMPLATE_ID);
  });

  it('guards template ids', () => {
    expect(isTemplateId('compact')).toBe(true);
    expect(isTemplateId('toString')).toBe(false);
    expect(isTemplateId(42)).toBe(false);
  });
});

describe('capyresume/templates — heading casing', () => {
  it('applies the template rule', () => {
    expect(headingText(TEMPLATES.classic, 'Experience')).toBe('EXPERIENCE');
    expect(headingText(TEMPLATES.serif, 'Experience')).toBe('Experience');
  });
});

describe('capyresume/templates — registry coverage', () => {
  it('lists every registry row exactly once', () => {
    // TEMPLATE_LIST is hand-maintained (templates.ts:97) while TEMPLATES is
    // type-checked against the TemplateId union, so a row can be added to the
    // registry, compile cleanly, and never reach the editor's template picker.
    const listed = TEMPLATE_LIST.map((spec) => spec.id).sort();
    const registered = Object.keys(TEMPLATES).sort();
    expect(listed).toEqual(registered);
  });

  it('keeps every bullet glyph inside WinAnsi', () => {
    // The PDFs use standard-14 fonts with WinAnsiEncoding: a glyph outside that
    // set looks fine in the HTML preview and prints as a blank or a notdef box
    // in the finished file.
    const SAFE = ['•', '–', '—', '·', '-', '*'];
    for (const spec of TEMPLATE_LIST) {
      expect(SAFE).toContain(spec.bulletChar);
    }
  });
});

describe('capyresume/templates — pack seam', () => {
  it('tags every template with a pack', () => {
    for (const spec of TEMPLATE_LIST) {
      expect(typeof spec.pack).toBe('string');
      expect(spec.pack.length).toBeGreaterThan(0);
    }
  });

  it('unlocks every pack until a payment layer exists', () => {
    // This is the whole seam: free must never gate the export of the user's own
    // résumé (plan §6.4), and until payments exist there is nothing to gate with.
    for (const pack of new Set(TEMPLATE_LIST.map((s) => s.pack))) {
      expect(isPackUnlocked(pack)).toBe(true);
    }
  });

  it('keeps the free set at the original three', () => {
    const free = TEMPLATE_LIST.filter((s) => s.pack === 'free');
    expect(free.map((s) => s.id).sort()).toEqual(['classic', 'compact', 'serif']);
  });
});
