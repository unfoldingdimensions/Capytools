import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CapyResume's boundaries: the promises only provable from the source.
 *
 * "Your details never leave this tab" — so no request API may appear in the
 * code the tool runs. And the AI assist is a planned PAID feature
 * (docs/plans/capyresume.md): its code stays in the tree, documented, but
 * nothing the site renders may reach it — the page, the editor and every
 * guide page are checked for an import of it.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(path, "utf8");

function filesUnder(dir: string): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { recursive: true })
    .map((name) => join(abs, String(name)))
    .filter((path) => /\.(ts|tsx)$/.test(path) && statSync(path).isFile());
}

/** The AI assist: the only CapyResume code allowed to make a request. */
const isAiAssist = (path: string) =>
  /[\\/]lib[\\/]capyresume[\\/]ai[\\/]/.test(path) || path.endsWith("AiAssist.tsx");

/** Everything the tool runs: its library, its components, its pages. */
const toolSources = [
  ...filesUnder("src/lib/capyresume"),
  ...filesUnder("src/components/capyresume"),
  ...filesUnder("src/app/capyresume"),
  join(root, "src", "components", "tool", "CapyResume.tsx"),
].filter((path) => !isAiAssist(path));

describe("capyresume makes no request with your data", () => {
  it("finds the sources it guards", () => {
    expect(toolSources.length).toBeGreaterThan(20);
  });

  it("no request API appears anywhere in the code the tool runs", () => {
    for (const path of toolSources) {
      expect(read(path), `${relative(root, path)} calls a request API`).not.toMatch(
        /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\s*\(/,
      );
    }
  });

  it("no api route exists for capyresume", () => {
    for (const path of filesUnder("src/app/api")) {
      expect(read(path), `${relative(root, path)} mentions capyresume`).not.toMatch(/capyresume/i);
    }
  });
});

describe("the AI assist is kept, but routed nowhere (a planned paid feature)", () => {
  it("is still in the tree, so the work is not lost", () => {
    expect(existsSync(join(root, "src", "components", "capyresume", "AiAssist.tsx"))).toBe(true);
    expect(existsSync(join(root, "src", "lib", "capyresume", "ai", "client.ts"))).toBe(true);
  });

  it("nothing outside the AI code imports it", () => {
    const everything = filesUnder("src").filter((path) => !isAiAssist(path));
    for (const path of everything) {
      expect(read(path), `${relative(root, path)} reaches the AI assist`).not.toMatch(
        /from\s+["']@\/(components\/capyresume\/AiAssist|lib\/capyresume\/ai\/)/,
      );
    }
  });
});
