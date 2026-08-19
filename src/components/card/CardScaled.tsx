"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { WrappedStats } from "@/lib/github/types";
import { CardArt, CARD_WIDE } from "@/components/card/CardArt";
import type { CardFormat, CardVariant } from "@/components/card/CardArt";

/**
 * The card rendered at a fixed canonical size (1200×630 / 1080×1080) and scaled
 * down to fit its container — so the on-page preview is the SAME pixels as the
 * export/OG artifact. Also renders an offscreen full-size instance (captureRef)
 * used by html-to-image for exact-size PNG downloads.
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
      <div style={{ width: "100%" }} ref={wrapRef} />
      <div style={{ width: "100%", height: artH * scale, overflow: "hidden" }}>
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

      {/* offscreen full-size instance for exact-size capture */}
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
