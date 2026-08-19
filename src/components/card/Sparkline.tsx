import { useMemo } from "react";

/**
 * Hand-rolled activity sparkline (the card's only "graphic"). Water-teal
 * stroke, faint area fill, a single clay node on the peak day. Uses
 * preserveAspectRatio="none" so it fills its container and scales like a card
 * element rather than an illustration.
 */
export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const { linePath, areaPath, endX, endY } = useMemo(() => {
    const w = 100;
    const h = 30;
    if (data.length === 0) return { linePath: "", areaPath: "", endX: 0, endY: 0 };
    const max = Math.max(1, ...data);
    const pts = data.map((v, i) => {
      const x = data.length === 1 ? 0 : (i / (data.length - 1)) * w;
      const y = h - (v / max) * (h - 3) - 1.5;
      return [x, y] as const;
    });
    const line = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
      .join(" ");
    const area = `${line} L${w},${h} L0,${h} Z`;
    const [ex, ey] = pts[pts.length - 1];
    return { linePath: line, areaPath: area, endX: ex, endY: ey };
  }, [data]);

  const flat = data.length > 0 && data.every((v) => v === 0);
  if (flat) return <div className={className} aria-label="no activity in the last 90 days" />;

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className} aria-hidden>
      <path d={areaPath} fill="var(--water)" fillOpacity="0.08" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--water)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={endX} cy={endY} r="2.2" fill="var(--clay)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
