import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CapyStamp's boundaries: the promises that are only provable from the
 * source. The tool's sentence is "your photos never leave this tab" — so no
 * request API may even appear in its code, no new dependency may ride in
 * behind it, the free-batch cap must stay ONE constant shared by the engine
 * and the copy, and the cap must never grow sales copy.
 */

const componentPath = join(process.cwd(), "src", "components", "tool", "CapyStamp.tsx");
const batchPath = join("src", "lib", "capystamp", "batch.ts");

function capystampSources(): string[] {
  const lib = join(process.cwd(), "src", "lib", "capystamp");
  const files = readdirSync(lib)
    .map((name) => join(lib, name))
    .filter((path) => /\.(ts|tsx)$/.test(path) && statSync(path).isFile());
  // The component lands with the registration PR; guarded so the engine PR
  // can carry this file first and the guard tightens the day it arrives.
  if (existsSync(componentPath)) files.push(componentPath);
  expect(files.length, "capystamp sources found").toBeGreaterThan(0);
  return files;
}

const read = (path: string) => readFileSync(path, "utf8");

describe("capystamp makes no request with your data", () => {
  it("no request API appears anywhere in capystamp code", () => {
    for (const path of capystampSources()) {
      expect(read(path), `${path} calls a request API`).not.toMatch(
        /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\s*\(/,
      );
    }
  });

  it("no api route exists for capystamp", () => {
    const apiDir = join(process.cwd(), "src", "app", "api");
    if (!existsSync(apiDir)) return;
    for (const name of readdirSync(apiDir, { recursive: true })) {
      const path = join(apiDir, String(name));
      if (!statSync(path).isFile()) continue;
      expect(read(path), `${path} mentions capystamp`).not.toMatch(/capystamp/i);
    }
  });
});

describe("capystamp imports nothing new", () => {
  it("engine files import only relative or @/ modules", () => {
    // The engine reaches CapyResize's helpers by import, exactly as the plan
    // requires — no package specifier may appear, so a new dependency could
    // not enter through these files even by accident.
    for (const path of capystampSources()) {
      if (!path.includes(join("lib", "capystamp"))) continue;
      const src = read(path);
      const specifiers = [...src.matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g)].map(
        (match) => match[1],
      );
      for (const spec of specifiers) {
        const allowed = spec.startsWith(".") || spec.startsWith("@/");
        expect(allowed, `${path} imports "${spec}" — a bare package specifier`).toBe(true);
      }
    }
  });

  it("the component, once registered, names only what it already had", () => {
    if (!existsSync(componentPath)) return;
    const allowed = new Set(["react", "react-dom", "lucide-react"]);
    const src = read(componentPath);
    const specifiers = [...src.matchAll(/(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    for (const spec of specifiers) {
      const ok = spec.startsWith(".") || spec.startsWith("@/") || allowed.has(spec);
      expect(ok, `${componentPath} imports "${spec}"`).toBe(true);
    }
  });

  it("package.json dependencies are exactly what main shipped, plus CapyRead's engines and CapyPassport's detector", () => {
    // A deliberate pin rather than a diff — the baseline allows zero new
    // dependencies beyond the three OCR engines CapyRead's own boundaries
    // test scopes to its three owner files and the face landmarker
    // CapyPassport's boundaries test pins (Apache-2.0, exact version); this
    // breaks on ANY other dependency change, which is the point; an
    // unrelated bump belongs to its own PR, on main.
    const pkg = JSON.parse(read(join(process.cwd(), "package.json"))) as {
      dependencies: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      "@mediapipe/tasks-vision",
      "apca-w3",
      "class-variance-authority",
      "client-zip",
      "clsx",
      "css-tree",
      "culori",
      "docx",
      "exifr",
      "html-to-image",
      "js-tiktoken",
      "jsqr",
      "lucide-react",
      "motion",
      "next",
      "next-themes",
      "onnxruntime-web",
      "pdfjs-dist",
      "qr-code-styling",
      "qrcode-generator",
      "radix-ui",
      "react",
      "react-dom",
      "tailwind-merge",
      "tesseract.js",
      "tw-animate-css",
    ]);
  });
});

describe("the cap is one constant, shared", () => {
  it("FREE_BATCH_LIMIT is defined exactly once, in batch.ts", () => {
    const defs = capystampSources().filter((path) => /const FREE_BATCH_LIMIT/.test(read(path)));
    expect(defs).toHaveLength(1);
    expect(defs[0]).toContain(batchPath);
  });

  it("the UI copy counts with the constant, not a literal", () => {
    if (!existsSync(componentPath)) return;
    const src = read(componentPath);
    expect(src).toContain("FREE_BATCH_LIMIT");
    // The honest notice when files arrive past the cap lives in the engine's
    // outcome; the component must not hand-type "20" into a sentence.
    expect(src).not.toMatch(/up to 20|first 20|20 photos|20 images/);
  });
});

describe("no sales copy in the free tool", () => {
  it("no pro/upgrade/unlock strings anywhere in capystamp sources", () => {
    for (const path of capystampSources()) {
      expect(read(path), `${path} carries sales copy`).not.toMatch(
        /\b(pro|upsell|upselling|upgrade|unlock|unlockable|paywall)\b/i,
      );
    }
  });
});
