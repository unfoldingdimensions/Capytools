import { cn } from "@/lib/utils/cn"

/**
 * A sophisticated, multi-layered glowing loader designed for AI thinking states.
 */
export function AIGlowingLoader({ size = "md", className }: { size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
    const sizes = {
        sm: "h-8 w-8",
        md: "h-16 w-16",
        lg: "h-24 w-24",
        xl: "h-32 w-32",
    }

    return (
        <div className={cn("relative flex items-center justify-center", sizes[size], className)}>
            {/* Outer Glow Pulse */}
            <div className="absolute inset-0 rounded-full bg-brand-500/20 blur-xl animate-pulse" />

            {/* Morphing Background Layer */}
            <div className="absolute inset-2 rounded-full border border-brand-500/10 bg-gradient-to-br from-brand-500/5 to-purple-500/5 animate-[spin_4s_linear_infinite]" />

            {/* Rotating Outer Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-600/30 border-l-brand-600/30 animate-[spin_2s_ease-in-out_infinite]" />

            {/* Counter-Rotating Inner Ring */}
            <div className="absolute inset-3 rounded-full border border-transparent border-b-purple-500/40 border-r-purple-500/40 animate-[spin_1.5s_ease-in-out_infinite_reverse]" />

            {/* Solid Center Core */}
            <div className="h-2 w-2 rounded-full bg-brand-600 shadow-[0_0_15px_rgba(var(--brand-600-rgb),0.5)]" />
        </div>
    )
}

/**
 * A granular shimmer skeleton element for building precise loading states.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-gray-200/60 dark:bg-gray-800/60 relative overflow-hidden",
                "after:absolute after:inset-0 after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/20 dark:after:via-white/5 after:to-transparent",
                className
            )}
            {...props}
        />
    )
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
    return (
        <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800", className)}>
            <div
                className="h-full bg-brand-600 transition-all duration-700 cubic-bezier(0.65, 0, 0.35, 1)"
                style={{ width: `${value}%` }}
            />
        </div>
    )
}

export function CircularLoader({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
    const sizeClasses = {
        sm: "h-5 w-5 border-[1.5px]",
        md: "h-10 w-10 border-2",
        lg: "h-16 w-16 border-[3px]",
    }

    return (
        <div className={cn("relative", className)}>
            <div className={cn(
                "rounded-full border-gray-100 dark:border-gray-800",
                sizeClasses[size]
            )} />
            <div className={cn(
                "absolute inset-0 rounded-full border-brand-600 border-t-transparent animate-spin-fast",
                sizeClasses[size]
            )} />
        </div>
    )
}

export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn("rounded-2xl border border-black/[0.05] dark:border-white/[0.05] bg-white dark:bg-gray-900 p-6 shadow-sm", className)}>
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
    )
}

export function LoadingSpinner({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center justify-center", className)}>
            <div className="h-5 w-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
    );
}
