import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  return {
    default: (props: Record<string, unknown>) =>
      createElement("img", { src: props.src, alt: props.alt }),
  };
});

import GlobalError from "../src/app/global-error";
import NotFound from "../src/app/not-found";

/**
 * The failure modes these guard are the ones nobody sees until a real visitor
 * hits them: a stock Next error screen with no way back, or a global boundary
 * that reaches for the very tokens that failed to load.
 */

const src = (p: string) => readFileSync(join(process.cwd(), "src", "app", p), "utf8");

describe("the 404", () => {
  const html = renderToStaticMarkup(<NotFound />);

  it("offers a way back", () => {
    expect(html).toContain('href="/"');
  });

  it("wears the suite's chrome rather than Next's default", () => {
    expect(html).toContain("lp-display");
  });

  it("shows the capybara, not a bare message", () => {
    expect(html).toContain("capy-surprise.svg");
  });
});

describe("the route error boundary", () => {
  // Rendering it needs a client runtime; the contract worth pinning is in the
  // source: it must be a client component, must take `reset`, and must not be
  // the place a visitor gets stranded.
  const file = src("error.tsx");

  it("is a client component — a boundary cannot be a server one", () => {
    expect(file.startsWith('"use client"')).toBe(true);
  });

  it("wires reset, so 'try again' is real and not decoration", () => {
    expect(file).toContain("onClick={reset}");
  });

  it("offers a way back as well as a retry", () => {
    expect(file).toContain('href="/"');
  });

  it("surfaces the digest — the only id React leaves in production", () => {
    expect(file).toContain("error.digest");
  });

  it("repeats the privacy promise, because an error is when it is doubted", () => {
    expect(file).toMatch(/never|cannot change that|browser/i);
  });
});

describe("the global error boundary", () => {
  const html = renderToStaticMarkup(
    <GlobalError error={Object.assign(new Error("boom"), { digest: "abc123" })} reset={() => {}} />,
  );

  it("renders its own html and body — it replaces the root layout", () => {
    const file = src("global-error.tsx");
    expect(file).toContain("<html");
    expect(file).toContain("<body");
  });

  it("imports nothing from the app it is catching", () => {
    // globals.css, tokens.css and the ThemeProvider may be exactly what failed.
    // Reaching for them here is how a global boundary throws inside itself.
    const file = src("global-error.tsx");
    expect(file).not.toMatch(/^import .*(globals\.css|tokens\.css|@\/components|@\/lib)/m);
  });

  it("still looks like the site, with literal brand colours", () => {
    expect(html).toContain("#f9f9f7");
    expect(html).toContain("#8e9b7e");
  });

  it("gives a retry and a link home", () => {
    expect(html).toContain("try again");
    expect(html).toContain('href="/"');
  });

  it("shows the digest when there is one", () => {
    expect(html).toContain("abc123");
  });
});
