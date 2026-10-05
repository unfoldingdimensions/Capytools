import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { cacheKey } from "../src/lib/capyread/langs";

/**
 * CapyRead's boundaries: the promises that are only provable from the
 * source. The tool's sentence is "your document never leaves this tab" — so
 * no request API may even appear in its code, the engines may only load
 * lazily, from the one file that owns each of them, with same-origin asset
 * paths and no absolute URL at runtime, no new dependency may ride in behind
 * them, the page cap must stay ONE constant shared by the engine and the
 * copy, and the binaries stay out of git.
 */

const componentPath = join(process.cwd(), "src", "components", "tool", "CapyRead.tsx");
const rasterPath = join("src", "lib", "capyread", "raster.ts");
const enginePath = join("src", "lib", "capyread", "engine.ts");

function capyreadSources(): string[] {
  const lib = join(process.cwd(), "src", "lib", "capyread");
  const files = readdirSync(lib, { recursive: true })
    .map((name) => join(lib, String(name)))
    .filter((path) => /\.(ts|tsx)$/.test(path) && statSync(path).isFile());
  // The component lands with the registration PR; guarded so the engine PR
  // can carry this file first and the guard tightens the day it arrives.
  if (existsSync(componentPath)) files.push(componentPath);
  expect(files.length, "capyread sources found").toBeGreaterThan(0);
  return files;
}

const read = (path: string) => readFileSync(path, "utf8");

/** Which file may name which engine package — everything else is a smuggler. */
const ENGINE_HOMES: Array<[pkg: string, home: string]> = [
  ["tesseract.js", enginePath],
  ["pdfjs-dist", rasterPath],
  ["docx", join("src", "lib", "capyread", "export.ts")],
];

