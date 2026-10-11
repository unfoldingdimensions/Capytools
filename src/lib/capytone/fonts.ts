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

/**
 * Await until the exact faces the cards draw with are loaded. Canvas text
 * never triggers @font-face loads on its own, so `document.fonts.ready`
 * alone can resolve before Fraunces or Albert Sans were ever fetched (it
 * settles when *pending* loads finish — of which a canvas-only page has
 * none) and the card silently paints fallbacks. Asking for each face first
 * makes `ready` meaningful. Best-effort: a refused load falls through to
 * whatever the browser has, which is what the ready-only path did.
 */
export async function ensureFontsReady(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) {
    getFontStacks();
    return;
  }
  const stacks = getFontStacks();
  // The weights match the card renderers: 300 serif display (editorial's
  // hero), 500 mono (every tracked label), 700 bold sans (minimal's hero).
  const probes = [
    `300 16px ${stacks.display}`,
    `500 16px ${stacks.mono}`,
    `700 16px ${stacks.sans}`,
  ];
  try {
    await Promise.all(probes.map((p) => document.fonts.load(p, "CapyTone")));
  } catch {
    // Font availability is a nicety; the fallback face is drawn honestly.
  }
  await document.fonts.ready;
}

/**
 * Test-hook only: clears the memoised stacks so a test document can re-resolve
 * them after installing its fonts.
 */
export function resetFontStackCache(): void {
  cached = null;
}
