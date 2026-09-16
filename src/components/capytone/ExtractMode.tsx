"use client";

/**
 * Extract mode — the colour hub's fifth mode (Phase C, plan §7b.5).
 *
 * A URL goes to the suite's one user-URL route; only counts and hexes come
 * back. The copy is bound to what v1 actually does: static source only, so
 * colours painted by JavaScript are invisible, and the visit stores nothing.
 * Failures reuse the suite's ErrorCard with a word per reason; every swatch
 * can deep-jump into the Feel mode's "start from" flow via the visually
 * nearest curated stop (the engine's stop commands match phrases, not hexes).
 */

import { useCallback, useState } from "react";

import { StageCard } from "@/components/stage-card";
import { ErrorCard } from "@/components/tool/ErrorCard";
import type { ExtractResult } from "@/lib/capytone/extract";
import { nearestStartStop } from "@/lib/capytone/extract/rank";

import { labelClass, WellCopy } from "./controls";

type FailureKind =
  | "bad_url"
  | "scheme"
  | "port"
  | "credentials"
  | "blocked_host"
  | "dns"
  | "timed_out"
  | "too_large"
  | "not_html"
  | "upstream"
  | "too_many_redirects"
  | "network"
  | "no_colours";

const FAILURE_NOTICES: Record<FailureKind, { title: string; body: string; retry: boolean }> = {
  blocked_host: {
    title: "That address is off-limits.",
    body: "this tool reads public websites only — loopback, private and link-local addresses (127.0.0.1 and friends, up to the cloud metadata endpoint) are refused before any request is made.",
    retry: false,
  },
  bad_url: {
    title: "That doesn't look like a web address.",
    body: "a plain http(s) address is all this mode can read. check the url and try again.",
    retry: false,
  },
  scheme: {
    title: "That isn't an http(s) address.",
    body: "only http and https pages can be read here — no other schemes.",
    retry: false,
  },
  port: {
    title: "That port is out of scope.",
    body: "pages are read on their normal ports — 80 and 443 — and nowhere else.",
    retry: false,
  },
  credentials: {
    title: "That url carries credentials.",
    body: "addresses with a user:password part are refused — this tool signs in to nothing.",
    retry: false,
  },
  dns: {
    title: "That name doesn't resolve.",
    body: "no dns record answered for this host. check the spelling — or the site may be gone.",
    retry: true,
  },
  timed_out: {
    title: "The site kept us waiting.",
    body: "ten seconds passed before the page and its stylesheets finished arriving, so the visit was stopped.",
    retry: true,
  },
  too_large: {
    title: "That page is a heavyweight.",
    body: "the response crossed the 3 mb cap and was stopped mid-read. nothing was kept.",
    retry: false,
  },
  not_html: {
    title: "That isn't a web page.",
    body: "the address answered with something other than html — try the page itself, not a file, an image or an api.",
    retry: false,
  },
  upstream: {
    title: "The site said no.",
    body: "it answered with an error status, so there was nothing to read there just now.",
    retry: true,
  },
  too_many_redirects: {
    title: "Too many detours.",
    body: "this address redirects more than three hops deep, so the tool stopped following. try the page the chain lands on.",
    retry: false,
  },
  network: {
    title: "The wire went quiet.",
    body: "the connection dropped before the page finished. trying once more may just work.",
    retry: true,
  },
  no_colours: {
    title: "No colours in the source.",
    body: "the page and its stylesheets declare nothing this mode can read — sites that paint everything with javascript are invisible to it.",
    retry: false,
  },
};

type Status =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; result: ExtractResult }
  | { state: "error"; failure: FailureKind };

