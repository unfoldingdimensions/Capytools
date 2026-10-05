/**
 * The one CapyRead language registry.
 *
 * Everything that pins a language model to a byte lives here: the tessdata
 * source URL, its SHA-256 and exact size. `scripts/fetch-capyread-assets.ts`
 * imports these pins at build time to download and verify the .gz files into
 * `public/ocr/tessdata/<variant>/`; the engine (engine.ts) serves them
 * same-origin through tesseract's `langPath`. One registry, so a pin can
 * never drift between the build that fetched the bytes and the page that
 * serves them.
 *
 * Sizes decide the UX (plan §3.3): English ships BOTH the fast model (the
 * default — about 1.9 MB, good enough for documents) and the standard model
 * (about 10.4 MB, the quality option). Every other language ships fast only
 * — 18 standard models would be ~180 MB of build and origin for a choice
 * almost nobody makes first. All files are the 4.0.0 tessdata drop, which
 * carries legacy + LSTM combined and runs under tesseract's LSTM-only OEM.
 *
 * Hashes were measured 2026-10-06 over HTTPS from the pinned URLs; the build
 * re-verifies every one on every run and fails loudly on a mismatch.
 */

import type { Quality } from "./types";

export interface LangPin {
  /** The pinned file's SHA-256. */
  sha256: string;
  /** The pinned file's exact byte length; the build fails on mismatch. */
  bytes: number;
}

export interface LangSpec {
  id: string;
  /** The choice list's label. */
  label: string;
  fast: LangPin;
  /** Only English ships the larger, slower standard model. */
  standard?: LangPin;
}

/** `https://tessdata.projectnaptha.com/<drop>/<lang>.traineddata.gz`. */
export function langUrl(id: string, quality: Quality): string {
  return `https://tessdata.projectnaptha.com/${quality === "fast" ? "4.0.0_fast" : "4.0.0"}/${id}.traineddata.gz`;
}

/** Where the fetch script puts the file — and tesseract's `langPath` reads it. */
export function langPath(quality: Quality): string {
  return `/ocr/tessdata/${quality}`;
}

export const LANGUAGES: readonly LangSpec[] = [
  {
    id: "eng",
    label: "English",
    fast: { sha256: "18c1ac52b75e35d44735fb6c2a60acfaf23033524653200738e98f0243edb75b", bytes: 1984273 },
    standard: { sha256: "ed350f3752f81ee8f38769edc14d92d997dababe23b565c59879372cc46a2468", bytes: 10923060 },
  },
  { id: "deu", label: "German", fast: { sha256: "acb48fa5d63b5088b6299bda4a700d86e97bb9421253be8fc4af8ea2d8247740", bytes: 854318 } },
  { id: "fra", label: "French", fast: { sha256: "9800c70d1db21689e1ee91b5c81fe4c822120fa92cf5f0dab0d2b81b616fd468", bytes: 609363 } },
  { id: "spa", label: "Spanish", fast: { sha256: "8db1167a8c9bb015ac8e97278384c3b07dfa9bc8271569beea071d9e296b4487", bytes: 1137561 } },
  { id: "ita", label: "Italian", fast: { sha256: "8a4a1415e492f78d046dab8b8b0efa2c32bd377960ec7db8e9e7b0d28ba54d20", bytes: 1287268 } },
  { id: "por", label: "Portuguese", fast: { sha256: "7b0f1749aa255a593b14160c75f74690be740edcae94c5a45efc24ab50235f4d", bytes: 1009185 } },
  { id: "nld", label: "Dutch", fast: { sha256: "4d966ff690c60dcf8421d0033a95d696f8069d6946b8668ac6e8ead2e2610518", bytes: 2997142 } },
  { id: "rus", label: "Russian", fast: { sha256: "56703dfb466e5d3bac7a5758ab479c5c8a173eb419a146fd934d11406b4bccf3", bytes: 1622027 } },
  { id: "pol", label: "Polish", fast: { sha256: "97abef6a21f4d70e58f7b2c6b4dfe6861ef63d00359eaef6adf9b4b5ecfb3bef", bytes: 2058686 } },
  { id: "ukr", label: "Ukrainian", fast: { sha256: "6d8e6e3c9fa22f8a4a6d10b446b59ebe83882c74c591cdc640358e779c347da3", bytes: 1636168 } },
  { id: "tur", label: "Turkish", fast: { sha256: "9e60b54f226a708cddb15b64521abb2d77f06072b2f7d4be5bb9c7638eb4e4b5", bytes: 2031682 } },
  { id: "ara", label: "Arabic", fast: { sha256: "cfdec92af6c72289984b03dfe5e03d25f7fee591733081aa6f40761f3f5884cf", bytes: 725639 } },
  { id: "hin", label: "Hindi", fast: { sha256: "87f789843eaa8a7a75be0c34d39da51ea6db12a101d78641ce02f37075cf1ba9", bytes: 922758 } },
  { id: "vie", label: "Vietnamese", fast: { sha256: "c98a3f7bd4c7564bf38409cd1203aef1d5f4afae722a45429d85fb0b48fd61ed", bytes: 422253 } },
  { id: "chi_sim", label: "Chinese (simplified)", fast: { sha256: "3aa140069a09796b8cb8d3ccd0c052e8ed67f20cddb24b70ffa3344b3b94346b", bytes: 1730011 } },
  { id: "chi_tra", label: "Chinese (traditional)", fast: { sha256: "542b2aecc8e4a3b760694301381543d76bdcd8afdf6d899fb03381801b5e2b47", bytes: 1667198 } },
  { id: "jpn", label: "Japanese", fast: { sha256: "cac936a50547d9546d48bd6d46372fd89f1ba49209b678cf23ed938092688a28", bytes: 1535471 } },
  { id: "kor", label: "Korean", fast: { sha256: "aae6df1bbd206053b366b0b0f00e2211637d0923e8c3c64a0cbc9edaf61a5896", bytes: 1114590 } },
];

/** English is the default row — the registry's first entry by design. */
export const DEFAULT_LANG = LANGUAGES[0];

/** `eng` → its row; a missing id falls back to the default rather than undefined. */
export function findLang(id: string): LangSpec {
  return LANGUAGES.find((lang) => lang.id === id) ?? DEFAULT_LANG;
}

/** The pin for the (language, quality) pair a run wants. Standard falls back
 *  to fast for languages that don't ship it, so the caller can't miss. */
export function pinFor(lang: LangSpec, quality: Quality): LangPin {
  return (quality === "standard" ? lang.standard : lang.fast) ?? lang.fast;
}

/**
 * The key tesseract's IndexedDB cache stores this model under. It must
 * distinguish the variants — fast and standard are both `eng.traineddata`
 * to tesseract, and without this they would evict each other by name.
 */
export function cacheKey(lang: string, quality: Quality): string {
  return `${lang}-${quality}`;
}
