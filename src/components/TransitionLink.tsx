"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * The site's internal-link seam, and nothing more — it renders Next's <Link>.
 *
 * A page wipe used to live here: the click handler called
 * `startTaggedTransition("wipe", () => router.push(href))`. That never worked
 * reliably, because a view-transition callback has to mutate the DOM
 * synchronously and the App Router renders the new route after the callback
 * returns; the implementation was dropped and the docstring was left claiming
 * otherwise, which is worse than having no transition at all.
 *
 * It is kept, rather than replaced at its 27 call sites, as the single place a
 * page transition would be reattached — and because the supported replacement
 * is not available on this project's React: React's `<ViewTransition>` plus
 * `<Link transitionTypes>` (next/dist/docs/01-app/02-guides/view-transitions.md)
 * requires the canary build, and `ViewTransition` is not exported by
 * react@19.x stable. See src/lib/capytools/reveal.ts.
 *
 * Until that dependency moves: navigation is a hard cut, deliberately, and
 * this file is a one-line seam rather than a second implementation.
 */
export function TransitionLink({ href, ...props }: ComponentProps<typeof Link>) {
  return <Link href={href} {...props} />;
}
