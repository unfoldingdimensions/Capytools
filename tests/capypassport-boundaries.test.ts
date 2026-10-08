import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CapyPassport's boundaries: the promises that are only provable from the
 * source. The tool's sentence is "your photo never leaves this tab" — so no
 * request API may appear outside the one loader whose job is fetching the
 * face model from this origin, the face model may never come from a CDN,
 * detection stays lazy, and the compliance copy rules hold in every file a
 * visitor could read.
 */

const componentPath = join("src", "components", "tool", "CapyPassport.tsx");

/** Every .ts/.tsx file under src/lib/capypassport/ plus the component. */
function capypassportSources(): string[] {
  const lib = join(process.cwd(), "src", "lib", "capypassport");
  const files = readdirSync(lib)
    .map((name) => join(lib, name))
    .filter((path) => /\.(ts|tsx)$/.test(path) && statSync(path).isFile());
  if (existsSync(join(process.cwd(), componentPath))) files.push(join(process.cwd(), componentPath));
  expect(files.length, "capypassport sources found").toBeGreaterThan(0);
  return files;
}

const read = (path: string) => readFileSync(path, "utf8");
const isLoader = (path: string) => path.includes(join("lib", "capypassport", "loader.ts"));

describe("capypassport makes no request with your photo", () => {
  it("no request API appears outside the model loader", () => {
    for (const path of capypassportSources()) {
      if (isLoader(path)) continue;
      expect(read(path), `${path} calls a request API`).not.toMatch(
        /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\s*\(/,
      );
    }
  });

  it("the loader's literal fetch targets are same-origin under /capypassport/", () => {
    const text = read(join(process.cwd(), "src", "lib", "capypassport", "loader.ts"));
    for (const match of text.matchAll(/fetch\(\s*([`"'])([^`"']*?)\1/g)) {
      expect(match[2], `loader fetches ${match[2]}`).toMatch(/^\/capypassport\//);
    }
    expect(text).not.toMatch(/fetch\(\s*[`"'][^`"']*https?:\/\//i);
  });

  it("no api route exists for capypassport", () => {
    const apiDir = join(process.cwd(), "src", "app", "api");
    if (!existsSync(apiDir)) return;
    for (const name of readdirSync(apiDir, { recursive: true })) {
      const path = join(apiDir, String(name));
      if (!statSync(path).isFile()) continue;
      expect(read(path), `${path} mentions capypassport`).not.toMatch(/capypassport/i);
    }
  });
});

describe("the face model is pinned, same-origin and lazy", () => {
  it("no runtime capypassport file fetches an absolute URL", () => {
    // specs.ts and assets.ts hold authority links and pin paths (the plan
    // REQUIRES every spec row to ship its sourceUrl) — they are data, not
    // requests; the loader-level guard above proves nothing fetches a URL.
    for (const path of capypassportSources()) {
      if (path.endsWith("assets.ts") || path.endsWith("specs.ts")) continue;
      expect(read(path), `${path} carries an absolute URL`).not.toMatch(/["'`]https?:\/\//);
    }
  });

  it("MediaPipe is imported only dynamically, never at module scope", () => {
    const detect = read(join(process.cwd(), "src", "lib", "capypassport", "detect.ts"));
    expect(detect).toMatch(/import\(["']@mediapipe\/tasks-vision["']\)/);
    expect(detect).not.toMatch(/(^|\n)\s*import\s[^;\n]*from\s+["']@mediapipe\/tasks-vision["']/);
  });

  it("nothing ever points at a MediaPipe CDN — the wasm resolves to this origin", () => {
    for (const path of capypassportSources()) {
      expect(read(path), `${path} names a CDN`).not.toMatch(/cdn\.jsdelivr|storage\.googleapis\.com/);
    }
    const detect = read(join(process.cwd(), "src", "lib", "capypassport", "detect.ts"));
    expect(detect).toContain("WASM_BASE");
    expect(detect).toMatch(/forVisionTasks\(\s*WASM_BASE\s*\)/);
  });

  it("the assets script is the only writer of /public/capypassport/, and it is gitignored", () => {
    expect(read(join(process.cwd(), ".gitignore"))).toContain("/public/capypassport/");
    const script = read(join(process.cwd(), "scripts", "fetch-capypassport-assets.ts"));
    expect(script).toContain("storage.googleapis.com"); // the ONE build-time fetch, pinned by sha256
  });
});

describe("the compliance copy rules hold", () => {
  it("no forbidden claim anywhere in capypassport sources or the guide", () => {
    const guide = read(join(process.cwd(), "src", "lib", "capytools", "guides.ts"));
    const capyGuide = guide.slice(guide.indexOf("CapyPassport:"), guide.indexOf("CapyStrip:", guide.indexOf("CapyPassport:")));
    expect(capyGuide.length, "the guide entry was found").toBeGreaterThan(0);
    for (const text of [...capypassportSources().map(read), capyGuide]) {
      expect(text, "a forbidden claim").not.toMatch(
        /\b(guarantee\w*|compliant|compliance|accepted by [a-z ]*(authority|office))\b/i,
      );
    }
  });

  it("the component carries the alteration warning and the confirm line", () => {
    const src = read(join(process.cwd(), componentPath));
    expect(src).toContain("FILL_WARNING");
    expect(src).toContain("always confirm on the official site");
    expect(src).toContain("specs last checked");
    // The estimate is labelled where the number is printed.
    expect(src).toMatch(/head height[^\n"*]*estimated/i);
  });

  it("the camera is granted on this tool's path and nowhere else", () => {
    const config = read(join(process.cwd(), "next.config.ts"));
    expect(config).toMatch(/source:\s*"\/capypassport\/:path\*"/);
    expect(config).toMatch(/camera=\(self\)/);
    // The blanket policy stays closed: only the scoped block opens it.
    expect(config).toMatch(/camera=\(\), microphone/);
    expect(config.indexOf('camera=(self)')).toBeGreaterThan(config.indexOf("camera=()"));
  });
});

describe("capypassport adds exactly one dependency", () => {
  it("package.json dependencies are main's list plus @mediapipe/tasks-vision", () => {
    const pkg = JSON.parse(read(join(process.cwd(), "package.json"))) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["@mediapipe/tasks-vision"]).toMatch(/^\d+\.\d+\.\d+$/); // exact-pinned
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

  it("the wasm version key matches the installed package", () => {
    const assets = read(join(process.cwd(), "src", "lib", "capypassport", "assets.ts"));
    const pinned = /MEDIAPIPE_NPM_VERSION = "([^"]+)"/.exec(assets)?.[1];
    expect(pinned, "MEDIAPIPE_NPM_VERSION is set").toBeTruthy();
    const installed = JSON.parse(
      read(join(process.cwd(), "node_modules", "@mediapipe", "tasks-vision", "package.json")),
    ).version;
    expect(pinned).toBe(installed);
  });
});

describe("no sales copy in the free tool", () => {
  it("no pro/upgrade/unlock strings anywhere in capypassport sources", () => {
    for (const path of capypassportSources()) {
      expect(read(path), `${path} carries sales copy`).not.toMatch(
        /\b(pro|upsell|upselling|upgrade|unlock|unlockable|paywall)\b/i,
      );
    }
  });
});
