import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Phase 0/1: defaults only. No incrementalCache — see plan §6 and R3: the
// `revalidate = 1800` exports on the GitHub routes are INERT without one, and
// A2's in-route Cache API puts (phase 4) are what actually carries those routes.
export default defineCloudflareConfig({});
