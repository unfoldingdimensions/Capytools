"use client";

import { useEffect } from "react";

import "@/components/landing/landing.css";
import { AmbientBackground } from "@/components/AmbientBackground";
import { CapyArt } from "@/components/mascot/CapyArt";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { TransitionLink } from "@/components/TransitionLink";
import { Button } from "@/components/ui/button";

/**
 * The route error boundary — an UNEXPECTED throw, not a handled failure.
 *
 * `ErrorCard` already covers the failures a tool knows how to have: a bad
 * username, a refused URL, an image that will not decode. This is the other
 * kind, where a render threw and the page cannot be produced at all. Without
 * this file Next serves its stock screen: black Helvetica on white, no
 * masthead, no way back — and in production it hides the message too, so the
 * visitor gets neither an explanation nor navigation.
 *
 * It must be a client component and it must carry the chrome itself: the root
 * layout renders ThemeProvider and children, and every page brings its own
 * Header and footer.
 *
 * `digest` is the only identifying thing React exposes in production — the
 * message is deliberately stripped — so it is shown, quietly, for anyone
 * reporting the fault.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Cloudflare's observability captures this; nothing else is logged about
    // the visitor, and the message never leaves their own console otherwise.
    console.error(error);
  }, [error]);

  return (
    <div className="lp flex min-h-dvh flex-col text-foreground">
      <a className="lp-skip-link" href="#main">
        Skip to content
      </a>

      <AmbientBackground />
      <Header />

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-16">
        <span className="lp-label">Error · Something threw</span>

        <CapyArt pose="surprise" className="mt-10 w-32" alt="A startled capybara" />

        <h1 className="lp-display mt-8 text-5xl sm:text-6xl">
          That did not <em>work</em>
          <span className="lp-dot">.</span>
        </h1>
        <p className="lp-lead mt-6 max-w-[46ch]">
          Something broke while this page was being built. Nothing you typed or
          dropped was sent anywhere — the tools run in your browser, and a
          failure here cannot change that. Trying again often settles it.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button onClick={reset} className="rounded-full">
            try again
          </Button>
          <TransitionLink href="/" className="lp-read-more">
            ← Back to the landing
          </TransitionLink>
        </div>

        {error.digest ? (
          <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            reference {error.digest}
          </p>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
