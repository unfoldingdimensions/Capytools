import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolve the project's "@/" alias so tests can import modules that use it.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Local sibling projects (own node_modules, own "@/" alias) are not this
  // app's tests — scanning them breaks resolution in the root suite.
  exclude: ["**/node_modules/**", "capytone/**", ".scratch-*/**"],
});
