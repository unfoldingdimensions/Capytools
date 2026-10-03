import { describe, expect, it } from "vitest";

import { metadata } from "@/app/capybg/page";
import { CPU_NOTE_NO_ADAPTER, CPU_NOTE_NO_WEBGPU, DETAILED_REFUSED_NOTE, decideBackend, gpuFailureFallback } from "@/lib/capybg/backend";
import { bgFilename, backdropFill, clampQuality, decideCompose } from "@/lib/capybg/compose";
import { MAX_ASSET_BYTES, validateManifest } from "@/lib/capybg/manifest";
import { MODELS, MODEL_IDS, modelUrl, sha8 } from "@/lib/capybg/models";
import { modelInputSize, toModelTensor } from "@/lib/capybg/preprocess";
import {
  applyMatte,
  featherMatte,
  matteFromModelOutput,
  resizeMatte,
  sigmoid,
} from "@/lib/capybg/postprocess";
import { SUITE } from "@/lib/capytools/suite";

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

describe("preprocess: the size rules", () => {
  it("lands the shortest MODNet edge on 512, both sides on a multiple of 32", () => {
    expect(modelInputSize(MODELS.modnet, 4000, 3000)).toEqual({ width: 672, height: 512 });
    expect(modelInputSize(MODELS.modnet, 3000, 4000)).toEqual({ width: 512, height: 672 });
    // A hair over square still rounds down to the nearest 32.
    expect(modelInputSize(MODELS.modnet, 1000, 1001)).toEqual({ width: 512, height: 512 });
    // Small portrait photos upscale to the same edge.
    expect(modelInputSize(MODELS.modnet, 160, 90)).toEqual({ width: 896, height: 512 });
  });

  it("stretches everything to BiRefNet's square 1024", () => {
    expect(modelInputSize(MODELS.birefnet, 4000, 3000)).toEqual({ width: 1024, height: 1024 });
    expect(modelInputSize(MODELS.birefnet, 64, 64)).toEqual({ width: 1024, height: 1024 });
  });
});

describe("preprocess: RGBA to planar NCHW", () => {
  it("splits planes and normalises with the model's mean/std", () => {
    const rgba = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      128, 128, 128, 255,
    ]);
    const tensor = toModelTensor(rgba, MODELS.modnet);
    expect(tensor.length).toBe(2 * 2 * 3);
    const half = (v: number) => (v / 255 - 0.5) / 0.5;
    // R plane first: pixels 0..3.
    expect(tensor[0]).toBeCloseTo(1);
    expect(tensor[1]).toBeCloseTo(-1);
    expect(tensor[2]).toBeCloseTo(-1);
    expect(tensor[3]).toBeCloseTo(half(128));
    // Then G, then B — same pixel order within each plane.
    expect(tensor[4]).toBeCloseTo(-1); // G of pixel 0
    expect(tensor[8]).toBeCloseTo(-1); // B of pixel 0
    expect(tensor[5]).toBeCloseTo(1); // G of pixel 1
    expect(tensor[10]).toBeCloseTo(1); // B of pixel 2
  });

  it("applies ImageNet normalisation for BiRefNet", () => {
    const white = new Uint8ClampedArray([255, 255, 255, 255]);
    const tensor = toModelTensor(white, MODELS.birefnet);
    expect(tensor[0]).toBeCloseTo((1 - 0.485) / 0.229);
    expect(tensor[1]).toBeCloseTo((1 - 0.456) / 0.224);
    expect(tensor[2]).toBeCloseTo((1 - 0.406) / 0.225);
  });
});

describe("postprocess: model output to alpha", () => {
  it("sigs only the logit model, clamps the rest", () => {
    const logits = new Float32Array([0, 1, -1, 100]);
    const sig = matteFromModelOutput(logits, true);
    expect(sig[0]).toBeCloseTo(0.5);
    expect(sig[1]).toBeCloseTo(sigmoid(1));
    expect(sig[2]).toBeCloseTo(sigmoid(-1));
    expect(sig[3]).toBeCloseTo(1);
    const raw = new Float32Array([-1, 0.5, 2, 0]);
    const clamped = matteFromModelOutput(raw, false);
    expect(Array.from(clamped)).toEqual([0, 0.5, 1, 0]);
  });

  it("resizes the matte bilinearly and monotonically", () => {
    const one = resizeMatte(new Float32Array([0.5]), 1, 1, 3, 3);
    expect(one).toHaveLength(9);
    expect(Array.from(one)).toEqual(new Array(9).fill(0.5));
    // 1×2 [0,1] → 1×4 walks 0, .25, .75, 1.
    const ramp = resizeMatte(new Float32Array([0, 1]), 2, 1, 4, 1);
    expect(Array.from(ramp)).toEqual([0, 0.25, 0.75, 1]);
    // Same size returns an equal copy.
    const same = new Float32Array([0.1, 0.9]);
    const passthrough = resizeMatte(same, 2, 1, 2, 1);
    expect(passthrough[0]).toBeCloseTo(0.1);
    expect(passthrough[1]).toBeCloseTo(0.9);
  });

  it("feathers with a box blur; radius 0 is the identity", () => {
    const flat = new Float32Array(16).fill(0.7);
    expect(Array.from(featherMatte(flat, 4, 4, 0))).toEqual(Array.from(flat));
    expect(Array.from(featherMatte(flat, 4, 4, 2))).toEqual(Array.from(flat)); // constant stays constant
    const step = new Float32Array(4);
    step.set([0, 0, 1, 1]);
    const soft = featherMatte(step, 4, 1, 1);
    expect(soft[0]).toBeLessThan(0.5);
    expect(soft[1]).toBeGreaterThan(0);
    expect(soft[1]).toBeLessThan(0.5);
    expect(soft[2]).toBeGreaterThan(0.5);
    expect(soft[2]).toBeLessThan(1);
  });

  it("writes the matte to channel 3 and nothing else", () => {
    const rgba = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 0]);
    applyMatte(rgba, new Float32Array([0.5, 2]));
    expect(Array.from(rgba.slice(0, 3))).toEqual([10, 20, 30]);
    expect(Array.from(rgba.slice(4, 7))).toEqual([40, 50, 60]);
    expect(rgba[3]).toBe(128); // 0.5 * 255, rounded
    expect(rgba[7]).toBe(255); // >1 clamps to opaque
  });

  it("refuses a matte smaller than the image", () => {
    expect(() => applyMatte(new Uint8ClampedArray(16), new Float32Array(2))).toThrow(/smaller/);
  });
});

