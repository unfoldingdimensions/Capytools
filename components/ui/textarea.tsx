import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[100px] w-full resize-y rounded-xl border border-transparent bg-gray-50/80 px-4 py-3 text-sm shadow-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground/50 focus-visible:border-gray-200 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800/80 dark:focus-visible:border-gray-700 dark:focus-visible:bg-gray-900',
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
