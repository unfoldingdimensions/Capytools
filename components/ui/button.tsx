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
                default: 'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-sm hover:shadow-md interactive-hover',
                destructive: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 shadow-sm interactive-hover',
                outline: 'border-2 border-gray-200 text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-100 dark:hover:bg-gray-800 bg-transparent',
                secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 shadow-sm interactive-hover',
                ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                ghostSubtle: 'text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-100 dark:hover:bg-gray-800',
                link: 'text-black dark:text-white underline-offset-4 hover:underline',
                gradient: 'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black hover:shadow-lg interactive-hover border-none',
                brand: 'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black shadow-sm interactive-hover border-none',
                softLanding: 'bg-white/90 backdrop-blur text-black hover:bg-white shadow-lg inner-border border-gray-200 dark:bg-black/90 dark:text-white dark:border-gray-800',
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
        if (asChild) {
            return (
                <Slot
                    className={cn(buttonVariants({ variant, size, className }))}
                    ref={ref}
                    {...props}
                >
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
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

