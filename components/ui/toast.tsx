'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastOptions {
  title: string;
  message?: string;
  variant?: ToastVariant;
}

type ToastInput = Omit<ToastOptions, 'variant'>;

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  success: (options: ToastInput) => void;
  error: (options: ToastInput) => void;
  info: (options: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) clearTimeout(timer);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (variant: ToastVariant) => (options: ToastInput) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, variant, ...options }]);
      timers.current[id] = setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: (options) => push(options.variant ?? 'info')(options),
      success: push('success'),
      error: push('error'),
      info: push('info'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 left-4 right-4 z-[200] flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-96"
        role="region"
        aria-live="polite"
        aria-label="notifications"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const Icon =
    item.variant === 'success' ? CheckCircle2 : item.variant === 'error' ? AlertCircle : Info;

  return (
    <div
      className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-md duration-move ease-entrance animate-in fade-in slide-in-from-bottom-2"
      role="status"
    >
      <Icon
        className={cn(
          'mt-0.5 h-5 w-5 shrink-0',
          item.variant === 'error'
            ? 'text-destructive'
            : item.variant === 'success'
              ? 'text-sage-deep dark:text-primary'
              : 'text-foreground'
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{item.title}</p>
        {item.message && <p className="mt-0.5 text-sm text-muted-foreground">{item.message}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-muted-foreground transition-colors duration-fade ease-ui hover:text-foreground"
        aria-label="dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
