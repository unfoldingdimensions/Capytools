import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The house field: card fill (not a grey wash), a 12px radius, and a hairline
 * `--input` border that resolves to the sage ring on focus. Radius is the same in
 * both themes — squares alongside rounded neighbours look like a mistake, not a style.
 */
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
            'flex h-11 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-ui-md text-foreground transition-[color,background-color,border-color] duration-fade ease-ui file:border-0 file:bg-transparent file:text-ui-sm file:font-medium placeholder:text-muted-foreground/60 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50',
            leftIcon && 'pl-11',
            rightIcon && 'pr-11',
            error && 'border-destructive/50 bg-destructive/5 focus-visible:border-destructive',
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
