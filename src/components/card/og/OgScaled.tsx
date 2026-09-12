"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { OgCard } from "@/components/card/og/OgCard";
import type { OgAccent, OgCardData, OgTemplateId, OgVariant } from "@/lib/capyog/types";

/** Share of the viewport height the preview may occupy. */
const MAX_VIEWPORT_SHARE = 0.62;
const MIN_HEIGHT = 220;

/**
 * CardScaled's architecture, parameterized for a generator: the card renders
 * at its canonical pixel size, then scales to fit the column and a share of
 * the viewport — so what you see is exactly what exports. A second, offscreen
 * full-size instance (captureRef) is the one html-to-image captures.
 *
 * Deliberately absent next to CardScaled: the drift animation and the
 * elevation shadow (a workbench preview reads flat, and the export has no
 * shadow either), and the wide↔square morph (preset swaps resize instantly).
 */
export function OgScaled({
  data,
  template,
  accent,
  variant,
  width,
  height,
  captureRef,
}: {
  data: OgCardData;
  template: OgTemplateId;
  accent: OgAccent;
  variant: OgVariant;
  width: number;
  height: number;
  captureRef: RefObject<HTMLDivElement | null>;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => {
      const cw = el.clientWidth;
      if (cw <= 0) return;
      const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight * MAX_VIEWPORT_SHARE);
      setScale(Math.min(cw / width, maxHeight / height));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [width, height]);

  const measured = scale > 0;

  return (
    <>
      <div ref={measureRef} className="w-full">
        <div className="relative mx-auto w-fit max-w-full">
          <div
            className="relative mx-auto overflow-hidden rounded-2xl ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
            style={{
              // Hold the slot with an aspect ratio before measuring so there
              // is no layout shift on first paint.
              width: measured ? width * scale : "100%",
              height: measured ? height * scale : undefined,
              aspectRatio: measured ? undefined : `${width} / ${height}`,
            }}
          >
            <div
              style={{
                width,
                height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                opacity: measured ? 1 : 0,
              }}
            >
              <OgCard
                data={data}
                template={template}
                accent={accent}
                variant={variant}
                width={width}
                height={height}
              />
            </div>
          </div>
        </div>
      </div>

      {/* offscreen full-size instance for exact-size capture */}
      <div
        style={{
          position: "fixed",
          left: -100000,
          top: 0,
          width,
          height,
          pointerEvents: "none",
          zIndex: -1,
        }}
        aria-hidden
      >
        <div ref={captureRef}>
          <OgCard
            data={data}
            template={template}
            accent={accent}
            variant={variant}
            width={width}
            height={height}
          />
        </div>
      </div>
    </>
  );
}
