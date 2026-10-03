/**
 * The idle state's fixture (plan §6): a hand-made subject and its cut, drawn
 * with canvas calls — no model, no download, no network. It teaches what the
 * tool does before the visitor has handed over anything: a sage capybara
 * sitting on a clay-paper field, and the same capybara on a checkerboard,
 * background gone. Deterministic, so the "demo" chip never lies about being
 * a real cut of a real photo.
 */

export const DEMO_SIZE = 320;

/** The subject, in its own coordinates. */
function capybaraPath(ctx: CanvasRenderingContext2D, s: number): void {
  const u = s / 320;
  ctx.beginPath();
  // Body: a loaf with a blunt snout.
  ctx.moveTo(60 * u, 210 * u);
  ctx.bezierCurveTo(52 * u, 150 * u, 96 * u, 112 * u, 150 * u, 110 * u);
  // Ears.
  ctx.moveTo(150 * u, 110 * u);
  ctx.lineTo(158 * u, 92 * u);
  ctx.lineTo(172 * u, 104 * u);
  ctx.lineTo(186 * u, 90 * u);
  ctx.lineTo(194 * u, 108 * u);
  // Head down the snout, then the chest and belly back to the start.
  ctx.bezierCurveTo(226 * u, 112 * u, 252 * u, 128 * u, 258 * u, 152 * u);
  ctx.bezierCurveTo(262 * u, 172 * u, 252 * u, 196 * u, 232 * u, 208 * u);
  ctx.lineTo(232 * u, 248 * u);
  ctx.lineTo(214 * u, 248 * u);
  ctx.lineTo(212 * u, 218 * u);
  ctx.bezierCurveTo(170 * u, 226 * u, 120 * u, 224 * u, 84 * u, 216 * u);
  ctx.lineTo(82 * u, 250 * u);
  ctx.lineTo(64 * u, 250 * u);
  ctx.closePath();
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
  ctx.beginPath();
  ctx.arc(232, 92, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8e9b7e";
  capybaraPath(ctx, s);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(216, 138, 4, 0, Math.PI * 2);
  ctx.fill();
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
  ctx.fillStyle = "#8e9b7e";
  capybaraPath(ctx, s);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(216, 138, 4, 0, Math.PI * 2);
  ctx.fill();
}