describe("capyread makes no request with your data", () => {
  it("no request API appears anywhere in capyread code", () => {
    for (const path of capyreadSources()) {
      expect(read(path), `${path} calls a request API`).not.toMatch(
        /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\s*\(/,
      );
    }
  });

  it("no api route exists for capyread", () => {
    const apiDir = join(process.cwd(), "src", "app", "api");
    if (!existsSync(apiDir)) return;
    for (const name of readdirSync(apiDir, { recursive: true })) {
      const path = join(apiDir, String(name));
      if (!statSync(path).isFile()) continue;
      expect(read(path), `${path} mentions capyread`).not.toMatch(/capyread/i);
    }
  });

  it("no absolute URL at runtime — only langs.ts carries the build-time pins", () => {
    for (const path of capyreadSources()) {
      if (path.endsWith(join("lib", "capyread", "langs.ts"))) continue;
      expect(read(path), `${path} carries an absolute URL`).not.toMatch(/["'`]https?:\/\//);
    }
  });

  it("engine asset paths are same-origin under /ocr/", () => {
    const engine = read(join(process.cwd(), enginePath));
    expect(engine).toMatch(/workerPath:\s*["'`]\/ocr\/worker\.min\.js["'`]/);
    expect(engine).toMatch(/corePath:\s*["'`]\/ocr\/core\/["'`]/);
    const raster = read(join(process.cwd(), rasterPath));
    expect(raster).toMatch(/workerSrc\s*=\s*["'`]\/ocr\/pdf\/pdf\.worker\.min\.mjs["'`]/);
    expect(raster).toMatch(/standardFontDataUrl:\s*["'`]\/ocr\/pdf\/standard_fonts\/["'`]/);
  });
});

/** Module specifiers a file imports (static or dynamic) — the only form in
 *  which "naming an engine" counts; ".docx" in UI copy is not an import. */
function importedSpecifiers(src: string): string[] {
  return [...src.matchAll(/(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
}

describe("the engines load lazily, each in its one file", () => {
  it("each engine package is imported only by the file that owns it", () => {
    for (const path of capyreadSources()) {
      for (const spec of importedSpecifiers(read(path))) {
        for (const [pkg, home] of ENGINE_HOMES) {
          if (spec !== pkg) continue;
          expect(
            path.endsWith(home),
            `${path} imports ${pkg} — that lives in ${home}`,
          ).toBe(true);
        }
      }
    }
  });

  it("every engine import is a dynamic import(), never a static one", () => {
    for (const [pkg, home] of ENGINE_HOMES) {
      const owner = read(join(process.cwd(), home));
      expect(owner, `${pkg} is imported dynamically`).toMatch(
        new RegExp(`await\\s+import\\(\\s*["']${pkg.replaceAll("/", "\\/")}["']\\s*\\)`),
      );
      expect(owner, `${pkg} must not be imported statically`).not.toMatch(
        new RegExp(`(^|\\n)\\s*import\\s[^;\\n]*from\\s+["']${pkg.replaceAll("/", "\\/")}["']`),
      );
      expect(owner, `${pkg} must not be type-imported`).not.toMatch(
        new RegExp(`import\\s+type\\s[^;\\n]*from\\s+["']${pkg.replaceAll("/", "\\/")}["']`),
      );
    }
  });

  it("the component imports no engine package at all", () => {
    if (!existsSync(componentPath)) return;
    for (const spec of importedSpecifiers(read(componentPath))) {
      for (const [pkg] of ENGINE_HOMES) {
        expect(spec, `${componentPath} imports ${spec}`).not.toBe(pkg);
      }
    }
  });

  it("lib files import only relative/@/ modules or their own engine", () => {
    for (const path of capyreadSources()) {
      if (!path.includes(join("lib", "capyread"))) continue;
      const src = read(path);
      const specifiers = [...src.matchAll(/(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
      const ownEngine = ENGINE_HOMES.filter(([, home]) => path.endsWith(home)).map(([pkg]) => pkg);
      for (const spec of specifiers) {
        const allowed = spec.startsWith(".") || spec.startsWith("@/") || ownEngine.includes(spec);
        expect(allowed, `${path} imports "${spec}"`).toBe(true);
      }
    }
  });

  it("the component names only what a tool component already had", () => {
    if (!existsSync(componentPath)) return;
    const allowed = new Set(["react", "react-dom", "lucide-react"]);
    const src = read(componentPath);
    const specifiers = [...src.matchAll(/(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
    for (const spec of specifiers) {
      const ok = spec.startsWith(".") || spec.startsWith("@/") || allowed.has(spec);
      expect(ok, `${componentPath} imports "${spec}"`).toBe(true);
    }
  });

  it("package.json adds exactly the three engines and nothing else", () => {
    const pkg = JSON.parse(read(join(process.cwd(), "package.json"))) as {
      dependencies: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
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

describe("the page cap is one constant, shared", () => {
  it("FREE_PAGE_LIMIT is defined exactly once, in raster.ts", () => {
    const defs = capyreadSources().filter((path) => /const FREE_PAGE_LIMIT/.test(read(path)));
    expect(defs).toHaveLength(1);
    expect(defs[0]).toContain(rasterPath);
  });

  it("the UI copy counts with the constant, not a literal", () => {
    if (!existsSync(componentPath)) return;
    const src = read(componentPath);
    expect(src).toContain("FREE_PAGE_LIMIT");
    expect(src).not.toMatch(/up to 10|first 10|ten pages/);
  });
});

describe("the storage promise is scoped honestly", () => {
  it("the copy discloses the language cache and offers the forget control", () => {
    if (!existsSync(componentPath)) return;
    const src = read(componentPath);
    expect(src).toContain("clearLanguageCache");
    expect(src).toMatch(/kept in your browser/);
  });

  it("the cache key separates the fast and standard models", () => {
    // Fast and standard are both "eng.traineddata" to tesseract; without a
    // cachePath that names the quality, the two models would evict each other.
    expect(cacheKey("eng", "fast")).not.toBe(cacheKey("eng", "standard"));
  });
});

describe("capyread binaries stay out of git", () => {
  it(".gitignore excludes /public/ocr/", () => {
    expect(read(join(process.cwd(), ".gitignore"))).toContain("/public/ocr/");
  });
});

describe("no sales copy in the free tool", () => {
  it("no pro/upgrade/unlock strings anywhere in capyread sources", () => {
    for (const path of capyreadSources()) {
      expect(read(path), `${path} carries sales copy`).not.toMatch(
        /\b(pro|upsell|upselling|upgrade|unlock|unlockable|paywall)\b/i,
      );
    }
  });
});
