/**
 * CapyRead's build-time asset pipeline (the CapyBg pattern, smaller).
 *
 * Copies tesseract's worker and LSTM wasm cores and pdf.js's worker out of
 * node_modules for the locked versions, downloads the pinned language models
 * (bytes + SHA-256 from src/lib/capyread/langs.ts — fails the build loudly
 * on any mismatch), and writes public/ocr/manifest.json describing every
 * byte. Runs from `prebuild`, `predeploy` and the CI build jobs; nothing
 * here ever runs in a visitor's browser, and /public/ocr/ is gitignored —
 * binaries never enter git.
 *
 * Nothing on disk may exceed Cloudflare's 25 MiB per-asset cap. The largest
 * file here is the standard English model at ~10.4 MB, so nothing needs
 * sharding — but the assertion stays, so an accidental large model fails
 * here instead of at `wrangler deploy`.
 *
 * `--verify-only` re-hashes everything against the manifest and exits
 * non-zero on any mismatch; it is a no-op success when the directory is
 * absent, so unit-test environments without the assets stay green.
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { LANGUAGES, langUrl } from "../src/lib/capyread/langs";
import type { Quality } from "../src/lib/capyread/types";

/** A safety margin under Cloudflare's 25 MiB per-asset cap. */
const MAX_ASSET_BYTES = 24 * 1024 * 1024;

const RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 6_000];

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "public", "ocr");

const sha256 = (data: Buffer | Uint8Array) => createHash("sha256").update(data).digest("hex");

function log(message: string) {
  console.log(`fetch-capyread-assets: ${message}`);
}

function fail(message: string): never {
  console.error(`fetch-capyread-assets: ${message}`);
  process.exit(1);
}

/** node_modules files copied by version-lock (package.json + lockfile pin
 *  them; the manifest records the hashes they had at copy time). */
const COPIED_FILES: Array<{ from: string[]; to: string }> = [
  // tesseract.js's worker — created from a blob that importScripts this file.
  { from: ["tesseract.js", "dist", "worker.min.js"], to: "worker.min.js" },
  // The three LSTM cores tesseract can pick by feature detect. Only these
  // three can load: the engine always asks for OEM.LSTM_ONLY (lstmOnly),
  // so the two non-LSTM and two combined variants never download.
  { from: ["tesseract.js-core", "tesseract-core-lstm.wasm.js"], to: join("core", "tesseract-core-lstm.wasm.js") },
  { from: ["tesseract.js-core", "tesseract-core-simd-lstm.wasm.js"], to: join("core", "tesseract-core-simd-lstm.wasm.js") },
  { from: ["tesseract.js-core", "tesseract-core-relaxedsimd-lstm.wasm.js"], to: join("core", "tesseract-core-relaxedsimd-lstm.wasm.js") },
  // pdf.js's worker plus the standard fonts unembedded-PDF pages fall back to.
  { from: ["pdfjs-dist", "build", "pdf.worker.min.mjs"], to: join("pdf", "pdf.worker.min.mjs") },
];

async function download(url: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "capytools-build (fetch-capyread-assets)" },
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

interface ManifestEntry {
  path: string;
  bytes: number;
  sha256: string;
}

/** Copy a node_modules file if the on-disk copy already matches; else copy
 *  and record. Returns the manifest entry describing what is on disk. */
function copyEngineFile(from: string, to: string): ManifestEntry {
  const data = readFileSync(from);
  const hash = sha256(data);
  const target = join(outDir, to);
  mkdirSync(join(target, ".."), { recursive: true });
  if (!existsSync(target) || sha256(readFileSync(target)) !== hash) {
    copyFileSync(from, target);
  }
  const entry: ManifestEntry = { path: `/ocr/${to.replaceAll("\\", "/")}`, bytes: data.length, sha256: hash };
  log(`${entry.path} ${entry.bytes} B`);
  return entry;
}

async function fetchLanguageModel(id: string, quality: Quality, pin: { bytes: number; sha256: string }): Promise<ManifestEntry> {
  const relative = join("tessdata", quality, `${id}.traineddata.gz`);
  const target = join(outDir, relative);
  mkdirSync(join(target, ".."), { recursive: true });

  const cached = existsSync(target) ? readFileSync(target) : null;
  if (cached && cached.length === pin.bytes && sha256(cached) === pin.sha256) {
    log(`tessdata/${quality}/${id}: verified copy already on disk, skipping download`);
    return { path: `/ocr/tessdata/${quality}/${id}.traineddata.gz`, bytes: cached.length, sha256: sha256(cached) };
  }

  const url = langUrl(id, quality);
  log(`tessdata/${quality}/${id}: downloading ${url}`);
  const data = await download(url);
  if (data.length !== pin.bytes) {
    fail(`tessdata/${quality}/${id}: byte length mismatch — got ${data.length}, pinned ${pin.bytes}`);
  }
  const hash = sha256(data);
  if (hash !== pin.sha256) {
    fail(`tessdata/${quality}/${id}: SHA-256 mismatch — got ${hash}, pinned ${pin.sha256}`);
  }
  writeFileSync(target, data);
  log(`tessdata/${quality}/${id}: verified ${data.length} B`);
  return { path: `/ocr/tessdata/${quality}/${id}.traineddata.gz`, bytes: data.length, sha256: hash };
}

/** The plan's size sanity: nothing on disk may exceed the cap, whether or
 *  not the manifest knows about it. */
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
    if (!existsSync(manifestPath)) {
      log("--verify-only: no manifest here — skipping (nothing to verify)");
      return;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestEntry[];
    for (const entry of manifest) {
      const data = readFileSync(join(outDir, entry.path.replace(/^\/ocr\//, "")));
      if (data.length !== entry.bytes) {
        fail(`${entry.path} is ${data.length} B on disk, manifest says ${entry.bytes}`);
      }
      if (sha256(data) !== entry.sha256) fail(`${entry.path} hash mismatch`);
    }
    log(`--verify-only: ${manifest.length} files all match the manifest`);
    return;
  }

  mkdirSync(outDir, { recursive: true });
  const entries: ManifestEntry[] = [];

  for (const { from, to } of COPIED_FILES) {
    const source = join(root, "node_modules", ...from);
    if (!existsSync(source)) fail(`expected ${source} — is the dependency installed at a locked version?`);
    entries.push(copyEngineFile(source, to));
  }
  const fontsDir = join(root, "node_modules", "pdfjs-dist", "standard_fonts");
  for (const name of readdirSync(fontsDir)) {
    if (!statSync(join(fontsDir, name)).isFile()) continue;
    entries.push(copyEngineFile(join(fontsDir, name), join("pdf", "standard_fonts", name)));
  }

  for (const lang of LANGUAGES) {
    entries.push(await fetchLanguageModel(lang.id, "fast", lang.fast));
    if (lang.standard) entries.push(await fetchLanguageModel(lang.id, "standard", lang.standard));
  }

  writeFileSync(manifestPath, `${JSON.stringify(entries, null, 2)}\n`);
  assertDiskSizesUnderCap();
  log(`manifest written to public/ocr/manifest.json (${entries.length} files)`);
}

main().catch((error) => fail((error as Error).stack ?? String(error)));
