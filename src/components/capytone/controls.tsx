"use client";

/**
 * Shared controls for the CapyTone hub modes (Phase B).
 *
 * The `Pill` is the same stage-tab pill CapyResize and the Feel flow carry;
 * it lives here so the three new mode components share one copy instead of
 * growing a fourth and fifth duplicate.
 */

import { useCallback, useState } from "react";
import { formatHex, parse } from "culori";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COPIED_MS } from "@/lib/capytools/feedback";
import { copyText } from "@/lib/capytone/export";
import { toOklchOrNull } from "@/lib/capytone/engine/color";
import { cn } from "@/lib/utils";

export const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

/** Copy button with the house fixed width — no layout shift on "Copied".
 * Shared by the hub modes (Blend's css, Extract's hexes). */
export function WellCopy({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    void copyText(text).then((ok) => {
      setCopied(ok);
      window.setTimeout(() => setCopied(false), COPIED_MS);
    });
  }, [text]);
  return (
    <Button
      size="sm"
      variant="outline"
      className="min-w-[84px] rounded-full"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function Pill({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-muted/30 text-muted-foreground hover:border-primary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * A colour slot: native picker + free-text field. The text accepts any CSS
 * colour the engine can parse; the picker always shows the nearest hex and
 * writes hex back. Invalid text renders a quiet note, never a thrown error.
 */
export function ColorPick({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = toOklchOrNull(value);
  const pickerValue = parsed ? formatHex(parse(value.trim())!) : "#000000";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`${id}-text`} className={labelClass}>
        {label}
      </label>
      <input
        type="color"
        aria-label={`${label} picker`}
        value={pickerValue}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 cursor-pointer rounded-full border border-border bg-transparent p-0.5"
      />
      <Input
        id={`${id}-text`}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-28 bg-muted/40 font-mono text-xs uppercase"
      />
      {!parsed ? (
        <span className="text-[11px] text-[var(--clay)]">not a colour this can read</span>
      ) : null}
    </div>
  );
}