export function ExtractMode({ onJumpToFeel }: { onJumpToFeel: (phrase: string) => void }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const submit = useCallback(async () => {
    const raw = url.trim();
    if (raw === "") return;
    // Bare "example.com" is what people type; the server remains the gate.
    const target = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/extract-palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = (await response.json()) as ExtractResult | { error: string };
      if (!response.ok || !("palette" in data)) {
        setStatus({
          state: "error",
          failure: ("error" in data && data.error) as FailureKind,
        });
        return;
      }
      setStatus({ state: "done", result: data });
    } catch {
      setStatus({ state: "error", failure: "network" });
    }
  }, [url]);

  return (
    <>
      {/* CARD 1: THE ADDRESS */}
      <StageCard index="01" title="The address" marks>
        <p className="mt-4 text-sm text-muted-foreground">
          paste a public page — capytone reads its html, up to five stylesheets
          and its declared theme colours, and ranks what it finds. colours
          painted by javascript are invisible to this mode, and nothing about
          the visit is stored.
        </p>
        <form
          className="mt-4 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {/* the well input, per the house form voice */}
          <label htmlFor="capytone-extract-url" className={labelClass}>
            website
          </label>
          <input
            id="capytone-extract-url"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="example.com"
            disabled={status.state === "loading"}
            aria-label="website address to read colours from"
            className="min-w-0 flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <button
            type="submit"
            disabled={status.state === "loading" || url.trim() === ""}
            aria-label="Extract this page's palette"
            className="rounded-full border border-primary bg-primary/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            extract
          </button>
        </form>
      </StageCard>

      {/* CARD 2: THE PALETTE */}
      <StageCard index="02" title="The palette">
        {status.state === "idle" ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            the palette appears here — ranked by how often each colour appears
            in the page’s own source, near-duplicates merged.
          </p>
        ) : status.state === "loading" ? (
          <p className="py-8 text-center text-sm text-muted-foreground" role="status">
            fetching the page and its stylesheets — nothing is stored…
          </p>
        ) : status.state === "error" ? (
          <div className="py-4">
            <ErrorCard
              title={FAILURE_NOTICES[status.failure]?.title ?? "Something quiet went wrong."}
              body={FAILURE_NOTICES[status.failure]?.body ?? "the visit ended early."}
              onRetry={
                FAILURE_NOTICES[status.failure]?.retry ? () => void submit() : undefined
              }
            />
          </div>
        ) : (
          <PaletteResult result={status.result} onJumpToFeel={onJumpToFeel} />
        )}
      </StageCard>
    </>
  );
}

function PaletteResult({
  result,
  onJumpToFeel,
}: {
  result: ExtractResult;
  onJumpToFeel: (phrase: string) => void;
}) {
  const { palette, themeColors, stats } = result;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {palette.map((colour) => {
          const stop = nearestStartStop(colour.hex);
          return (
            <div
              key={colour.hex}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card"
            >
              <div
                aria-hidden
                className="h-16 border-b border-border/50"
                style={{ backgroundColor: colour.hex }}
              />
              <div className="flex flex-col gap-2 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-xs uppercase tracking-[0.1em] text-foreground">
                    {colour.hex}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    ×{colour.count} · {colour.source}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <WellCopy text={colour.hex} label="Copy the hex" />
                  {stop ? (
                    <button
                      type="button"
                      onClick={() => onJumpToFeel(`start from ${stop.phrase}`)}
                      aria-label={`Rebuild the palette starting from this colour, via the stop phrase “${stop.phrase}”`}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                    >
                      <span
                        aria-hidden
                        className="size-3 rounded-full border border-border"
                        style={{ backgroundColor: stop.hex }}
                      />
                      start from {stop.phrase}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {themeColors.length > 0 ? (
        <div>
          <p className={labelClass}>the page’s declared theme colours</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {themeColors.map((theme, index) => (
              <span
                key={`${theme.hex}-${theme.from}-${index}`}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                title={theme.media ?? undefined}
              >
                <span
                  aria-hidden
                  className="size-3 rounded-full border border-border"
                  style={{ backgroundColor: theme.hex }}
                />
                {theme.hex}
                {theme.media ? ` · ${theme.media}` : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        {stats.colourValues} colour values read · {stats.styleBlocks} style blocks ·{" "}
        {stats.inlineStyles} inline styles · {stats.stylesheetsFetched} of{" "}
        {stats.stylesheetsFetched + stats.stylesheetsFailed + stats.stylesheetsSkipped}{" "}
        stylesheets read
        {stats.stylesheetsFailed > 0 ? ` (${stats.stylesheetsFailed} failed` : ""}
        {stats.stylesheetsSkipped > 0
          ? `${stats.stylesheetsFailed > 0 ? ", " : " ("}${stats.stylesheetsSkipped} past the cap)`
          : stats.stylesheetsFailed > 0
            ? ")"
            : ""}{" "}
        · nothing stored
      </p>
    </div>
  );
}
