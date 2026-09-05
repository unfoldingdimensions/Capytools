"use client";

import { useCallback, useState } from "react";

/**
 * True pixel width of a chart slot, for the 1:1 viewBox every chart draws at.
 *
 * A ref callback plus ResizeObserver rather than a layout effect: the repo's
 * lint bans setState in an effect body, and observing from a callback ref means
 * the element cannot be null when we subscribe. React 19 calls the returned
 * cleanup when the ref detaches.
 *
 * It deliberately does NOT start at 0. The marketing page server-renders these
 * charts, and a zero-width first paint would flash an empty card before
 * hydration; 720 is a plausible desktop slot, so the chart paints correctly
 * shaped and then snaps to its real size.
 */
export const FALLBACK_W = 720;

export function useMeasuredWidth(): [(el: HTMLElement | null) => void, number] {
  const [width, setWidth] = useState(FALLBACK_W);

  const ref = useCallback((el: HTMLElement | null) => {
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next && next > 0) setWidth(Math.round(next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
