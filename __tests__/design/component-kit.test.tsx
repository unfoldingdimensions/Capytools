/**
 * @jest-environment node
 *
 * Rendered with react-dom's node server (the jsdom environment resolves the browser
 * build, which wants a MessageChannel at import time).
 *
 * The kit's mechanical contract (DESIGN.md §Components): pills for buttons, cards that
 * rest on `shadow-sm` and lift on transform only, chips in the label voice, fields on
 * the card fill. Behaviour lives in the component tests; this file guards the styling
 * rules that are cheap to state and expensive to re-derive by eye.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';

import config from '../../tailwind.config';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
const kitFile = (name: string) =>
  readFileSync(path.join(process.cwd(), 'components', 'ui', name), 'utf8');

const KIT_FILES = [
  'button.tsx',
  'card.tsx',
  'input.tsx',
  'textarea.tsx',
  'badge.tsx',
  'interactive-card.tsx',
];

describe('component kit', () => {
  it.each(KIT_FILES)('%s never animates layout and never erases the focus ring', (file) => {
    const src = kitFile(file);
    expect(src).not.toMatch(/transition-all/);
    expect(src).not.toMatch(/focus-visible:outline-none/);
  });

  it('points the shadow scale at the stylesheet tokens (cards rest at the v4 sm)', () => {
    const shadow = config.theme?.extend?.boxShadow as Record<string, string>;
    expect(shadow.sm).toBe('var(--shadow-sm)');
    expect(shadow.md).toBe('var(--shadow-md)');
  });

  it('exposes the house motion keys, so classes can carry the tokens', () => {
    const duration = config.theme?.extend?.transitionDuration as Record<string, string>;
    const ease = config.theme?.extend?.transitionTimingFunction as Record<string, string>;
    expect(duration.fade).toBe('var(--dur-fade)');
    expect(duration.move).toBe('var(--dur-move)');
    expect(ease.ui).toBe('var(--ease-ui)');
    expect(ease.entrance).toBe('var(--ease-entrance)');
  });

  it('makes the primary action a full-round sage pill that moves on colour alone', () => {
    const primary = buttonVariants({ variant: 'default', size: 'lg' });
    expect(primary).toMatch(/rounded-full/);
    expect(primary).toMatch(/bg-primary/);
    expect(primary).toMatch(/h-12/);
    expect(primary).toMatch(/duration-fade/);
    expect(primary).toMatch(/ease-ui/);
    expect(primary).toMatch(/active:translate-y-px/);
    expect(primary).not.toMatch(/transition-all/);
  });

  it('keeps destructive tinted rather than a solid red', () => {
    const destructive = buttonVariants({ variant: 'destructive' });
    expect(destructive).toMatch(/bg-destructive\/10/);
    expect(destructive).not.toMatch(/bg-destructive\b(?!\/)/);
  });

  it('renders a card that rests on sm and lifts 2px on transform', () => {
    const html = renderToStaticMarkup(<Card hover data-testid="card" />);
    expect(html).toContain('rounded-3xl');
    expect(html).toContain('shadow-sm');
    expect(html).toContain('border-border');
    expect(html).toContain('duration-move');
    expect(html).toContain('hover:-translate-y-0.5');
    expect(html).toContain('hover:shadow-md');
  });

  it('dresses chips in the label voice', () => {
    const html = renderToStaticMarkup(<Badge>Saved</Badge>);
    expect(html).toContain('font-mono');
    expect(html).toContain('uppercase');
    expect(html).toContain('text-label-caps');
    expect(html).toContain('rounded-md');
  });

  it('gives fields the card fill, the input border, and the focus ring back', () => {
    for (const html of [
      renderToStaticMarkup(<Input aria-label="Name" />),
      renderToStaticMarkup(<Textarea aria-label="Summary" />),
    ]) {
      expect(html).toContain('bg-card');
      expect(html).toContain('border-input');
      expect(html).toContain('rounded-xl');
      expect(html).not.toContain('outline-none');
    }
  });

  it('keeps Button usable through its legacy aliases', () => {
    for (const variant of ['gradient', 'brand'] as const) {
      expect(buttonVariants({ variant })).toMatch(/bg-primary/);
    }
    expect(buttonVariants({ size: 'xl' })).toMatch(/h-12/);
  });
});
