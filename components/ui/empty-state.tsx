import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-t-3xl border border-dashed border-border/80 bg-muted/20 px-8 py-14 text-center',
                className
            )}
        >
            {Icon && (
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground">
                    <Icon className="h-7 w-7" strokeWidth={1.5} />
                </div>
            )}
            <h3 className="font-display text-xl font-medium tracking-tight text-foreground">{title}</h3>
            {description && (
                <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">{description}</p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
