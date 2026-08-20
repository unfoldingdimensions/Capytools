import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TerminalLoader } from "../src/components/tool/TerminalLoader";
import type { LoadStep } from "../src/components/tool/TerminalLoader";
import { TextReveal } from "../src/components/TextReveal";
import { WRAP_STEPS } from "../src/lib/github/wrap";

const steps = (states: LoadStep["state"][]): LoadStep[] =>
  WRAP_STEPS.map((label, i) => ({ label, state: states[i] ?? "pending" }));

describe("TerminalLoader", () => {
  it("announces real progress, not a fake percentage", () => {
    const html = renderToStaticMarkup(
      <TerminalLoader username="torvalds" steps={steps(["done", "done", "pending", "pending"])} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Wrapping torvalds: 2 of 4 steps complete");
    // Bar width is the completed fraction, so it can never claim progress that
    // hasn't happened.
    expect(html).toContain("50%");
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
    expect(html).toContain("1 of 4 steps complete"); // the failure is not counted
    expect(html).toContain("text-destructive");
  });

  it("reports 0/4 before anything resolves", () => {
    const html = renderToStaticMarkup(<TerminalLoader username="x" steps={steps([])} />);
    expect(html).toContain("0 of 4 steps complete");
    expect(html).toContain("0%");
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
