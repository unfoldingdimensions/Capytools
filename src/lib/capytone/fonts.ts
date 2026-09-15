/**
 * Canvas font loading.
 *
 * `<canvas>` has no idea CSS variables exist — `ctx.font` needs literal
 * families, and if the font isn't loaded the browser silently paints a
 * fallback and the card looks wrong. So we resolve the actual computed stacks
 * from the document (the `next/font` variables are live there), wait for
 * `document.fonts.ready`, and cache the result per document.
 */

let cached: { display: string; sans: string; mono: string } | null = null;

export function getFontStacks(): { display: string; sans: string; mono: string } {
  if (cached && typeof cached.display === "string") return cached;
  if (typeof document === "undefined") {
    // SSR safety: never called during render, but don't crash if imported.
    return { display: "serif", sans: "sans-serif", mono: "monospace" };
  }
  const probe = (varName: string, fallback: string[]): string => {
    const el = document.createElement("span");
    el.style.position = "absolute";
    el.style.visibility = "hidden";
    el.style.fontFamily = `var(${varName})`;
    document.body.appendChild(el);
    const stack = getComputedStyle(el).fontFamily || fallback.join(", ");
    el.remove();
    return stack;
  };

  cached = {
    display: probe("--font-display", ["Fraunces", "Georgia", "serif"]),
    sans: probe("--font-sans", ["Plus Jakarta Sans", "system-ui", "sans-serif"]),
    // In this suite `--font-mono` serves the Albert Sans label voice, so the
    // card's tracked labels read with it — the accepted house voice (see the
    // Phase A port notes).
    mono: probe("--font-mono", ["Albert Sans", "ui-monospace", "monospace"]),
  };
  return cached;
}

/** Await until webfonts are ready AND the stacks have been resolved once. */
export async function ensureFontsReady(): Promise<void> {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
  getFontStacks();
}

/**
 * Test-hook only: clears the memoised stacks so a test document can re-resolve
 * them after installing its fonts.
 */
export function resetFontStackCache(): void {
  cached = null;
}
