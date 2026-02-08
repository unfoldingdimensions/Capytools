'use client';

import { cn } from '@/lib/utils';

interface ScoreProgressRingProps {
    /** Score value (0-100) */
    score: number;
    /** Size of the ring: 'sm' = 80px, 'md' = 120px, 'lg' = 160px */
    size?: 'sm' | 'md' | 'lg';
    /** Color theme based on score */
    color?: 'red' | 'yellow' | 'green' | 'auto';
    /** Label to display below the score */
    label?: string;
    /** Whether the score is being calculated */
    isLoading?: boolean;
    /** Custom class name */
    className?: string;
}

const sizeConfig = {
    sm: { diameter: 80, strokeWidth: 6, fontSize: 'text-xl', labelSize: 'text-xs' },
    md: { diameter: 120, strokeWidth: 8, fontSize: 'text-3xl', labelSize: 'text-sm' },
    lg: { diameter: 160, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-base' },
};

const colorConfig = {
    red: {
        stroke: 'stroke-zinc-900 dark:stroke-white',
        bg: 'stroke-zinc-100 dark:stroke-zinc-800',
        text: 'text-zinc-900 dark:text-white',
    },
    yellow: {
        stroke: 'stroke-zinc-900 dark:stroke-white',
        bg: 'stroke-zinc-100 dark:stroke-zinc-800',
        text: 'text-zinc-900 dark:text-white',
    },
    green: {
        stroke: 'stroke-zinc-900 dark:stroke-white',
        bg: 'stroke-zinc-100 dark:stroke-zinc-800',
        text: 'text-zinc-900 dark:text-white',
    },
};

function getAutoColor(_score: number): 'red' | 'yellow' | 'green' {
    // In monochrome mode, we use the same color config for all
    return 'green';
}

export function ScoreProgressRing({
    score,
    size = 'md',
    color = 'auto',
    label,
    isLoading = false,
    className,
}: ScoreProgressRingProps) {
    const { diameter, strokeWidth, fontSize, labelSize } = sizeConfig[size];
    const resolvedColor = color === 'auto' ? getAutoColor(score) : color;
    const colors = colorConfig[resolvedColor];

    const radius = (diameter - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(score, 0), 100);
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className={cn('relative inline-flex flex-col items-center', className)}>
            <svg
                width={diameter}
                height={diameter}
                viewBox={`0 0 ${diameter} ${diameter}`}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={diameter / 2}
                    cy={diameter / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    className={colors.bg}
                />
                {/* Progress circle */}
                <circle
                    cx={diameter / 2}
                    cy={diameter / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className={cn(colors.stroke, 'transition-all duration-700 ease-out')}
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: isLoading ? circumference : strokeDashoffset,
                    }}
                />
            </svg>
            {/* Score display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isLoading ? (
                    <div className="animate-pulse">
                        <div className={cn('h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded', size === 'sm' && 'h-4 w-8')} />
                    </div>
                ) : (
                    <>
                        <span className={cn(fontSize, 'font-bold', colors.text)}>
                            {Math.round(score)}
                        </span>
                        {label && (
                            <span className={cn(labelSize, 'text-muted-foreground font-medium')}>
                                {label}
                            </span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
