import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolve the project's "@/" alias so tests can import modules that use it.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Local sibling projects (own node_modules, own "@/" alias) are not this
    // app's tests — scanning them breaks resolution in the root suite.
    exclude: ["**/node_modules/**", "**/dist/**", "capytone/**", ".scratch-*/**", "desktop/**"],
    // 20s, not vitest's 5s default. The suite runs 50 files wide and the
    // slowest specs are CPU-bound rather than slow by nature: the exceljs
    // workbook generate -> read round trips, the expense dashboard's render,
    // and the PNG-inflation bomb test each measured 5-7s while the rest of the
    // suite competed for cores, then passed in a fraction of that run alone
    // (7.15s for all 66 of those tests together). Under the default they
    // failed intermittently on a Windows machine and passed on Linux CI — the
    // worst shape a flake can take: green where it runs, red where it doesn't.
    // Raised rather than capped with maxWorkers, so the suite keeps its
    // parallel speed instead of trading one problem for a slower one.
    testTimeout: 20_000,
  },
});
