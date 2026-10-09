import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { metadata } from "@/app/capybg/page";
import { CPU_NOTE_NO_ADAPTER, CPU_NOTE_NO_WEBGPU, DETAILED_REFUSED_NOTE, decideBackend, gpuFailureFallback, modelFits } from "@/lib/capybg/backend";
import { bgFilename, backdropFill, clampQuality, decideCompose } from "@/lib/capybg/compose";
import { MAX_ASSET_BYTES, validateManifest } from "@/lib/capybg/manifest";
import { MODELS, MODEL_IDS, modelUrl, sha8 } from "@/lib/capybg/models";
import { modelInputSize, toModelTensor } from "@/lib/capybg/preprocess";
import {
  applyMatte,
  attachPeople,
  cleanMatte,
  decontaminateEdges,
  featherMatte,
  fuseMattes,
  matteFromModelOutput,
  resizeMatte,
  sigmoid,
  tileStarts,
  trimapFrom,
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
    path: "onnx/model_fp16.onnx",
    sha256: "25f165da9bfd30830a575f1f0490f1acd995975cb349bc02f3d79332e1fe5cf6",
    bytes: 12984781,
  },
  birefnet: {
    repo: "onnx-community/BiRefNet_lite-ONNX",
    revision: "de15b22ba131738a16dff04aab8bdf8dc32e3ac1",
    path: "onnx/model_fp16.onnx",
    sha256: "d39b897ceb16ae654c1731f3dba0cf9b368d9cae74b5a57459b455cc8bfec402",
    bytes: 114538221,
  },
  u2human: {
    repo: "danielgatis/rembg",
    revision: "7fb6683169d588f653281d53c3c258838194c950",
    path: "u2net_human_seg.onnx",
    url: "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx",
    sha256: "01eb6a29a5c4d8edb30b56adad9bb3a2a0535338e480724a213e0acfd2d1c73c",
    bytes: 175997641,
  },
  isnet: {
    repo: "danielgatis/rembg",
    revision: "7fb6683169d588f653281d53c3c258838194c950",
    path: "isnet-general-use.onnx",
    url: "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx",
    sha256: "60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a",
    bytes: 178648008,
  },
  vitmatte: {
    repo: "Xenova/vitmatte-small-composition-1k",
    revision: "6bc1297f6140f055a227b6d2cfe8c093281f35d2",
    path: "onnx/model.onnx",
    sha256: "bf28d2e0be2c073286e88d60ad649d7123da2749a2d99133fd1098d5887e0225",
    bytes: 103885865,
  },
};

