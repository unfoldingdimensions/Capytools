import type { EstimateLabel, ModelPriceRow } from "./types";

/**
 * The pricing math — pure functions over the vendored snapshot.
 *
 * Costs are `tokens × perToken`, never rounded at this layer; display
 * rounding belongs to format.ts. Context fit follows the plan's reading of
 * the window model: input and output share one window but carry separate
 * caps — input past `maxInput` is a hard fail, a combined total past
 * `maxInput + maxOutput` is a warning band.
 */

export function costFor(
  row: ModelPriceRow,
  inputTokens: number,
  plannedOutput: number,
): { input: number; output: number; total: number } {
  const input = (inputTokens * row.inputPerMTok) / 1e6;
  const output = (plannedOutput * row.outputPerMTok) / 1e6;
  return { input, output, total: input + output };
}

export function contextFit(
  row: ModelPriceRow,
  inputTokens: number,
  plannedOutput: number,
): { fitsInput: boolean; fitsTotal: boolean; inputShare: number } {
  return {
    fitsInput: inputTokens <= row.maxInput,
    fitsTotal: inputTokens + plannedOutput <= row.maxInput + row.maxOutput,
    // The input's share of the input window — 1+ means it does not fit.
    inputShare: row.maxInput > 0 ? inputTokens / row.maxInput : 1,
  };
}

/**
 * The honesty label for a row, by construction:
 * - exact rows say which encoding counted them;
 * - Claude rows say the count came from o200k_base and that Anthropic's own
 *   docs put its tokenizer ~+30% vs earlier Claude (the only multiplier with
 *   a primary source — never a Claude-vs-cl100k figure, that one is folklore);
 * - every other non-OpenAI row says plainly that it is unverified.
 */
export function estimateLabelFor(row: ModelPriceRow): EstimateLabel {
  if (row.encoding === "o200k") {
    return { kind: "exact", text: "exact — counted with o200k_base" };
  }
  if (row.encoding === "cl100k") {
    return { kind: "exact", text: "exact — counted with cl100k_base" };
  }
  if (row.provider === "Anthropic") {
    return {
      kind: "claude-estimate",
      text: "estimate — counted with o200k_base; Claude's tokenizer differs (its own docs: ~+30% vs earlier Claude)",
    };
  }
  return { kind: "unverified-estimate", text: "estimate — OpenAI-tokenizer equivalent, not verified" };
}
