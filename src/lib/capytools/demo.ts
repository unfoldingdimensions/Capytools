import { FIXTURE_NOW, fixtureContributions, fixtureOwnerLike } from "@/lib/github/fixtures";
import { computeWrapped } from "@/lib/github/stats";
import type { WrappedStats } from "@/lib/github/types";

/** Static demo card shown on arrival — built from the owner-like fixture. */
export const DEMO_STATS: WrappedStats = computeWrapped(
  fixtureOwnerLike.user,
  fixtureOwnerLike.repos,
  fixtureOwnerLike.events,
  FIXTURE_NOW,
  fixtureContributions,
);

/** "1234" → "1,234" */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
