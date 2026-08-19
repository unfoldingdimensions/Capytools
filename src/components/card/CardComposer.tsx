"use client";

import { useRef, useState } from "react";
import type { WrappedStats } from "@/lib/github/types";
import { useIsDark } from "@/lib/capytools/use-is-dark";
import { CardScaled } from "@/components/card/CardScaled";
import type { CardFormat, CardVariant } from "@/components/card/CardArt";
import { exportNodePng, copyPost, shareIntents } from "@/lib/card/export";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

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
 * The live share surface: the card (variant follows the app theme, live
 * animated sparkline) plus the format picker and download / X / LinkedIn /
 * copy-post actions. Copy-post writes BOTH the PNG and caption to the clipboard
 * so a paste is ready to post.
 */
export function CardComposer({ stats }: { stats: WrappedStats }) {
  const [format, setFormat] = useState<CardFormat>("wide");
  const [copied, setCopied] = useState<"idle" | "text" | "post">("idle");
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

  const doCopy = () => {
    if (format !== "wide") return; // clipboard image copy uses the current capture node
    void copyPost(captureRef.current, stats, intents.url, { width: 1200, height: 630 }).then(
      (r) => {
        setCopied(r.ok && r.withImage ? "post" : "text");
        setTimeout(() => setCopied("idle"), 2200);
      },
    );
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
          aria-label="Share on X"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <XLogo className="h-3.5 w-3.5" />
          <span>post</span>
        </a>
        <a
          href={intents.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <LinkedInLogo className="h-3.5 w-3.5" />
          <span>post</span>
        </a>

        <Button variant="outline" className="h-8 rounded-full px-4 text-xs" onClick={doCopy}>
          {copied === "post" ? "card copied!" : copied === "text" ? "text copied" : "copy post"}
        </Button>
      </div>
    </div>
  );
}
