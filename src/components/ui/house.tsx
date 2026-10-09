import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * The house controls for a tool's editor, shared so every tool reads the same.
 * Every button fills on hover so it reads as pressable, in one of four weights:
 * primary (filled at rest — one per card, the action the card exists for),
 * neutral (sage fill on hover), additive (sage-tinted at rest) and destructive
 * (fills red). DESIGN.md "Controls" is the rule; this file is its one copy.
 */

export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background";
export const PRIMARY_BTN = `inline-flex items-center justify-center gap-1.5 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background disabled:pointer-events-none disabled:opacity-60 pointer-coarse:min-h-11 ${FOCUS}`;
export const BTN = `inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[13px] transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-60 pointer-coarse:min-h-11 ${FOCUS}`;
export const ICON_BTN = `inline-grid size-8 shrink-0 place-items-center rounded-full border border-border text-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground pointer-coarse:size-11 ${FOCUS}`;
export const DANGER_BTN = `inline-flex items-center rounded-full border border-border px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:border-destructive hover:bg-destructive hover:text-background pointer-coarse:min-h-11 ${FOCUS}`;
export const ADD_BTN = `inline-flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary/10 px-3.5 py-1.5 text-[13px] transition-colors hover:bg-primary hover:text-primary-foreground pointer-coarse:min-h-11 ${FOCUS}`;
/** A segmented choice (invoice / quote / receipt): the chosen one is filled. */
export const CHOICE_BTN = (active: boolean) =>
  cn(
    `rounded-full border px-4 py-1.5 text-sm transition-colors pointer-coarse:min-h-11 ${FOCUS}`,
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border hover:border-primary hover:bg-primary hover:text-primary-foreground",
  );
export const FIELD =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/70 hover:border-primary/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50";
export const LABEL = "mb-1.5 block text-xs font-medium text-muted-foreground";
/** A group heading inside a card: a step above the field labels. */
export const GROUP = "text-[13px] font-semibold text-foreground";
/** A section heading inside a card, in the display face. */
export const SECTION = "font-display text-2xl font-light leading-tight";
/** The house Select's trigger (`@/components/ui/select`) — never a native <select>. */
export const SELECT_TRIGGER =
  "min-w-36 rounded-full bg-background transition-colors hover:border-primary";

/** A visible label above its control — placeholders vanish once you type. */
export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}
