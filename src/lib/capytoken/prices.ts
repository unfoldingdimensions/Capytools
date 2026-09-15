import type { ModelPriceRow } from "./types";

/**
 * The vendored price snapshot — a pruned, hand-checked subset of LiteLLM's
 * `model_prices_and_context_window.json` (MIT, at their repo root). This file
 * IS the artifact: nothing here is fetched at runtime, ever.
 *
 * ── Snapshot recipe (manual, ~5 minutes — never a build-time fetch) ─────────
 * 1. Pin: `curl -sL https://raw.githubusercontent.com/BerriAI/litellm/<SHA>/
 *    model_prices_and_context_window.json` — record <SHA> below.
 * 2. Prune: keep only `mode: "chat"` rows you can defend, ~24–36 of them,
 *    budget → frontier. Copy `input_cost_per_token` × 1e6 into
 *    `inputPerMTok`, `output_cost_per_token` × 1e6 into `outputPerMTok`,
 *    `max_input_tokens` into `maxInput`, and `max_output_tokens ?? max_tokens`
 *    into `maxOutput`.
 * 3. Sanity second source (optional, once, keyless):
 *    `GET https://openrouter.ai/api/v1/models` — pricing strings per token.
 * 4. Bump `PRICES_VERIFIED` to the current YYYY-MM and `PRICES_SOURCE_COMMIT`
 *    to the SHA from step 1. The stamp in the UI renders from these.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const PRICES_VERIFIED = "2026-09";
export const PRICES_SOURCE = "BerriAI/litellm model_prices_and_context_window.json";
/** LiteLLM main this snapshot was read from: 30f33a949b8a2bb890a2baee18e2ab7ab015a4f7 */
export const PRICES_SOURCE_COMMIT = "30f33a9";

/**
 * Encoding map, by construction: OpenAI's current-generation models are priced
 * against o200k_base exactly; GPT-4 Turbo is the cl100k-era exact row; every
 * other provider has no public tokenizer and carries "estimate" — the labels
 * in compute.ts.estimateLabelFor say so in the UI.
 */
