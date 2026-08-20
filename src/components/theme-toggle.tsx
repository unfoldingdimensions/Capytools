"use client";

import { useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { spreadFrom, startTaggedTransition } from "@/lib/capytools/reveal";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

/** Reveal duration for the theme spread, ms. */
const SPREAD_MS = 650;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const ref = useRef<HTMLButtonElement>(null);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Avoid the hydration mismatch (server renders a size placeholder).
  if (!mounted) return <div className="h-9 w-9" aria-hidden />;

  // Use the RESOLVED theme (system → actual), not the raw theme which can be "system".
  const dark = resolvedTheme === "dark";

  /**
   * Spread the new palette out from the toggle in one motion, via the View
   * Transitions API: the outgoing snapshot sits underneath and the incoming one
   * is clipped to a circle that grows from the button past the far corner.
   * `globals.css` disables both snapshots' default cross-fade so this clip is
   * the only movement. Falls back to an instant swap where the API is missing
   * or the reader asked for reduced motion.
   */
  const toggle = async () => {
    const next = dark ? "light" : "dark";
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
      aria-label="Toggle theme"
      aria-pressed={dark}
      className="rounded-full"
    >
      {/* Both glyphs stay mounted and cross-rotate, so the icon turns with the
          spread instead of popping. */}
      <span className="relative block h-4 w-4">
        <Sun
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-300 ease-out",
            dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-300 ease-out",
            dark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100",
          )}
        />
      </span>
    </Button>
  );
}