describe("backend: the honest truth table", () => {
  it("chooses WebGPU only when the adapter answers", () => {
    expect(decideBackend(true, true)).toEqual({ backend: "webgpu" });
    const noAdapter = decideBackend(true, false);
    expect(noAdapter.backend).toBe("wasm");
    expect(noAdapter.note).toBe(CPU_NOTE_NO_ADAPTER);
    const noWebGPU = decideBackend(false, false);
    expect(noWebGPU.backend).toBe("wasm");
    expect(noWebGPU.note).toBe(CPU_NOTE_NO_WEBGPU);
    // A dead combination degrades to the plain no-WebGPU note.
    expect(decideBackend(false, true)).toEqual(noWebGPU);
  });

  it("never claims the GPU in a CPU note", () => {
    for (const note of [CPU_NOTE_NO_ADAPTER, CPU_NOTE_NO_WEBGPU]) {
      expect(note).toMatch(/CPU \(WebAssembly\)/);
      expect(note.toLowerCase()).not.toMatch(/gpu \(/);
    }
  });

  it("sends the detailed model's failures to the people model, never the wasm heap", () => {
    // The owner's try/hide decision (plan §11.1, 2026-10-04): a birefnet GPU
    // failure must re-run on modnet — the 1024² fp16 graph OOMs the wasm heap.
    expect(gpuFailureFallback("birefnet")).toBe("people");
    expect(gpuFailureFallback("modnet")).toBe("cpu");
  });

  it("states the detailed refusal and where the cut landed", () => {
    const note = DETAILED_REFUSED_NOTE.toLowerCase();
    expect(note).toContain("people model");
    expect(note).toContain("hidden");
    expect(note).not.toMatch(/offline|no network/);
  });
});

describe("compose: the decisions", () => {
  it("keeps transparency as PNG, and says why when JPEG was asked", () => {
    expect(decideCompose("transparent", "png")).toEqual({ format: "png", fill: null });
    const refused = decideCompose("transparent", "jpeg");
    expect(refused.format).toBe("png");
    expect(refused.fill).toBeNull();
    expect(refused.note).toMatch(/JPEG has no transparency/);
  });

  it("flattens light, dark and picked colours", () => {
    expect(decideCompose("light", "jpeg")).toEqual({ format: "jpeg", fill: "#ffffff" });
    expect(decideCompose("dark", "png")).toEqual({ format: "png", fill: "#121212" });
    expect(decideCompose({ color: "#abc123" }, "jpeg")).toEqual({ format: "jpeg", fill: "#abc123" });
    expect(backdropFill({ color: "#abc123" })).toBe("#abc123");
  });

  it("clamps JPEG quality into the promised 0.5–1 window", () => {
    expect(clampQuality(undefined)).toBe(0.92);
    expect(clampQuality(0.3)).toBe(0.5);
    expect(clampQuality(1.5)).toBe(1);
    expect(clampQuality(0.8)).toBe(0.8);
  });

  it("names downloads after the original, with -nobg", () => {
    expect(bgFilename("photo.JPG", "png")).toBe("photo-nobg.png");
    expect(bgFilename("archive", "jpeg")).toBe("archive-nobg.jpg");
    expect(bgFilename("album.cover.webp", "png")).toBe("album.cover-nobg.png");
  });
});

describe("registration — the suite knows CapyBg", () => {
  it("SUITE row 12 is CapyBg at /capybg, with its plate", () => {
    expect(SUITE).toHaveLength(12);
    const row = SUITE[11];
    expect(row.name).toBe("CapyBg");
    expect(row.href).toBe("/capybg");
    expect(row.cat).toBe("browser");
    expect(row.plate).toEqual({ src: "/plates/lab-12.webp", width: 896, height: 1200 });
    // (The plate FILE is the owner's image step — the landing's asset test is
    // the canary that stays red until public/plates/lab-12.webp exists.)
  });

  it("the page's metadata carries the tool name and the promise", () => {
    const description = metadata.description ?? "";
    expect(metadata.title).toContain("CapyBg");
    expect(description).toContain("100% in your browser");
    // The copy rules (§3.6): "nothing uploaded" is true; "offline"/"no
    // network" never is, because the model downloads.
    expect(description.toLowerCase()).toContain("never uploaded");
    expect(description.toLowerCase()).not.toMatch(/offline|no network/);
  });
});