describe("the model registry", () => {
  it("has a complete, well-formed spec for every model", () => {
    expect(MODEL_IDS).toHaveLength(5);
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
      "https://huggingface.co/Xenova/modnet/resolve/fa2fa546052fba4c08921230a26cc69a333fca12/onnx/model_fp16.onnx",
    );
  });

  it("content-addresses model directories by the first 8 hash chars", () => {
    expect(sha8(MODELS.modnet.sha256)).toBe("25f165da");
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
    expect(SUITE).toHaveLength(17);
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

describe("the detailed model is offered only where it can run", () => {
  // Measured in review (2026-10-04): BiRefNet_lite needs a 17-storage-buffer
  // shader; Chrome on Windows/D3D reports 16, and the run then never settles.
  const real = (n: number) => ({ maxStorageBuffersPerShaderStage: n, isFallbackAdapter: false });

  it("pins the measured requirement on the detailed model, and none on the people model", () => {
    expect(MODELS.birefnet.minStorageBuffersPerShaderStage).toBe(17);
    expect(MODELS.modnet.minStorageBuffersPerShaderStage).toBeUndefined();
  });

  it("refuses the detailed model on a 16-buffer adapter, before any download", () => {
    expect(modelFits(MODELS.birefnet, { backend: "webgpu", gpu: real(16) })).toBe(false);
    expect(modelFits(MODELS.birefnet, { backend: "webgpu", gpu: real(17) })).toBe(true);
    expect(modelFits(MODELS.birefnet, { backend: "webgpu", gpu: real(32) })).toBe(true);
  });

  it("refuses it on a software fallback adapter and with no adapter limits at all", () => {
    expect(modelFits(MODELS.birefnet, { backend: "webgpu", gpu: { maxStorageBuffersPerShaderStage: 32, isFallbackAdapter: true } })).toBe(false);
    expect(modelFits(MODELS.birefnet, { backend: "webgpu" })).toBe(false);
  });

  it("refuses it on the CPU path, where it would exhaust the wasm heap", () => {
    expect(modelFits(MODELS.birefnet, { backend: "wasm" })).toBe(false);
  });

  it("always fits the people model on either backend, whatever the adapter", () => {
    expect(modelFits(MODELS.modnet, { backend: "webgpu", gpu: real(8) })).toBe(true);
    expect(modelFits(MODELS.modnet, { backend: "wasm" })).toBe(true);
  });
});

describe("no cut can wait forever", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("the worker reports the adapter's storage-buffer limit with its decision", () => {
    expect(read("src/lib/capybg/worker.ts")).toMatch(/maxStorageBuffersPerShaderStage/);
  });

  it("loads and runs carry watchdogs, and the page offers a stop", async () => {
    const client = read("src/lib/capybg/client.ts");
    expect(client).toMatch(/LOAD_TIMEOUT_MS,\n\s*\);/);
    expect(client).toMatch(/RUN_TIMEOUT_MS,\n\s*\);/);
    expect(client).toMatch(/worker\.terminate\(\)/);
    const { LOAD_TIMEOUT_MS, RUN_TIMEOUT_MS } = await import("@/lib/capybg/client");
    expect(LOAD_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000);
    expect(RUN_TIMEOUT_MS).toBeGreaterThanOrEqual(30_000);
    expect(read("src/components/tool/CapyBg.tsx")).toMatch(/onClick=\{\(\) => cancelCut\(\)\}/);
  });
});

describe("the ORT wasm never ships through the bundler", () => {
  // The default "bundle" builds embed `new URL("…asyncify.wasm", import.meta.url)`,
  // so Turbopack emitted a 25.5 MiB file and `wrangler versions upload` refused it.
  it("aliases both backend imports to the extern-wasm builds", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toMatch(/"onnxruntime-web\/webgpu":\s*"\.\/node_modules\/onnxruntime-web\/dist\/ort\.webgpu\.min\.mjs"/);
    expect(config).toMatch(/"onnxruntime-web\/wasm":\s*"\.\/node_modules\/onnxruntime-web\/dist\/ort\.wasm\.min\.mjs"/);
  });

  it("the extern builds reference no wasm file of their own", () => {
    for (const f of ["ort.webgpu.min.mjs", "ort.wasm.min.mjs"]) {
      const src = readFileSync(join(process.cwd(), "node_modules/onnxruntime-web/dist", f), "utf8");
      expect(src).not.toMatch(/new URL\("[^"]*\.wasm"/);
    }
  });
});

describe("the matte matches the reference, not a backend's shortcut", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("ships fp16 MODNet, not the int8 build that kept backdrops and dropped people", () => {
    expect(MODELS.modnet.path).toBe("onnx/model_fp16.onnx");
  });

  it("pins WebGPU to NCHW — the default NHWC transform corrupts MODNet's matte", () => {
    expect(read("src/lib/capybg/worker.ts")).toMatch(/\{ name: "webgpu", preferredLayout: "NCHW" \}/);
  });
});

