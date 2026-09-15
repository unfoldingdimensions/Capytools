/**
 * Pure display formatting for counts and money.
 *
 * Cost precision is honesty, not decoration: a 1,203-token prompt at GPT-5
 * rates costs $0.0015, and "$0.00" would be a lie. Small amounts get the
 * decimals they need; only dollar-scale amounts round to cents.
 */

const COUNTER = new Intl.NumberFormat("en-US");

/** 1234 → "1,234" */
export function formatTokens(n: number): string {
  return COUNTER.format(Math.round(n));
}

/**
 * USD, enough precision for the small amounts a prompt costs:
 * ≥ $1 → cents; ≥ 1¢ → tenths of a cent; below that, four decimals
 * ("$0.0047" — the plan's example).
 */
export function formatCost(usd: number): string {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(4)}`;
}

/** Per-token USD → per-1M, the industry's display convention: 2.5e-6 → "$2.50". */
export function formatPerM(perTokenUsd: number): string {
  const perMillion = perTokenUsd * 1e6;
  if (perMillion >= 0.01) return `$${perMillion.toFixed(2)}`;
  return `$${perMillion.toFixed(4)}`;
}
