import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The opener every chrome page needs — wrapper, skip-link, ambient layer,
 * Header, `<main id="main">`, footer — used to be restated by hand in eight
 * files, with the three invariants that keep it correct living in prose
 * comments. One copy drifted: /u/[username] shipped without the skip-link,
 * without the ambient layer and without the `lp` class.
 *
 * These tests are what stop a ninth copy appearing. They read source rather
 * than render, matching the idiom already used in `a11y-polish.test.tsx`;
 * a render-level assertion would need every page's module to be requireable,
 * which `error.tsx` (a client boundary) and the metadata-exporting pages make
 * awkward.
 */
const SRC = join(process.cwd(), "src");

const read = (p: string) => readFileSync(p, "utf8");

/** Relative, forward-slashed — stable in failure messages on either platform. */
const rel = (p: string) => p.replace(process.cwd(), "").replace(/\\/g, "/");

/**
 * Every .tsx under src — app routes AND shared components.
 *
 * Walking src/app alone was the first version's mistake: ToolPageShell lives
 * under src/components, so the guard could not see the ninth opener sitting in
 * it. Both halves of the chrome are in scope now, which makes the ledger a
 * failure prints the whole ledger rather than most of it.
 */
function tsxFiles(dir = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

/** Every file containing `needle`, sorted — the ledger a failure prints. */
const ownersOf = (needle: string) =>
  tsxFiles()
    // `existsSync` first, so a not-yet-created module drops out of the list
    // instead of throwing ENOENT and hiding the ledger behind a stack trace.
    .filter((p) => existsSync(p) && read(p).includes(needle))
    .map(rel)
    .sort();

describe("the page chrome", () => {
  it("finds files to check (guards against the walk silently returning nothing)", () => {
    expect(tsxFiles().length).toBeGreaterThan(50);
  });

  it("builds the min-h-dvh frame in exactly two places", () => {
    // The shell, and the landing's own root — decisions.md D7 keeps the
    // landing's chrome separate. Any other entry is a hand-rolled opener.
    expect(ownersOf("min-h-dvh")).toEqual([
      "/src/app/page.tsx",
      "/src/components/page-shell.tsx",
    ]);
  });

  it("hands out the skip-link in exactly two places", () => {
    // The same two files: the shell, and the landing's own chrome.
    expect(ownersOf("lp-skip-link")).toEqual([
      "/src/components/landing/Landing.tsx",
      "/src/components/page-shell.tsx",
    ]);
  });
});
