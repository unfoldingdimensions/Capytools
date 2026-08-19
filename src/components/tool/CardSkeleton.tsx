"use client";

import { Skeleton } from "@/components/ui/skeleton";

/** Calm loading placeholder — a slow "breathe" pulse, never a shimmer sweep. */
export function CardSkeleton() {
  return (
    <div className="w-full space-y-5 rounded-[20px] border border-border bg-card px-6 py-7 sm:px-8 opacity-90 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="h-px w-full bg-border" />
      <Skeleton className="h-16 w-2/3" />
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
      <Skeleton className="h-10 w-3/5" />
    </div>
  );
}