describe("group mode — the helper decides who, MODNet draws the edges", () => {
  // 40×40: a person (helper says so) MODNet missed on the left, a backdrop
  // blob MODNet invented on the right, far from any helper person.
  const W = 40;
  const H = 40;
  const at = (x: number, y: number) => y * W + x;
  const people = new Float32Array(W * H);
  const helper = new Float32Array(W * H);
  for (let y = 5; y < 35; y++) for (let x = 3; x < 20; x++) helper[at(x, y)] = 1; // the missed person
  for (let y = 5; y < 15; y++) for (let x = 30; x < 38; x++) people[at(x, y)] = 1; // the invented blob
  const fused = fuseMattes(people, helper, W, H);

  it("fills in a person MODNet lost, where the helper is sure", () => {
    expect(fused[at(11, 20)]).toBeGreaterThan(0.99);
  });

  it("drops what MODNet kept far from any person the helper saw", () => {
    expect(fused[at(34, 10)]).toBe(0);
  });

  it("keeps MODNet's own edge near a person, and stays in [0, 1]", () => {
    const edge = new Float32Array(W * H);
    edge[at(20, 20)] = 0.4; // just outside the helper's person — MODNet's soft edge
    const out = fuseMattes(edge, helper, W, H);
    expect(out[at(20, 20)]).toBeGreaterThanOrEqual(0.4);
    for (const v of out) expect(v >= 0 && v <= 1).toBe(true);
  });

  it("is offered on the people model only, and opt-in", () => {
    const client = readFileSync(join(process.cwd(), "src/lib/capybg/client.ts"), "utf8");
    expect(client).toMatch(/opts\.group && opts\.model === "modnet"/);
    expect(MODELS.u2human.backends).toEqual(["webgpu", "wasm"]);
    expect(modelUrl(MODELS.u2human)).toBe(MODELS.u2human.url);
  });
});

describe("the manifest is never cached as immutable", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("revalidates it on every visit, from the loader", () => {
    expect(read("src/lib/capybg/loader.ts")).toMatch(/fetch\(MANIFEST_URL, \{ cache: "no-cache" \}\)/);
  });

  it("detaches the /capybg/* immutable header for it in public/_headers", () => {
    expect(read("public/_headers")).toMatch(/\/capybg\/manifest\.json\n {2}! Cache-Control\n {2}Cache-Control: no-cache/);
  });
});

describe("group mode is per photo", () => {
  const ui = readFileSync(join(process.cwd(), "src/components/tool/CapyBg.tsx"), "utf8");

  it("a new photo after a cut switches it off; picked before the first photo, it applies", () => {
    const processFile = ui.slice(ui.indexOf("const processFile"), ui.indexOf("const processFile") + 300);
    expect(processFile).toMatch(/const groupMode = group && !file;\n\s*setGroup\(groupMode\);\n\s*void startCut\(blob, name, model, groupMode\)/);
  });

  it("a retry of the same photo keeps the mode it used", () => {
    expect(ui).toMatch(/\? \(\) => void startCut\(file\.blob, file\.name, model, group\)/);
  });
});

describe("edge-colour cleanup", () => {
  // 20×1: a red subject on the left, a blue backdrop on the right, and a soft
  // edge between whose pixels are a red/blue mix at alpha 0.5.
  const W = 20;
  const H = 1;
  const rgba = new Uint8ClampedArray(W * H * 4);
  const alpha = new Float32Array(W * H);
  for (let x = 0; x < W; x++) {
    const a = x < 9 ? 1 : x > 10 ? 0 : 0.5;
    alpha[x] = a;
    rgba[x * 4] = Math.round(255 * a);       // red share
    rgba[x * 4 + 2] = Math.round(255 * (1 - a)); // blue share
    rgba[x * 4 + 3] = 255;
  }
  const before = rgba.slice();
  decontaminateEdges(rgba, alpha, W, H);

  it("pulls an edge pixel's colour toward the subject, out of the backdrop", () => {
    expect(rgba[9 * 4]).toBeGreaterThan(before[9 * 4]); // more red
    expect(rgba[9 * 4 + 2]).toBeLessThan(before[9 * 4 + 2]); // less blue
  });

  it("leaves solid, transparent pixels and every alpha byte alone", () => {
    for (const x of [0, 5, 15, 19]) {
      for (let c = 0; c < 4; c++) expect(rgba[x * 4 + c]).toBe(before[x * 4 + c]);
    }
    for (let x = 0; x < W; x++) expect(rgba[x * 4 + 3]).toBe(255);
  });
});

