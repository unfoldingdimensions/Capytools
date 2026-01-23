import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, leftIcon, rightIcon, error, ...props }, ref) => {
        return (
            <div className="relative w-full">
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {leftIcon}
                    </div>
                )}
                <input
                    type={type}
                    className={cn(
                        'flex h-11 w-full rounded-xl border border-transparent bg-gray-50/80 dark:bg-gray-800/80 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-white dark:focus-visible:bg-gray-900 focus-visible:border-gray-200 dark:focus-visible:border-gray-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 shadow-sm',
                        leftIcon && "pl-11",
                        rightIcon && "pr-11",
                        error && "border-destructive/50 bg-destructive/5 focus-visible:border-destructive",
                        className
                    )}
                    aria-invalid={!!error}
                    ref={ref}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {rightIcon}
                    </div>
                )}
            </div>
        );
    }
);
Input.displayName = 'Input';

export { Input };

