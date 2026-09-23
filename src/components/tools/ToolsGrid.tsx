"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

function match(query: string) {
  // Every whitespace-separated term must match, so "qr code" narrows
  // rather than widening the way a naive substring test would.
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return ROWS;
  return ROWS.filter((row) => terms.every((term) => row.haystack.includes(term)));
}

export function ToolsGrid() {
  const [query, setQuery] = useState("");
  const [announced, setAnnounced] = useState("");
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);

  const shown = useMemo(() => match(query), [query]);
  const input = useRef<HTMLInputElement>(null);

  // "/" jumps to the search from anywhere on the page, as it does on most
  // developer sites — unless the visitor is already typing somewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function search(next: string) {
    setQuery(next);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      setAnnounced(`${match(next).length} of ${ROWS.length} tools`);
    }, 700);
  }

  return (
    <>
      <div className="mt-10">
        <label htmlFor="tool-search" className="lp-label">
          Search the suite
        </label>
        <div className="relative mt-3">
          <input
            ref={input}
            id="tool-search"
            type="search"
            aria-keyshortcuts="/"
            value={query}
            onChange={(event) => search(event.target.value)}
            placeholder="try “qr”, “exif”, “tokens”…"
            autoComplete="off"
            className="w-full rounded-full border border-border bg-card px-5 py-3 pr-28 text-base text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary"
          />
          {/* The visible count updates per keystroke; the announcement waits for
              typing to pause. aria-live="polite" on the count itself still
              queued one announcement per letter. */}
          <span
            className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            aria-hidden="true"
          >
            {shown.length} / {ROWS.length}
          </span>
          <span className="sr-only" aria-live="polite">
            {announced}
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
            onClick={() => search("")}
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
                className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary/60 focus-visible:border-primary"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    {tool.no}
                  </span>
                  {/* Only the exception is labelled: ten "Browser" chips marked the
                      rule, not the one tool that breaks it. */}
                  {tool.cat === "desktop" ? (
                    <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Desktop
                    </span>
                  ) : null}
                </span>

                <h2 className="mt-4 font-display text-2xl font-light text-foreground transition-colors group-hover:text-primary">
                  {tool.name}
                </h2>

                <span className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tool.line}
                </span>
              </TransitionLink>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
