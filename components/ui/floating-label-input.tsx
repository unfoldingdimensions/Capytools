import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface FloatingLabelInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
    ({ className, label, id, value, onChange, onFocus, onBlur, helperText, leftIcon, rightIcon, ...props }, ref) => {
        const [focused, setFocused] = React.useState(false);
        const generatedId = React.useId();
        const inputId = id || generatedId;
        const hasValue = value !== '' && value !== undefined;

        return (
            <div className={cn("relative w-full", className)}>
                < div className="relative">
                    {leftIcon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
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
                            "peer w-full rounded-xl border-2 border-gray-200 bg-transparent px-4 py-3 pt-6 text-base transition-all focus:border-brand-500 focus:outline-none focus:ring-0 placeholder:opacity-0 focus:placeholder:opacity-100",
                            leftIcon && "pl-11",
                            rightIcon && "pr-11"
                        )}
                        {...props}
                    />

                    <label
                        htmlFor={inputId}
                        className={cn(
                            "absolute left-4 top-1/2 -translate-y-1/2 cursor-text text-sm text-gray-500 transition-all duration-200 pointer-events-none",
                            (hasValue || focused || !!props.placeholder)
                                ? "-translate-y-1/2 top-2.5 text-[10px] font-bold uppercase tracking-wider text-brand-600"
                                : "top-1/2",
                            leftIcon && "left-11"
                        )}
                    >
                        {label}
                    </label>
                    {rightIcon && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                            {rightIcon}
                        </div>
                    )}
                </div>

                {helperText && (
                    <p className="mt-1 text-xs text-gray-500 pl-4">{helperText}</p>
                )}
            </div>
        );
    }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';

export { FloatingLabelInput };
