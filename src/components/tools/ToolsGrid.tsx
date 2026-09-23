"use client";

import { useMemo, useState } from "react";

import { TransitionLink } from "@/components/TransitionLink";
import { SUITE, pad2 } from "@/lib/capytools/suite";

/**
 * The whole suite on one page, searchable.
 *
 * Derived from `SUITE` like everything else, so a twelfth tool appears here
 * the day its row lands — there is no second list to keep in step.
 *
 * `line` rather than `blurb`: the catalog blurb is a sentence of marketing
 * and the note line is what the tool actually does. Someone scanning eleven
 * cards at once wants the second one.
 */

/** Everything a card shows, flattened once so the filter can read one string. */
const ROWS = SUITE.map((tool, i) => ({
  no: `Nº ${pad2(i + 1)}`,
  name: tool.name,
  href: tool.href,
  line: tool.line,
  cat: tool.cat,
  badge: tool.badge,
  // Everything the tool is, in one haystack, so the caller never has to know
  // which field carried the word. `keywords` is what makes this a search
  // rather than a prefix match on the name: the prose fields never say
  // "exif", "favicon" or "tokenizer", which are exactly what people type.
  haystack: `${tool.name} ${tool.line} ${tool.blurb} ${tool.badge} ${tool.cat} ${tool.keywords.join(" ")}`.toLowerCase(),
}));

export function ToolsGrid() {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    // Every whitespace-separated term must match, so "qr code" narrows
    // rather than widening the way a naive substring test would.
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return ROWS;
    return ROWS.filter((row) => terms.every((term) => row.haystack.includes(term)));
  }, [query]);

  return (
    <>
      <div className="mt-10">
        <label htmlFor="tool-search" className="lp-label">
          Search the suite
        </label>
        <div className="relative mt-3">
          <input
            id="tool-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="try “qr”, “exif”, “tokens”, “desktop”…"
            autoComplete="off"
            className="w-full rounded-full border border-border bg-card px-5 py-3 pr-28 text-base text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <span
            className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            // Announced politely rather than on every keystroke's re-render:
            // a screen reader should hear the count settle, not each letter.
            aria-live="polite"
          >
            {shown.length} / {ROWS.length}
          </span>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
          <p>
            Nothing matches “{query.trim()}”. Try a shorter word, or clear the
            search to see all {ROWS.length}.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="min-h-11 rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:border-primary/60"
          >
            clear search
          </button>
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((tool) => (
            <li key={tool.name}>
              <TransitionLink
                href={tool.href}
                className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    {tool.no}
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {tool.cat === "desktop" ? "Desktop" : "Browser"}
                  </span>
                </span>

                <span className="mt-4 font-display text-2xl font-light text-foreground transition-colors group-hover:text-primary">
                  {tool.name}
                </span>

                <span className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tool.line}
                </span>

                <span className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                  Open →
                </span>
              </TransitionLink>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
