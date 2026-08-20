"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { WrappedStats } from "@/lib/github/types";
import { CardArt, CARD_WIDE } from "@/components/card/CardArt";
import type { CardFormat, CardVariant } from "@/components/card/CardArt";
import { SparklineLive } from "@/components/card/SparklineLive";

/** Share of the viewport height the preview may occupy. */
const MAX_VIEWPORT_SHARE = 0.62;
const MIN_HEIGHT = 220;
/** Frame/content resize, ms — the wide↔square morph. */
const MORPH_MS = 520;

/**
 * The card rendered at its canonical pixel size (1200×630 / 1080×1080) then
 * scaled to fit — so the on-page preview is the SAME pixels as the export/OG
 * artifact. The visible preview drifts gently and carries elevation; the
 * offscreen full-size instance (captureRef) stays bare and still for exact-size
 * html-to-image PNG downloads.
 *
 * Scale is bound by BOTH the container width and a share of the viewport
 * height: a 1:1 square at full column width is tall enough to push itself (and
 * the actions under it) off screen, so height has to be the binding constraint
 * when the format changes.
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
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const { width: artW, height: artH } = CARD_WIDE[format];

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight * MAX_VIEWPORT_SHARE);
      setScale(Math.min(width / artW, maxHeight / artH));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [artW, artH]);

  const measured = scale > 0;
  // Frame and content share one duration/easing so the card doesn't scale ahead
  // of its own border during the wide↔square morph.
  const morph = `${MORPH_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;

  return (
    <>
      <div ref={measureRef} className="w-full">
        {/* card-drift: the gentle float (globals.css) — a composited CSS
            animation, so the scaled text inside is not repainted each frame. */}
        <div className="card-drift">
          <div
            /* mx-auto: in square format the frame is narrower than the column,
               so without it the card sits left of centre. */
            className="relative mx-auto overflow-hidden rounded-[20px] shadow-[0_1px_2px_rgba(26,26,26,0.05),0_24px_70px_-28px_rgba(26,26,26,0.45)] ring-1 ring-black/[0.04] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_24px_70px_-24px_rgba(0,0,0,0.6)] dark:ring-white/[0.06]"
            style={{
              // Before measuring, hold the slot with an aspect ratio so there is
              // no layout shift on first paint.
              width: measured ? artW * scale : "100%",
              height: measured ? artH * scale : undefined,
              aspectRatio: measured ? undefined : `${artW} / ${artH}`,
              transition: `width ${morph}, height ${morph}`,
            }}
          >
            <div
              style={{
                width: artW,
                height: artH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                transition: `transform ${morph}`,
                opacity: measured ? 1 : 0,
              }}
            >
              <CardArt
                stats={stats}
                variant={variant}
                format={format}
                sparkline={(series, w, h) => (
                  <SparklineLive
                    data={series}
                    width={w}
                    height={h}
                    variant={variant}
                    guide={stats.activity.peak !== null}
                    className="h-full w-full"
                  />
                )}
              />
            </div>
          </div>
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
