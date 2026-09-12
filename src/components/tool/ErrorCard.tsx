"use client";

import { GithubError } from "@/lib/github/types";
import { CapyScene } from "@/components/mascot/CapyScene";
import { Button } from "@/components/ui/button";

/**
 * The suite's error state: a napping capybara, a plain sentence, and a retry
 * only when retrying could actually work.
 *
 * It used to take a `GithubError` and know the GitHub copy, so CapyStrip —
 * which fails for entirely different reasons — grew a second component beside
 * it with the same markup and different words. That is two implementations of
 * one idea. This is the markup and nothing else; the words come from the tool.
 *
 * `githubErrorNotice` below is the GitHub wording, kept here because it is
 * presentation copy rather than anything the data layer should know about.
 */
export type ErrorNotice = {
  title: string;
  body: string;
  /** Whether retrying could plausibly change the outcome. */
  retry?: boolean;
};

export function ErrorCard({
  title,
  body,
  onRetry,
  retryLabel = "try again",
}: {
  title: string;
  body: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card px-8 py-10 text-center">
      <CapyScene pose="nap" className="w-20 text-foreground/70" title="Napping capybara" />
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="mt-1 rounded-full">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

/** The GitHub-backed tools' wording, keyed by what went wrong. */
export function githubErrorNotice(kind: GithubError["kind"]): ErrorNotice {
  switch (kind) {
    case "not_found":
      return {
        title: "Hmm, that one isn't here.",
        body: "We couldn't find this GitHub username. Maybe it took a nap — double-check the spelling and try again.",
      };
    case "rate_limited":
      return {
        title: "GitHub is resting.",
        body: "GitHub allows about 60 free requests an hour. We've hit that quiet limit — wait a minute, then try again.",
        retry: true,
      };
    case "empty":
      return {
        title: "Nothing to wrap yet.",
        body: "This account has no public activity we could find. A calm card needs a little something to go on.",
      };
    default:
      return {
        title: "Something quiet went wrong.",
        body: "We couldn't reach GitHub just now. Check your connection and give it one more try.",
        retry: true,
      };
  }
}
