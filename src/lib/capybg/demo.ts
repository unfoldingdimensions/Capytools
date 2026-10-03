/**
 * The idle state's fixture (plan §6): a hand-made subject and its cut, drawn
 * with canvas calls — no model, no download, no network. It teaches what the
 * tool does before the visitor has handed over anything: a sage capybara
 * sitting on a clay-paper field, and the same capybara on a checkerboard,
 * background gone. Deterministic, so the "demo" chip never lies about being
 * a real cut of a real photo.
 *
 * The silhouette is built from plain rounded shapes, not bezier art: the
 * first bezier attempt rendered as a mangled wing (the critique's P0), and a
 * loaf + blunt snout + ears + stubby legs reads as a capybara at any size.
 */

export const DEMO_SIZE = 320;

const SAGE = "#8e9b7e";
const INK = "#1a1a1a";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** The subject: loaf body, blunt snout, two ears, four stubby legs, one eye. */
function capybara(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = SAGE;
  roundRect(ctx, 58, 118, 184, 114, 46); // body
  roundRect(ctx, 208, 136, 66, 56, 22); // snout
  circle(ctx, 212, 114, 13); // left ear
  circle(ctx, 240, 110, 13); // right ear
  ctx.fillRect(92, 224, 20, 42); // hind leg
  ctx.fillRect(128, 228, 18, 38); // hind leg
  ctx.fillRect(194, 228, 18, 38); // front leg
  ctx.fillRect(220, 224, 20, 42); // front leg
  ctx.fillStyle = INK;
  circle(ctx, 238, 156, 5); // eye
}

/** The photo: subject on a warm field, one gold disc behind. */
export function drawDemoSource(canvas: HTMLCanvasElement): void {
  const s = DEMO_SIZE;
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#c07952";
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = "#d9a441";
  circle(ctx, 252, 84, 42);
  capybara(ctx);
}

/** The cut: the same subject on the checkerboard, everything else gone. */
export function drawDemoCut(canvas: HTMLCanvasElement): void {
  const s = DEMO_SIZE;
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const tile = s / 8;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#e7e4dd" : "#f9f9f7";
      ctx.fillRect(x * tile, y * tile, tile, tile);
    }
  }
  capybara(ctx);
}