describe("group mode keeps faint fabric MODNet already has", () => {
  // A thin pallu: MODNet has it (0.9), the helper only faintly (0.2), next to
  // a person the helper is sure of.
  const W = 60;
  const H = 40;
  const at = (x: number, y: number) => y * W + x;
  const people = new Float32Array(W * H);
  const helper = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 5; x < 25; x++) { helper[at(x, y)] = 1; people[at(x, y)] = 1; }
  for (let y = 10; y < 30; y++) for (let x = 25; x < 32; x++) { helper[at(x, y)] = 0.2; people[at(x, y)] = 0.9; }
  const fused = fuseMattes(people, helper, W, H);

  it("keeps the pallu the helper sees only faintly", () => {
    expect(fused[at(29, 20)]).toBeCloseTo(0.9, 5);
  });

  it("keeps fabric the helper misses entirely, because it hangs from a person", () => {
    const blind = helper.slice();
    for (let y = 10; y < 30; y++) for (let x = 25; x < 45; x++) blind[at(x, y)] = 0;
    const longPallu = people.slice();
    for (let y = 10; y < 30; y++) for (let x = 25; x < 45; x++) longPallu[at(x, y)] = 0.9;
    const out = fuseMattes(longPallu, blind, W, H);
    expect(out[at(42, 20)]).toBeCloseTo(0.9, 5); // far past any grown gate
  });

  it("the people pill re-cuts when it leaves group mode", () => {
    const ui = readFileSync(join(process.cwd(), "src/components/tool/CapyBg.tsx"), "utf8");
    expect(ui).toMatch(/if \(wasOther && file && phase === "done"\) void startCut\(file\.blob, file\.name, "modnet", false\)/);
  });
});

