import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The multi-line twin of `Input`, so a form has one focus treatment and one
 * fill instead of a hand-rolled field per component.
 *
 * Radii follow the shape, not the sibling: a single-line field is a pill, but a
 * multi-line field is an inset well, and DESIGN.md puts wells at `rounded-2xl`.
 * A 26px radius on a three-row box reads as a card.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 resize-y rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-base transition-[color,box-shadow,background-color] placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
