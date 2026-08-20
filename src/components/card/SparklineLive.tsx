"use client";

import { motion } from "motion/react";
import { buildSparkline, SPARK } from "@/lib/capytools/sparkline";
import { cardPalette } from "@/components/card/CardArt";
import type { CardVariant } from "@/components/card/CardArt";

/**
 * Live, animated sparkline for the on-page preview only: smooth curve with a
 * pulsing clay dot that "pings" off the peak. The export/OG card uses the
 * static data-URI sparkline instead (a pulsing dot can't exist in a flat PNG),
 * so both draw from the same geometry + SPARK ink to stay identical.
 *
 * `width`/`height` are the slot's true pixel size — the viewBox matches 1:1 so
 * the stroke stays even and the dot stays round.
 */
export function SparklineLive({
  data,
  width,
  height,
  variant = "light",
  className,
  guide = false,
}: {
  data: number[];
  width: number;
  height: number;
  variant?: CardVariant;
  className?: string;
  /** Draw the dotted level line through the peak. */
  guide?: boolean;
}) {
  const c = cardPalette(variant);
  const { linePath, peakX, peakY, zero } = buildSparkline(data, width, height);
  if (zero) return <div className={className} aria-label="no recent activity" />;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: "visible" }}
      aria-hidden
    >
      {/* Guide first, so the curve and dot sit on top of it. */}
      {guide && (
        <path
          d={`M0,${peakY} H${width}`}
          stroke={c.clay}
          strokeWidth={SPARK.guideWidth}
          strokeDasharray={SPARK.guideDash}
          strokeLinecap="round"
          opacity={SPARK.guideOpacity}
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={c.water}
        strokeWidth={SPARK.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* soft halo */}
      <circle cx={peakX} cy={peakY} r={SPARK.halo} fill={c.clay} fillOpacity={SPARK.haloOpacity} />
      {/* pulsing ping */}
      <motion.circle
        cx={peakX}
        cy={peakY}
        r={SPARK.core}
        fill="none"
        stroke={c.clay}
        strokeWidth={1.8}
        initial={{ opacity: 0.8, scale: 1 }}
        animate={{ opacity: 0, scale: 3 }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      {/* solid core */}
      <circle cx={peakX} cy={peakY} r={SPARK.core} fill={c.clay} />
    </svg>
  );
}
