/**
 * The background question (plan §3.4, §5.4) — the sharpest caveat in the
 * tool. The DEFAULT is "leave the background as shot"; this module only
 * ASKS whether the shot's background is plain and light enough, by sampling
 * the frame's corners, and phrases a calm warning when it isn't. Replacing a
 * background is an alteration several authorities forbid, so the fill itself
 * lives behind an opt-in control that carries the warning verbatim; the
 * compositing is CapyBg's people matte, not a second model.
 *
 * The classifier is deliberately conservative: a false "busy" warning annoys
 * nobody into losing a photo, but a false "plain" on a busy background would
 * reassure someone into a rejected application. Thresholds are wide.
 */

export interface BackgroundVerdict {
  /** Every corner reads as one flat tone. */
  plain: boolean;
  /** That tone is light, as "plain light-coloured" guidance asks. */
  light: boolean;
  /** The calm warning, or null when there is nothing to say. */
  note: string | null;
}

/** Per-corner patch size as a share of the frame's short side. */
const CORNER_SHARE = 0.18;
/** How far in from each edge the patch starts. */
const CORNER_INSET = 0.03;
/** A plain wall still textures; this is generous on purpose. */
const PLAIN_STDDEV = 26;
/** "Light" — white 255, a light-grey wall ~215, a pale blue ~195, a mid wall ~150. */
const LIGHT_LUMA = 172;

interface PatchStats {
  mean: number;
  stddev: number;
}

function patchStats(data: Uint8ClampedArray, w: number, h: number, x0: number, y0: number, pw: number, ph: number): PatchStats {
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = y0; y < y0 + ph && y < h; y++) {
    for (let x = x0; x < x0 + pw && x < w; x++) {
      const at = (y * w + x) * 4;
      // Rec.601 luma — good enough to tell a wall from a bookshelf.
      const luma = 0.299 * data[at] + 0.587 * data[at + 1] + 0.114 * data[at + 2];
      sum += luma;
      sumSq += luma * luma;
      count++;
    }
  }
  if (count === 0) return { mean: 0, stddev: 255 };
  const mean = sum / count;
  return { mean, stddev: Math.sqrt(Math.max(0, sumSq / count - mean * mean)) };
}

/**
 * Read the four corners of an RGBA buffer. Corners, not the centre: a
 * passport photo's centre is a face, and the backdrop is what the corners
 * see.
 */
export function checkCorners(data: Uint8ClampedArray, w: number, h: number): BackgroundVerdict {
  const short = Math.min(w, h);
  const pw = Math.max(1, Math.round(short * CORNER_SHARE));
  const ph = Math.max(1, Math.round(short * CORNER_SHARE));
  const inset = Math.round(short * CORNER_INSET);
  const corners: PatchStats[] = [
    patchStats(data, w, h, inset, inset, pw, ph),
    patchStats(data, w, h, w - inset - pw, inset, pw, ph),
    patchStats(data, w, h, inset, h - inset - ph, pw, ph),
    patchStats(data, w, h, w - inset - pw, h - inset - ph, pw, ph),
  ];

  const plain = corners.every((c) => c.stddev <= PLAIN_STDDEV);
  const darkest = Math.min(...corners.map((c) => c.mean));
  const light = darkest >= LIGHT_LUMA;

  let note: string | null = null;
  if (!plain) {
    note = "The background looks busy — the guidance asks for a plain, light-coloured backdrop behind you.";
  } else if (!light) {
    note = "The background looks plain but darker than a plain, light backdrop — a lighter wall or an opt-in fill may read better.";
  }
  return { plain, light, note };
}

/**
 * The warning the opt-in fill carries, verbatim (plan §3.4 / §6.3): filling
 * a background is computer alteration, and UK guidance says the photo must
 * be "unaltered by computer software".
 */
export const FILL_WARNING =
  "Many authorities require an unaltered photo — only fill the background if your official guidance allows it.";
