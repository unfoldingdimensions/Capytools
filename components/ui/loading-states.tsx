import { cn } from "@/lib/utils/cn"
import { Loader2 } from "lucide-react"

export function ProgressBar({ value, className }: { value: number; className?: string }) {
    return (
        <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
            <div
                className="h-full bg-brand-600 transition-all duration-500 ease-out"
                style={{ width: `${value}%` }}
            />
        </div>
    )
}

export function CircularLoader({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-3",
        lg: "h-12 w-12 border-4",
    }

    return (
        <div className={cn("relative", className)}>
            <div className={cn(
                "rounded-full border-gray-200",
                sizeClasses[size]
            )} />
            <div className={cn(
                "absolute inset-0 rounded-full border-brand-600 border-t-transparent animate-spin",
                sizeClasses[size]
            )} />
        </div>
    )
}

export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn("rounded-2xl border border-gray-200 bg-white p-6 shadow-sm", className)}>
            <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
                <div className="space-y-2">
                    <div className="h-4 w-[200px] rounded bg-gray-200 animate-pulse" />
                    <div className="h-4 w-[150px] rounded bg-gray-200 animate-pulse" />
                </div>
            </div>
            <div className="mt-6 space-y-3">
                <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-[90%] rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-[80%] rounded bg-gray-200 animate-pulse" />
            </div>
        </div>
    )
}

export function LoadingSpinner({ className }: { className?: string }) {
    return <Loader2 className={cn("animate-spin text-brand-600", className)} />;
}
