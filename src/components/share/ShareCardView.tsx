"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatedLink } from "@/components/ui/animated-link";
import { fetchWrapped, WRAP_STEPS } from "@/lib/github/wrap";
import { GithubError } from "@/lib/github/types";
import type { WrappedStats } from "@/lib/github/types";
import { CardComposer } from "@/components/card/CardComposer";
import { ErrorCard } from "@/components/tool/ErrorCard";
import { TerminalLoader } from "@/components/tool/TerminalLoader";
import type { LoadStep } from "@/components/tool/TerminalLoader";
import { readWrappedCache, writeWrappedCache } from "@/lib/capytools/cache";

/** Client view for a shared /u/[username] card — same data layer + cache as the tool. */
export function ShareCardView({ username }: { username: string }) {
  const [stats, setStats] = useState<WrappedStats | null>(() => readWrappedCache(username));
  const [error, setError] = useState<GithubError | null>(null);
  const [steps, setSteps] = useState<LoadStep[]>(() =>
    WRAP_STEPS.map((label) => ({ label, state: "pending" as const })),
  );

  const fetchRemote = useCallback(() => {
    const mark = (i: number, state: "done" | "failed", detail?: string) =>
      setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, state, detail } : s)));

    void fetchWrapped(username, mark)
      .then((next) => {
        writeWrappedCache(username, next);
        setStats(next);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof GithubError ? err : new GithubError("network", "Something quiet went wrong."),
        );
      });
  }, [username]);

  useEffect(() => {
    if (!stats) {
      fetchRemote();
    }
  }, [fetchRemote, stats]);

  if (error) return <ErrorCard error={error} onRetry={fetchRemote} />;
  if (!stats) return <TerminalLoader username={username} steps={steps} />;

  return (
    <div className="w-full">
      <CardComposer stats={stats} />
      <div className="mt-10 text-center">
        <AnimatedLink href="/" className="text-sm text-primary" arrow wipe>
          make your own card
        </AnimatedLink>
      </div>
    </div>
  );
}
