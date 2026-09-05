import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpenseDashboard } from "../src/components/capyexpense/ExpenseDashboard";
import { buildDashboard } from "../src/lib/capyexpense/aggregate";
import type { RangeState } from "../src/lib/capyexpense/bucket";
import { dataSpanOf, resolveRange } from "../src/lib/capyexpense/bucket";
import { DEFAULT_LOCALE } from "../src/lib/capyexpense/format";
import { SAMPLE_CURRENCY, SAMPLE_NOW, SAMPLE_TRANSACTIONS } from "../src/lib/capyexpense/sample";
import type { LoadProblem, Transaction } from "../src/lib/capyexpense/types";

const span = dataSpanOf(SAMPLE_TRANSACTIONS);

function render(
  preset: RangeState["preset"] = "month",
  rows: readonly Transaction[] = SAMPLE_TRANSACTIONS,
  problems: LoadProblem[] = [],
) {
  const state: RangeState = { preset, anchor: SAMPLE_NOW };
  const range = resolveRange(state, { weekStart: 1, dataSpan: span });
  const model = buildDashboard(rows, range, {
    now: SAMPLE_NOW,
    weekStart: 1,
    currency: SAMPLE_CURRENCY,
  });
  return renderToStaticMarkup(
    <ExpenseDashboard
      model={model}
      state={state}
      greeting="good evening"
      name="ada"
      weekStart={1}
      today={SAMPLE_NOW}
      locale={DEFAULT_LOCALE}
      problems={problems}
      onRangeChange={() => {}}
    />,
  );
}

describe("ExpenseDashboard renders", () => {
  it("greets by name and names the range", () => {
    const html = render();
    expect(html.toLowerCase()).toContain("good evening");
    expect(html).toContain("ada");
    expect(html.toLowerCase()).toContain("september 2026");
    expect(html).toContain("CapyExpense · tool no. 5");
  });

  it("never leaks a broken number into the page", () => {
    // One blanket assertion that catches most formatting bugs at once: a
    // divide-by-zero, a missing null guard, an object stringified by accident.
    for (const preset of ["day", "week", "month", "year", "all"] as const) {
      const html = render(preset);
      expect(html, preset).not.toMatch(/NaN|Infinity|\[object Object\]|undefined/);
    }
  });

  it("draws real chart geometry, not empty paths", () => {
    const html = render();
    const paths = [...html.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(0);
    for (const d of paths) expect(d.startsWith("M")).toBe(true);
    expect(html).toContain("<rect");
  });

  it("announces changes through exactly one live region", () => {
    const html = render();
    expect(html.match(/aria-live="polite"/g)).toHaveLength(1);
    expect(html).toContain('role="status"');
  });

  it("labels every chart for screen readers", () => {
    const html = render();
    const labelled = html.match(/role="img"/g) ?? [];
    expect(labelled.length).toBeGreaterThanOrEqual(2);
    // Every role="img" carries an aria-label rather than relying on the SVG.
    expect((html.match(/role="img" aria-label="/g) ?? []).length).toBe(labelled.length);
  });

  it("gives the range buttons a pressed state rather than faking tabs", () => {
    const html = render();
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('role="tablist"');
  });

  it("pairs every date input with a real label", () => {
    const html = render("custom");
    const ids = [...html.matchAll(/<input[^>]*id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(html).toContain(`for="${id}"`);
  });

  it("shows an empty state instead of a blank card when there is nothing", () => {
    const html = render("month", []);
    expect(html.toLowerCase()).toContain("nothing in this window");
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it("surfaces skipped rows with the Excel row number, and keeps rendering", () => {
    const html = render("month", SAMPLE_TRANSACTIONS, [
      { level: "warn", file: "CapyExpense-2026.xlsx", sheet: "Sep", row: 41, message: "couldn't read \"n/a\" as a number" },
    ]);
    expect(html.toLowerCase()).toContain("1 row skipped");
    expect(html.toLowerCase()).toContain("row 41");
    // The rest of the dashboard is still there.
    expect(html.toLowerCase()).toContain("total spend");
  });

  it("keeps the copy in the house voice", () => {
    const html = render();
    expect(html.toLowerCase()).toContain("no-spend days");
    expect(html.toLowerCase()).toContain("what repeats");
    // Direction, never judgement — no praise or scolding anywhere.
    expect(html.toLowerCase()).not.toMatch(/well done|great job|you should|too much|overspent/);
  });
});

describe("registration parity", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

  it("is on the landing page with the hero count bumped", () => {
    const home = read("../src/app/page.tsx");
    expect(home).toContain('href: "/capyexpense"');
    expect(home).toContain('eyebrow: "tool no. 5"');
    expect(home).toContain("Five of them so far.");
  });

  it("is in the header navigation", () => {
    const header = read("../src/components/header.tsx");
    expect(header).toContain('{ href: "/capyexpense", label: "Expense" }');
  });

  it("no longer claims every tool runs in the browser", () => {
    // CapyExpense is a desktop app; the old blanket promise would be false.
    const home = read("../src/app/page.tsx");
    expect(home).not.toContain("All run in your browser");
    const agents = read("../AGENTS.md");
    expect(agents).toContain("Desktop tools");
  });
});
