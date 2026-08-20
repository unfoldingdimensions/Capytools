"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { spreadFrom, startTaggedTransition } from "@/lib/capytools/reveal";

/** Reveal duration for the theme spread, ms. */
const SPREAD_MS = 650;

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const ref = useRef<HTMLButtonElement>(null);

  /**
   * Spread the new palette out from the toggle in one motion, via the View
   * Transitions API: the outgoing snapshot sits underneath and the incoming one
   * is clipped to a circle that grows from the button past the far corner.
   * `globals.css` disables both snapshots' default cross-fade so this clip is
   * the only movement. Falls back to an instant swap where the API is missing
   * or the reader asked for reduced motion.
   */
  const toggle = async () => {
    // Read the theme at click time from the class next-themes maintains, rather
    // than from render state — see the note on the icons below.
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    const box = ref.current?.getBoundingClientRect();

    // flushSync: startViewTransition snapshots as soon as the callback returns,
    // so React's re-render (and next-themes' class flip) has to land inside it.
    const transition = await startTaggedTransition("theme", () => {
      flushSync(() => setTheme(next));
    });
    if (!transition || !box) return;

    const { from, to } = spreadFrom(box, window.innerWidth, window.innerHeight);
    document.documentElement.animate(
      { clipPath: [from, to] },
      {
        duration: SPREAD_MS,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  };

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      onClick={() => void toggle()}
      aria-label="Toggle light and dark theme"
      className="size-10 rounded-full sm:size-9"
    >
      {/*
        Which glyph shows is decided purely by the `dark` class through CSS, not
        by React state. next-themes sets that class in a blocking script before
        paint, so the icon is already correct on first paint — and crucially the
        server and client render byte-identical markup.

        This used to gate on a mounted flag and render a placeholder <div> on the
        server against a <button> on the client. That is an element-type
        mismatch: a hard hydration failure, which makes React discard the server
        HTML and re-render the whole page on the client.
      */}
      <span className="relative block h-4 w-4">
        <Sun className="absolute inset-0 h-4 w-4 -rotate-90 scale-50 opacity-0 transition-all duration-300 ease-out dark:rotate-0 dark:scale-100 dark:opacity-100" />
        <Moon className="absolute inset-0 h-4 w-4 rotate-0 scale-100 opacity-100 transition-all duration-300 ease-out dark:rotate-90 dark:scale-50 dark:opacity-0" />
      </span>
    </Button>
  );
}
