"use client";

import { useRef, useState } from "react";
import type { WrappedStats } from "@/lib/github/types";
import { CardScaled } from "@/components/card/CardScaled";
import type { CardFormat, CardVariant } from "@/components/card/CardArt";
import { exportNodePng, copyText, shareLine } from "@/lib/card/export";
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
 * The live share surface: the card plus the format / theme pickers and the
 * download / copy-post actions. Captures the canonical full-size CardArt.
 */
export function CardComposer({ stats }: { stats: WrappedStats }) {
  const [format, setFormat] = useState<CardFormat>("wide");
  const [variant, setVariant] = useState<CardVariant>("light");
  const [copied, setCopied] = useState(false);
  const captureRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="w-full">
      <CardScaled stats={stats} format={format} variant={variant} captureRef={captureRef} />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {/* format */}
        <div className="flex overflow-hidden rounded-full border border-border">
          <PillToggle active={format === "wide"} onClick={() => setFormat("wide")}>
            wide
          </PillToggle>
          <PillToggle active={format === "square"} onClick={() => setFormat("square")}>
            square
          </PillToggle>
        </div>
        {/* theme */}
        <div className="flex overflow-hidden rounded-full border border-border">
          <PillToggle active={variant === "light"} onClick={() => setVariant("light")}>
            light
          </PillToggle>
          <PillToggle active={variant === "dark"} onClick={() => setVariant("dark")}>
            dark
          </PillToggle>
        </div>

        <Button
          variant="outline"
          className="h-8 rounded-full px-4 text-xs"
          onClick={() => {
            if (captureRef.current)
              void exportNodePng(captureRef.current, {
                width: format === "wide" ? 1200 : 1080,
                height: format === "wide" ? 630 : 1080,
                filename: `wrapped-${stats.username}.png`,
              });
          }}
        >
          download png
        </Button>
        <Button
          variant="outline"
          className="h-8 rounded-full px-4 text-xs"
          onClick={() => {
            void (async () => {
              const ok = await copyText(shareLine(stats, `/u/${stats.username}`));
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
