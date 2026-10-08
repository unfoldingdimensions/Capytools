import { cn } from '@/lib/utils';

/**
 * Loading states, in the palette. The old version was the last place still using zinc,
 * white and a `blur-xl` glow — a filter blur on an animating element forces a backdrop
 * re-sample every frame, so the halo is now a plain tinted disc that pulses instead.
 */
export function AIGlowingLoader({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
    xl: 'h-32 w-32',
  };

  return (
    <div className={cn('relative flex items-center justify-center', sizes[size], className)}>
      {/* Halo — a tint, never a blur filter */}
      <div className="absolute inset-0 animate-pulse rounded-full bg-primary/15" />

      {/* Morphing background layer */}
      <div className="absolute inset-2 animate-[spin_4s_linear_infinite] rounded-full border border-border bg-gradient-to-br from-primary/5 to-transparent" />

      {/* Rotating outer ring */}
      <div className="absolute inset-0 animate-[spin_2s_ease-in-out_infinite] rounded-full border-2 border-transparent border-l-border border-t-primary/40" />

      {/* Counter-rotating inner ring */}
      <div className="absolute inset-3 animate-[spin_1.5s_ease-in-out_infinite_reverse] rounded-full border border-transparent border-b-muted-foreground/30 border-r-muted-foreground/15" />

      {/* Solid centre */}
      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
    </div>
  );
}

/**
 * A granular shimmer skeleton element for building precise loading states.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative animate-pulse overflow-hidden rounded-md bg-muted',
        'after:absolute after:inset-0 after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-foreground/[0.06] after:to-transparent',
        className
      )}
      {...props}
    />
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className="h-full bg-primary transition-[width] duration-move ease-entrance"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function CircularLoader({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-[1.5px]',
    md: 'h-10 w-10 border-2',
    lg: 'h-16 w-16 border-[3px]',
  };

  return (
    <div className={cn('relative', className)}>
      <div className={cn('rounded-full border-border', sizeClasses[size])} />
      <div
        className={cn(
          'animate-spin-fast absolute inset-0 rounded-full border-primary border-t-transparent',
          sizeClasses[size]
        )}
      />
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-3xl border border-border bg-card p-6 shadow-sm', className)}>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-48 rounded-lg" />
          <Skeleton className="h-3 w-32 rounded-lg" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-3 w-full rounded-lg" />
        <Skeleton className="h-3 w-[85%] rounded-lg" />
        <Skeleton className="h-3 w-[60%] rounded-lg" />
      </div>
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  );
}
