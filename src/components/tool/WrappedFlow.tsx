"use client";

import { useCallback, useEffect, useState } from "react";
import { getUser, getRepos, getEvents } from "@/lib/github/user";
import { computeWrapped } from "@/lib/github/stats";
import { GithubError } from "@/lib/github/types";
import type { WrappedStats } from "@/lib/github/types";
import { DEMO_STATS } from "@/lib/capytools/demo";
import { CardComposer } from "@/components/card/CardComposer";
import { UsernameForm } from "@/components/tool/UsernameForm";
import { ErrorCard } from "@/components/tool/ErrorCard";
import { CardSkeleton } from "@/components/tool/CardSkeleton";

const CACHE_PREFIX = "capytools:wrapped:";
const CACHE_TTL_MS = 10 * 60 * 1000;

type Status = "idle" | "loading" | "success" | "error";

function readCache(username: string): WrappedStats | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + username);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { stats: WrappedStats; at: number };
    if (Date.now() - entry.at < CACHE_TTL_MS) return entry.stats;
  } catch {
    /* ignore malformed cache */
  }
  return null;
}

function writeCache(username: string, stats: WrappedStats) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + username, JSON.stringify({ stats, at: Date.now() }));
  } catch {
    /* ignore quota / privacy-mode failures */
  }
}

const PRESETS = ["unfoldingdimensions", "torvalds", "mojombo"];

export function WrappedFlow() {
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<GithubError | null>(null);

  // react-hooks v7 safe: every setState below happens inside a .then / cache branch,
  // never synchronously against the effect.
  const run = useCallback(() => {
    if (!username) return;
    const cached = readCache(username);
    if (cached) {
      return Promise.resolve().then(() => {
        setStats(cached);
        setStatus("success");
        setError(null);
      });
    }
    return Promise.all([getUser(username), getRepos(username), getEvents(username)])
      .then(([user, repos, events]) => {
        const next = computeWrapped(user, repos, events);
        writeCache(username, next);
        setStats(next);
        setStatus("success");
        setError(null);
      })
      .catch((err: unknown) => {
        const g =
          err instanceof GithubError ? err : new GithubError("network", "Something quiet went wrong.");
        setError(g);
        setStatus("error");
      });
  }, [username]);

  useEffect(() => {
    void run();
  }, [run]);

  const handleGenerate = (u: string) => {
    setUsername(u);
    setStats(null);
    setError(null);
    setStatus("loading"); // event handler — allowed
  };

  return (
    <div className="flex w-full flex-col items-center">
      <UsernameForm onSubmit={handleGenerate} busy={status === "loading"} />

      <p className="mt-3 font-mono text-[11px] text-muted-foreground">
        try: {PRESETS.join(" · ")}
      </p>

      <div className="mt-10 w-full max-w-2xl">
        {status === "idle" && (
          <div className="space-y-2">
            <CardComposer stats={DEMO_STATS} />
            <p className="text-center font-mono text-[10px] text-muted-foreground">
              a calm example — paste a real username above to wrap your own
            </p>
          </div>
        )}
        {status === "loading" && <CardSkeleton />}
        {status === "success" && stats && <CardComposer stats={stats} />}
        {status === "error" && error && (
          <ErrorCard error={error} onRetry={() => username && handleGenerate(username)} />
        )}
      </div>
    </div>
  );
}
