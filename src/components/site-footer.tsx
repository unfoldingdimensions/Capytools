import Link from "next/link";

import { SUITE_WORD } from "@/lib/capytools/suite";

/**
 * The one footer, shared by the tool pages, /tools, the notes and the share page.
 *
 * It used to promise "nothing stored." on every one of them — including
 * /capyexpense, the desktop tool that exists to keep your files on your disk
 * (AGENTS.md §1: a desktop tool must never inherit "nothing stored"). The
 * line below claims only what is true on every page it renders on, desktop
 * included — "no telemetry" was considered and refused, because the Worker's
 * request logging is on. Each tool page states its storage promise in its
 * own lead.
 *
 * "more calm tools, coming soon" went with it: filler, on an eleven-tool suite.
 * Its replacement links stay on this site — shared chrome carries no external
 * links (D18; tests/tool-pages.test.tsx), so the repo lives on /notes.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-3 px-6 py-6 sm:flex-row">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          capytools — no signup. no cookies. open source.
        </p>
        <nav aria-label="Footer" className="flex gap-5 text-xs text-muted-foreground">
          <Link href="/tools" className="transition-colors hover:text-foreground">
            all {SUITE_WORD} tools
          </Link>
          <Link href="/notes" className="transition-colors hover:text-foreground">
            notes
          </Link>
        </nav>
      </div>
    </footer>
  );
}
