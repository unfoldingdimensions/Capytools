/**
 * CapyBg's shared vocabulary. Pure types — no browser, no Node, no imports —
 * so the build script, the worker and the tests can all speak them.
 */

/** The segmentation models CapyBg can run (see models.ts for the registry). */
export type ModelId = "modnet" | "birefnet";

/** Where inference runs. The copy on the page names both honestly. */
export type Backend = "webgpu" | "wasm";
