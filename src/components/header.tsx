"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export type NavLink = { href: string; label: string; active?: boolean };

/**
 * The suite's tool switcher, shared by every page. Notes is the last entry
 * because it is the one non-tool destination the chrome carries — it used to
 * be an icon button on the tool pages and a text link on the landing, which
 * was another way the two headers drifted apart.
 */
const TOOL_LINKS: NavLink[] = [
  { href: "/capywrapped", label: "Wrapped" },
  { href: "/capyimagine", label: "Imagine" },
  { href: "/capycreator", label: "Creator" },
  { href: "/capystrip", label: "Strip" },
  { href: "/capyexpense", label: "Expense" },
  { href: "/notes", label: "Notes" },
];

const DEFAULT_CTA = { label: "Open the tools", href: "/#labs" };

/**
 * ONE masthead for the whole site — landing, tool pages and the meta pages.
 *
 * The tool pages used to run a second header (`max-w-4xl`, capybara mark, no
 * CTA) against the landing's editorial masthead (`.lp-container`, circle-C
 * mark, black pill CTA). The two sat ~50px apart horizontally at the same
 * viewport, so clicking from the landing into a tool made the logo and the
 * theme toggle jump sideways and dropped the CTA. Both now render this
 * component, on the landing's `.lp-container`, so the chrome stays put.
 *
 * Deviations from one identical block, all deliberate:
 * - `links` — the landing navigates its own sections; every other page
 *   navigates the suite. Same type, same spacing, same hover.
 * - `brandHref` — the landing points its brand at `#top`; everywhere else it
 *   goes home.
 * - `active` — the current tool is marked with `aria-current`, the landing
 *   marks nothing.
 *
 * The nav collapses into a disclosure below 1180px rather than dropping out
 * entirely: the old tool header hid five pills at `md` and the landing hid its
 * four links at 880, which left the tool switcher simply absent on a phone.
 * A disclosure carries any number of tools, which is the point with three or
 * four more on the way.
 */
export function Header({
  tool,
  links = TOOL_LINKS,
  cta = DEFAULT_CTA,
  brandHref = "/",
}: {
  /** Names the current tool beside the wordmark; omit it on the landing. */
  tool?: string;
  /** Nav entries. Defaults to the suite switcher. */
  links?: NavLink[];
  /** The persistent action, identical on every page. `null` hides it. */
  cta?: { label: string; href: string } | null;
  brandHref?: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  const header = useRef<HTMLElement>(null);

  // Headroom: hide on the way down, re-pin on the way up, always visible near
  // the top. Was the landing's behaviour alone; the tool pages now share it so
  // the chrome moves the same way everywhere.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      let nextHidden = false;
      if (y <= 100) {
        nextHidden = false;
      } else if (delta > 6) {
        nextHidden = true;
      } else if (delta < -6) {
        nextHidden = false;
      }
      lastY.current = y;
      setHidden(nextHidden);
      setScrolled(y > 8);
      // A hidden bar has `pointer-events: none`, so an open panel inside it
      // would be unclickable — close it on the way out.
      if (nextHidden) setOpen(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes; a pointer anywhere outside closes. Both are the minimum a
  // disclosure owes a keyboard user.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const isActive = (link: NavLink) =>
    link.active ?? (!!tool && tool.toLowerCase().endsWith(link.label.toLowerCase()));

  return (
    <header
      ref={header}
      className={`lp-nav${hidden ? " is-hidden" : ""}${scrolled ? " is-scrolled" : ""}${
        open ? " is-open" : ""
      }`}
    >
      <div className="lp-container lp-nav-inner">
        <Link className="lp-brand" href={brandHref} aria-label="Capytools — home">
          <BrandMark />
          {/* One baseline-aligned text group so the smaller tool name sits on
              the wordmark's baseline rather than 1.2px above it; the mark
              stays centred on the block. */}
          <span className="lp-brand-text">
            Capytools
            {tool && <span className="lp-brand-tool">· {tool}</span>}
          </span>
        </Link>

        <nav className="lp-nav-links" aria-label="Tools">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link) ? "is-active" : undefined}
              aria-current={isActive(link) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="lp-nav-right">
          <ThemeToggle />
          {cta ? (
            <Link className="lp-nav-cta" href={cta.href}>
              {cta.label}
            </Link>
          ) : null}
          <button
            type="button"
            className="lp-nav-toggle"
            aria-expanded={open}
            aria-controls="site-nav-menu"
            aria-label={open ? "Close the tools menu" : "Open the tools menu"}
            onClick={() => setOpen((was) => !was)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* The same links, stacked, below the breakpoint where the row would
          overflow. Closed it is `display: none`, so it leaves the a11y tree
          entirely and only one <nav> is ever exposed. */}
      <div id="site-nav-menu" className={`lp-nav-menu${open ? " is-open" : ""}`}>
        <nav className="lp-container" aria-label="Tools menu">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link) ? "is-active" : undefined}
              aria-current={isActive(link) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {cta ? (
            <Link
              href={cta.href}
              className="lp-nav-menu-cta"
              onClick={() => setOpen(false)}
            >
              {cta.label}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
