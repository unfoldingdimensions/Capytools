import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 btn-press',
    {
        variants: {
            variant: {
                default: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow-md interactive-hover',
                destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm interactive-hover',
                outline: 'border-2 border-brand-200 text-brand-700 hover:bg-brand-50 bg-transparent',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm interactive-hover',
                ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                ghostSubtle: 'text-gray-500 hover:text-brand-700 hover:bg-brand-50',
                link: 'text-primary underline-offset-4 hover:underline',
                gradient: 'bg-gradient-to-r from-brand-600 to-purple-600 text-white hover:shadow-lg interactive-hover border-none',
                brand: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm interactive-hover border-none',
                softLanding: 'bg-white/90 backdrop-blur text-brand-700 hover:bg-white shadow-lg inner-border border-white/20',
            },
            size: {
                default: 'h-10 px-4 py-2',
                xs: 'h-8 px-2 text-xs rounded-md',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-lg px-8 text-base',
                xl: 'h-12 rounded-xl px-8 text-lg font-semibold',
                icon: 'h-10 w-10',
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
    ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || loading}
                {...props}
            >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </Comp>
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