export const CURATED_PRICES: ModelPriceRow[] = [
  // OpenAI — exact under o200k_base
  { id: "gpt-5.6", label: "GPT-5.6", provider: "OpenAI", encoding: "o200k", inputPerMTok: 4.0, outputPerMTok: 20.0, maxInput: 922_000, maxOutput: 128_000 },
  { id: "gpt-5.5", label: "GPT-5.5", provider: "OpenAI", encoding: "o200k", inputPerMTok: 5.0, outputPerMTok: 30.0, maxInput: 1_050_000, maxOutput: 128_000 },
  { id: "gpt-5.4", label: "GPT-5.4", provider: "OpenAI", encoding: "o200k", inputPerMTok: 2.5, outputPerMTok: 15.0, maxInput: 1_050_000, maxOutput: 128_000 },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini", provider: "OpenAI", encoding: "o200k", inputPerMTok: 0.75, outputPerMTok: 4.5, maxInput: 272_000, maxOutput: 128_000 },
  { id: "gpt-5.4-nano", label: "GPT-5.4 nano", provider: "OpenAI", encoding: "o200k", inputPerMTok: 0.2, outputPerMTok: 1.25, maxInput: 272_000, maxOutput: 128_000 },
  { id: "gpt-5.2", label: "GPT-5.2", provider: "OpenAI", encoding: "o200k", inputPerMTok: 1.75, outputPerMTok: 14.0, maxInput: 272_000, maxOutput: 128_000 },
  { id: "gpt-5.1", label: "GPT-5.1", provider: "OpenAI", encoding: "o200k", inputPerMTok: 1.25, outputPerMTok: 10.0, maxInput: 272_000, maxOutput: 128_000 },
  { id: "gpt-5", label: "GPT-5", provider: "OpenAI", encoding: "o200k", inputPerMTok: 1.25, outputPerMTok: 10.0, maxInput: 272_000, maxOutput: 128_000 },
  { id: "gpt-5-mini", label: "GPT-5 mini", provider: "OpenAI", encoding: "o200k", inputPerMTok: 0.25, outputPerMTok: 2.0, maxInput: 272_000, maxOutput: 128_000 },
  { id: "gpt-5-nano", label: "GPT-5 nano", provider: "OpenAI", encoding: "o200k", inputPerMTok: 0.05, outputPerMTok: 0.4, maxInput: 272_000, maxOutput: 128_000 },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "OpenAI", encoding: "o200k", inputPerMTok: 2.0, outputPerMTok: 8.0, maxInput: 1_047_576, maxOutput: 32_768 },
  { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI", encoding: "o200k", inputPerMTok: 2.5, outputPerMTok: 10.0, maxInput: 128_000, maxOutput: 16_384 },
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "OpenAI", encoding: "o200k", inputPerMTok: 0.15, outputPerMTok: 0.6, maxInput: 128_000, maxOutput: 16_384 },
  { id: "o3", label: "o3", provider: "OpenAI", encoding: "o200k", inputPerMTok: 2.0, outputPerMTok: 8.0, maxInput: 200_000, maxOutput: 100_000 },
  { id: "o4-mini", label: "o4-mini", provider: "OpenAI", encoding: "o200k", inputPerMTok: 1.1, outputPerMTok: 4.4, maxInput: 200_000, maxOutput: 100_000 },
  // OpenAI — the cl100k-era exact row
  { id: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "OpenAI", encoding: "cl100k", inputPerMTok: 10.0, outputPerMTok: 30.0, maxInput: 128_000, maxOutput: 4_096 },
  // Anthropic — no public tokenizer; the count is an openly labeled estimate
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", provider: "Anthropic", encoding: "estimate", inputPerMTok: 5.0, outputPerMTok: 25.0, maxInput: 1_000_000, maxOutput: 128_000 },
  { id: "claude-opus-4-7", label: "Claude Opus 4.7", provider: "Anthropic", encoding: "estimate", inputPerMTok: 5.0, outputPerMTok: 25.0, maxInput: 1_000_000, maxOutput: 128_000 },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "Anthropic", encoding: "estimate", inputPerMTok: 3.0, outputPerMTok: 15.0, maxInput: 1_000_000, maxOutput: 128_000 },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "Anthropic", encoding: "estimate", inputPerMTok: 1.0, outputPerMTok: 5.0, maxInput: 200_000, maxOutput: 64_000 },
  // Google — estimate
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", provider: "Google", encoding: "estimate", inputPerMTok: 1.5, outputPerMTok: 9.0, maxInput: 1_048_576, maxOutput: 65_535 },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "Google", encoding: "estimate", inputPerMTok: 0.5, outputPerMTok: 3.0, maxInput: 1_048_576, maxOutput: 65_535 },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google", encoding: "estimate", inputPerMTok: 1.25, outputPerMTok: 10.0, maxInput: 1_048_576, maxOutput: 65_535 },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google", encoding: "estimate", inputPerMTok: 0.3, outputPerMTok: 2.5, maxInput: 1_048_576, maxOutput: 65_535 },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", provider: "Google", encoding: "estimate", inputPerMTok: 0.1, outputPerMTok: 0.4, maxInput: 1_048_576, maxOutput: 65_535 },
  // xAI — estimate
  { id: "xai/grok-4.6", label: "Grok 4.6", provider: "xAI", encoding: "estimate", inputPerMTok: 2.0, outputPerMTok: 6.0, maxInput: 500_000, maxOutput: 500_000 },
  // DeepSeek — estimate
  { id: "deepseek-chat", label: "DeepSeek Chat", provider: "DeepSeek", encoding: "estimate", inputPerMTok: 0.28, outputPerMTok: 0.42, maxInput: 131_072, maxOutput: 8_192 },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner", provider: "DeepSeek", encoding: "estimate", inputPerMTok: 0.28, outputPerMTok: 0.42, maxInput: 131_072, maxOutput: 65_536 },
  // Meta's Llama 4, as hosted on Groq — estimate
  { id: "groq/meta-llama/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick (Groq)", provider: "Meta", encoding: "estimate", inputPerMTok: 0.2, outputPerMTok: 0.6, maxInput: 131_072, maxOutput: 8_192 },
  { id: "groq/meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout (Groq)", provider: "Meta", encoding: "estimate", inputPerMTok: 0.11, outputPerMTok: 0.34, maxInput: 131_072, maxOutput: 8_192 },
  // Alibaba's Qwen — estimate
  { id: "qwencloud/qwen3.8-max", label: "Qwen 3.8 Max", provider: "Alibaba", encoding: "estimate", inputPerMTok: 2.0, outputPerMTok: 6.0, maxInput: 991_808, maxOutput: 131_072 },
  { id: "qwencloud/qwen-plus", label: "Qwen Plus", provider: "Alibaba", encoding: "estimate", inputPerMTok: 0.4, outputPerMTok: 1.2, maxInput: 129_024, maxOutput: 16_384 },
  { id: "qwencloud/qwen-turbo", label: "Qwen Turbo", provider: "Alibaba", encoding: "estimate", inputPerMTok: 0.05, outputPerMTok: 0.2, maxInput: 129_024, maxOutput: 16_384 },
  // Mistral — estimate
  { id: "mistral/mistral-medium-latest", label: "Mistral Medium", provider: "Mistral", encoding: "estimate", inputPerMTok: 1.5, outputPerMTok: 7.5, maxInput: 262_144, maxOutput: 262_144 },
  { id: "mistral/mistral-large-latest", label: "Mistral Large", provider: "Mistral", encoding: "estimate", inputPerMTok: 0.5, outputPerMTok: 1.5, maxInput: 262_144, maxOutput: 262_144 },
  { id: "mistral/mistral-small-latest", label: "Mistral Small", provider: "Mistral", encoding: "estimate", inputPerMTok: 0.15, outputPerMTok: 0.6, maxInput: 262_144, maxOutput: 262_144 },
];
