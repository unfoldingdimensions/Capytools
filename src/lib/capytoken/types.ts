/**
 * CapyToken's data vocabulary — pure types, no code that runs.
 *
 * The honest-estimation rule lives in the `encoding` field: exactly two
 * encodings are exact (the ones this tool actually counts with), and every
 * other model is priced against an openly labeled estimate. Nothing in here
 * knows about React, the DOM, or storage.
 */

/** An encoding this tool counts exactly, via js-tiktoken's vendored ranks. */
export type TokenEncodingId = "o200k" | "cl100k";

/** The three honesty tiers a priced model can sit in. */
export type EstimateKind = "exact" | "claude-estimate" | "unverified-estimate";

/**
 * One row of the vendored price snapshot (a pruned LiteLLM subset — see
 * prices.ts for the refresh recipe and the commit it was snapped from).
 */
export interface ModelPriceRow {
  /** LiteLLM's key, e.g. "gpt-5", "claude-opus-4-7", "groq/meta-llama/…". */
  id: string;
  /** The human label the table shows, e.g. "GPT-5", "Claude Opus 4.7". */
  label: string;
  /** The company behind the model, e.g. "OpenAI", "Anthropic", "Google". */
  provider: string;
  /** Which count prices this row exactly — or "estimate" when none does. */
  encoding: TokenEncodingId | "estimate";
  /** USD per 1M input tokens. */
  inputPerMTok: number;
  /** USD per 1M output tokens. */
  outputPerMTok: number;
  /** The model's input-side context cap, in tokens. */
  maxInput: number;
  /** The model's output cap, in tokens (shares the window with maxInput). */
  maxOutput: number;
}

/** One encoding chip's count: the raw BPE tokens plus any framing added on top. */
export interface CountResult {
  encoding: TokenEncodingId;
  /** Raw BPE count for the text, exactly as pasted. */
  tokens: number;
  /** Chat framing tokens added on top (0 when the overhead toggle is off). */
  overhead: number;
}

/** The estimation label a priced row carries, and the exact copy for it. */
export interface EstimateLabel {
  kind: EstimateKind;
  text: string;
}
