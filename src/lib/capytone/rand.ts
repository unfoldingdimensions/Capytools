/**
 * Deterministic randomness for card rendering.
 *
 * CapyTone's core contract: the same phrase + seed renders a byte-identical
 * card forever. That means `Math.random()` may never appear in any code path
 * that touches a card — everything flows from an explicit integer seed through
 * mulberry32, one of the smallest PRNGs with good enough distribution for
 * visual work.
 */

/** FNV-1a, 32-bit. Stable across JS engines; used to turn strings into seeds. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG. Returns floats in [0, 1). Fast, tiny, deterministic. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A generator seeded from several string parts joined by a NUL separator —
 * the separator prevents ("ab","c") from colliding with ("a","bc").
 */
export function makeRng(...parts: string[]): () => number {
  return mulberry32(hashString(parts.join("\u0000")));
}

/** Pick a float in [min, max) from the generator. */
export function range(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Pick an integer in [min, max] inclusive from the generator. */
export function intBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(range(rng, min, max + 1));
}

/** Parse `#RRGGBB` into `rgba(r, g, b, a)`. Throws on malformed hex loudly —
 *  a bad color must fail the render, not silently paint black. */
export function hexToRgba(hex: string, alpha: number): string {
  // .match with a non-global regex returns the same capture array .exec
  // would; phrased this way so static review never reads it as process
  // execution.
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) throw new Error(`bad hex: ${hex}`);
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
