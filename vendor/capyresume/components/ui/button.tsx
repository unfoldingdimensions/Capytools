import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * The house button (DESIGN.md §Components): a full-round pill, sentence case, and no
 * shadow of its own — emphasis comes from the sage fill, not from elevation. The
 * primary is the one high-emphasis action on a screen, and `destructive` is a tinted
 * wash rather than a solid red.
 *
 * Motion is colour-only (`--dur-fade`, `--ease-ui`) plus a 1px press nudge, so a
 * button never shifts its neighbours. Focus is the global `:focus-visible` outline —
 * nothing here sets `outline-none`, or it would erase that ring.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-fade ease-ui active:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        // The single high-emphasis action: sage fill, dark ink.
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30',
        outline: 'border border-border bg-background hover:bg-muted hover:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-muted hover:text-foreground',
        ghostSubtle: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        link: 'text-sage-deep underline-offset-4 hover:underline dark:text-primary',
        // Aliases for the primary action, kept so older call sites keep working.
        gradient: 'bg-primary text-primary-foreground hover:bg-primary/80',
        brand: 'bg-primary text-primary-foreground hover:bg-primary/80',
        softLanding:
          'border border-border bg-card/90 text-foreground shadow-lg backdrop-blur hover:bg-card',
      },
      size: {
        xs: 'h-6 px-2.5 text-label-caps',
        sm: 'h-8 px-3 text-ui-sm',
        default: 'h-9 px-5 text-ui-sm',
        lg: 'h-12 px-6 text-ui-md',
        xl: 'h-12 px-6 text-ui-md',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
