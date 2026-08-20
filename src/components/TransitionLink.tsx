"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { startTaggedTransition } from "@/lib/capytools/reveal";

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
  const router = useRouter();

  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    const modified =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (event.defaultPrevented || modified) return;

    event.preventDefault();
    void startTaggedTransition("wipe", () => {
      router.push(String(href));
    });
  };

  return <Link href={href} onClick={handle} {...props} />;
}
