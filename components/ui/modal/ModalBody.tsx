'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const ModalBody = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('py-4', className)} {...props} />
);
ModalBody.displayName = 'ModalBody';

export { ModalBody };
