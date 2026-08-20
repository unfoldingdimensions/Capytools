import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolve the project's "@/" alias so tests can import modules that use it.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
