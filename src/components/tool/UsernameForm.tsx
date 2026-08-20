"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sanitizeUsername } from "@/lib/utils";

export function UsernameForm({
  onSubmit,
  busy,
}: {
  onSubmit: (username: string) => void;
  busy: boolean;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const username = sanitizeUsername(value);
    if (username) onSubmit(username);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="paste a github username…"
        className="h-12 flex-1 rounded-full border-border bg-card px-5 text-sm shadow-sm"
        aria-label="GitHub username"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      <Button
        type="submit"
        disabled={busy}
        className="h-12 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {busy ? "wrapping…" : "wrap it"}
      </Button>
    </form>
  );
}
