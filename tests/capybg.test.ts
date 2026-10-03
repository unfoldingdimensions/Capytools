import { describe, expect, it } from "vitest";

import { MAX_ASSET_BYTES, validateManifest } from "@/lib/capybg/manifest";
import { MODELS, MODEL_IDS, modelUrl, sha8 } from "@/lib/capybg/models";

/**
 * The model registry is where CapyBg's licences and pins live, and the
 * manifest validator is what stops a broken asset description from shipping.
 * Both guard promises the visitor depends on: permissively-licensed models,
 * served in pieces Cloudflare actually accepts, reassembled into exactly the
 * bytes the pin describes.
 */

/** The exact pins from docs/plans/capybg.md §3.1 — drift must be loud. */
const PLAN_PINS = {
  modnet: {
    repo: "Xenova/modnet",
    revision: "fa2fa546052fba4c08921230a26cc69a333fca12",
    path: "onnx/model_quantized.onnx",
    sha256: "92e49898c3e05a6d7a944fc67a8cb87c4aad754ffb6ebd949528c7d1105fee3a",
    bytes: 6632188,
  },
  birefnet: {
    repo: "onnx-community/BiRefNet_lite-ONNX",
    revision: "de15b22ba131738a16dff04aab8bdf8dc32e3ac1",
    path: "onnx/model_fp16.onnx",
    sha256: "d39b897ceb16ae654c1731f3dba0cf9b368d9cae74b5a57459b455cc8bfec402",
    bytes: 114538221,
  },
};

