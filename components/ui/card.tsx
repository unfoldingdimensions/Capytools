import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The house card: 24px radius, a hairline border, and `shadow-sm` at rest. With
 * `hover` it lifts 2px and settles onto `shadow-md` over 350ms on the entrance curve.
 * Only transform and box-shadow are transitioned, so the lift never triggers layout.
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'elevated' | 'outlined' | 'flat';
    hover?: boolean;
    gradient?: boolean;
  }
>(({ className, variant = 'default', hover = false, gradient = false, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-3xl bg-card text-card-foreground transition-[transform,box-shadow] duration-move ease-entrance',
        {
          'border border-border bg-card shadow-sm': variant === 'elevated' || variant === 'default',
          'border border-border bg-transparent': variant === 'outlined',
          'border-none bg-muted/50': variant === 'flat',
        },
        hover && 'hover:-translate-y-0.5 hover:shadow-md',
        gradient && 'bg-gradient-to-br from-card to-muted',
        className
      )}
      {...props}
    />
  );
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

/**
 * The card heading. Level is a prop because a card title is not inherently an `h3`:
 * it is whatever level the card sits at. The landing page nests cards under an `h2`,
 * so `h3` is right there; the two index hubs put a card grid straight under the `h1`,
 * and a hardcoded `h3` there skipped a level — twelve `h3`s and no `h2` on
 * `/free-cv-builder`. Default stays `h3` so existing usage is unchanged.
 */
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h2' | 'h3' | 'h4' }
>(({ className, as: Tag = 'h3', ...props }, ref) => (
  <Tag
    ref={ref}
    className={cn('font-display text-title-md font-normal leading-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-body-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
