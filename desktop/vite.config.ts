import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The desktop app's frontend build.
 *
 * It is a SEPARATE Vite bundle, not a Next export, because `output: "export"` is
 * a global switch and this repo has dynamic API routes and a dynamic page that
 * static export refuses. Turning it on to serve the desktop app would take
 * CapyWrapped down with it.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Shared analysis + components live in the Next app's src/.
      "@": fileURLToPath(new URL("../src", import.meta.url)),
      /**
       * exceljs needs pointing at a specific build, twice over:
       *
       * 1. Rollup cannot parse the default MINIFIED browser bundle
       *    (exceljs#2093, still open), so `import "exceljs"` fails the build.
       * 2. The `es5` build parses, but imports ~20 `core-js/modules/*` and
       *    `regenerator-runtime` paths that are not dependencies here. Rollup
       *    warns and externalises them, which produces a bundle that builds
       *    cleanly and then throws on the first import at runtime.
       *
       * `exceljs.bare.js` is the unminified build WITHOUT bundled polyfills,
       * which is exactly right for WebView2 — evergreen Chromium needs none.
       * See docs/research/capyexpense/research-brief.md section 3.
       */
      exceljs: fileURLToPath(
        new URL("../node_modules/exceljs/dist/exceljs.bare.js", import.meta.url),
      ),
    },
  },
  server: {
    port: 3025,
    strictPort: true,
    // The shared modules live outside this package's root.
    fs: { allow: [".."] },
  },
  build: { outDir: "dist", emptyOutDir: true, target: "chrome105" },
});
