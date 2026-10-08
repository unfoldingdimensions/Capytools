/**
 * CapyPassport's build-time asset pipeline (the CapyBg/CapyRead pattern).
 *
 * Downloads the pinned Face Landmarker model from Google's storage and copies
 * the MediaPipe wasm out of node_modules for the LOCKED npm version — every
 * byte verified against the pins in src/lib/capypassport/assets.ts, failing
 * the build loudly on any mismatch. The model directory is content-addressed
 * and the wasm directory carries the package version, so everything under
 * /capypassport/ is safe to serve immutable. Runs from `prebuild`,
 * `predeploy` and CI; nothing here ever runs in a visitor's browser, and
 * /public/capypassport/ is gitignored — binaries never enter git.
 *
 * Nothing on disk may exceed Cloudflare's 25 MiB per-asset cap. The largest
 * file here is the SIMD wasm at ~13 MB, so nothing needs sharding — but the
 * assertion stays, so a bigger engine fails here instead of at
 * `wrangler versions upload`.
 *
 * `--verify-only` re-hashes everything against the pins and exits non-zero
 * on any mismatch; it is a no-op success when the directory is absent, so
 * unit-test environments without the assets stay green.
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { FACE_LANDMARKER, MEDIAPIPE_NPM_VERSION, WASM_BASE, WASM_FILES, sha8 } from "../src/lib/capypassport/assets";

/** A safety margin under Cloudflare's 25 MiB per-asset cap. */
const MAX_ASSET_BYTES = 24 * 1024 * 1024;

const RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 6_000];

/** The model's upstream home, pinned to a FIXED float16 revision — not the
 *  mutable `latest` path (they hashed identically on 2026-10-08; the pin
 *  keeps it that way or fails the build). */
const MODEL_SOURCE =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "public", "capypassport");
const modelDir = join(outDir, "models", sha8(FACE_LANDMARKER.sha256));
const wasmDir = join(outDir, WASM_BASE.split("/").pop()!);

const sha256 = (data: Buffer | Uint8Array) => createHash("sha256").update(data).digest("hex");

function log(message: string) {
  console.log(`fetch-capypassport-assets: ${message}`);
}

function fail(message: string): never {
  console.error(`fetch-capypassport-assets: ${message}`);
  process.exit(1);
}

async function download(url: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "capytools-build (fetch-capypassport-assets)" },
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

function verifyOnDisk(path: string, pin: { bytes: number; sha256: string }): Buffer | null {
  let data: Buffer;
  try {
    data = readFileSync(path);
  } catch {
    return null;
  }
  if (data.length !== pin.bytes || sha256(data) !== pin.sha256) return null;
  return data;
}

async function fetchModel(): Promise<void> {
  const cached = verifyOnDisk(join(modelDir, "face_landmarker.task"), FACE_LANDMARKER);
  if (cached) {
    log(`face_landmarker: verified copy already on disk, skipping download`);
    return;
  }
  log(`face_landmarker: downloading ${MODEL_SOURCE}`);
  const data = await download(MODEL_SOURCE);
  if (data.length !== FACE_LANDMARKER.bytes) {
    fail(`face_landmarker: byte length mismatch — got ${data.length}, pinned ${FACE_LANDMARKER.bytes}`);
  }
  const hash = sha256(data);
  if (hash !== FACE_LANDMARKER.sha256) {
    fail(`face_landmarker: SHA-256 mismatch — got ${hash}, pinned ${FACE_LANDMARKER.sha256}`);
  }
  mkdirSync(modelDir, { recursive: true });
  writeFileSync(join(modelDir, "face_landmarker.task"), data);
  log(`face_landmarker: verified ${data.length} B (${(data.length / 1024 / 1024).toFixed(1)} MB)`);
}

function copyWasm(): void {
  const pkgPath = join(root, "node_modules", "@mediapipe", "tasks-vision", "package.json");
  let installed: string;
  try {
    installed = JSON.parse(readFileSync(pkgPath, "utf8")).version;
  } catch {
    fail("@mediapipe/tasks-vision is not installed — run npm install first");
  }
  if (installed !== MEDIAPIPE_NPM_VERSION) {
    fail(
      `@mediapipe/tasks-vision ${installed} is installed but the pins say ${MEDIAPIPE_NPM_VERSION} — ` +
        `bump MEDIAPIPE_NPM_VERSION and the wasm pins in src/lib/capypassport/assets.ts together`,
    );
  }
  mkdirSync(wasmDir, { recursive: true });
  for (const pin of WASM_FILES) {
    const name = pin.path.split("/").pop()!;
    const data = readFileSync(join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm", name));
    if (data.length !== pin.bytes || sha256(data) !== pin.sha256) {
      fail(`${name} no longer matches its pin — the package changed under us; re-pin assets.ts`);
    }
    copyFileSync(join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm", name), join(wasmDir, name));
    log(`wasm: ${name} ${data.length} B verified`);
  }
}

/** The plan's size sanity: nothing on disk may exceed the cap, whether or
 *  not anything above remembers to check. */
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
  if (process.argv.includes("--verify-only")) {
    if (!existsSync(outDir)) {
      log("--verify-only: nothing here — skipping (nothing to verify)");
      return;
    }
    const model = verifyOnDisk(join(modelDir, "face_landmarker.task"), FACE_LANDMARKER);
    if (!model) fail("face_landmarker.task is missing or fails its pin");
    for (const pin of WASM_FILES) {
      const name = pin.path.split("/").pop()!;
      if (!verifyOnDisk(join(wasmDir, name), pin)) fail(`${name} is missing or fails its pin`);
    }
    log("--verify-only: all assets match their pins");
    return;
  }

  mkdirSync(outDir, { recursive: true });
  await fetchModel();
  copyWasm();
  assertDiskSizesUnderCap();
  log(`assets ready under public/capypassport/`);
}

main().catch((error) => fail((error as Error).stack ?? String(error)));
