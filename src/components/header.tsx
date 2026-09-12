"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SUITE } from "@/lib/capytools/suite";

export type NavLink = { href: string; label: string; active?: boolean };

/**
 * The suite's tool switcher, derived from the registry so a new tool appears
 * here the moment it appears in `SUITE` — the row measures its own fit and
 * folds into the disclosure, so nothing here needs editing for tool #9 either.
 * Notes is the one non-tool destination the chrome carries.
 */
const TOOL_LINKS: NavLink[] = [
  ...SUITE.map((tool) => ({ href: tool.href, label: tool.short })),
  { href: "/notes", label: "Notes" },
];

const DEFAULT_CTA = { label: "Open the tools", href: "/#labs" };

/**
 * useLayoutEffect warns during SSR, and this component is server-rendered on
 * every page. Measuring before paint on the client and after paint on the
 * server is the standard fix and keeps the console clean.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
 * The nav row is shown while it FITS and folds into the disclosure when it
 * does not — measured, not guessed from a breakpoint. The suite is heading for
 * eight or nine tools, and a fixed `@media` threshold is a landmine: the old
 * chrome hid the landing's four links at 880px and the tool pills at 768px, so
 * the switcher was simply absent on a phone, and a fifth tool had already
 * forced one breakpoint bump. Measuring means tool #9 needs no CSS change.
 *
 * Deviations from one identical block, all deliberate:
 * - `links` — the landing navigates its own sections; every other page
 *   navigates the suite. Same type, same spacing, same hover.
 * - `brandHref` — the landing points its brand at `#top`; everywhere else it
 *   goes home.
 * - `active` — the current tool is marked with `aria-current`, the landing
 *   marks nothing.
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
  const [crowded, setCrowded] = useState(false);
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

  // Does the inline row still fit?
  //
  // `nav.scrollWidth` is the row's natural width, and it reads the same whether
  // the row is laid out inline or folded away — an absolutely-positioned
  // element still has its own content width — so one number serves both
  // states. The space it may occupy is what the brand and the right-hand
  // cluster leave over, minus the two flex gaps. The gaps come from the
  // computed style rather than a constant because the stylesheet tightens them
  // below 1280px.
  //
  // The elements are queried from the header rather than held as refs: Next's
  // App Router `Link` is a plain function component that keeps its own internal
  // ref, so `<Link ref={...}>` silently leaves the ref null — which made this
  // whole measurement a no-op the first time it was written.
  //
  // The disclosure button always holds its box (it is `visibility: hidden`, not
  // `display: none`, when unused), so the right-hand cluster's width does not
  // change when the row folds — which is what keeps this from oscillating at
  // the boundary.
  useIsomorphicLayoutEffect(() => {
    const measure = () => {
      const root = header.current;
      if (!root) return;
      const node = root.querySelector<HTMLElement>(".lp-nav-links");
      const row = root.querySelector<HTMLElement>(".lp-nav-inner");
      const mark = root.querySelector<HTMLElement>(".lp-brand");
      const tail = root.querySelector<HTMLElement>(".lp-nav-right");
      if (!node || !row || !mark || !tail) return;

      const style = window.getComputedStyle(row);
      const gap = Number.parseFloat(style.columnGap || style.gap || "0") || 0;
      // `.lp-container` carries the page gutter as padding, and clientWidth
      // includes padding — so the gutter has to come back out or the row is
      // judged against ~2x64px of space that is not there.
      const gutter =
        (Number.parseFloat(style.paddingLeft) || 0) +
        (Number.parseFloat(style.paddingRight) || 0);
      const available =
        row.clientWidth - gutter - mark.offsetWidth - tail.offsetWidth - gap * 2;
      setCrowded(node.scrollWidth > available);
    };

    measure();
    // Three ways this can be measured too early and never again: the stylesheet
    // can land after the first layout effect (dev especially), the row's own
    // box can change without the container's ever changing, and a web font can
    // re-width every label. So: one frame later, on any box change of either
    // element, and on any viewport change.
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    const root = header.current;
    if (root) {
      const row = root.querySelector(".lp-nav-inner");
      const node = root.querySelector(".lp-nav-links");
      if (row) observer.observe(row);
      if (node) observer.observe(node);
    }
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [links]);

  const isActive = (link: NavLink) =>
    link.active ?? (!!tool && tool.toLowerCase().endsWith(link.label.toLowerCase()));

  return (
    <header
      ref={header}
      className={`lp-nav${hidden ? " is-hidden" : ""}${scrolled ? " is-scrolled" : ""}${
        open ? " is-open" : ""
      }${crowded ? " is-crowded" : ""}`}
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

      {/* The same links, stacked. Closed it is `display: none`, so it leaves the
          a11y tree entirely and only one <nav> is ever exposed. */}
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
