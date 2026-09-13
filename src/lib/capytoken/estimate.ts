/**
 * OpenAI's own rules of thumb, as the sanity cross-check next to exact counts.
 *
 * From OpenAI's help page "Understanding and counting tokens": one token is
 * approximately 4 characters; one token is approximately three-quarters of a
 * word (100 tokens ≈ 75 words). These are the numbers OpenAI itself offers —
 * they are shown here as "rule of thumb ≈ N", never dressed up as a count.
 *
 * The chat overhead is the Cookbook's constants: 3 tokens per message, plus 3
 * to prime the reply — +6 for a single message. It is labeled model-dependent
 * in the UI because only OpenAI documents it.
 */

export function ruleOfThumb(text: string): { byChars: number; byWords: number } {
  const chars = text.length;
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    byChars: Math.round(chars / 4),
    byWords: Math.round((words * 4) / 3),
  };
}

/** Framing tokens for a chat turn: 3 per message + 3 to prime the reply. */
export function chatOverhead(messages: number): number {
  return messages * 3 + 3;
}