describe("the detailed model where BiRefNet doesn't fit", () => {
  const sixteen = { maxStorageBuffersPerShaderStage: 16, isFallbackAdapter: false };

  it("is ISNet on a 16-buffer WebGPU adapter, and never on the CPU", () => {
    expect(modelFits(MODELS.birefnet, { backend: "webgpu", gpu: sixteen })).toBe(false);
    expect(modelFits(MODELS.isnet, { backend: "webgpu", gpu: sixteen })).toBe(true);
    expect(modelFits(MODELS.isnet, { backend: "wasm" })).toBe(false);
  });

  it("hides itself and re-cuts on the people model if the GPU refuses it", () => {
    expect(gpuFailureFallback("isnet")).toBe("people");
  });

  it("is chosen BiRefNet-first by the page", () => {
    const ui = readFileSync(join(process.cwd(), "src/components/tool/CapyBg.tsx"), "utf8");
    expect(ui).toMatch(/modelFits\(MODELS\.birefnet, decision\) \? "birefnet" : modelFits\(MODELS\.isnet, decision\) \? "isnet" : null/);
  });

  it("is never the AGPL-labelled onnx-community repack", () => {
    expect(MODELS.isnet.repo).not.toMatch(/onnx-community/i);
    expect(modelUrl(MODELS.isnet)).toMatch(/^https:\/\/github\.com\/danielgatis\/rembg\/releases\//);
  });
});

describe("matte cleanup", () => {
  const W = 40;
  const H = 20;
  const at = (x: number, y: number) => y * W + x;
  const m = new Float32Array(W * H);
  for (let y = 2; y < 18; y++) for (let x = 2; x < 22; x++) m[at(x, y)] = 0.95; // the subject
  m[at(23, 10)] = 0.5; // its soft rim
  for (let y = 0; y < H; y++) for (let x = 25; x < 40; x++) if (!m[at(x, y)]) m[at(x, y)] = 0.1; // haze
  m[at(35, 3)] = 0.9; // a one-pixel speck in the haze
  const out = cleanMatte(m, W, H);

  it("clears haze and makes the subject solid", () => {
    expect(out[at(30, 15)]).toBe(0);
    expect(out[at(10, 10)]).toBe(1);
  });

  it("keeps the anti-aliased rim between", () => {
    expect(out[at(23, 10)]).toBeCloseTo((0.5 - 0.15) / 0.7, 5);
  });

  it("drops a speck far from the subject", () => {
    expect(out[at(35, 3)]).toBe(0);
  });
});

describe("every cut is cleaned", () => {
  it("runs cleanMatte on the final matte, after group fusion, before it is kept", () => {
    const client = readFileSync(join(process.cwd(), "src/lib/capybg/client.ts"), "utf8");
    const fuse = client.indexOf("matte = fuseMattes(");
    const clean = client.indexOf("matte = cleanMatte(matte, size.width, size.height);");
    const kept = client.indexOf("lastCut = {", clean);
    expect(fuse).toBeGreaterThan(0);
    expect(clean).toBeGreaterThan(fuse);
    expect(kept).toBeGreaterThan(clean);
  });
});

describe("the ISNet detailed cut keeps people parts it misses", () => {
  const W = 30;
  const H = 30;
  const at = (x: number, y: number) => y * W + x;
  const isnet = new Float32Array(W * H);
  const people = new Float32Array(W * H);
  for (let y = 2; y < 15; y++) for (let x = 10; x < 20; x++) { isnet[at(x, y)] = 1; people[at(x, y)] = 1; } // torso: both
  for (let y = 15; y < 28; y++) for (let x = 11; x < 19; x++) people[at(x, y)] = 0.95; // trousers: MODNet only
  for (let y = 2; y < 6; y++) for (let x = 24; x < 28; x++) people[at(x, y)] = 0.9; // a MODNet speck touching nothing
  const out = attachPeople(isnet, people, W, H);

  it("adds back the trousers hanging from the subject", () => {
    expect(out[at(15, 25)]).toBeCloseTo(0.95, 5);
  });

  it("keeps ISNet's cut, and ignores MODNet pieces attached to nothing", () => {
    expect(out[at(15, 8)]).toBe(1);
    expect(out[at(26, 4)]).toBe(0);
  });
});

describe("edge refinement (ViTMatte) for the detailed cut", () => {
  it("lays 512 tiles with overlap end to end", () => {
    expect(tileStarts(400, 512, 64)).toEqual([0]);
    expect(tileStarts(1024, 512, 64)).toEqual([0, 256, 512]);
    const starts = tileStarts(2048, 512, 64);
    expect(starts[0]).toBe(0);
    expect(starts[starts.length - 1]).toBe(2048 - 512);
    for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeLessThanOrEqual(512 - 64);
  });

  it("marks sure subject 1, sure backdrop 0, and the band between 0.5", () => {
    const W = 100;
    const H = 10;
    const m = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) m[y * W + x] = x < 50 ? 1 : 0;
    const t = trimapFrom(m, W, H);
    expect(t[5 * W + 10]).toBe(1);
    expect(t[5 * W + 90]).toBe(0);
    expect(t[5 * W + 49]).toBe(0.5);
    expect(t[5 * W + 50]).toBe(0.5);
  });

  it("is a webgpu-only refiner that steps aside, not a model choice", () => {
    expect(MODELS.vitmatte.backends).toEqual(["webgpu"]);
    expect(MODELS.vitmatte.licence).toBe("MIT");
    expect(gpuFailureFallback("vitmatte")).toBe("people");
  });

  it("runs on detailed cuts, after cleanup, and the pill counts its download", () => {
    const client = readFileSync(join(process.cwd(), "src/lib/capybg/client.ts"), "utf8");
    const clean = client.indexOf("matte = cleanMatte(matte, size.width, size.height);");
    const refine = client.indexOf("await refineEdges(canvas, matte, size, onProgress, notes)");
    expect(clean).toBeGreaterThan(0);
    expect(refine).toBeGreaterThan(clean);
    expect(client).toMatch(/if \(opts\.model === "isnet" \|\| opts\.model === "birefnet"\) \{/);
    const ui = readFileSync(join(process.cwd(), "src/components/tool/CapyBg.tsx"), "utf8");
    expect(ui).toMatch(/MODELS\[detailedId\]\.bytes \+ MODELS\.vitmatte\.bytes/);
  });
});
