import type { TextMark } from "./types";

/**
 * The idle state's fixture, same contract as CapyBg's demo: drawn with canvas
 * calls — no network, no asset fetch — deterministic, and labelled "demo" in
 * the UI so it never poses as a real photo. A dusk landscape with a gold sun:
 * busy enough to show why the halo exists, calm enough to be the house.
 */

export const DEMO_WIDTH = 960;
export const DEMO_HEIGHT = 720;

export const DEMO_SPEC: TextMark = {
  kind: "text",
  text: "capytools",
  font: "house-sans",
  weight: 700,
  colour: "#ffffff",
  size: 0.12,
  opacity: 0.9,
  rotation: 0,
  anchor: "br",
  offset: { x: 0, y: 0 },
  tiling: "none",
  gap: 0.5,
  letterSpacing: 0.04,
  halo: "shadow",
};

/** A dusk sky, a gold sun, two sage hills — the "photo" the demo stamps. */
export function drawDemoPhoto(canvas: HTMLCanvasElement): void {
  canvas.width = DEMO_WIDTH;
  canvas.height = DEMO_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const sky = ctx.createLinearGradient(0, 0, 0, DEMO_HEIGHT);
  sky.addColorStop(0, "#3d4a5c");
  sky.addColorStop(0.55, "#c07952");
  sky.addColorStop(0.75, "#d9a441");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, DEMO_WIDTH, DEMO_HEIGHT);

  ctx.fillStyle = "#f0d9a8";
  ctx.beginPath();
  ctx.arc(DEMO_WIDTH * 0.68, DEMO_HEIGHT * 0.55, DEMO_HEIGHT * 0.11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5f7a72";
  ctx.beginPath();
  ctx.moveTo(0, DEMO_HEIGHT * 0.72);
  ctx.quadraticCurveTo(DEMO_WIDTH * 0.3, DEMO_HEIGHT * 0.52, DEMO_WIDTH * 0.62, DEMO_HEIGHT * 0.74);
  ctx.lineTo(DEMO_WIDTH * 0.62, DEMO_HEIGHT);
  ctx.lineTo(0, DEMO_HEIGHT);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#4a6741";
  ctx.beginPath();
  ctx.moveTo(DEMO_WIDTH * 0.42, DEMO_HEIGHT);
  ctx.quadraticCurveTo(DEMO_WIDTH * 0.78, DEMO_HEIGHT * 0.62, DEMO_WIDTH, DEMO_HEIGHT * 0.78);
  ctx.lineTo(DEMO_WIDTH, DEMO_HEIGHT);
  ctx.closePath();
  ctx.fill();
}
