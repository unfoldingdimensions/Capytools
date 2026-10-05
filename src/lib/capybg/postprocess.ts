/**
 * The matte's way back to pixels, pure so node can table-test it.
 *
 * Model output → alpha, in four steps, each its own function:
 * 1. `matteFromModelOutput` — sigmoid for the logit models (BiRefNet), a
 *    plain clamp for the ones that already emit [0, 1] (MODNet).
 * 2. `resizeMatte` — bilinear back up to the source size.
 * 3. `featherMatte` — a small box blur so the edge isn't knife-sharp;
 *    radius 0 is the identity.
 * 4. `applyMatte` — writes channel 3 and NOTHING else.
 */

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Model output → matte values in [0, 1]. */
export function matteFromModelOutput(output: Float32Array, needsSigmoid: boolean): Float32Array {
  const matte = new Float32Array(output.length);
  for (let i = 0; i < output.length; i++) {
    const v = output[i];
    matte[i] = needsSigmoid ? sigmoid(v) : v < 0 ? 0 : v > 1 ? 1 : v;
  }
  return matte;
}

/** Bilinear resize of a single-channel matte, edges clamped. */
export function resizeMatte(matte: Float32Array, w: number, h: number, outW: number, outH: number): Float32Array {
  if (w === outW && h === outH) return matte.slice();
  const out = new Float32Array(outW * outH);
  const xRatio = w / outW;
  const yRatio = h / outH;
  for (let y = 0; y < outH; y++) {
    const sy = Math.min(Math.max((y + 0.5) * yRatio - 0.5, 0), h - 1);
    const y0 = Math.floor(sy);
    const y1 = Math.min(h - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < outW; x++) {
      const sx = Math.min(Math.max((x + 0.5) * xRatio - 0.5, 0), w - 1);
      const x0 = Math.floor(sx);
      const x1 = Math.min(w - 1, x0 + 1);
      const fx = sx - x0;
      const top = matte[y0 * w + x0] * (1 - fx) + matte[y0 * w + x1] * fx;
      const bottom = matte[y1 * w + x0] * (1 - fx) + matte[y1 * w + x1] * fx;
      out[y * outW + x] = top * (1 - fy) + bottom * fy;
    }
  }
  return out;
}

/**
 * Radius-`radius` box blur, separable. Runs on the MODEL-SIZED matte (the
 * big one is recomposed per render), so even radius 3 is cheap.
 */
export function featherMatte(matte: Float32Array, w: number, h: number, radius: number): Float32Array {
  if (radius <= 0) return matte.slice();
  const r = Math.min(Math.round(radius), 3);
  const horizontal = new Float32Array(matte.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let d = -r; d <= r; d++) {
        const xx = Math.min(w - 1, Math.max(0, x + d));
        sum += matte[y * w + xx];
        count++;
      }
      horizontal[y * w + x] = sum / count;
    }
  }
  const out = new Float32Array(matte.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let d = -r; d <= r; d++) {
        const yy = Math.min(h - 1, Math.max(0, y + d));
        sum += horizontal[yy * w + x];
        count++;
      }
      out[y * w + x] = sum / count;
    }
  }
  return out;
}

/** Write the matte into the alpha channel; RGB is the photo's business. */
export function applyMatte(rgba: Uint8ClampedArray, matte: Float32Array): void {
  const pixels = rgba.length >> 2;
  if (matte.length < pixels) throw new Error("matte smaller than the image");
  for (let i = 0; i < pixels; i++) {
    rgba[(i << 2) + 3] = Math.round(Math.min(1, Math.max(0, matte[i])) * 255);
  }
}

