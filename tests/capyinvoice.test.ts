import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { metadata } from "@/app/capyinvoice/page";
import { TOOL_GUIDES } from "@/lib/capytools/guides";
import { SUITE } from "@/lib/capytools/suite";

describe("registration — the suite knows CapyInvoice", () => {
  it("SUITE row 17 is CapyInvoice at /capyinvoice, with its plate", () => {
    expect(SUITE).toHaveLength(17);
    // Row 16 by position — the row is appended after CapyResume.
    const row = SUITE[16];
    expect(row.name).toBe("CapyInvoice");
    expect(row.short).toBe("Invoice");
    expect(row.href).toBe("/capyinvoice");
    expect(row.cat).toBe("browser");
    expect(row.appCategory).toBe("FinanceApplication");
    // (The plate FILE is the owner's image step — the landing's asset test is
    // the canary that stays red until public/plates/lab-17.webp exists.)
    expect(row.plate).toEqual({ src: "/plates/lab-17.webp", width: 896, height: 1200 });
  });

  it("the page's metadata carries the tool name and the promise", () => {
    expect(metadata.title).toContain("CapyInvoice");
    const description = metadata.description ?? "";
    expect(description.toLowerCase()).toContain("browser");
    // It is a generator people search for, and honesty about money matters:
    expect(metadata.title).toContain("invoice");
    expect(description).not.toMatch(/\b(guarantee\w*|compliant)\b/i);
  });

  it("carries a guide, and its claims hold against the code", () => {
    const guide = TOOL_GUIDES.CapyInvoice;
    expect(guide).toBeDefined();
    // Every arithmetic claim below is pinned by tests/capyinvoice-compute.test.ts:
    expect(guide?.summary).toContain("per-line tax");
    expect(guide?.summary).toContain("real PDF");
    const copy = [...(guide?.steps ?? []), ...(guide?.about ?? [])].join("\n");
    expect(copy).toContain("integer");
    expect(copy).toContain("in your browser");
    expect(copy).toContain("ISO 4217");
  });

  it("the README carries the tool's section and the count", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
    expect(readme).toContain("## 17. CapyInvoice");
    expect(readme).toContain("Seventeen so far");
  });

  it("the money promise: the tool's code makes no network request", () => {
    // The whole point of a private invoice tool. The component and its library
    // may not so much as name a request API (the CapyStamp rule).
    const sources = [
      readFileSync(join(process.cwd(), "src/components/tool/CapyInvoice.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "src/lib/capyinvoice/pdf.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "src/lib/capyinvoice/compute.ts"), "utf8"),
      readFileSync(join(process.cwd(), "src/lib/capyinvoice/store.ts"), "utf8"),
      readFileSync(join(process.cwd(), "src/lib/capyinvoice/business.ts"), "utf8"),
    ];
    for (const source of sources) {
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/XMLHttpRequest/);
      expect(source).not.toMatch(/WebSocket|EventSource|sendBeacon/);
    }
  });
});
