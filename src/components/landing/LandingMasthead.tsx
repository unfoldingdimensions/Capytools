"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { TransitionLink } from "@/components/TransitionLink";

const LINKS = [
  { label: "Suite", href: "#labs" },
  { label: "Method", href: "#method" },
  { label: "Work", href: "#work" },
  { label: "Notes", href: "/notes" },
];

/**
 * The landing's own masthead (tool pages keep the shared Header): brand mark,
 * section anchors, project notes, theme toggle, and a headroom
 * hide-on-scroll — hides on the way down, re-pins on the way up, always
 * visible near the top. Everything routes natively.
 */
export function LandingMasthead() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (y <= 100) {
        setHidden(false);
      } else if (delta > 6) {
        setHidden(true);
      } else if (delta < -6) {
        setHidden(false);
      }
      lastY.current = y;
      setScrolled(y > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`lp-nav${hidden ? " is-hidden" : ""}${scrolled ? " is-scrolled" : ""}`}
    >
      <div className="lp-container lp-nav-inner">
        <a className="lp-brand" href="#top" aria-label="Capytools — back to top">
          <span className="lp-brand-mark" aria-hidden="true">
            C
          </span>
          <span>Capytools</span>
        </a>

        <nav className="lp-nav-links" aria-label="Landing sections">
          {LINKS.map((link) =>
            link.href.startsWith("#") ? (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ) : (
              <TransitionLink key={link.href} href={link.href}>
                {link.label}
              </TransitionLink>
            ),
          )}
        </nav>

        <div className="lp-nav-right">
          <ThemeToggle />
          <TransitionLink href="/capywrapped" className="lp-nav-cta">
            Open the tools
          </TransitionLink>
        </div>
      </div>
    </header>
  );
}
