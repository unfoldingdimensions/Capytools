"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { WrappedStats } from "@/lib/github/types";
import { CardArt, CARD_WIDE } from "@/components/card/CardArt";
import type { CardFormat, CardVariant } from "@/components/card/CardArt";

/**
 * The card rendered at its canonical pixel size (1200×630 / 1080×1080) then
 * scaled to fit the container — so the on-page preview is the SAME pixels as
 * the export/OG artifact. The visible preview gets elevation (shadow + rounded
 * corners + ring) so it floats off the page; the offscreen full-size instance
 * (captureRef) stays bare for exact-size html-to-image PNG downloads.
 */
export function CardScaled({
  stats,
  format = "wide",
  variant = "light",
  captureRef,
}: {
  stats: WrappedStats;
  format?: CardFormat;
  variant?: CardVariant;
  captureRef?: RefObject<HTMLDivElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const { width: artW, height: artH } = CARD_WIDE[format];

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / artW);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [artW]);

  return (
    <>
      {/* elevated on-page preview */}
      <div
        ref={wrapRef}
        className="relative w-full overflow-hidden rounded-[20px] shadow-[0_1px_2px_rgba(26,26,26,0.05),0_24px_70px_-28px_rgba(26,26,26,0.45)] ring-1 ring-black/[0.04] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_24px_70px_-24px_rgba(0,0,0,0.6)] dark:ring-white/[0.06]"
        style={{ height: artH * scale }}
      >
        <div
          style={{
            width: artW,
            height: artH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <CardArt stats={stats} variant={variant} format={format} />
        </div>
      </div>

      {/* offscreen full-size instance for exact-size capture (no elevation) */}
      <div
        style={{
          position: "fixed",
          left: -100000,
          top: 0,
          width: artW,
          height: artH,
          pointerEvents: "none",
          zIndex: -1,
        }}
        aria-hidden
      >
        <div ref={captureRef}>
          <CardArt stats={stats} variant={variant} format={format} />
        </div>
      </div>
    </>
  );
}
