'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

const Form = React.forwardRef<
    HTMLFormElement,
    React.FormHTMLAttributes<HTMLFormElement>
>(({ className, ...props }, ref) => (
    <form ref={ref} className={cn('space-y-6', className)} {...props} />
));
Form.displayName = 'Form';

export { Form };
