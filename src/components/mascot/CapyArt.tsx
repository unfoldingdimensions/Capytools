import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The finished capybara illustrations.
 *
 * These are NOT `CAPY_POSE` art. That file wants layered paths in a 120×80
 * box so `CapyScene` can rotate a head about a pivot and cross-fade eyes;
 * these are flat, full-colour, single-layer drawings traced from the brand
 * references. The two are different things and both are worth having — this
 * one is the character as it is meant to look, `CapyScene` is the rig.
 *
 * Served from `public/`, not inlined, deliberately: at ~9–11 KiB gzip each
 * they would be a third of a tool page's JS if they rode the bundle, and as
 * static files only the pose actually rendered is ever fetched, cached on its
 * own, and never re-parsed by the client.
 *
 * They carry their own colours and so do NOT theme with `currentColor` the way
 * `CapyMark` does. All three share one viewBox, so swapping pose keeps the
 * animal registered in place instead of jumping.
 */
export type CapyPoseArt = "awake" | "asleep" | "surprise";

/** Intrinsic ratio of the shared viewBox (520 420 1010 1200). */
const W = 1010;
const H = 1200;

export function CapyArt({
  pose = "awake",
  className,
  alt = "",
  priority = false,
}: {
  pose?: CapyPoseArt;
  className?: string;
  /** Empty by default: the capy is decoration beside copy that already speaks. */
  alt?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={`/mascot/capy-${pose}.svg`}
      width={W}
      height={H}
      alt={alt}
      aria-hidden={alt === "" ? true : undefined}
      priority={priority}
      className={cn("h-auto", className)}
    />
  );
}
