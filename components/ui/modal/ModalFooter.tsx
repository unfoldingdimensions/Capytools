'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const ModalFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            'flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:space-x-2',
            className
        )}
        {...props}
    />
);
ModalFooter.displayName = 'ModalFooter';

export { ModalFooter };
