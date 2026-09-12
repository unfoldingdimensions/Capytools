import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");

function walk(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Radii, enforced rather than trusted.
 *
 * DESIGN.md names three surfaces — cards at `rounded-3xl` (26px), inset wells
 * at `rounded-2xl` (21.6px), pills at `rounded-full` — plus `rounded-md` for
 * small inputs. The codebase had drifted to five: a 20px card (four copies of
 * it), a 28px card, and a 12px one used as both an input and a card.
 *
 * A hardcoded radius is almost always someone not finding the scale, so this
 * fails rather than trusting the next author to read DESIGN.md first.
 */
describe("the radius scale is the documented one", () => {
  const files = walk(join(ROOT, "src"));

  it("finds files to check (guards against the walk returning nothing)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("uses no hardcoded radii outside the chart micro-scale", () => {
    const offenders: string[] = [];
    const ALLOWED = [/CalendarHeatmap\.tsx$/];

    for (const file of files) {
      if (ALLOWED.some((pattern) => pattern.test(file))) continue;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/rounded-\[[0-9.]+(px|rem)\]/.test(line)) {
            offenders.push(`${file.slice(ROOT.length + 1)}:${i + 1}`);
          }
        });
    }

    // The heatmap's legend swatches are 10px squares, and the scale's smallest
    // step is 7px — which would round them into circles. That is the one place
    // a sub-scale radius is the correct answer, and it is named above.
    expect(offenders).toEqual([]);
  });
});
