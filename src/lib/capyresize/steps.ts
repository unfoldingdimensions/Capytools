/**
 * The size math, all pure: the progressive-halving step list, the aspect
 * locks, and the centered square crop the favicon stage crops through.
 *
 * Progressive halving is the whole quality story of Stage A — a single
 * `drawImage` across a 8× reduction blots fine lines on some engines, while
 * repeated ~50% steps stay close to the same output on every browser. The
 * list is [source → halves…] with the FINAL entry exactly the target, so the
 * renderer's last draw is the only one that lands on the output canvas.
 */

export interface Size {
  w: number;
  h: number;
}

/**
 * [src] → repeated ~50% steps while the current width is more than twice the
 * target → one final exact step. Each intermediate rounds (never below 1);
 * the last entry is exactly (outW, outH). An upscale returns a single
 * smoothing step — no halving on the way up.
 */
export function halveSteps(srcW: number, srcH: number, outW: number, outH: number): Size[] {
  if (outW > srcW) return [{ w: outW, h: outH }];

  const steps: Size[] = [];
  let w = srcW;
  let h = srcH;
  while (w > outW * 2) {
    w = Math.max(1, Math.round(w / 2));
    h = Math.max(1, Math.round(h / 2));
    steps.push({ w, h });
  }
  steps.push({ w: outW, h: outH });
  return steps;
}

/** An upscale is legal, but the reader deserves the one-line warning. */
export function isUpscale(srcW: number, outW: number): boolean {
  return outW > srcW;
}

/** Largest size within the box that keeps the aspect — never grows past 1×. */
export function fitWithin(srcW: number, srcH: number, maxW?: number, maxH?: number): Size {
  const limitW = maxW ?? srcW;
  const limitH = maxH ?? srcH;
  const scale = Math.min(1, limitW / srcW, limitH / srcH);
  return { w: Math.max(1, Math.round(srcW * scale)), h: Math.max(1, Math.round(srcH * scale)) };
}

/** Aspect-locked height for a target width; the lock the width input keeps. */
export function scaleToWidth(srcW: number, srcH: number, width: number): Size {
  const w = Math.max(1, Math.round(width));
  return { w, h: Math.max(1, Math.round((srcH * w) / srcW)) };
}

/** The centered square the favicon stage crops: size and the source offset. */
export function centerSquare(w: number, h: number): { size: number; sx: number; sy: number } {
  const size = Math.min(w, h);
  return { size, sx: Math.round((w - size) / 2), sy: Math.round((h - size) / 2) };
}
