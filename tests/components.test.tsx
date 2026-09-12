import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TerminalLoader } from "../src/components/tool/TerminalLoader";
import type { LoadStep } from "../src/components/tool/TerminalLoader";
import { TextReveal } from "../src/components/TextReveal";
import { WRAP_STEPS } from "../src/lib/github/wrap";

const steps = (states: LoadStep["state"][]): LoadStep[] =>
  WRAP_STEPS.map((label, i) => ({ label, state: states[i] ?? "pending" }));

/** Derived, so adding a request to the wrap does not break these assertions. */
const TOTAL = WRAP_STEPS.length;
const pct = (done: number) => `${(done / TOTAL) * 100}%`;

describe("TerminalLoader", () => {
  it("announces real progress, not a fake percentage", () => {
    const html = renderToStaticMarkup(
      <TerminalLoader username="torvalds" steps={steps(["done", "done", "pending", "pending"])} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(`Wrapping torvalds: 2 of ${TOTAL} steps complete`);
    // Bar width is the completed fraction, so it can never claim progress that
    // hasn't happened.
    expect(html).toContain(pct(2));
  });

  it("shows every request as a line, with details once known", () => {
    const withDetail = steps(["done", "pending", "pending", "pending"]);
    withDetail[0].detail = "@torvalds";
    const html = renderToStaticMarkup(<TerminalLoader username="torvalds" steps={withDetail} />);
    for (const label of WRAP_STEPS) expect(html).toContain(label);
    expect(html).toContain("@torvalds");
  });

  it("marks a failed request without claiming it finished", () => {
    const html = renderToStaticMarkup(
      <TerminalLoader username="x" steps={steps(["done", "failed", "pending", "pending"])} />,
    );
    expect(html).toContain(`1 of ${TOTAL} steps complete`); // the failure is not counted
    expect(html).toContain("text-destructive");
  });

  it("reports 0/4 before anything resolves", () => {
    const html = renderToStaticMarkup(<TerminalLoader username="x" steps={steps([])} />);
    expect(html).toContain(`0 of ${TOTAL} steps complete`);
    expect(html).toContain(pct(0));
  });
});

/**
 * The site states this contract in writing on /design: "Every motion dies
 * under prefers-reduced-motion". The CSS guard in globals.css cannot reach a
 * JS-driven animation, and motion's own default is `reducedMotion: "never"`,
 * so the wiring is asserted here — there is no jsdom in this suite to drive
 * `matchMedia` and observe the rendered difference.
 */
describe("reduced motion", () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

  it("applies motion's own reduced-motion contract app-wide", () => {
    expect(read("src/app/layout.tsx")).toContain("MotionProvider");
    expect(read("src/components/motion-provider.tsx")).toContain('reducedMotion="user"');
  });

  it("keeps a local guard where the config alone is not enough", () => {
    // Reveal/TextReveal must render their settled state outright (the config
    // only drops the transform); TerminalLoader runs an infinite pulse.
    for (const file of [
      "src/components/Reveal.tsx",
      "src/components/TextReveal.tsx",
      "src/components/tool/TerminalLoader.tsx",
    ]) {
      expect(read(file), `${file} should guard prefers-reduced-motion`).toContain(
        "useReducedMotion",
      );
    }
  });
});

describe("TextReveal", () => {
  it("keeps the sentence readable to assistive tech while animating words", () => {
    const html = renderToStaticMarkup(<TextReveal text="Your GitHub year," />);
    // One aria-label carries the whole line; the split spans are hidden.
    expect(html).toContain('aria-label="Your GitHub year,"');
    expect(html).toContain('aria-hidden');
    expect(html).toContain("GitHub");
  });

  it("preserves whitespace so the line still wraps naturally", () => {
    const html = renderToStaticMarkup(<TextReveal text="in a calm little card." />);
    const text = html.replace(/<[^>]+>/g, "");
    expect(text).toContain("in a calm little card.");
  });
});
