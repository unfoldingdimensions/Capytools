"use client";

import dynamic from "next/dynamic";

import { StageCard } from "@/components/stage-card";

/**
 * Loads the tokenizer widget in the browser only.
 *
 * `src/lib/capytoken/engine.ts` is browser-only by construction — the
 * js-tiktoken rank tables are dynamic-imported on the first user-triggered
 * count and are never touched during render. Server-rendering the widget
 * anyway made Next emit those ranks as SSR chunks, so the Cloudflare Worker
 * carried ~1.6 MB gzipped of tokenizer it can never execute, on top of the
 * copy the browser already loads from /_next/static. That duplicate was a
 * third of the compressed worker.
 *
 * Nothing indexable is lost: the headline, lead and copy all live in
 * ToolPageShell, which still renders on the server. Only the interactive
 * panel waits for hydration, and it has a real placeholder so the page does
 * not jump when it arrives.
 */
const CapyToken = dynamic(() => import("./CapyToken").then((m) => m.CapyToken), {
  ssr: false,
  // Mirrors the real first stage — same index, title and crop marks — so the
  // page keeps the editorial contract every tool surface is held to
  // (tests/tool-pages.test.tsx) and does not reflow when the widget arrives.
  loading: () => (
    <StageCard index="01" title="The text" marks>
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        loading the counter…
      </p>
    </StageCard>
  ),
});

export function CapyTokenClient() {
  return <CapyToken />;
}
