import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Import boundaries, enforced rather than trusted.
 *
 * Two failure modes this catches, both of which are silent until something
 * expensive breaks:
 *
 * 1. exceljs or a Tauri plugin reached from `src/app` or `src/components` gets
 *    bundled into the Next build. exceljs is a DEV dependency here, so the
 *    Vercel deploy fails — after a push, not before one.
 * 2. A shared dashboard component reaching for `next/*`, `motion`, or
 *    `localStorage` compiles fine on the web and breaks the desktop build,
 *    which is a separate Vite bundle that has no Next in it at all.
 */

const ROOT = join(__dirname, "..");

function walk(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // directory not created yet — nothing to police
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const read = (file: string) => readFileSync(file, "utf8");
const rel = (file: string) => file.slice(ROOT.length + 1).replace(/\\/g, "/");

describe("nothing browser-bound may reach the desktop-only layer", () => {
  const files = [...walk(join(ROOT, "src", "app")), ...walk(join(ROOT, "src", "components"))];

  it("finds files to check (guards against the walk silently returning nothing)", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each([
    ["exceljs", /from\s+["']exceljs/],
    ["the workbook reader/writer", /capyexpense\/workbook-(read|write)/],
    ["a Tauri plugin", /from\s+["']@tauri-apps/],
  ])("never imports %s", (_label, pattern) => {
    const offenders = files.filter((f) => pattern.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });
});

describe("shared dashboard components stay framework-agnostic", () => {
  // They render in BOTH the Next app and the desktop Vite bundle, so anything
  // Next-specific here breaks a build that no web test would ever exercise.
  const files = walk(join(ROOT, "src", "components", "capyexpense"));

  it.each([
    ["next/*", /from\s+["']next\//],
    ["next-themes", /from\s+["']next-themes/],
    ["motion", /from\s+["']motion/],
    ["a Tauri plugin", /from\s+["']@tauri-apps/],
    ["storage directly", /\b(localStorage|sessionStorage)\b/],
  ])("never imports %s", (_label, pattern) => {
    const offenders = files.filter((f) => pattern.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });
});

describe("shared modules survive a bundler that is not Next", () => {
  /**
   * Regression: `src/lib/utils.ts` exports `cn`, which every shared component
   * uses, and also evaluated `process.env` at module load. In the desktop app's
   * plain Vite bundle `process` does not exist, so importing `cn` threw before
   * the first paint. Next inlines `process.env.NEXT_PUBLIC_*` textually, so the
   * fix has to guard the read without rewriting the expression.
   */
  const shared = [join(ROOT, "src", "lib", "utils.ts")];

  it.each(shared.map((f) => [rel(f), f]))("%s guards every process access", (_label, file) => {
    const source = read(file);
    for (const [, line] of source.split("\n").entries()) {
      if (!/\bprocess\.env\b/.test(line)) continue;
      if (line.trim().startsWith("*") || line.trim().startsWith("//")) continue;
      expect(source).toContain('typeof process !== "undefined"');
    }
  });
});

describe("the pure analysis core stays pure", () => {
  const files = walk(join(ROOT, "src", "lib", "capyexpense")).filter(
    (f) => !/workbook-(read|write)\.ts$/.test(f),
  );

  it("keeps exceljs confined to the two files that own it", () => {
    const offenders = files.filter((f) => /from\s+["']exceljs/.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("touches no filesystem, and no browser storage", () => {
    const offenders = files
      .filter((f) => /from\s+["']node:fs|\blocalStorage\b/.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
