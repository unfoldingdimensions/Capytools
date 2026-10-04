import {
  validateManifest,
  type Manifest,
  type ManifestFile,
} from "./manifest";
import type { ModelId } from "./types";

/**
 * The browser-side model loader: manifest first, Cache Storage when it has
 * the bytes, sharded parallel fetch when it doesn't, SHA-256 before trust.
 *
 * The promise this module keeps: the ONLY things it ever fetches live under
 * /capybg/ on this origin (guarded by tests/capybg-boundaries.test.ts and by
 * the manifest validator, which rejects any other path). Nothing here ever
 * sees the visitor's photo.
 *
 * Cache Storage is an optimisation, never a requirement (plan R6): a failed
 * cache write — quota, private mode — degrades to downloading again next
 * time, and a corrupted entry is caught by the hash check, evicted, and
 * re-fetched once before giving up.
 */

const CACHE_NAME = "capybg-v1";
const MANIFEST_URL = "/capybg/manifest.json";

export interface ByteProgress {
  received: number;
  total: number;
}

let manifestPromise: Promise<Manifest> | null = null;

export function loadManifest(): Promise<Manifest> {
  // no-cache: revalidate every visit. The manifest's URL never changes while
  // what it names does, and browsers still hold a year-long immutable copy
  // from before public/_headers stopped sending one.
  manifestPromise ??= fetch(MANIFEST_URL, { cache: "no-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`the asset manifest could not be read (HTTP ${res.status})`);
      return res.json();
    })
    .then((json) => validateManifest(json));
  return manifestPromise;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as ArrayBufferView<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function cacheOrNothing(): Promise<Cache | null> {
  if (typeof caches === "undefined") return Promise.resolve(null);
  return caches.open(CACHE_NAME).catch(() => null);
}

/** Every part present in Cache Storage, or null the moment one is missing. */
async function readCachedParts(cache: Cache | null, file: ManifestFile): Promise<Uint8Array<ArrayBuffer>[] | null> {
  if (!cache) return null;
  const parts: Uint8Array<ArrayBuffer>[] = [];
  for (const part of file.parts ?? [file]) {
    try {
      const stored = await cache.match(part.path);
      if (!stored) return null;
      const bytes = new Uint8Array(await stored.arrayBuffer());
      if (bytes.length !== part.bytes) return null;
      parts.push(bytes);
    } catch {
      return null;
    }
  }
  return parts;
}

async function fetchAllParts(
  file: ManifestFile,
  onProgress?: (progress: ByteProgress) => void,
): Promise<Uint8Array<ArrayBuffer>[]> {
  const parts = file.parts ?? [file];
  const total = file.bytes;
  let received = 0;
  const report = () => onProgress?.({ received, total });

  return Promise.all(
    parts.map(async (part) => {
      const res = await fetch(part.path);
      if (!res.ok) throw new Error(`a model file failed to download (HTTP ${res.status})`);
      const bytes = new Uint8Array(part.bytes);
      if (res.body) {
        const reader = res.body.getReader();
        let offset = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes.set(value, offset);
          offset += value.length;
          received += value.length;
          report();
        }
        if (offset !== part.bytes) throw new Error("a model file was truncated in transit");
      } else {
        const whole = new Uint8Array(await res.arrayBuffer());
        if (whole.length !== part.bytes) throw new Error("a model file was truncated in transit");
        bytes.set(whole);
        received += part.bytes;
        report();
      }
      return bytes;
    }),
  );
}

/**
 * Fetch (or read from cache) one manifest file, reassembled and verified.
 * A hash mismatch evicts the cache entries and retries the download once —
 * a truncated cache entry must look like what it is, an error.
 */
export async function loadFile(
  file: ManifestFile,
  onProgress?: (progress: ByteProgress) => void,
): Promise<Uint8Array> {
  const cache = await cacheOrNothing();

  for (let attempt = 0; ; attempt++) {
    const cached = await readCachedParts(cache, file);
    const parts = cached ?? (await fetchAllParts(file, onProgress));
    if (!cached && cache) {
      // A failed cache write is not an error: the tool works, it just
      // downloads again next time (quota, private mode).
      try {
        await Promise.all(
          (file.parts ?? [file]).map((part, i) =>
            cache.put(part.path, new Response(parts[i], { headers: { "content-length": String(part.bytes) } })),
          ),
        );
      } catch {
        /* the download still counts */
      }
    }

    const whole = concat(parts);
    const hash = await sha256Hex(whole);
    if (hash === file.sha256) return whole;

    if (cache) {
      try {
        await Promise.all((file.parts ?? [file]).map((part) => cache.delete(part.path)));
      } catch {
        /* re-fetching anyway */
      }
    }
    if (attempt > 0) {
      throw new Error("the model download failed its integrity check twice — please try again");
    }
    onProgress?.({ received: 0, total: file.bytes });
  }
}

function concat(parts: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** The model's exact bytes, transferable and verified. */
export async function loadModel(
  id: ModelId,
  onProgress?: (progress: ByteProgress) => void,
): Promise<Uint8Array> {
  const manifest = await loadManifest();
  const file = manifest.models[id];
  if (!file) throw new Error(`the ${id} model is missing from the asset manifest`);
  return loadFile(file, onProgress);
}

/** The onnxruntime binary a backend loads (asyncify for WebGPU, plain for WASM). */
export async function loadOrtBinary(
  fileName: string,
  onProgress?: (progress: ByteProgress) => void,
): Promise<Uint8Array> {
  const manifest = await loadManifest();
  const file = manifest.ort.files[fileName];
  if (!file) throw new Error(`${fileName} is missing from the asset manifest`);
  return loadFile(file, onProgress);
}

/**
 * The quiet escape hatch under the download button: "remove downloaded
 * models". It is the visitor's disk; the link says what it does and this
 * does it. The next cut re-downloads from this site.
 */
export async function deleteCachedModels(): Promise<void> {
  if (typeof caches === "undefined") return;
  await caches.delete(CACHE_NAME);
}
