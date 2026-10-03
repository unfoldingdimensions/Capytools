import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CapyBg's boundaries: the promises that are only provable from the source.
 * Everything here guards the visitor-facing sentence "your photo never
 * leaves this tab" — the engine loads lazily, in the worker, from this
 * origin only, with no route that could ever receive a photo, and the
 * binaries it needs never enter git.
 */

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Every .ts/.tsx/.json file under src/, recursively (absolute paths). */
function srcFiles(dir = join(process.cwd(), "src")): string[] {
  return readdirSync(dir, { recursive: true })
    .map((name) => join(dir, String(name)))
    .filter((path) => /\.(ts|tsx|json)$/.test(path) && statSync(path).isFile());
}

const workerPath = join("src", "lib", "capybg", "worker.ts");

describe("capybg never touches a third-party CDN", () => {
  it("no string in src/ mentions jsdelivr — ORT's default wasmPaths is forbidden", () => {
    for (const path of srcFiles()) {
      expect(readFileSync(path, "utf8"), `${path} mentions cdn.jsdelivr`).not.toContain("cdn.jsdelivr");
    }
  });

  it("no runtime capybg file contains any absolute URL — the pins in models.ts are build-time only", () => {
    for (const name of ["loader.ts", "client.ts", "worker.ts", "compose.ts", "backend.ts", "preprocess.ts", "postprocess.ts"]) {
      const text = source(join("src", "lib", "capybg", name));
      expect(text, `${name} carries an absolute URL`).not.toMatch(/["'`]https?:\/\//);
    }
  });
});

describe("the engine is lazy, and lives only in the worker", () => {
  it("only worker.ts so much as mentions onnxruntime-web", () => {
    for (const path of srcFiles()) {
      const text = readFileSync(path, "utf8");
      if (!text.includes("onnxruntime-web")) continue;
      expect(path.endsWith(workerPath), `${path} references onnxruntime-web outside the worker`).toBe(true);
    }
  });

  it("worker.ts loads it only through import(), never a static import", () => {
    const worker = source(workerPath);
    // The import is conditional (webgpu vs wasm), so assert the dynamic form
    // and the package specifiers rather than one literal call.
    expect(worker).toMatch(/await\s+import\(/);
    expect(worker).toMatch(/["']onnxruntime-web\/webgpu["']/);
    expect(worker).toMatch(/["']onnxruntime-web\/wasm["']/);
    expect(worker).not.toMatch(/(^|\n)\s*import\s[^;\n]*from\s+["']onnxruntime-web/);
    expect(worker).not.toMatch(/import\s+type\s[^;\n]*from\s+["']onnxruntime-web/);
  });

  it("the worker is a module chunk reached through new URL + import.meta.url", () => {
    const client = source(join("src", "lib", "capybg", "client.ts"));
    expect(client).toContain('new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })');
  });

  it("wasmPaths points at this origin, never a CDN", () => {
    const worker = source(workerPath);
    expect(worker).toMatch(/wasmPaths\s*=\s*[`"']\/capybg\/ort\//);
  });
});

describe("no upload path exists", () => {
  it("no api route mentions capybg", () => {
    const apiDir = join(process.cwd(), "src", "app", "api");
    if (!existsSync(apiDir)) return;
    for (const name of readdirSync(apiDir, { recursive: true })) {
      const path = join(apiDir, String(name));
      if (!statSync(path).isFile()) continue;
      expect(readFileSync(path, "utf8"), `${path} mentions capybg`).not.toMatch(/capybg/i);
    }
  });

  it("every literal fetch target in capybg code is same-origin under /capybg/", () => {
    const files = srcFiles().filter(
      (path) => path.includes(join("lib", "capybg")) || path.endsWith(join("components", "tool", "CapyBg.tsx")),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const path of files) {
      const text = readFileSync(path, "utf8");
      // Dynamic fetch args (part.path and friends) are pinned to /capybg/ by
      // the manifest validator; literals must prove it themselves.
      for (const match of text.matchAll(/fetch\(\s*([`"'])([^`"']*?)\1/g)) {
        expect(match[2], `${path} fetches ${match[2]}`).toMatch(/^\/capybg\//);
      }
      expect(text, `${path} fetches an absolute URL`).not.toMatch(/fetch\(\s*[`"'][^`"']*https?:\/\//i);
    }
  });
});

describe("capybg binaries stay out of git", () => {
  it(".gitignore excludes /public/capybg/", () => {
    expect(source(".gitignore")).toContain("/public/capybg/");
  });
});
