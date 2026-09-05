"use client";

import { useState } from "react";
import { CapyExpenseDemo } from "./CapyExpenseDemo";
import { CapyExpenseHeroChart } from "./CapyExpenseHeroChart";

/**
 * The landing page's centrepiece.
 *
 * At rest this is a landing page, not a dashboard: one chart that draws itself,
 * and an invitation. The full demo is a deliberate second click — dropping a
 * forty-widget dashboard on someone who arrived thirty seconds ago asks them to
 * work out what they are looking at before they know why they should care.
 */
export function CapyExpenseShowcase() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="capyexpense-demo"
          className="rounded-full bg-primary px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          {open ? "Hide the dashboard" : "Show the dashboard"}
        </button>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {open ? "Live, on made-up numbers" : "The real thing, running on made-up numbers"}
        </p>
      </div>

      <div id="capyexpense-demo">
        {open ? (
          <CapyExpenseDemo />
        ) : (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <CapyExpenseHeroChart />
          </div>
        )}
      </div>
    </div>
  );
}
