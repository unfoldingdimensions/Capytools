"use client";

import { GithubError } from "@/lib/github/types";
import { CapyMark } from "@/components/mascot/CapyMark";
import { Button } from "@/components/ui/button";

function copy(kind: GithubError["kind"]): { title: string; body: string } {
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
      };
  }
}

export function ErrorCard({ error, onRetry }: { error: GithubError; onRetry?: () => void }) {
  const { title, body } = copy(error.kind);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-[20px] border border-border bg-card px-8 py-10 text-center">
      <CapyMark className="w-10 text-foreground/50" />
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
      {onRetry && error.kind === "rate_limited" ? (
        <Button variant="outline" onClick={onRetry} className="mt-1 rounded-full">
          try again
        </Button>
      ) : null}
    </div>
  );
}
