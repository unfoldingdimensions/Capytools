import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every `lp-` class the markup applies must be a class some stylesheet defines.
 *
 * The landing was ported from a design export whose class hooks were kept but
 * never given rules, so five of them shipped as no-ops and nothing noticed — a
 * class with no rule fails silently, where a missing class fails visibly.
 * `lp-method` survived several design passes that way, and showed up the first
 * time this test ran rather than by anyone looking at the page.
 *
 * Scoped to `lp-`, the prefix `landing.css` requires of every rule it owns, and
 * to all of `src/` — the landing components, plus the shared chrome that
 * borrows their classes (`header.tsx`, `ToolPageShell`).
 */

const SRC = join(process.cwd(), "src");

/** Custom properties (`--lp-lab-cols`) are not classes; the leading `-` excludes them. */
const CLASS_TOKEN = /(?<![\w-])lp-[a-z0-9-]+/g;

function walk(dir: string, extension: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, extension);
    return entry.isFile() && full.endsWith(extension) ? [full] : [];
  });
}

/** Comments are not markup: a class named only in prose is not applied. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("the landing's class hooks are all real", () => {
  const stylesheets = walk(SRC, ".css")
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  it("resolves every lp- class applied in src to a rule", () => {
    const applied = new Map<string, string[]>();
    for (const file of walk(SRC, ".tsx")) {
      const relative = file.slice(SRC.length + 1).replace(/\\/g, "/");
      stripComments(readFileSync(file, "utf8"))
        .split("\n")
        .forEach((line, index) => {
          for (const match of line.matchAll(CLASS_TOKEN)) {
            const sites = applied.get(match[0]) ?? [];
            sites.push(`${relative}:${index + 1}`);
            applied.set(match[0], sites);
          }
        });
    }

    // If the walk above ever stops finding markup, this test would pass having
    // checked nothing — so the population itself is asserted.
    expect(stylesheets.length).toBeGreaterThan(1000);
    expect(applied.size).toBeGreaterThan(100);

    const dead = [...applied]
      .filter(([name]) => !new RegExp(`\\.${name}(?![\\w-])`).test(stylesheets))
      .map(([name, sites]) => `${name} — applied at ${sites.join(", ")}, but no stylesheet defines it`);

    expect(dead).toEqual([]);
  });
});
