import { getUser, getRepos, getEvents } from "./user";
import { getContributions } from "./contributions";
import { computeWrapped } from "./stats";
import type { WrappedStats } from "./types";

/** The four requests a wrap needs, in the order the loader lists them. */
export const WRAP_STEPS = [
  "profile",
  "repositories",
  "recent events",
  "contribution calendar",
] as const;

export type StepReporter = (
  index: number,
  state: "done" | "failed",
  detail?: string,
) => void;

/**
 * Fetch everything a card needs and compute the stats.
 *
 * `onStep` fires as each request settles, so the loader can show real progress
 * — the four calls finish at very different speeds and a timed fake would lie
 * about which one is slow. The contribution calendar is best-effort: if it
 * fails the card still renders off the 90-day events feed.
 */
export async function fetchWrapped(
  username: string,
  onStep: StepReporter = () => {},
): Promise<WrappedStats> {
  const track = <T,>(index: number, work: Promise<T>, describe: (value: T) => string) =>
    work.then(
      (value) => {
        onStep(index, "done", describe(value));
        return value;
      },
      (err: unknown) => {
        onStep(index, "failed");
        throw err;
      },
    );

  const [user, repos, events, contributions] = await Promise.all([
    track(0, getUser(username), (u) => `@${u.login}`),
    track(1, getRepos(username), (r) => `${r.length} repos`),
    track(2, getEvents(username), (e) => `${e.length} events`),
    track(3, getContributions(username), (d) => `${d.length} days`).catch(() => []),
  ]);

  return computeWrapped(user, repos, events, new Date(), contributions);
}
