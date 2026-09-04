"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Link that wipes the incoming page up over the outgoing one, using the same
 * View Transitions plumbing as the theme spread (keyframes live in globals.css
 * under `[data-vt="wipe"]`).
 *
 * Falls back to a plain <Link> navigation when the API is missing or the reader
 * prefers reduced motion, and never intercepts modified clicks (new tab, etc.)
 * so normal browser behaviour keeps working.
 */
export function TransitionLink({
  href,
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  return <Link href={href} onClick={onClick} {...props} />;
}
