'use client';

import { cn } from '@/lib/utils';

interface ScoreProgressRingProps {
  /** Score value (0-100) */
  score: number;
  /** Size of the ring: 'sm' = 80px, 'md' = 120px, 'lg' = 160px */
  size?: 'sm' | 'md' | 'lg';
  /** Emphasis based on score band */
  color?: 'red' | 'yellow' | 'green' | 'auto';
  /** Label to display below the score */
  label?: string;
  /** Whether the score is being calculated */
  isLoading?: boolean;
  /** Custom class name */
  className?: string;
}

const sizeConfig = {
  sm: { diameter: 80, strokeWidth: 6, fontSize: 'text-title-sm', labelSize: 'text-caption' },
  md: { diameter: 120, strokeWidth: 8, fontSize: 'text-title-md', labelSize: 'text-ui-sm' },
  lg: { diameter: 160, strokeWidth: 10, fontSize: 'text-display-sm', labelSize: 'text-ui-md' },
};

/**
 * The score bands use the palette rather than a traffic-light ramp: sage when the score
 * reads well, clay when it wants attention, the destructive hue when it does not. The
 * track is the same hairline as every other border, so the ring sits on the page instead
 * of floating above it.
 */
const colorConfig = {
  red: { stroke: 'stroke-destructive', text: 'text-destructive' },
  yellow: { stroke: 'stroke-clay', text: 'text-clay' },
  green: { stroke: 'stroke-primary', text: 'text-sage-deep dark:text-primary' },
};

function getAutoColor(score: number): 'red' | 'yellow' | 'green' {
  if (score >= 75) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
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
        className="-rotate-90 transform"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-border"
        />
        {/* Progress */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(
            colors.stroke,
            'transition-[stroke-dashoffset] duration-hero ease-entrance'
          )}
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
            <div className={cn('h-6 w-12 rounded bg-muted', size === 'sm' && 'h-4 w-8')} />
          </div>
        ) : (
          <>
            <span className={cn('font-display', fontSize, colors.text)}>{Math.round(score)}</span>
            {label && (
              <span className={cn(labelSize, 'font-medium text-muted-foreground')}>{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
