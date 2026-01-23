"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";
import { AnimatePresence, motion } from "framer-motion";

interface MonthPickerProps {
    value?: string; // YYYY-MM
    onChange: (value: string) => void;
    label: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    leftIcon?: React.ReactNode;
}

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function MonthPicker({
    value = "", // Default to empty string
    onChange,
    label,
    placeholder,
    className,
    disabled,
    leftIcon
}: MonthPickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Ensure we have a string for split operations
    const safeValue = value || "";

    // Parse current value
    const date = safeValue ? new Date(safeValue + "-01") : new Date();
    const [viewYear, setViewYear] = React.useState(date.getFullYear());

    const parts = safeValue.split("-");
    const selectedYear = parts.length >= 1 && parts[0] ? parseInt(parts[0]) : null;
    const selectedMonth = parts.length >= 2 && parts[1] ? parseInt(parts[1]) - 1 : null;

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleMonthClick = (monthIndex: number) => {
        const monthStr = (monthIndex + 1).toString().padStart(2, "0");
        onChange(`${viewYear}-${monthStr}`);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
    };

    const displayValue = safeValue.includes("-") ? (() => {
        const parts = safeValue.split("-");
        const monthPart = parts[1];
        const yearPart = parts[0];
        if (!monthPart || !yearPart) return "";
        const m = parseInt(monthPart);
        return `${MONTHS[m - 1]} ${yearPart}`;
    })() : "";

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "peer group relative w-full cursor-pointer rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 pt-6 transition-all focus-within:border-brand-500",
                    disabled && "opacity-50 cursor-not-allowed",
                    isOpen && "border-brand-500 ring-4 ring-brand-500/10",
                    leftIcon && "pl-11"
                )}
            >
                {leftIcon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-hover:text-brand-500 transition-colors">
                        {leftIcon}
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <span className={cn(
                        "text-base font-medium transition-colors",
                        displayValue ? "text-foreground" : "text-muted-foreground",
                        (!displayValue && !isOpen && !placeholder) && "opacity-0"
                    )}>
                        {displayValue || placeholder || "Select date"}
                    </span>
                    {value && !disabled && (
                        <button
                            onClick={handleClear}
                            className="text-gray-300 hover:text-gray-500 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <label
                    className={cn(
                        "absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer text-sm text-muted-foreground transition-all duration-200 pointer-events-none",
                        (displayValue || isOpen || !!placeholder)
                            ? "-translate-y-1/2 top-2.5 text-[10px] font-bold uppercase tracking-wider text-brand-600"
                            : "top-1/2",
                        leftIcon && "left-11"
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
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute left-0 right-0 z-[100] mt-2 overflow-hidden rounded-2xl bg-white p-4 shadow-swiss border border-black/[0.05] dark:bg-gray-950 dark:border-white/[0.1]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 px-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => setViewYear(v => v - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                                {viewYear}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => setViewYear(v => v + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Months Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            {MONTHS.map((m, i) => {
                                const isSelected = selectedYear === viewYear && selectedMonth === i;
                                return (
                                    <motion.button
                                        key={m}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleMonthClick(i)}
                                        className={cn(
                                            "h-10 rounded-lg text-sm font-semibold transition-all",
                                            isSelected
                                                ? "bg-black text-white dark:bg-white dark:text-black shadow-lg"
                                                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                                        )}
                                    >
                                        {m}
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Quick Jumps or Footer if needed */}
                        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5 flex justify-center">
                            <button
                                onClick={() => {
                                    const now = new Date();
                                    setViewYear(now.getFullYear());
                                    // Optionally select current month too
                                }}
                                className="text-[10px] font-bold uppercase tracking-widest text-brand-600 hover:text-brand-700 transition-colors"
                            >
                                Go to Today
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
