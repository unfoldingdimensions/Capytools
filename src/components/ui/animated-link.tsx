"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { TransitionLink } from "@/components/TransitionLink";
import { cn } from "@/lib/utils";

/**
 * Link whose underline wipes in from the left on hover/focus, with an optional
 * arrow that nudges. The underline is a pseudo-element scale so it animates on
 * the compositor rather than reflowing text.
 */
export function AnimatedLink({
  children,
  className,
  arrow = false,
  wipe = false,
  ...props
}: ComponentProps<typeof Link> & { arrow?: boolean; wipe?: boolean; children: ReactNode }) {
  const Anchor = wipe ? TransitionLink : Link;
  return (
    <Anchor
      {...props}
      className={cn(
        "group relative inline-flex items-center gap-1.5 font-medium text-foreground",
        // underline: scaleX from the left, driven by the group's hover/focus
        "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left",
        "after:scale-x-0 after:bg-current after:transition-transform after:duration-350",
        "after:ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:after:scale-x-100 focus-visible:after:scale-x-100",
        "motion-reduce:after:transition-none",
        className,
      )}
    >
      {children}
      {arrow && (
        <span
          aria-hidden
          className="inline-block transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
        >
          →
        </span>
      )}
    </Anchor>
  );
}
