import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        warning:
          'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        info: 'border-transparent bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
        brand:
          'border-transparent bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
      },
      shape: {
        default: 'rounded-md',
        pill: 'rounded-full',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2.5 py-0.5 text-[11px]',
        lg: 'px-3 py-1 text-sm',
        xs: 'px-2 py-0.5 text-[10px]',
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

function Badge({ className, variant, shape, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, shape }), className)} {...props} />;
}

export { Badge, badgeVariants };
