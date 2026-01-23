import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    'flex min-h-[100px] w-full rounded-xl border border-transparent bg-gray-50/80 dark:bg-gray-800/80 px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-white dark:focus-visible:bg-gray-900 focus-visible:border-gray-200 dark:focus-visible:border-gray-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 shadow-sm resize-y',
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Textarea.displayName = 'Textarea';

export { Textarea };

