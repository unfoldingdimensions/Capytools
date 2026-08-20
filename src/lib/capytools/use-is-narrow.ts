"use client";

import { useSyncExternalStore } from "react";

/** Tailwind's `sm` breakpoint, so JS and the CSS variants agree. */
const NARROW = "(max-width: 639.98px)";

/**
 * Whether the viewport is narrower than Tailwind's `sm`.
 *
 * Built on useSyncExternalStore, like useIsDark, so the value is read through
 * React rather than during render — reading window.innerWidth inline would
 * differ between the server and the client and break hydration.
 * `getServerSnapshot` returns false, so SSR renders the desktop layout and a
 * phone corrects itself on hydration.
 */
const subscribe = (callback: () => void) => {
  const mql = window.matchMedia(NARROW);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};

const getSnapshot = () => window.matchMedia(NARROW).matches;

const getServerSnapshot = () => false;

export function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
