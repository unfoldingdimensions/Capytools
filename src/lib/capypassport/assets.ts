/**
 * The one CapyPassport asset registry — every byte the tool ever downloads,
 * pinned the way CapyBg's `models.ts` pins its models (one registry, so the
 * build that fetches the bytes and the page that fetches them again cannot
 * drift).
 *
 * Licences: `@mediapipe/tasks-vision` and the face_landmarker model are
 * Apache-2.0 (plan §3.2). The wasm ships from the SAME installed npm package
 * the page imports its API from — version-locked by `MEDIAPIPE_NPM_VERSION`,
 * which a unit test holds against the installed package.json, so the loader
 * and the binary can never be release-mismatched.
 *
 * Paths are self-hosted, same-origin, never the MediaPipe CDN (house rule).
 * The model path is content-addressed (sha8) and the wasm directory carries
 * the package version, so both are safe to serve immutable; public/_headers
 * marks them so.
 */

export const MEDIAPIPE_NPM_VERSION = "1.1.0";

export interface PinnedAsset {
  /** Same-origin path this asset is served from. */
  path: string;
  bytes: number;
  sha256: string;
}

/** sha8 — the content-addressed directory form CapyBg uses. */
export function sha8(sha256: string): string {
  return sha256.slice(0, 8);
}

const MODEL_SHA256 = "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff";

/** The Face Landmarker bundle (float16), pinned from Google's storage —
 *  fetched and hash-verified at build time by
 *  scripts/fetch-capypassport-assets.ts, and re-verified in the browser by
 *  the loader before a single byte reaches the landmarker. */
export const FACE_LANDMARKER: PinnedAsset = {
  path: `/capypassport/models/${sha8(MODEL_SHA256)}/face_landmarker.task`,
  bytes: 3_758_596,
  sha256: MODEL_SHA256,
};

/** The wasm files `FilesetResolver.forVisionTasks(base)` loads in script
 *  mode: the SIMD pair on any modern browser, the nosimd pair as the
 *  fallback. Copied out of the installed package at build time and verified
 *  against these pins. */
export const WASM_BASE = `/capypassport/wasm-${MEDIAPIPE_NPM_VERSION}`;

export const WASM_FILES: readonly PinnedAsset[] = [
  {
    path: `${WASM_BASE}/vision_wasm_internal.js`,
    bytes: 335_393,
    sha256: "7c652617b5bef832f42878ce8c5f752b0724bca6054e4bc1013a37d4b1949723",
  },
  {
    path: `${WASM_BASE}/vision_wasm_internal.wasm`,
    bytes: 12_997_248,
    sha256: "782eda3ec1f414fdb4f1d66a8b59093eb4d5ab437e06117796abf05962d68eef",
  },
  {
    path: `${WASM_BASE}/vision_wasm_nosimd_internal.js`,
    bytes: 335_196,
    sha256: "510fc70a170eb8b46767a7abab2af89a7a8341fa5b3ebfb8a5de41a79b7fa9df",
  },
  {
    path: `${WASM_BASE}/vision_wasm_nosimd_internal.wasm`,
    bytes: 12_168_316,
    sha256: "b802041d105876865d6a0806f2ff7c4419a7f1b80bc01340fe36e759c2030011",
  },
];
