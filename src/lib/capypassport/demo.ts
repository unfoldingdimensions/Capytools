import { fitCrop, type FaceGeometry, type Fit } from "./geometry";
import { DEFAULT_SPEC, type PhotoSpec } from "./specs";

/**
 * The idle state (plan §6.2): a drawn "photo" — no asset, no model load, no
 * detection — that teaches the tool's readout by flowing through the REAL
 * geometry engine. The demo face below is the same data structure detection
 * produces, so the idle card shows honest numbers for an honest drawing.
 */

/** The demo photo's dimensions (a 3:4 portrait, like a phone shot). */
export const DEMO_IMAGE = { w: 900, h: 1200 };

/**
 * The drawn face, normalized. The drawing below paints: hairline at y 430,
 * eyes at 531 (45% of the head below the drawn crown — where faces actually
 * sit), chin at 810, head spanning x 300–600 — so the demo's readouts are
 * the numbers an honest portrait produces.
 */
export const DEMO_FACE: FaceGeometry = {
  chinY: 810 / DEMO_IMAGE.h,
  eyeY: 531 / DEMO_IMAGE.h,
  hairlineY: 430 / DEMO_IMAGE.h,
  centerX: 0.5,
  minX: 300 / DEMO_IMAGE.w,
  maxX: 600 / DEMO_IMAGE.w,
};

/** The demo fit, through the same engine a real photo goes through. */
export function demoFit(spec: PhotoSpec = DEFAULT_SPEC): Fit {
  return fitCrop(spec, DEMO_FACE, DEMO_IMAGE.w, DEMO_IMAGE.h);
}

/**
 * Paint the demo "photo": a calm still of a head-and-shoulders silhouette.
 * House tones only — sage planes, a warm clay ground line, cream sky — and
 * obviously a drawing, never a fake photograph of a person.
 */
export function drawDemoPhoto(canvas: HTMLCanvasElement): void {
  const w = DEMO_IMAGE.w;
  const h = DEMO_IMAGE.h;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // The backdrop: a plain light wall with the faintest vertical drift.
  const wall = ctx.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, "#efeee7");
  wall.addColorStop(1, "#e3e1d6");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, h);

  // Shoulders — a calm mound, not a person.
  ctx.fillStyle = "#8e9b7e";
  ctx.beginPath();
  ctx.moveTo(140, h);
  ctx.bezierCurveTo(170, 1000, 320, 950, 450, 950);
  ctx.bezierCurveTo(580, 950, 730, 1000, 760, h);
  ctx.closePath();
  ctx.fill();

  // Neck.
  ctx.fillStyle = "#c2b2a3";
  ctx.fillRect(395, 790, 110, 170);

  // Head: an ellipse from crown (drawn at y≈310) to chin (810).
  ctx.fillStyle = "#c9a68b";
  ctx.beginPath();
  ctx.ellipse(450, 560, 150, 250, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair: the drawn crown the estimate is judged against.
  ctx.fillStyle = "#4a4238";
  ctx.beginPath();
  ctx.ellipse(450, 430, 158, 130, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(292, 430, 316, 26);

  // Eyes, at the eye line the readout reports (45% of the head below the
  // drawn crown — where faces actually sit).
  ctx.fillStyle = "#3d372f";
  for (const ex of [395, 505]) {
    ctx.beginPath();
    ctx.ellipse(ex, 531, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The ground line the silhouette sits on.
  ctx.fillStyle = "#c07952";
  ctx.fillRect(0, h - 14, w, 14);
}
