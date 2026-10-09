import { FACE_LANDMARKER, type PinnedAsset } from "./assets";

/**
 * The browser-side loader for the face landmarker's model bytes (plan §3.2:
 * self-hosted, same-origin, cached). Same posture as CapyBg's loader, cut to
 * one file: Cache Storage when it has verified bytes, a streamed fetch when
 * it doesn't, SHA-256 before trust — and only ever under /capypassport/ on
 * this origin (tests/capypassport-boundaries.test.ts holds that line).
 *
 * The wasm glue is fetched by MediaPipe itself from its version-keyed
 * directory (there is no API to hand it bytes), so those files are verified
 * at build time against the pins in assets.ts; the model — the file that
 * decides what the tool sees — is verified HERE, in the visitor's tab.
 *
 * Cache Storage is an optimisation, never a requirement: a failed write
 * (quota, private mode) degrades to downloading again next visit.
 */

const CACHE_NAME = "capypassport-v1";

export interface ByteProgress {
  received: number;
  total: number;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as ArrayBufferView<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function cacheOrNothing(): Promise<Cache | null> {
  if (typeof caches === "undefined") return Promise.resolve(null);
  return caches.open(CACHE_NAME).catch(() => null);
}

async function readCached(cache: Cache | null, asset: PinnedAsset): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!cache) return null;
  try {
    const stored = await cache.match(asset.path);
    if (!stored) return null;
    const bytes = new Uint8Array(await stored.arrayBuffer());
    return bytes.length === asset.bytes ? bytes : null;
  } catch {
    return null;
  }
}

async function fetchVerified(asset: PinnedAsset, onProgress?: (p: ByteProgress) => void): Promise<Uint8Array<ArrayBuffer>> {
  const res = await fetch(asset.path);
  if (!res.ok) throw new Error(`The face model failed to download (HTTP ${res.status})`);
  const bytes = new Uint8Array(asset.bytes);
  if (res.body) {
    const reader = res.body.getReader();
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes.set(value, received);
      received += value.length;
      onProgress?.({ received, total: asset.bytes });
    }
    if (received !== asset.bytes) throw new Error("The face model was truncated in transit");
  } else {
    const whole = new Uint8Array(await res.arrayBuffer());
    if (whole.length !== asset.bytes) throw new Error("The face model was truncated in transit");
    bytes.set(whole);
    onProgress?.({ received: bytes.length, total: asset.bytes });
  }
  const hash = await sha256Hex(bytes);
  if (hash !== asset.sha256) {
    throw new Error("The face model failed its integrity check — please try again");
  }
  return bytes;
}

/** The face landmarker's exact bytes, hash-verified. One retry on a failed
 *  integrity check, evicting the cache in between — a corrupted cache entry
 *  must look like what it is. */
export async function loadFaceModel(onProgress?: (p: ByteProgress) => void): Promise<Uint8Array<ArrayBuffer>> {
  const cache = await cacheOrNothing();
  const cached = await readCached(cache, FACE_LANDMARKER);
  if (cached) {
    const hash = await sha256Hex(cached);
    if (hash === FACE_LANDMARKER.sha256) return cached;
    // A stale or corrupted entry: fall through and re-download.
  }
  const bytes = await fetchVerified(FACE_LANDMARKER, onProgress);
  if (cache) {
    try {
      await cache.put(FACE_LANDMARKER.path, new Response(bytes, { headers: { "content-length": String(bytes.length) } }));
    } catch {
      /* the download still counts */
    }
  }
  return bytes;
}

/** The visitor's disk, offered back: same quiet escape hatch CapyBg ships. */
export async function deleteCachedModel(): Promise<void> {
  if (typeof caches === "undefined") return;
  await caches.delete(CACHE_NAME);
}
