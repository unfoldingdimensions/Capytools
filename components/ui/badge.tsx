import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Chips are labels, not buttons: the label voice (Albert Sans, uppercase, 0.18em
 * tracking) at 10-11px, sitting on a tint from the palette. They are deliberately
 * quiet — the outline and sage tints carry almost everything.
 *
 * The palette has no emerald/amber/sky, so the old `success`/`warning`/`info`
 * variants are gone rather than re-tinted off-hue; `brand` is kept, now on sage.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 border font-mono uppercase tracking-[0.18em] transition-colors duration-fade',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/15 text-sage-deep dark:bg-primary/25 dark:text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        outline: 'border-border text-foreground',
        brand:
          'border-transparent bg-primary/15 text-sage-deep dark:bg-primary/25 dark:text-primary',
      },
      shape: {
        default: 'rounded-md',
        pill: 'rounded-full',
      },
      size: {
        default: 'px-2 py-0.5 text-label-caps',
        sm: 'px-2 py-0.5 text-label-micro',
        lg: 'px-2.5 py-1 text-ui-sm',
        xs: 'px-1.5 py-0.5 text-label-micro',
      },
    },
    defaultVariants: {
      variant: 'default',
      shape: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, shape, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, shape, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
