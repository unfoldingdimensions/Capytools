'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { dur, ease } from '@/lib/capytools/motion';
import { Button } from './button';

interface MonthPickerProps {
  value?: string; // YYYY-MM
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthPicker({
  value = '', // Default to empty string
  onChange,
  label,
  placeholder,
  className,
  disabled,
  leftIcon,
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Ensure we have a string for split operations
  const safeValue = value || '';

  // Parse current value
  const date = safeValue ? new Date(safeValue + '-01') : new Date();
  const [viewYear, setViewYear] = React.useState(date.getFullYear());

  const parts = safeValue.split('-');
  const selectedYear = parts.length >= 1 && parts[0] ? parseInt(parts[0]) : null;
  const selectedMonth = parts.length >= 2 && parts[1] ? parseInt(parts[1]) - 1 : null;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMonthClick = (monthIndex: number) => {
    const monthStr = (monthIndex + 1).toString().padStart(2, '0');
    onChange(`${viewYear}-${monthStr}`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const displayValue = safeValue.includes('-')
    ? (() => {
        const parts = safeValue.split('-');
        const monthPart = parts[1];
        const yearPart = parts[0];
        if (!monthPart || !yearPart) return '';
        const m = parseInt(monthPart);
        return `${MONTHS[m - 1]} ${yearPart}`;
      })()
    : '';

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'group peer relative w-full cursor-pointer rounded-xl border border-input bg-card px-4 py-3 pt-6 transition-[color,background-color,border-color] duration-fade ease-ui focus-within:border-ring',
          disabled && 'cursor-not-allowed opacity-50',
          isOpen && 'border-ring ring-4 ring-ring/10',
          leftIcon && 'pl-11'
        )}
      >
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-fade ease-ui group-hover:text-sage-deep dark:group-hover:text-primary">
            {leftIcon}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-ui-md font-medium transition-colors duration-fade ease-ui',
              displayValue ? 'text-foreground' : 'text-muted-foreground',
              !displayValue && !isOpen && !placeholder && 'opacity-0'
            )}
          >
            {displayValue || placeholder || 'select month'}
          </span>
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={`clear ${label.toLowerCase()}`}
              className="p-1 text-muted-foreground/60 transition-colors duration-fade ease-ui hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <label
          className={cn(
            'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer text-ui-sm text-muted-foreground transition-[top,color] duration-move ease-entrance',
            displayValue || isOpen || !!placeholder
              ? 'top-3.5 -translate-y-1/2 text-label-micro font-medium uppercase tracking-[0.24em] text-sage-deep dark:text-primary'
              : 'top-1/2',
            leftIcon && 'left-11'
          )}
        >
          {label}
        </label>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: dur.fade / 1000, ease: ease.slowOut }}
            className="absolute left-0 right-0 z-[100] mt-2 overflow-hidden rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between px-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="previous year"
                onClick={() => setViewYear((v) => v - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span className="font-display text-title-sm tabular-nums text-foreground">
                {viewYear}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="next year"
                onClick={() => setViewYear((v) => v + 1)}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {/* Months grid */}
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((m, i) => {
                const isSelected = selectedYear === viewYear && selectedMonth === i;
                return (
                  <motion.button
                    key={m}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleMonthClick(i)}
                    className={cn(
                      'h-10 rounded-lg text-ui-sm font-medium transition-colors duration-fade ease-ui',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {m}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-4 flex justify-center border-t border-border pt-4">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewYear(now.getFullYear());
                }}
                className="text-label-micro font-medium uppercase tracking-[0.24em] text-sage-deep transition-colors duration-fade ease-ui hover:text-foreground dark:text-primary"
              >
                go to this year
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
