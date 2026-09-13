import type { TokenEncodingId } from "./types";

/**
 * The tokenizer engine — the only browser-only file in the folder.
 *
 * Two hard rules from the plan:
 * - Never import the `js-tiktoken` package root (it bundles every rank file,
 *   ~5.6 MB). The lite build and the two rank modules are dynamic-imported
 *   here, once each, on the first user-triggered count.
 * - Ranks are expensive (~1.1 MB gzipped for o200k), so the constructed
 *   encoder is cached in a module-level singleton keyed by encoding; the load
 *   itself is cached as a promise so concurrent first counts share one parse.
 *
 * `countTokens` resolves to `null` while the ranks for that encoding are
 * still loading — the caller renders the loading chip and awaits
 * `ensureEngine` before asking again. An empty string counts 0 without ever
 * loading the engine.
 */

type Encoding = { default: { pat_str: string; special_tokens: Record<string, number>; bpe_ranks: string } };

const encoders = new Map<TokenEncodingId, import("js-tiktoken/lite").Tiktoken>();
const loading = new Map<TokenEncodingId, Promise<void>>();

const RANK_SOURCES: Record<TokenEncodingId, () => Promise<Encoding>> = {
  o200k: () => import("js-tiktoken/ranks/o200k_base"),
  cl100k: () => import("js-tiktoken/ranks/cl100k_base"),
};

/** Load (once) and cache the encoder for one encoding. */
export function ensureEngine(encoding: TokenEncodingId): Promise<void> {
  const inFlight = loading.get(encoding);
  if (inFlight) return inFlight;

  const load = (async () => {
    try {
      const [{ Tiktoken }, ranks] = await Promise.all([import("js-tiktoken/lite"), RANK_SOURCES[encoding]()]);
      encoders.set(encoding, new Tiktoken(ranks.default));
    } catch (caught) {
      // A failed load must not stay cached — the calm retry card depends on a
      // second call actually retrying.
      loading.delete(encoding);
      throw caught;
    }
  })();
  loading.set(encoding, load);
  return load;
}

/**
 * Count `text` under one encoding. Resolves `null` while the ranks load
 * (first use only); the caller shows the loading chip, awaits `ensureEngine`,
 * then calls again — every count after that is synchronous-fast.
 */
export async function countTokens(text: string, encoding: TokenEncodingId): Promise<number | null> {
  if (!text) return 0;
  const encoder = encoders.get(encoding);
  if (!encoder) {
    void ensureEngine(encoding);
    return null;
  }
  // Strips nothing — the count is of the raw string, exactly as pasted.
  return encoder.encode(text).length;
}
