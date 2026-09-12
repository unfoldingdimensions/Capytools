/**
 * The ICO container, written by hand because it is forty bytes of bookkeeping
 * and no dependency at all: an ICONDIR, one ICONDIRENTRY per frame, then the
 * frame payloads (PNG-encoded — PNG-in-ICO is the recommended form) back to
 * back in frame order. Everything little-endian.
 *
 * Pure and byte-exact — the golden-byte tests pin the whole layout.
 */

export interface IcoFrame {
  /** The frame's pixel size; 256 encodes as the 0 byte the format reserves. */
  size: number;
  png: Uint8Array;
}

export function buildIco(frames: IcoFrame[]): Uint8Array<ArrayBuffer> {
  const dirSize = 6 + frames.length * 16;
  const total = dirSize + frames.reduce((sum, frame) => sum + frame.png.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  // ICONDIR: reserved, type (1 = icon), count.
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, frames.length, true);

  let offset = dirSize;
  frames.forEach((frame, i) => {
    const entry = 6 + i * 16;
    out[entry] = frame.size === 256 ? 0 : frame.size;
    out[entry + 1] = frame.size === 256 ? 0 : frame.size;
    out[entry + 2] = 0; // color count — palettes are long gone
    out[entry + 3] = 0; // reserved
    view.setUint16(entry + 4, 1, true); // planes
    view.setUint16(entry + 6, 32, true); // bit count
    view.setUint32(entry + 8, frame.png.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(frame.png, offset);
    offset += frame.png.length;
  });

  return out;
}
