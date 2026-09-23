import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Same surface as Input, one step taller. The old grey fills (`gray-50/80`,
 * `dark:bg-gray-800/80`) were the last raw Tailwind palette in the kit — every colour
 * now comes from a semantic token.
 */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[100px] w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-ui-md text-foreground transition-[color,background-color,border-color] duration-fade ease-ui placeholder:text-muted-foreground/60 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50',
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
