"use client";

import { motion } from "motion/react";
import { buildSparkline } from "@/lib/capytools/sparkline";
import { cardPalette } from "@/components/card/CardArt";
import type { CardVariant } from "@/components/card/CardArt";

/**
 * Live, animated sparkline for the on-page preview only: smooth curve with a
 * pulsing clay dot that "pings" off the peak. The export/OG card uses the
 * static data-URI sparkline instead (a pulsing dot can't exist in a flat PNG).
 */
export function SparklineLive({
  data,
  variant = "light",
  className,
}: {
  data: number[];
  variant?: CardVariant;
  className?: string;
}) {
  const c = cardPalette(variant);
  const { linePath, areaPath, endX, endY, zero } = buildSparkline(data, 300, 80);
  if (zero) return <div className={className} aria-label="no activity in the last 90 days" />;

  return (
    <svg viewBox="0 0 300 80" preserveAspectRatio="none" className={className} aria-hidden>
      <path d={areaPath} fill={c.water} fillOpacity="0.10" />
      <path
        d={linePath}
        fill="none"
        stroke={c.water}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* soft halo */}
      <circle cx={endX} cy={endY} r="8" fill={c.clay} fillOpacity="0.16" />
      {/* pulsing ping */}
      <motion.circle
        cx={endX}
        cy={endY}
        r={6}
        fill="none"
        stroke={c.clay}
        strokeWidth={2}
        initial={{ opacity: 0.75, scale: 1 }}
        animate={{ opacity: 0, scale: 2.6 }}
        transition={{ duration: 1.7, repeat: Infinity, ease: "easeOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      {/* solid core */}
      <circle cx={endX} cy={endY} r="4.5" fill={c.clay} />
    </svg>
  );
}