/** Square max (grow) or min (shrink) filter of radius `r`, separable. */
function morph(mask: Float32Array, w: number, h: number, r: number, grow: boolean): Float32Array {
  const pick = grow ? Math.max : Math.min;
  const pass = (src: Float32Array, horizontal: boolean): Float32Array => {
    const out = new Float32Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = src[y * w + x];
        for (let d = -r; d <= r; d++) {
          const xx = horizontal ? Math.min(w - 1, Math.max(0, x + d)) : x;
          const yy = horizontal ? y : Math.min(h - 1, Math.max(0, y + d));
          v = pick(v, src[yy * w + xx]);
        }
        out[y * w + x] = v;
      }
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

/** The pieces of MODNet's matte (> 0.5, 4-connected) that overlap `sure`. */
function touchingPieces(people: Float32Array, sure: Float32Array, w: number, h: number): Float32Array {
  const keep = new Float32Array(people.length);
  const stack = new Int32Array(people.length);
  for (let seed = 0; seed < people.length; seed++) {
    if (!sure[seed] || people[seed] <= 0.5 || keep[seed]) continue;
    let top = 0;
    stack[top++] = seed;
    keep[seed] = 1;
    while (top > 0) {
      const p = stack[--top];
      const x = p % w;
      const neighbours = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p + w < w * h ? p + w : -1];
      for (const q of neighbours) {
        if (q >= 0 && !keep[q] && people[q] > 0.5) {
          keep[q] = 1;
          stack[top++] = q;
        }
      }
    }
  }
  return keep;
}

/**
 * Group mode: the helper (U²-Net human seg) decides WHO is in the photo, the
 * people model (MODNet) draws the edges. Both mattes are w×h, in [0, 1].
 * - MODNet survives where it is CONNECTED to a person the helper is sure of,
 *   or where the helper sees even a faint person (> 0.03). A pallu hangs from
 *   the shoulder, so it survives whole even where the helper scores it 0; a
 *   threshold gate alone cut it off (owner's photo, 2026-10-04 — and the helper
 *   scores that fabric 0.09 in the browser against 0.17 in Python, so any
 *   threshold near it is a coin toss). Pieces touching nobody still drop.
 * - Inside the helper's sure core (helper > 0.5, shrunk by ~2%), the person is
 *   opaque even where MODNet lost them — a black saree on a black backdrop.
 * Measured on all five owner photos, not chosen by eye.
 */
