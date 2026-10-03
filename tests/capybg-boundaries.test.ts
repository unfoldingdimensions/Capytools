import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CapyBg's boundaries: the promises that are only provable from the source.
 * Everything here guards the visitor-facing sentence "your photo never
 * leaves this tab" — the engine can only load lazily and from same-origin,
 * and the binaries it needs never enter git.
 *
 * (The lazy-import, no-upload and wasmPaths guards join in the engine PR,
 * where the code they guard is written.)
 */

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Every .ts/.tsx/.json file under src/, recursively. */
function srcFiles(dir = join(process.cwd(), "src")): string[] {
  return readdirSync(dir, { recursive: true })
    .map((name) => join(dir, String(name)))
    .filter((path) => /\.(ts|tsx|json)$/.test(path) && statSync(path).isFile());
}

describe("capybg never touches a third-party CDN", () => {
  it("no string in src/ mentions jsdelivr — ORT's default wasmPaths is forbidden", () => {
    for (const path of srcFiles()) {
      expect(readFileSync(path, "utf8"), `${path} mentions cdn.jsdelivr`).not.toContain("cdn.jsdelivr");
    }
  });
});

describe("capybg binaries stay out of git", () => {
  it(".gitignore excludes /public/capybg/", () => {
    expect(source(".gitignore")).toContain("/public/capybg/");
  });
});
