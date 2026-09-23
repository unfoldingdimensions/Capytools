import { cn } from '@/lib/utils';

/**
 * A sophisticated, multi-layered glowing loader designed for AI thinking states.
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
      {/* Outer Glow Pulse */}
      <div className="absolute inset-0 animate-pulse rounded-full bg-zinc-400/20 blur-xl dark:bg-white/10" />

      {/* Morphing Background Layer */}
      <div className="absolute inset-2 animate-[spin_4s_linear_infinite] rounded-full border border-zinc-200 bg-gradient-to-br from-zinc-100/10 to-transparent dark:border-white/5" />

      {/* Rotating Outer Ring */}
      <div className="absolute inset-0 animate-[spin_2s_ease-in-out_infinite] rounded-full border-2 border-transparent border-l-zinc-900/10 border-t-zinc-900/30 dark:border-l-white/10 dark:border-t-white/30" />

      {/* Counter-Rotating Inner Ring */}
      <div className="absolute inset-3 animate-[spin_1.5s_ease-in-out_infinite_reverse] rounded-full border border-transparent border-b-zinc-400/40 border-r-zinc-400/20 dark:border-b-zinc-500/40 dark:border-r-zinc-500/20" />

      {/* Solid Center Core */}
      <div className="h-2.5 w-2.5 rounded-full bg-zinc-900 shadow-[0_0_15px_rgba(0,0,0,0.2)] dark:bg-white dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
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
        'relative animate-pulse overflow-hidden rounded-md bg-gray-200/60 dark:bg-gray-800/60',
        'after:absolute after:inset-0 after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent dark:after:via-white/5',
        className
      )}
      {...props}
    />
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800',
        className
      )}
    >
      <div
        className="cubic-bezier(0.65, 0, 0.35, 1) h-full bg-brand-600 transition-all duration-700"
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
      <div className={cn('rounded-full border-gray-100 dark:border-gray-800', sizeClasses[size])} />
      <div
        className={cn(
          'animate-spin-fast absolute inset-0 rounded-full border-brand-600 border-t-transparent',
          sizeClasses[size]
        )}
      />
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-black/[0.05] bg-white p-6 shadow-sm dark:border-white/[0.05] dark:bg-gray-900',
        className
      )}
    >
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
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    </div>
  );
}
