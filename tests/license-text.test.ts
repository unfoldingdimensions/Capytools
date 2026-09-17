import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LICENSE_TEXT } from "../src/lib/capytools/license-text";

/**
 * /license renders the project's licence. It used to read LICENSE from disk at
 * module scope, which worked on a Node server and returned a 500 on Cloudflare
 * Workers — module scope is evaluated when the worker imports the route, and
 * there is no filesystem there (ENOENT /bundle/LICENSE). The read moved to a
 * prebuild step; these two tests are what stop that trade going wrong.
 */
describe("the generated licence text", () => {
  it("is byte-identical to the repo's LICENSE — no drift", () => {
    // If this fails, the generator has not been run: `npm run build`, or
    // `node scripts/generate-license-text.mjs`.
    const canonical = readFileSync(join(process.cwd(), "LICENSE"), "utf8");
    expect(LICENSE_TEXT).toBe(canonical);
  });

  it("is a real licence, not an empty string that would render a blank page", () => {
    expect(LICENSE_TEXT).toContain("Apache License");
    expect(LICENSE_TEXT).toContain("Version 2.0");
    expect(LICENSE_TEXT.length).toBeGreaterThan(10_000);
  });
});
