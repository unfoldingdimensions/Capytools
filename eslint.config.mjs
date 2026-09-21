import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Separate package with its own toolchain; linted by its own build.
    "desktop/**",
    // Build output and scratch space. All gitignored, so a clean checkout —
    // and therefore CI — never had them; locally they buried the 7 real
    // findings under 175,757 problems and made `npm run lint` unusable.
    ".open-next/**",
    ".wrangler/**",
    ".openclaw/**",
    ".scratch-*/**",
    // A sibling port with its own node_modules and its own "@/" alias, the
    // same one vitest.config.mts already excludes for the same reason.
    "capytone/**",
  ]),
]);

export default eslintConfig;
