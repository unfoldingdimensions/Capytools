import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * tests/license-text.test.ts compares the generated LICENSE_TEXT against the
 * repo's LICENSE byte for byte, so the two files' line endings must agree on
 * every platform. They agree only because `.gitattributes` pins `eol=lf`,
 * overriding a Windows checkout's `core.autocrlf=true`: without it a Windows
 * clone failed that test while Linux CI passed, and committing the regenerated
 * file swapped the two around.
 *
 * These tests fail the moment that attribute goes missing, naming the cause
 * instead of leaving it to surface as a byte-level diff in the licence test.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("line endings", () => {
  it(".gitattributes still pins LF for every text file", () => {
    expect(read(".gitattributes")).toMatch(/^\* text=auto eol=lf$/m);
  });

  it("the licence and the text generated from it hold no CR in the working tree", () => {
    for (const path of ["LICENSE", "src/lib/capytools/license-text.ts"]) {
      expect(
        read(path),
        `${path} carries CR — run: git rm -r --cached . -q && git reset --hard HEAD`,
      ).not.toContain("\r");
    }
  });
});