describe("the model registry", () => {
  it("has a complete, well-formed spec for every model", () => {
    expect(MODEL_IDS).toHaveLength(2);
    for (const id of MODEL_IDS) {
      const model = MODELS[id];
      expect(model.id).toBe(id);
      expect(model.label.length).toBeGreaterThan(0);
      expect(model.licence.length).toBeGreaterThan(0);
      expect(model.revision).toMatch(/^[0-9a-f]{40}$/);
      expect(model.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(model.bytes).toBeGreaterThan(0);
      expect(model.inputName.length).toBeGreaterThan(0);
      expect(model.outputName.length).toBeGreaterThan(0);
      expect(model.mean).toHaveLength(3);
      expect(model.std).toHaveLength(3);
      expect(model.backends.length).toBeGreaterThan(0);
    }
  });

  it("pins exactly what the plan pinned — changing a model is the owner's call", () => {
    for (const id of MODEL_IDS) {
      expect(MODELS[id]).toMatchObject(PLAN_PINS[id]);
    }
  });

  it("never ships a non-commercial or copyleft licence", () => {
    for (const id of MODEL_IDS) {
      expect(MODELS[id].licence).not.toMatch(/nc|non-commercial|agpl|gpl/i);
    }
  });

  it("offers the detailed model only on WebGPU, the people model everywhere", () => {
    expect(MODELS.birefnet.backends).toEqual(["webgpu"]);
    expect(MODELS.modnet.backends).toContain("wasm");
    expect(MODELS.modnet.backends).toContain("webgpu");
  });

  it("declares the preprocessing contract each model's card states", () => {
    // MODNet: matte in [0,1], shortest edge 512 on a multiple of 32.
    expect(MODELS.modnet.sigmoid).toBe(false);
    expect(MODELS.modnet.input).toEqual({ kind: "shortest-edge", edge: 512, multiple: 32 });
    // BiRefNet: logits, square 1024, ImageNet normalisation.
    expect(MODELS.birefnet.sigmoid).toBe(true);
    expect(MODELS.birefnet.input).toEqual({ kind: "fixed", size: 1024 });
    expect(MODELS.birefnet.mean).toEqual([0.485, 0.456, 0.406]);
    expect(MODELS.birefnet.std).toEqual([0.229, 0.224, 0.225]);
  });

  it("builds the pinned resolve URL", () => {
    expect(modelUrl(MODELS.modnet)).toBe(
      "https://huggingface.co/Xenova/modnet/resolve/fa2fa546052fba4c08921230a26cc69a333fca12/onnx/model_quantized.onnx",
    );
  });

  it("content-addresses model directories by the first 8 hash chars", () => {
    expect(sha8(MODELS.modnet.sha256)).toBe("92e49898");
  });
});

describe("the manifest validator", () => {
  const hex = (seed: number) => String(seed).repeat(2).padEnd(64, "0").slice(0, 64);

  const part = (path: string, bytes: number, seed = 1) => ({ path, bytes, sha256: hex(seed) });
  const whole = (path: string, bytes: number, seed = 1) => ({ path, bytes, sha256: hex(seed) });

  const manifest = (files: unknown): unknown => ({
    version: 1,
    ort: { version: "1.30.0", files: { "ort-wasm-simd-threaded.wasm": whole("/capybg/ort/1.30.0/ort-wasm-simd-threaded.wasm", 100) } },
    models: files,
  });

  it("accepts a well-formed manifest, whole and sharded", () => {
    const parsed = validateManifest(
      manifest({
        modnet: whole("/capybg/models/92e49898/modnet.onnx", 6632188, 2),
        birefnet: {
          path: "/capybg/models/d39b897c/birefnet.onnx",
          bytes: 30,
          sha256: hex(3),
          parts: [part("/capybg/models/d39b897c/birefnet.onnx.part0", 20, 4), part("/capybg/models/d39b897c/birefnet.onnx.part1", 10, 5)],
        },
      }),
    );
    expect(parsed.version).toBe(1);
    expect(parsed.ort.version).toBe("1.30.0");
    expect(parsed.models.birefnet?.parts).toHaveLength(2);
  });

  it("rejects a part over the 25 MiB asset cap", () => {
    expect(() =>
      validateManifest(
        manifest({
          birefnet: {
            path: "/capybg/models/d39b897c/birefnet.onnx",
            bytes: MAX_ASSET_BYTES + 1,
            sha256: hex(3),
            parts: [part("/capybg/models/d39b897c/birefnet.onnx.part0", MAX_ASSET_BYTES + 1, 4)],
          },
        }),
      ),
    ).toThrow(/asset cap/);
  });

  it("rejects an unsharded file over the asset cap", () => {
    expect(() =>
      validateManifest(manifest({ modnet: whole("/capybg/models/92e49898/modnet.onnx", MAX_ASSET_BYTES + 1, 2) })),
    ).toThrow(/asset cap/);
  });

  it("rejects parts whose lengths do not sum to the file's length", () => {
    expect(() =>
      validateManifest(
        manifest({
          birefnet: {
            path: "/capybg/models/d39b897c/birefnet.onnx",
            bytes: 30,
            sha256: hex(3),
            parts: [part("/capybg/models/d39b897c/birefnet.onnx.part0", 20, 4), part("/capybg/models/d39b897c/birefnet.onnx.part1", 9, 5)],
          },
        }),
      ),
    ).toThrow(/sum to 29 B but the file is 30 B/);
  });

  it("rejects a missing or malformed hash", () => {
    const bad = manifest({ modnet: { path: "/capybg/models/92e49898/modnet.onnx", bytes: 10, sha256: "d41d8cd9" } });
    expect(() => validateManifest(bad)).toThrow(/sha256/);
    const missing = manifest({ modnet: { path: "/capybg/models/92e49898/modnet.onnx", bytes: 10 } });
    expect(() => validateManifest(missing)).toThrow(/sha256/);
  });

  it("rejects paths that leave /capybg/", () => {
    expect(() => validateManifest(manifest({ modnet: whole("/capybg/../secret.bin", 10, 2) }))).toThrow(/plain \/capybg\/ path/);
    expect(() => validateManifest(manifest({ modnet: whole("/other/model.onnx", 10, 2) }))).toThrow(/\/capybg\/ path/);
  });

  it("rejects a wrong manifest version", () => {
    expect(() => validateManifest({ version: 2, ort: { version: "1.30.0", files: {} }, models: {} })).toThrow(/version/);
  });
});
