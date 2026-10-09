import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Image mode's promise is "your photo never leaves this tab", and the folder
 * it borrows from (`lib/capytone/extract/`) also holds Extract mode's
 * server-only code. Both are provable from the source alone: walk everything
 * the mode imports, however deep, and fail if the walk reaches a server file
 * or finds a request API.
 */

const root = join(process.cwd(), "src");
const entries = [
  join(root, "components", "capytone", "ImageMode.tsx"),
  join(root, "lib", "capytone", "image.ts"),
];
const SERVER_ONLY = ["ssrf", "dohResolver", "fetchDoc", "workersTransport", "index"].map((name) =>
  join(root, "lib", "capytone", "extract", `${name}.ts`),
);

function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith("@/")
    ? join(root, spec.slice(2))
    : spec.startsWith(".")
      ? resolve(dirname(from), spec)
      : null;
  if (!base) return null; // a package — checked separately
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`${from} imports ${spec}, which does not resolve`);
}

/** Every file reachable from the entries, with the packages each one imports. */
function closure(): Map<string, string[]> {
  const seen = new Map<string, string[]>();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    const src = readFileSync(file, "utf8");
    const specs = [...src.matchAll(/(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
    seen.set(
      file,
      specs.filter((s) => !s.startsWith(".") && !s.startsWith("@/")),
    );
    for (const spec of specs) {
      const next = resolveImport(file, spec);
      if (next) queue.push(next);
    }
  }
  return seen;
}

describe("image mode stays in the tab", () => {
  const files = closure();
  const rel = (path: string) => path.slice(root.length + 1);

  it("walks a real import graph", () => {
    expect([...files.keys()].map(rel)).toContain(join("lib", "capytone", "extract", "rank.ts"));
    expect(files.size).toBeGreaterThan(5);
  });

  it("reaches no server module of Extract mode", () => {
    for (const file of files.keys()) {
      expect(SERVER_ONLY, `${rel(file)} is server-only but image mode imports it`).not.toContain(file);
    }
  });

  it("reaches no node: builtin, no Next server API and no request API", () => {
    for (const [file, packages] of files) {
      for (const pkg of packages) {
        expect(pkg, `${rel(file)} imports ${pkg}`).not.toMatch(/^node:|^next\/(server|headers)$/);
      }
      expect(readFileSync(file, "utf8"), `${rel(file)} calls a request API`).not.toMatch(
        /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\s*\(/,
      );
    }
  });

  it("stores nothing: no web storage in the mode's own files", () => {
    for (const file of entries) {
      expect(readFileSync(file, "utf8"), `${rel(file)} stores something`).not.toMatch(
        /\b(localStorage|sessionStorage|indexedDB)\b/,
      );
    }
  });

  it("imports rank.ts directly, never the extract folder's index", () => {
    for (const file of files.keys()) {
      expect(readFileSync(file, "utf8"), `${rel(file)} imports the extract index`).not.toMatch(
        /from\s*["'](?:@\/lib\/capytone\/extract|\.\/extract|\.\.\/extract)["']/,
      );
    }
  });

  it("has no api route of its own", () => {
    expect(existsSync(join(root, "app", "api", "image-palette"))).toBe(false);
  });
});
