"use client";

import { useEffect } from "react";

/**
 * Marks `<html data-hydrated>` once React has hydrated.
 *
 * The page ships several reveals in their starting state (ScrollReveal at
 * opacity 0, headline words at blur(6px)). When hydration never happens —
 * a blocked or failed script, an extension, a dev server refusing its own
 * assets to a LAN address — nothing animates them in, and the page renders
 * blank below the fold. globals.css watches for this mark: without it, after
 * a grace period, every reveal fades in on its own. `@media (scripting: none)`
 * covers the no-JavaScript case; this covers JavaScript that ran and failed.
 */
export function HydrationMark() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "";
  }, []);
  return null;
}
