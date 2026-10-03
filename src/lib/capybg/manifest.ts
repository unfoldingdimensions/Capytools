/**
 * The manifest of everything CapyBg ever downloads, plus a pure validator for
 * it. `scripts/fetch-capybg-assets.ts` writes `public/capybg/manifest.json`
 * at build time; the browser loader fetches it first and trusts nothing past
 * what this validator accepts.
 *
 * Why validate at all: the manifest is the loader's only description of what
 * the bytes should be. A part over Cloudflare's 25 MiB per-asset cap would
 * 404 in production but work in dev; a shard list whose lengths don't sum to
 * the file's length would reassemble a truncated model; a missing hash would
 * let a corrupted Cache Storage entry pass verification. All three are build
 * mistakes, so all three are rejected here, loudly, before they can ship.
 */

import type { ModelId } from "./types";

export const MANIFEST_VERSION = 1 as const;

/**
 * Cloudflare Workers refuses static assets over 25 MiB. The fetch script
 * shards at 24 MiB; the validator enforces the hard cap itself so a future
 * shard-size bump cannot silently cross it.
 */
export const MAX_ASSET_BYTES = 25 * 1024 * 1024;

export interface ManifestPart {
  /** Public URL path, e.g. `/capybg/models/d39b897c/birefnet.onnx.part0`. */
  path: string;
  bytes: number;
  sha256: string;
}

export interface ManifestFile {
  /** Public URL path of the whole file (served directly when unsharded). */
  path: string;
  bytes: number;
  sha256: string;
  /** Present only when the file exceeds the shard threshold. */
  parts?: ManifestPart[];
}

export interface Manifest {
  version: typeof MANIFEST_VERSION;
  ort: { version: string; files: Record<string, ManifestFile> };
  models: Partial<Record<ModelId, ManifestFile>>;
}

export class ManifestError extends Error {
  constructor(reason: string) {
    super(`invalid capybg manifest: ${reason}`);
    this.name = "ManifestError";
  }
}

const SHA256_RE = /^[0-9a-f]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkFile(file: unknown, where: string): ManifestFile {
  if (!isRecord(file)) throw new ManifestError(`${where} is not an object`);
  const { path, bytes, sha256, parts } = file;
  if (typeof path !== "string" || !path.startsWith("/capybg/")) {
    throw new ManifestError(`${where}.path must be a same-origin /capybg/ path`);
  }
  if (path.includes("..") || path.includes("\\")) {
    throw new ManifestError(`${where}.path must be a plain /capybg/ path`);
  }
  if (typeof bytes !== "number" || !Number.isInteger(bytes) || bytes <= 0) {
    throw new ManifestError(`${where}.bytes must be a positive integer`);
  }
  if (typeof sha256 !== "string" || !SHA256_RE.test(sha256)) {
    throw new ManifestError(`${where}.sha256 must be a 64-char lowercase hex digest`);
  }
  if (parts === undefined) {
    // Unsharded: the whole file itself must fit Cloudflare's cap.
    if (bytes > MAX_ASSET_BYTES) {
      throw new ManifestError(`${where} is ${bytes} B, over the ${MAX_ASSET_BYTES} B asset cap, and has no parts`);
    }
    return { path, bytes, sha256 };
  }
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new ManifestError(`${where}.parts must be a non-empty array when present`);
  }
  let total = 0;
  const checked: ManifestPart[] = parts.map((part, i) => {
    const label = `${where}.parts[${i}]`;
    if (!isRecord(part)) throw new ManifestError(`${label} is not an object`);
    const { path: partPath, bytes: partBytes, sha256: partSha } = part;
    if (typeof partPath !== "string" || !partPath.startsWith("/capybg/") || partPath.includes("..") || partPath.includes("\\")) {
      throw new ManifestError(`${label}.path must be a plain /capybg/ path`);
    }
    if (typeof partBytes !== "number" || !Number.isInteger(partBytes) || partBytes <= 0) {
      throw new ManifestError(`${label}.bytes must be a positive integer`);
    }
    if (partBytes > MAX_ASSET_BYTES) {
      throw new ManifestError(`${label} is ${partBytes} B, over the ${MAX_ASSET_BYTES} B asset cap`);
    }
    if (typeof partSha !== "string" || !SHA256_RE.test(partSha)) {
      throw new ManifestError(`${label}.sha256 must be a 64-char lowercase hex digest`);
    }
    total += partBytes;
    return { path: partPath, bytes: partBytes, sha256: partSha };
  });
  if (total !== bytes) {
    throw new ManifestError(`${where} parts sum to ${total} B but the file is ${bytes} B`);
  }
  return { path, bytes, sha256, parts: checked };
}

/** Parse and validate a decoded manifest, or throw `ManifestError`. */
export function validateManifest(input: unknown): Manifest {
  if (!isRecord(input)) throw new ManifestError("not an object");
  if (input.version !== MANIFEST_VERSION) {
    throw new ManifestError(`version must be ${MANIFEST_VERSION}, got ${String(input.version)}`);
  }
  if (!isRecord(input.ort)) throw new ManifestError("ort is not an object");
  const { version: ortVersion, files: ortFiles } = input.ort;
  if (typeof ortVersion !== "string" || ortVersion.length === 0) {
    throw new ManifestError("ort.version must be a non-empty string");
  }
  if (!isRecord(ortFiles)) throw new ManifestError("ort.files is not an object");
  const files: Record<string, ManifestFile> = {};
  for (const [name, file] of Object.entries(ortFiles)) {
    files[name] = checkFile(file, `ort.files["${name}"]`);
  }
  if (!isRecord(input.models)) throw new ManifestError("models is not an object");
  const models: Manifest["models"] = {};
  for (const [id, file] of Object.entries(input.models)) {
    models[id as ModelId] = checkFile(file, `models["${id}"]`);
  }
  return { version: MANIFEST_VERSION, ort: { version: ortVersion, files }, models };
}
