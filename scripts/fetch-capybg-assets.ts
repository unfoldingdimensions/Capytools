/**
 * CapyBg's build-time asset pipeline (docs/plans/capybg.md §4.2).
 *
 * Downloads the two pinned models from Hugging Face, verifies byte length and
 * SHA-256 (fails the build loudly on mismatch), shards anything over 24 MiB —
 * Cloudflare refuses static assets over 25 MiB — copies onnxruntime-web's
 * wasm glue out of node_modules for the installed version, and writes
 * public/capybg/manifest.json describing every byte. Runs from `prebuild`
 * and from the CI build jobs; nothing here ever runs in a visitor's browser,
 * and /public/capybg/ is gitignored — binaries never enter git.
 *
 * `--verify-only` re-hashes every file against the manifest and exits
 * non-zero on any mismatch; it is a no-op success when the directory is
 * absent, so unit-test environments without the assets stay green.
 *
 * Local rebuilds are instant but never blind: before skipping a download the
 * on-disk bytes (whole file or reassembled parts) are hashed against the
 * pinned SHA-256, so the manifest can only ever describe verified bytes.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { MODELS, MODEL_IDS, modelUrl, sha8 } from "../src/lib/capybg/models";
import {
  MAX_ASSET_BYTES,
  MANIFEST_VERSION,
  validateManifest,
  type Manifest,
  type ManifestFile,
} from "../src/lib/capybg/manifest";
import type { ModelId } from "../src/lib/capybg/types";

/** Shard size: a safety margin under Cloudflare's 25 MiB per-asset cap. */
const SHARD_BYTES = 24 * 1024 * 1024;

/** onnxruntime-web binaries CapyBg serves, by their subpath export name.
 *  The plain pair is what the `wasm` (CPU) bundle loads; the asyncify pair is
 *  what the `webgpu` bundle loads (verified: docs/plans/capybg.md §3.2). */
const ORT_EXPORTS = [
  "./ort-wasm-simd-threaded.mjs",
  "./ort-wasm-simd-threaded.wasm",
  "./ort-wasm-simd-threaded.asyncify.mjs",
  "./ort-wasm-simd-threaded.asyncify.wasm",
] as const;

const RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 6_000];

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "public", "capybg");
const ortDir = (version: string) => join(outDir, "ort", version);
const modelDir = (sha: string) => join(outDir, "models", sha8(sha));

const sha256 = (data: Buffer | Uint8Array) => createHash("sha256").update(data).digest("hex");

function log(message: string) {
  console.log(`fetch-capybg-assets: ${message}`);
}

function fail(message: string): never {
  console.error(`fetch-capybg-assets: ${message}`);
  process.exit(1);
}

function readInstalledOrtVersion(): string {
  const pkg = JSON.parse(readFileSync(join(root, "node_modules", "onnxruntime-web", "package.json"), "utf8"));
  if (typeof pkg.version !== "string" || pkg.version.length === 0) fail("onnxruntime-web has no version");
  return pkg.version;
}

