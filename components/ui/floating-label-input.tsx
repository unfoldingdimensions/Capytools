import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The same field surface as Input, with the label doing the work: it sits in the field
 * until there is focus or a value, then rises into the label voice above it. Only the
 * properties that actually change are transitioned — never `all`, which would drag
 * layout into a hover.
 */
export interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  (
    {
      className,
      label,
      id,
      value,
      onChange,
      onFocus,
      onBlur,
      helperText,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = React.useState(false);
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hasValue = value !== '' && value !== undefined;

    return (
      <div className={cn('relative w-full', className)}>
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            value={value}
            onChange={onChange}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            className={cn(
              'peer w-full rounded-xl border border-input bg-card px-4 pb-2.5 pt-6 text-ui-md text-foreground transition-[color,background-color,border-color] duration-fade ease-ui placeholder:opacity-0 focus:border-ring focus:placeholder:opacity-100',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11'
            )}
            {...props}
          />

          <label
            htmlFor={inputId}
            className={cn(
              'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 cursor-text text-ui-sm text-muted-foreground transition-[top,color] duration-move ease-entrance',
              hasValue || focused || !!props.placeholder
                ? 'top-3.5 -translate-y-1/2 text-label-micro font-medium uppercase tracking-[0.24em] text-sage-deep dark:text-primary'
                : 'top-1/2',
              leftIcon && 'left-11'
            )}
          >
            {label}
          </label>
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>

        {helperText && (
          <p className="mt-1.5 pl-4 text-caption text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';

export { FloatingLabelInput };
