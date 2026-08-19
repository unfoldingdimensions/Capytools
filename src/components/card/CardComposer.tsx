"use client";

import { useRef, useState } from "react";
import type { WrappedStats } from "@/lib/github/types";
import { useIsDark } from "@/lib/capytools/use-is-dark";
import { CardScaled } from "@/components/card/CardScaled";
import type { CardFormat, CardVariant } from "@/components/card/CardArt";
import { exportNodePng, copyText, shareIntents, shareLine } from "@/lib/card/export";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PillToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The live share surface: the card plus the format picker and the download /
 * copy-post / X / LinkedIn actions. The card variant follows the app theme, so
 * the header theme toggle switches the preview too. Captures the canonical
 * full-size CardArt (bare, no elevation) for exact-size PNGs.
 */
export function CardComposer({ stats }: { stats: WrappedStats }) {
  const [format, setFormat] = useState<CardFormat>("wide");
  const [copied, setCopied] = useState(false);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const variant: CardVariant = useIsDark() ? "dark" : "light";
  const intents = shareIntents(stats.username);

  const download = () => {
    if (captureRef.current)
      void exportNodePng(captureRef.current, {
        width: format === "wide" ? 1200 : 1080,
        height: format === "wide" ? 630 : 1080,
        filename: `wrapped-${stats.username}.png`,
      });
  };

  return (
    <div className="w-full">
      <CardScaled stats={stats} format={format} variant={variant} captureRef={captureRef} />

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <div className="flex overflow-hidden rounded-full border border-border">
          <PillToggle active={format === "wide"} onClick={() => setFormat("wide")}>
            wide
          </PillToggle>
          <PillToggle active={format === "square"} onClick={() => setFormat("square")}>
            square
          </PillToggle>
        </div>

        <Button variant="outline" className="h-8 rounded-full px-4 text-xs" onClick={download}>
          download png
        </Button>

        <a
          href={intents.x}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center rounded-full border border-border px-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          share · x
        </a>
        <a
          href={intents.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center rounded-full border border-border px-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          share · linkedin
        </a>

        <Button
          variant="outline"
          className="h-8 rounded-full px-4 text-xs"
          onClick={() => {
            void (async () => {
              const ok = await copyText(shareLine(stats, intents.url));
              if (ok) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            })();
          }}
        >
          {copied ? "copied!" : "copy post"}
        </Button>
      </div>
    </div>
  );
}
