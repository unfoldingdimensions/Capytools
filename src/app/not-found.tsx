import type { Metadata } from "next";
import { CapyArt } from "@/components/mascot/CapyArt";
import { PageShell } from "@/components/page-shell";
import { TransitionLink } from "@/components/TransitionLink";
import { SUITE_WORD } from "@/lib/capytools/suite";

export const metadata: Metadata = {
  title: "Nothing here — Capytools",
  description: "That page does not exist. The tools are one click away.",
};

/**
 * The 404.
 *
 * There was none, so a mistyped URL fell through to Next's stock error page —
 * black Helvetica on white, no masthead, no way back. This is the suite's own
 * chrome and a link home, which is the whole job.
 *
 * `surprise` rather than `awake`: a wrong address is a small shock, and the
 * same pose already carries every other failure in the suite (ErrorCard).
 */
export default function NotFound() {
  return (
    <PageShell>
      <span className="lp-label">Error · 404</span>

      <CapyArt pose="surprise" className="mt-10 w-32" alt="A startled capybara" />

      <h1 className="lp-display mt-8 text-5xl sm:text-6xl">
        Nothing <em>here</em>
        <span className="lp-dot">.</span>
      </h1>
      <p className="lp-lead mt-6 max-w-[42ch]">
        That address does not point at anything. Nothing broke and nothing was
        lost — the {SUITE_WORD} tools are one click away.
      </p>

      <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3">
        <TransitionLink href="/" className="lp-read-more">
          ← Back to the landing
        </TransitionLink>
        <TransitionLink href="/#labs" className="lp-read-more">
          Explore our tools
        </TransitionLink>
        <TransitionLink href="/notes" className="lp-read-more">
          Project notes
        </TransitionLink>
      </div>
    </PageShell>
  );
}
