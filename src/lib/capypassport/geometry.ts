/**
 * The geometry: where the head sits, what the spec asks of it, and how far
 * off a placement is. Pure — every number here is unit-tested, and the
 * exported sheet is only as honest as this module (plan §5.2, §7).
 *
 * The honesty rules this file exists for:
 * - Authorities measure CHIN → CROWN. No landmark model detects the crown
 *   (hair, headwear), so `crownYOf` ESTIMATES it and the UI labels the
 *   readout "estimated". Never a word of acceptance; at most "within the
 *   range".
 * - `flag` always returns a WORD beside its level — a colour alone is not a
 *   readout (WCAG; .agents/rules/production-invariants.md §3).
 */

import type { PhotoSpec } from "./specs";

/** The face points detection hands over — all normalized 0..1 of the image. */
export interface FaceGeometry {
  /** The bottom of the chin (mesh landmark 152). */
  chinY: number;
  /** The eye line (iris centres, or the eye corners on older models). */
  eyeY: number;
  /** The mesh's top-centre point (landmark 10) — top of the forehead, just
   *  under the hairline on a bare forehead. */
  hairlineY: number;
  /** Horizontal centre of the landmark cloud. */
  centerX: number;
  minX: number;
  maxX: number;
}

/** A crop window in SOURCE pixels. */
export interface CropWindow {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The manual fine-tune, both 0..1 with 0.5 the untouched default. */
export interface Tweak {
  /** 0 = smallest head the band allows (a little beyond), 1 = largest. */
  headT: number;
  /** 0 = crop sits higher in the frame's slack, 1 = lower. */
  marginT: number;
}

export const DEFAULT_TWEAK: Tweak = { headT: 0.5, marginT: 0.5 };

/** How far past each band edge the sliders may reach — a fine-tune must be
 *  able to leave the range, or its pass/fail readout could never change. */
const HEAD_OVERSHOOT = 0.2;
/** How much of the frame's slack the vertical slider can spend. */
const MARGIN_SWING = 0.15;
/**
 * The default rest for the crown: 30% of the frame's leftover space. Photos
 * that pass the US eye-line band ride the crown close to the top edge: that
 * band (28.6–34.9 mm above the bottom, with anatomical eyes ~45% of the head
 * below the crown) only clears with a small top margin, and a centred head
 * band would fail it on an honest face. UK/Schengen publish no eye line and
 * sit fine at 30% too.
 */
const DEFAULT_MARGIN_SHARE = 0.3;

/**
 * The crown estimate (plan §3.3 — say it out loud: this is a heuristic).
 *
 * The classic artist's canon divides the head into four equal parts — crown
 * to hairline, hairline to brow, brow to nose base, nose base to chin — so
 * the crown sits ONE PART above the mesh's top-of-forehead point, where a
 * part is a third of the hairline-to-chin distance. Hair and headwear make
 * the real crown unknowable from landmarks alone; the sliders are the
 * mitigation and the UI says "estimated".
 */
export function crownYOf(face: FaceGeometry): number {
  const crown = face.hairlineY - (face.chinY - face.hairlineY) / 3;
  return Math.max(0, Math.min(crown, face.eyeY));
}

/** Chin → crown in source pixels, through the crown estimate. */
export function headHeightPx(face: FaceGeometry, imageH: number): number {
  return (face.chinY - crownYOf(face)) * imageH;
}

/** The head size the fit aims for: mid-band by default, overshooting the
 *  band edges at the slider extremes so the flags can honestly fail. */
export function targetHeadMm(spec: PhotoSpec, headT: number): number {
  const { minMm, maxMm } = spec.head;
  const band = maxMm - minMm;
  const pad = band * HEAD_OVERSHOOT;
  return minMm - pad + (band + 2 * pad) * clamp01(headT);
}

/** The distance from the frame's top to the crown, before any clamping. */
export function targetTopMarginMm(spec: PhotoSpec, headMm: number, marginT: number): number {
  const leftover = spec.physical.hMm - headMm;
  const rest = leftover * DEFAULT_MARGIN_SHARE;
  const swing = spec.physical.hMm * MARGIN_SWING;
  return Math.max(0, rest + (clamp01(marginT) - 0.5) * 2 * swing);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export interface Fit {
  crop: CropWindow;
  /** The REALIZED numbers of this window — what the export actually shows. */
  headMm: number;
  headPct: number;
  topMarginMm: number;
  /** Eye line above the frame's bottom edge, when the eyes were detected. */
  eyeLineMm: number | null;
  /** True when the photo ran out and the window was pulled inside it — the
   *  realized numbers then differ from the targets, and the UI says so. */
  clamped: boolean;
}

/**
 * Choose the crop window (plan §5.2 `fitCrop`): spec aspect, head at the
 * target size, centred on the face, crown at the target top margin, then
 * clamped inside the photo — because a real crop may not leave the image.
 * Every readout comes from the window this returns, never from the targets.
 */
export function fitCrop(
  spec: PhotoSpec,
  face: FaceGeometry,
  imageW: number,
  imageH: number,
  tweak: Tweak = DEFAULT_TWEAK,
): Fit {
  const { wMm, hMm } = spec.physical;
  const aspect = wMm / hMm;
  const headPx = headHeightPx(face, imageH);
  const crownPx = crownYOf(face) * imageH;
  const eyePx = face.eyeY * imageH;

  const headMm = targetHeadMm(spec, tweak.headT);
  // The window height that renders the head at exactly `headMm` on a frame
  // `hMm` tall; the width follows from the spec's aspect.
  let cropH = (headPx * hMm) / headMm;
  let cropW = cropH * aspect;

  let clamped = false;
  // A photo taken too close cannot be framed outward: shrink the window (a
  // larger apparent head) until it fits, rather than cropping off-photo.
  if (cropH > imageH) {
    cropH = imageH;
    cropW = cropH * aspect;
    clamped = true;
  }
  if (cropW > imageW) {
    const shrink = imageW / cropW;
    cropH *= shrink;
    cropW = imageW;
    clamped = true;
  }

  const topMarginMm = targetTopMarginMm(spec, headMm, tweak.marginT);
  let x = face.centerX * imageW - cropW / 2;
  let y = crownPx - (topMarginMm / hMm) * cropH;

  if (x < 0) { x = 0; clamped = true; }
  if (x + cropW > imageW) { x = imageW - cropW; clamped = true; }
  if (y < 0) { y = 0; clamped = true; }
  if (y + cropH > imageH) { y = imageH - cropH; clamped = true; }
  // Never let rounding push the window past the photo.
  const w = Math.min(Math.round(cropW), imageW - Math.round(x));
  const h = Math.min(Math.round(cropH), imageH - Math.round(y));

  const realized = {
    headMm: (headPx / h) * hMm,
    headPct: headPx / h,
    topMarginMm: (crownPx - y) * (hMm / h),
    eyeLineMm: ((y + h - eyePx) / h) * hMm,
  };

  return {
    crop: { x: Math.round(x), y: Math.round(y), w, h },
    headMm: realized.headMm,
    headPct: realized.headPct,
    topMarginMm: realized.topMarginMm,
    eyeLineMm: realized.eyeLineMm,
    clamped,
  };
}

// ——— the flag, with its word ———

export type FlagLevel = "pass" | "near" | "fail";

export interface Flag {
  level: FlagLevel;
  /** The word the readout prints beside the colour — never colour alone. */
  word: string;
}

/** "Near" means within this share of the band's width past its edge — a
 *  rounded millimetre could be rounding's fault. Beyond that, plainly out. */
const NEAR_FRACTION = 0.08;

export function flag(value: number, minMm: number, maxMm: number): Flag {
  const band = maxMm - minMm;
  const near = band * NEAR_FRACTION;
  if (value >= minMm && value <= maxMm) return { level: "pass", word: "Within the range" };
  if (value > maxMm - near && value <= maxMm + near) return { level: "near", word: "A touch outside the range" };
  if (value < minMm + near && value >= minMm - near) return { level: "near", word: "A touch outside the range" };
  return { level: "fail", word: "Outside the range" };
}
