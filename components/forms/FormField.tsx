'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils/cn';

const Label = React.forwardRef<
    React.ElementRef<typeof LabelPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={cn(
            'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            className
        )}
        {...props}
    />
));
Label.displayName = LabelPrimitive.Root.displayName;

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
    label?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    id?: string;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
    ({ className, label, error, helperText, required, id, children, ...props }, ref) => {
        const generatedId = React.useId();
        const fieldId = id || generatedId;
        const errorId = `${fieldId}-error`;
        const descriptionId = `${fieldId}-description`;

        return (
            <div ref={ref} className={cn('space-y-2', className)} {...props}>
                {label && (
                    <Label htmlFor={fieldId} className={cn(error && 'text-red-500')}>
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                )}
                {children}
                {helperText && !error && (
                    <p id={descriptionId} className="text-[0.8rem] text-muted-foreground">
                        {helperText}
                    </p>
                )}
                {error && (
                    <p id={errorId} className="text-[0.8rem] font-medium text-red-500 animate-in slide-in-from-top-1 fade-in-0">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);
FormField.displayName = 'FormField';

export { FormField, Label };
