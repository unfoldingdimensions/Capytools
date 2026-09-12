import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { cssEase, dur, ease } from "../src/lib/capytools/motion";

const ROOT = join(__dirname, "..");
const TOKENS = readFileSync(join(ROOT, "src", "app", "tokens.css"), "utf8");

/** Whitespace is not the point; the numbers are. */
const norm = (value: string) => value.replace(/\s+/g, "");

const token = (name: string) =>
  TOKENS.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();

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
    else if (/\.(ts|tsx|css)$/.test(entry)) out.push(full);
  }
  return out;
}

const rel = (file: string) => file.slice(ROOT.length + 1).replace(/\\/g, "/");

/**
 * The motion language is stated in DESIGN.md and implemented twice: once in
 * TypeScript (`motion.ts`) for anything a library drives, and once in CSS
 * (`tokens.css`) for everything the stylesheets drive. They were four different
 * curves and six different hover durations before this — the docs said
 * `cubic-bezier(0.16, 1, 0.3, 1)` and the landing ran
 * `cubic-bezier(0.22, 1, 0.36, 1)`.
 *
 * Nothing can make the two files share a value, so this makes them unable to
 * disagree quietly.
 */
describe("the motion tokens are one language", () => {
  it("mirrors every curve between tokens.css and motion.ts", () => {
    expect(norm(token("ease-entrance") ?? "")).toBe(norm(cssEase.entrance));
    expect(norm(token("ease-ui") ?? "")).toBe(norm(cssEase.ui));
    expect(norm(token("ease-drift") ?? "")).toBe(norm(cssEase.drift));
  });

  it("mirrors the curves between the tuple form and the string form", () => {
    // `ease.slowOut` and `cssEase.entrance` are the same curve in two shapes.
    expect(`cubic-bezier(${ease.slowOut.join(", ")})`).toBe(cssEase.entrance);
    expect(`cubic-bezier(${ease.gentle.join(", ")})`).toBe(cssEase.ui);
    expect(`cubic-bezier(${ease.drift.join(", ")})`).toBe(cssEase.drift);
  });

  it("mirrors every duration between tokens.css and motion.ts", () => {
    expect(token("dur-fade")).toBe(`${dur.fade}ms`);
    expect(token("dur-move")).toBe(`${dur.move}ms`);
    expect(token("dur-entrance")).toBe(`${dur.entrance}ms`);
  });
});

describe("nothing animates layout", () => {
  const files = walk(join(ROOT, "src"));

  /** Comment lines are prose, and the prose here names the thing it forbids. */
  const isComment = (line: string) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith("*") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("{/*")
    );
  };

  it("never uses a blanket transition", () => {
    const offenders: string[] = [];
    for (const file of files) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (!isComment(line) && /\btransition-all\b/.test(line)) {
            offenders.push(`${rel(file)}:${i + 1}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });

  it("keeps raw durations out of the landing stylesheet", () => {
    // Every duration there is a `--dur-*` token now, so changing the feel of
    // the site is a token change rather than a hunt through 31 rules.
    const landing = readFileSync(join(ROOT, "src", "components", "landing", "landing.css"), "utf8");
    const raw = landing.match(/\b\d+ms\b/g) ?? [];
    expect(raw).toEqual([]);
  });
});