/** Resolve a subpath export (a plain string in 1.30.0) to its dist file. */
function ortExportPath(exportName: string, exports: Record<string, unknown>): string {
  const target = exports[exportName];
  if (typeof target !== "string") {
    fail(`onnxruntime-web no longer exports ${exportName} as a plain path — update ORT_EXPORTS`);
  }
  return join(root, "node_modules", "onnxruntime-web", target.replace(/^\.\//, ""));
}

async function download(url: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "capytools-build (fetch-capybg-assets)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      if (attempt >= RETRIES) throw error;
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? 6_000;
      log(`retry ${attempt}/${RETRIES - 1} after ${(error as Error).message}; waiting ${delay} ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/** Whole-or-sharded write. Returns the manifest entry describing what is on
 *  disk; parts exist only when the file needed splitting. */
function writeSharded(basePath: string, data: Buffer, publicBase: string): ManifestFile {
  const file: ManifestFile = { path: publicBase, bytes: data.length, sha256: sha256(data) };
  if (data.length <= SHARD_BYTES) {
    writeFileSync(basePath, data);
    return file;
  }
  const parts = [];
  for (let offset = 0, index = 0; offset < data.length; offset += SHARD_BYTES, index++) {
    const slice = data.subarray(offset, Math.min(offset + SHARD_BYTES, data.length));
    writeFileSync(`${basePath}.part${index}`, slice);
    parts.push({ path: `${publicBase}.part${index}`, bytes: slice.length, sha256: sha256(slice) });
  }
  return { ...file, parts };
}

/** Read a previously downloaded model back from disk and prove it against
 *  the PIN — lengths and the whole-file SHA-256. Returns null when anything
 *  is off (missing file, truncated cache, corrupted shard), which triggers a
 *  clean re-download rather than a broken manifest. */
function readVerifiedModel(dir: string, baseName: string, bytes: number, pinnedSha: string): Buffer | null {
  const chunks: Buffer[] = [];
  if (bytes > SHARD_BYTES) {
    for (let index = 0; existsSyncSafe(join(dir, `${baseName}.part${index}`)); index++) {
      chunks.push(readFileSync(join(dir, `${baseName}.part${index}`)));
    }
    if (chunks.length === 0) return null;
  } else {
    try {
      chunks.push(readFileSync(join(dir, baseName)));
    } catch {
      return null;
    }
  }
  const data = Buffer.concat(chunks);
  if (data.length !== bytes || sha256(data) !== pinnedSha) return null;
  return data;
}

function existsSyncSafe(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchModel(id: ModelId): Promise<ManifestFile> {
  const model = MODELS[id];
  const dir = modelDir(model.sha256);
  const baseName = `${id}.onnx`;
  const publicBase = `/capybg/models/${sha8(model.sha256)}/${baseName}`;
  mkdirSync(dir, { recursive: true });

  const cached = readVerifiedModel(dir, baseName, model.bytes, model.sha256);
  if (cached) {
    log(`${id}: verified copy already on disk, skipping download`);
    return writeSharded(join(dir, baseName), cached, publicBase);
  }

  log(`${id}: downloading ${modelUrl(model)}`);
  const data = await download(modelUrl(model));
  if (data.length !== model.bytes) {
    fail(`${id}: byte length mismatch — got ${data.length}, pinned ${model.bytes}`);
  }
  const hash = sha256(data);
  if (hash !== model.sha256) {
    fail(`${id}: SHA-256 mismatch — got ${hash}, pinned ${model.sha256}`);
  }
  log(`${id}: verified ${data.length} B (${(data.length / 1024 / 1024).toFixed(1)} MB)`);
  return writeSharded(join(dir, baseName), data, publicBase);
}

function copyOrtFiles(version: string): Record<string, ManifestFile> {
  const pkg = JSON.parse(readFileSync(join(root, "node_modules", "onnxruntime-web", "package.json"), "utf8"));
  const exportsMap = pkg.exports as Record<string, unknown>;
  mkdirSync(ortDir(version), { recursive: true });
  const files: Record<string, ManifestFile> = {};
  for (const exportName of ORT_EXPORTS) {
    const name = exportName.replace(/^\.\//, "");
    const data = readFileSync(ortExportPath(exportName, exportsMap));
    files[name] = writeSharded(join(ortDir(version), name), data, `/capybg/ort/${version}/${name}`);
    log(`ort: ${name} ${data.length} B${files[name].parts ? ` (${files[name].parts.length} parts)` : ""}`);
  }
  return files;
}

/** The plan's size sanity (§4.2 step 7): nothing on disk may exceed the cap,
 *  whether or not the manifest knows about it. */
function assertDiskSizesUnderCap() {
  for (const name of readdirSync(outDir, { recursive: true })) {
    const path = join(outDir, String(name));
    if (statSync(path).isDirectory()) continue;
    const size = statSync(path).size;
    if (size > MAX_ASSET_BYTES) {
      fail(`${path} is ${size} B, over the ${MAX_ASSET_BYTES} B asset cap`);
    }
  }
}

async function main() {
  const manifestPath = join(outDir, "manifest.json");

  if (process.argv.includes("--verify-only")) {
    let manifest: Manifest;
    try {
      manifest = validateManifest(JSON.parse(readFileSync(manifestPath, "utf8")));
    } catch {
      log("--verify-only: no manifest here — skipping (nothing to verify)");
      return;
    }
    let files = 0;
    for (const file of [...Object.values(manifest.ort.files), ...Object.values(manifest.models)]) {
      for (const entry of file.parts ?? [file]) {
        let data: Buffer;
        try {
          data = readFileSync(join(outDir, entry.path.replace(/^\/capybg\//, "")));
        } catch {
          fail(`${entry.path} is listed in the manifest but missing on disk`);
        }
        if (data.length !== entry.bytes) {
          fail(`${entry.path} is ${data.length} B on disk, manifest says ${entry.bytes}`);
        }
        const hash = sha256(data);
        if (hash !== entry.sha256) fail(`${entry.path} hash mismatch — ${hash} != ${entry.sha256}`);
        files++;
      }
    }
    log(`--verify-only: ${files} files all match the manifest (ort ${manifest.ort.version})`);
    return;
  }

  const version = readInstalledOrtVersion();
  mkdirSync(outDir, { recursive: true });

  const models: Partial<Record<ModelId, ManifestFile>> = {};
  for (const id of MODEL_IDS) {
    models[id] = await fetchModel(id);
  }
  const ortFiles = copyOrtFiles(version);

  const manifest: Manifest = {
    version: MANIFEST_VERSION,
    ort: { version, files: ortFiles },
    models,
  };
  validateManifest(manifest);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  assertDiskSizesUnderCap();
  log(`manifest written to public/capybg/manifest.json (ort ${version})`);
}

main().catch((error) => fail((error as Error).stack ?? String(error)));