export function fuseMattes(people: Float32Array, helper: Float32Array, w: number, h: number): Float32Array {
  const r = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  const sure = new Float32Array(helper.length);
  for (let i = 0; i < helper.length; i++) sure[i] = helper[i] > 0.5 ? 1 : 0;
  const keep = touchingPieces(people, sure, w, h);
  for (let i = 0; i < helper.length; i++) if (helper[i] > 0.03) keep[i] = 1;
  const region = morph(keep, w, h, r, true);
  const core = featherMatte(morph(sure, w, h, r, false), w, h, 3);
  const out = new Float32Array(people.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(people[i] * region[i], core[i]);
  return out;
}

/** Radius-`r` box blur of a single channel, edge-clamped, via running sums. */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let d = -r; d <= r; d++) sum += src[row + Math.min(w - 1, Math.max(0, d))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / n;
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let d = -r; d <= r; d++) sum += tmp[Math.min(h - 1, Math.max(0, d)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / n;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** One blur-fusion pass: blurred foreground/background colour fields, and the
 *  refined foreground they imply (Forte & Pitié 2021, "Approximate Fast
 *  Foreground Colour Estimation"). Channels are planar, values in [0, 1]. */
function fusionPass(
  image: Float32Array[],
  fg: Float32Array[],
  bg: Float32Array[],
  alpha: Float32Array,
  w: number,
  h: number,
  r: number,
): { fg: Float32Array[]; blurredFg: Float32Array[]; blurredBg: Float32Array[] } {
  const bA = boxBlur(alpha, w, h, r);
  const next: Float32Array[] = [];
  const blurredFg: Float32Array[] = [];
  const blurredBg: Float32Array[] = [];
  for (let c = 0; c < 3; c++) {
    const fa = new Float32Array(alpha.length);
    const b1a = new Float32Array(alpha.length);
    for (let i = 0; i < alpha.length; i++) {
      fa[i] = fg[c][i] * alpha[i];
      b1a[i] = bg[c][i] * (1 - alpha[i]);
    }
    const bF = boxBlur(fa, w, h, r);
    const bB = boxBlur(b1a, w, h, r);
    const f = new Float32Array(alpha.length);
    for (let i = 0; i < alpha.length; i++) {
      bF[i] /= bA[i] + 1e-5;
      bB[i] /= 1 - bA[i] + 1e-5;
      const a = alpha[i];
      f[i] = Math.min(1, Math.max(0, bF[i] + a * (image[c][i] - a * bF[i] - (1 - a) * bB[i])));
    }
    next.push(f);
    blurredFg.push(bF);
    blurredBg.push(bB);
  }
  return { fg: next, blurredFg, blurredBg };
}

/**
 * Edge-colour cleanup. A soft-edged pixel (hair, a sheer dupatta) is part
 * subject, part backdrop, and keeps the backdrop's colour — a purple fringe in
 * the hair against a purple stage (owner's photo, 2026-10-04). This replaces
 * each partly transparent pixel's RGB with its estimated FOREGROUND colour.
 *
 * Blur-fusion, two passes (radius 45 then 3). The blurs run on a copy whose
 * long side is ≤ 1024 — the fields are smooth by construction — and only the
 * per-pixel formula runs at full resolution, on edge pixels only, so a
 * 24-megapixel photo costs about what a 1-megapixel one does. Writes RGB of
 * pixels with 0.01 < alpha < 0.99; alpha and every other pixel are untouched.
 * Measured on the owner's photo: blue cast in the hair-edge band 0.115 → 0.031.
 */
export function decontaminateEdges(rgba: Uint8ClampedArray, alpha: Float32Array, w: number, h: number): void {
  const k = Math.min(1, 1024 / Math.max(w, h));
  const lw = Math.max(1, Math.round(w * k));
  const lh = Math.max(1, Math.round(h * k));
  // Area-average down to lw×lh.
  const image = [new Float32Array(lw * lh), new Float32Array(lw * lh), new Float32Array(lw * lh)];
  const a = new Float32Array(lw * lh);
  for (let ly = 0; ly < lh; ly++) {
    const y0 = Math.floor((ly * h) / lh);
    const y1 = Math.max(y0 + 1, Math.floor(((ly + 1) * h) / lh));
    for (let lx = 0; lx < lw; lx++) {
      const x0 = Math.floor((lx * w) / lw);
      const x1 = Math.max(x0 + 1, Math.floor(((lx + 1) * w) / lw));
      let r = 0, g = 0, b = 0, al = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * w + x;
          r += rgba[i * 4];
          g += rgba[i * 4 + 1];
          b += rgba[i * 4 + 2];
          al += alpha[i];
        }
      }
      const n = (y1 - y0) * (x1 - x0);
      const j = ly * lw + lx;
      image[0][j] = r / n / 255;
      image[1][j] = g / n / 255;
      image[2][j] = b / n / 255;
      a[j] = al / n;
    }
  }
  const first = fusionPass(image, image, image, a, lw, lh, 45);
  const { blurredFg, blurredBg } = fusionPass(image, first.fg, first.blurredBg, a, lw, lh, 3);

  // Full resolution, edge pixels only: bilinear-sample the fields, apply the formula.
  const sx = lw / w;
  const sy = lh / h;
  for (let y = 0; y < h; y++) {
    const fy = Math.min(lh - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(lh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const al = alpha[i];
      if (al <= 0.01 || al >= 0.99) continue;
      const fx = Math.min(lw - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(lw - 1, x0 + 1);
      const tx = fx - x0;
      const p00 = y0 * lw + x0, p01 = y0 * lw + x1, p10 = y1 * lw + x0, p11 = y1 * lw + x1;
      for (let c = 0; c < 3; c++) {
        const lerp = (f: Float32Array) =>
          (f[p00] * (1 - tx) + f[p01] * tx) * (1 - ty) + (f[p10] * (1 - tx) + f[p11] * tx) * ty;
        const bF = lerp(blurredFg[c]);
        const bB = lerp(blurredBg[c]);
        const px = rgba[i * 4 + c] / 255;
        const f = bF + al * (px - al * bF - (1 - al) * bB);
        rgba[i * 4 + c] = Math.round(Math.min(1, Math.max(0, f)) * 255);
      }
    }
  }
}

/**
 * Matte cleanup, every model, at model size (owner compared against
 * remove.bg, 2026-10-05: ours left milky half-transparent haze around people
 * and stray specks away from them).
 * - Levels: alpha below 0.15 becomes 0, above 0.85 becomes 1, linear between —
 *   the model's unsure haze clears, the subject goes solid, the edge band keeps
 *   its anti-aliasing (and sheer fabric at ~0.6 stays ~0.64).
 * - Islands: solid pieces (> 0.5, 4-connected) smaller than 2% of the largest
 *   are dropped, with their soft rims (kept pieces' rims are grown back ~1%).
 * Measured on the owner's family photo, detailed model: the share of pixels in
 * 0.02–0.5 ("haze") fell from 6.45% to 0.73%.
 */
export function cleanMatte(matte: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(matte.length);
  for (let i = 0; i < matte.length; i++) out[i] = Math.min(1, Math.max(0, (matte[i] - 0.15) / 0.7));

  // Label solid pieces; remember each one's size.
  const label = new Int32Array(out.length);
  const sizes: number[] = [0];
  const stack = new Int32Array(out.length);
  for (let seed = 0; seed < out.length; seed++) {
    if (out[seed] <= 0.5 || label[seed]) continue;
    const id = sizes.length;
    let size = 0;
    let top = 0;
    stack[top++] = seed;
    label[seed] = id;
    while (top > 0) {
      const p = stack[--top];
      size++;
      const x = p % w;
      const neighbours = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p + w < w * h ? p + w : -1];
      for (const q of neighbours) {
        if (q >= 0 && !label[q] && out[q] > 0.5) {
          label[q] = id;
          stack[top++] = q;
        }
      }
    }
    sizes.push(size);
  }
  if (sizes.length <= 2) return out; // nothing, or one piece — no specks to drop
  const largest = Math.max(...sizes);
  const keep = new Float32Array(out.length);
  for (let i = 0; i < out.length; i++) keep[i] = label[i] && sizes[label[i]] >= 0.02 * largest ? 1 : 0;
  const near = morph(keep, w, h, Math.max(2, Math.round(Math.min(w, h) * 0.01)), true);
  for (let i = 0; i < out.length; i++) out[i] *= near[i];
  return out;
}

/**
 * ISNet + the people model. ISNet (the detailed fallback) kept the owner's
 * mother's sheer pallu (1.0) but dropped their son's dark trousers (0.02);
 * MODNet had the trousers (0.98) and only part of the pallu. So keep ISNet's
 * cut and add back MODNet's pieces (> 0.5, 4-connected) that touch ISNet's
 * subject (> 0.5), grown ~2% for their soft rims. A logo stays pure ISNet —
 * MODNet finds nothing there to attach. Both mattes are w×h, in [0, 1].
 */
export function attachPeople(detailed: Float32Array, people: Float32Array, w: number, h: number): Float32Array {
  const sure = new Float32Array(detailed.length);
  for (let i = 0; i < detailed.length; i++) sure[i] = detailed[i] > 0.5 ? 1 : 0;
  const attached = morph(touchingPieces(people, sure, w, h), w, h, Math.max(2, Math.round(Math.min(w, h) * 0.02)), true);
  const out = new Float32Array(detailed.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(detailed[i], people[i] * attached[i]);
  return out;
}

/**
 * The trimap ViTMatte refines from: 1 where the cut is sure of the subject,
 * 0 where it is sure of the backdrop, 0.5 in the band between (each sure side
 * shrunk by ~0.8% of the short side, so the model gets room to decide).
 */
export function trimapFrom(matte: Float32Array, w: number, h: number): Float32Array {
  const r = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  const fg = new Float32Array(matte.length);
  const bg = new Float32Array(matte.length);
  for (let i = 0; i < matte.length; i++) {
    fg[i] = matte[i] > 0.95 ? 1 : 0;
    bg[i] = matte[i] < 0.05 ? 1 : 0;
  }
  const sureFg = morph(fg, w, h, r, false);
  const sureBg = morph(bg, w, h, r, false);
  const out = new Float32Array(matte.length);
  for (let i = 0; i < out.length; i++) out[i] = sureFg[i] ? 1 : sureBg[i] ? 0 : 0.5;
  return out;
}

/** Origins of `tile`-sized windows overlapping by at least `overlap`, covering `total`. */
export function tileStarts(total: number, tile: number, overlap: number): number[] {
  if (total <= tile) return [0];
  const n = Math.ceil((total - overlap) / (tile - overlap));
  return Array.from({ length: n }, (_, k) => Math.round((k * (total - tile)) / (n - 1)));
}
