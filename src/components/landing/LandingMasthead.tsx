"use client";

import { Header } from "@/components/header";
import type { NavLink } from "@/components/header";

/**
 * Superseded. The landing used to ship its own masthead while the tool pages
 * shipped a second, differently-sized one — the source of the logo/toggle jump
 * between the landing and a tool. `Landing` now renders the shared `<Header>`
 * directly, so nothing imports this file.
 *
 * It is kept only as a passthrough so the repo cannot drift back to two header
 * implementations; it can be deleted outright with the next approval.
 */
const LINKS: NavLink[] = [
  { href: "#labs", label: "Suite" },
  { href: "#method", label: "Method" },
  { href: "#work", label: "Work" },
  { href: "/notes", label: "Notes" },
];

export function LandingMasthead() {
  return (
    <Header
      links={LINKS}
      cta={{ label: "Open the tools", href: "#labs" }}
      brandHref="#top"
    />
  );
}
