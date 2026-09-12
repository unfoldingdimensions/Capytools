"use client";

import { useState } from "react";
import { CapyExpenseDemo } from "./CapyExpenseDemo";
import { CapyExpenseHeroChart, HERO_CHART_TOTAL } from "./CapyExpenseHeroChart";
import { Button } from "@/components/ui/button";

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
    <div className="relative w-full">
      <span aria-hidden className="lp-corner lp-corner-tl" />
      <span aria-hidden className="lp-corner lp-corner-tr" />
      <span aria-hidden className="lp-corner lp-corner-bl" />
      <span aria-hidden className="lp-corner lp-corner-br" />
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.10)]">
        {!open ? (
          <div className="px-6 pt-8 sm:px-10 sm:pt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">A year on one screen</p>
                <p className="mt-1 font-display text-[2rem] font-light leading-none tracking-tight text-foreground">
                  {HERO_CHART_TOTAL}
                </p>
              </div>
              <p className="max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
                Made-up numbers, real charts. This is the app&rsquo;s own code, running in the page.
              </p>
            </div>
            <div className="mt-6">
              <CapyExpenseHeroChart />
            </div>
          </div>
        ) : null}

        <div id="capyexpense-demo" className={open ? "px-6 pt-8 sm:px-10 sm:pt-10" : undefined}>
          {open ? <CapyExpenseDemo /> : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border bg-muted/30 px-6 py-5 sm:px-10">
          <Button
            size="lg"
            className="rounded-full"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="capyexpense-demo"
          >
            {open ? "Hide the dashboard" : "Show the whole dashboard"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {open
              ? "Every control works. Change the range and the numbers follow."
              : "Five charts, four numbers, and a range picker that actually works."}
          </p>
        </div>
      </div>
    </div>
  );
}
