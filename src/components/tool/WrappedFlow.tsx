"use client";

import { useCallback, useState } from "react";
import { useIsDark } from "@/lib/capytools/use-is-dark";
import { fetchWrapped, WRAP_STEPS } from "@/lib/github/wrap";
import { GithubError } from "@/lib/github/types";
import type { WrappedStats } from "@/lib/github/types";
import { DEMO_STATS } from "@/lib/capytools/demo";
import { CardComposer } from "@/components/card/CardComposer";
import { CardScaled } from "@/components/card/CardScaled";
import { UsernameForm } from "@/components/tool/UsernameForm";
import { ErrorCard } from "@/components/tool/ErrorCard";
import { TerminalLoader } from "@/components/tool/TerminalLoader";
import type { LoadStep } from "@/components/tool/TerminalLoader";
import { readWrappedCache, writeWrappedCache } from "@/lib/capytools/cache";

type Status = "idle" | "loading" | "success" | "error";

const PRESETS = ["unfoldingdimensions", "torvalds", "mojombo"];

const freshSteps = (): LoadStep[] =>
  WRAP_STEPS.map((label) => ({ label, state: "pending" as const }));

export function WrappedFlow() {
  const dark = useIsDark();
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<GithubError | null>(null);
  const [steps, setSteps] = useState<LoadStep[]>(freshSteps);

  const fetchAndWrap = useCallback((u: string) => {
    if (!u) return;
    const cached = readWrappedCache(u);
    if (cached) {
      setStats(cached);
      setStatus("success");
      setError(null);
      return;
    }
    setStatus("loading");
    setStats(null);
    setError(null);
    setSteps(freshSteps());

    const mark = (i: number, state: "done" | "failed", detail?: string) =>
      setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, state, detail } : s)));

    void fetchWrapped(u, mark)
      .then((next) => {
        writeWrappedCache(u, next);
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
  }, []);

  const handleGenerate = (u: string) => {
    setUsername(u);
    fetchAndWrap(u);
  };

  return (
    <div className="flex w-full flex-col items-center">
      <UsernameForm onSubmit={handleGenerate} busy={status === "loading"} />

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 font-mono text-[11px] text-muted-foreground">
        <span>try:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handleGenerate(preset)}
            disabled={status === "loading"}
            className="rounded-full px-2 py-0.5 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-ring/50 disabled:pointer-events-none"
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="mt-10 w-full max-w-4xl">
        {status === "idle" && (
          <div className="space-y-2">
            <CardScaled
              stats={DEMO_STATS}
              format="wide"
              variant={dark ? "dark" : "light"}
            />
            <p className="text-center font-mono text-[10px] text-muted-foreground">
              a calm example — paste a real username above to wrap your own
            </p>
          </div>
        )}
        {status === "loading" && username && (
          <TerminalLoader username={username} steps={steps} />
        )}
        {status === "success" && stats && <CardComposer stats={stats} />}
        {status === "error" && error && (
          <ErrorCard error={error} onRetry={() => username && handleGenerate(username)} />
        )}
      </div>
    </div>
  );
}
