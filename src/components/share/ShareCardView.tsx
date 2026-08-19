"use client";

import { useCallback, useEffect, useState } from "react";
import { getUser, getRepos, getEvents } from "@/lib/github/user";
import { computeWrapped } from "@/lib/github/stats";
import { GithubError } from "@/lib/github/types";
import type { WrappedStats } from "@/lib/github/types";
import { CardComposer } from "@/components/card/CardComposer";
import { ErrorCard } from "@/components/tool/ErrorCard";
import { CardSkeleton } from "@/components/tool/CardSkeleton";

const CACHE_PREFIX = "capytools:wrapped:";
const CACHE_TTL_MS = 10 * 60 * 1000;

/** Client view for a shared /u/[username] card — same data layer + cache as the tool. */
export function ShareCardView({ username }: { username: string }) {
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [error, setError] = useState<GithubError | null>(null);

  const load = useCallback(() => {
    const key = CACHE_PREFIX + username;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const entry = JSON.parse(raw) as { stats: WrappedStats; at: number };
        if (Date.now() - entry.at < CACHE_TTL_MS) {
          return Promise.resolve().then(() => setStats(entry.stats));
        }
      }
    } catch {
      /* ignore malformed cache */
    }
    return Promise.all([getUser(username), getRepos(username), getEvents(username)])
      .then(([user, repos, events]) => {
        const next = computeWrapped(user, repos, events);
        try {
          sessionStorage.setItem(key, JSON.stringify({ stats: next, at: Date.now() }));
        } catch {
          /* ignore */
        }
        setStats(next);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof GithubError ? err : new GithubError("network", "Something quiet went wrong."),
        );
      });
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorCard error={error} onRetry={() => void load()} />;
  if (!stats) return <CardSkeleton />;

  return (
    <div className="w-full">
      <CardComposer stats={stats} />
      <div className="mt-10 text-center">
        <a
          href="/"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          make your own card →
        </a>
      </div>
    </div>
  );
}
