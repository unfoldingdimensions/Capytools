"use client";

import { useRef, useState } from "react";
import type { WrappedStats } from "@/lib/github/types";
import { useIsDark } from "@/lib/capytools/use-is-dark";
import { CardScaled } from "@/components/card/CardScaled";
import { CARD_WIDE } from "@/components/card/CardArt";
import type { CardFormat, CardVariant } from "@/components/card/CardArt";
import {
  exportNodePng,
  copyPost,
  postToX,
  prefersNativeShare,
  shareIntents,
} from "@/lib/card/export";
import type { PostResult } from "@/lib/card/export";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
        "px-4 py-3 text-xs font-semibold transition-colors sm:px-3 sm:py-1.5",
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
  const [posted, setPosted] = useState<PostResult | "idle">("idle");
  const captureRef = useRef<HTMLDivElement | null>(null);

  const variant: CardVariant = useIsDark() ? "dark" : "light";
  const intents = shareIntents(stats.username);

  const download = () => {
    if (captureRef.current)
      void exportNodePng(captureRef.current, {
        ...CARD_WIDE[format],
        filename: `wrapped-${stats.username}.png`,
      });
  };

  /**
   * X cannot accept an image through an intent URL, so try the OS share sheet
   * first (a genuine attachment) and otherwise put the PNG on the clipboard and
   * open the composer for a single paste. The window is opened synchronously
   * here — a popup opened after an await gets blocked.
   */
  const doPost = () => {
    // Decide the route BEFORE any await: opening the composer is only right for
    // the clipboard route, and a popup opened after an await gets blocked.
    const composer = prefersNativeShare()
      ? null
      : window.open(intents.x, "_blank", "noopener,noreferrer");
    void postToX(captureRef.current, stats, intents.url, CARD_WIDE[format]).then((result) => {
      if (result === "shared") composer?.close(); // share sheet handled it
      setPosted(result);
      setTimeout(() => setPosted("idle"), 4000);
    });
  };

  const doCopy = () => {
    void copyPost(captureRef.current, stats, intents.url, CARD_WIDE[format]).then((r) => {
      setCopied(r.ok && r.withImage ? "post" : "text");
      setTimeout(() => setCopied("idle"), 2200);
    });
  };

  return (
    <div className="w-full">
      <CardScaled stats={stats} format={format} variant={variant} captureRef={captureRef} />

      {/* mt-10 clears the card's 70px drop shadow — at mt-5 the buttons sat inside it. */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        <div className="flex overflow-hidden rounded-full border border-border">
          <PillToggle active={format === "wide"} onClick={() => setFormat("wide")}>
            Wide
          </PillToggle>
          <PillToggle active={format === "square"} onClick={() => setFormat("square")}>
            Square
          </PillToggle>
        </div>

        <Button variant="outline" className="h-10 rounded-full sm:h-8 px-4 text-xs" onClick={download}>
          Download PNG
        </Button>

        <Button
          variant="outline"
          onClick={doPost}
          aria-label="Post to X with the card image"
          className="h-10 gap-1.5 rounded-full sm:h-8 px-3 text-xs"
        >
          <XLogo className="h-3.5 w-3.5" />
          <span>Post</span>
        </Button>

        <Button variant="outline" className="h-10 rounded-full sm:h-8 px-4 text-xs" onClick={doCopy}>
          {copied === "post" ? "Card copied!" : copied === "text" ? "Text copied" : "Copy post"}
        </Button>
      </div>

      {/* Says what actually happened, because "clipboard" needs one paste. */}
      <p
        aria-live="polite"
        className="mt-3 min-h-4 text-center text-xs text-muted-foreground"
      >
        {posted === "clipboard" && "Card image copied — press Ctrl/⌘+V in the post to attach it."}
        {posted === "text" && "Caption copied. Your browser blocked the image copy."}
      </p>
    </div>
  );
}
