'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

/**
 * The theme switcher.
 *
 * This was a `DropdownMenu` from Radix for three options. Measured, that package -
 * with its DismissableLayer, FocusScope and react-remove-scroll - cost **18.3 KB
 * gzip on every marketing route**, which was 82% of the entire client delta those
 * pages paid. A native `<select>` gives the same three choices, ships no JavaScript
 * at all, and is announced and operated correctly by every assistive technology
 * without a focus trap to get right.
 *
 * The visible label is the icon pair, which is presentational, so the real name lives
 * on the control: `aria-label` plus a `title` for hover. `size` and `w-10` keep the
 * header's 40px control rhythm.
 *
 * The icons sit in `<span>` wrappers rather than carrying the transform themselves:
 * animating `transform` on an `<svg>` element is not reliably composited, which is
 * what `rendering-animate-svg-wrapper` is about.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <span className="relative inline-flex h-10 w-10 items-center justify-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span className="flex items-center justify-center">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-transform duration-move ease-entrance dark:-rotate-90 dark:scale-0" />
        </span>
        <span className="absolute flex items-center justify-center">
          <Moon className="h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-transform duration-move ease-entrance dark:rotate-0 dark:scale-100" />
        </span>
      </span>

      {/*
        The server cannot know the stored theme, so SSR renders `system` and the client
        swaps in the real value on hydration. `suppressHydrationWarning` is the intended
        tool for a value that legitimately differs on first paint — and next-themes
        already injects a pre-hydration script, so the applied theme is correct before
        React runs. The `mounted` flag this usually needs is a setState-in-effect, which
        the lint rules here reject, and it also paints a wrong value for a frame.
      */}
      <select
        aria-label="theme"
        title="theme"
        suppressHydrationWarning
        defaultValue={theme ?? 'system'}
        onChange={(event) => setTheme(event.target.value)}
        className="h-10 w-10 cursor-pointer appearance-none rounded-full border border-border bg-background opacity-0 transition-colors duration-fade ease-ui hover:bg-muted focus-visible:opacity-100"
      >
        <option value="light">light</option>
        <option value="dark">dark</option>
        <option value="system">system</option>
      </select>
    </span>
  );
}
