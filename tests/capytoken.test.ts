import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Tiktoken } from "js-tiktoken/lite";
import o200kRanks from "js-tiktoken/ranks/o200k_base";
import cl100kRanks from "js-tiktoken/ranks/cl100k_base";

import { estimateLabelFor, contextFit, costFor } from "../src/lib/capytoken/compute";
import { DEMO_TEXT } from "../src/lib/capytoken/demo";
import { ensureEngine, countTokens } from "../src/lib/capytoken/engine";
import { chatOverhead, ruleOfThumb } from "../src/lib/capytoken/estimate";
import { formatCost, formatPerM, formatTokens } from "../src/lib/capytoken/format";
import { CURATED_PRICES, PRICES_SOURCE_COMMIT, PRICES_VERIFIED } from "../src/lib/capytoken/prices";
import { SUITE } from "../src/lib/capytools/suite";
import { metadata } from "../src/app/capytoken/page";

/**
 * CapyToken's pure layers, node-tested. The engine goldens are pinned against
 * js-tiktoken 1.0.21's ranks at test-writing time — they are the tripwire for
 * any future ranks or library upgrade that would silently change counts.
 */

const o200k = new Tiktoken(o200kRanks);
const cl100k = new Tiktoken(cl100kRanks);

describe("engine — golden vectors (js-tiktoken 1.0.21 ranks)", () => {
  const goldens: { text: string; o200k: number; cl100k: number }[] = [
    { text: "", o200k: 0, cl100k: 0 },
    { text: "hello world", o200k: 2, cl100k: 2 },
    {
      text: "The quick brown fox jumps over the lazy dog near the riverbank while the sun sets slowly.",
      o200k: 19,
      cl100k: 19,
    },
    { text: "Hello 👋 world! This costs $0.0047 per 1M tokens.", o200k: 18, cl100k: 18 },
    { text: "function add(a, b) {\n  return a + b;\n}", o200k: 14, cl100k: 14 },
    // The two encodings are close on prose but not the same — pin divergences
    // so an accidental ranks swap cannot pass.
    { text: "🙏🏿🙏🏿 done", o200k: 7, cl100k: 13 },
    { text: "色々な道具", o200k: 5, cl100k: 6 },
  ];

  for (const { text, o200k: o, cl100k: c } of goldens) {
    it(`counts ${JSON.stringify(text.slice(0, 24))} → o200k ${o}, cl100k ${c}`, () => {
      expect(o200k.encode(text)).toHaveLength(o);
      expect(cl100k.encode(text)).toHaveLength(c);
    });
  }

  it("counts the demo text without changing it between encodings' calls", () => {
    const before = o200k.encode(DEMO_TEXT).length;
    expect(cl100k.encode(DEMO_TEXT).length).toBeGreaterThan(0);
    expect(o200k.encode(DEMO_TEXT)).toHaveLength(before);
  });

  it("the raw string is counted — nothing stripped, special tokens off", () => {
    // `<think>` is ordinary text here; CapyToken counts prompts, not completions.
    expect(o200k.encode("<think>hello</think>").length).toBeGreaterThan(4);
  });
});

describe("engine — the lazy contract", () => {
  it("empty text counts 0 without loading the engine", async () => {
    expect(await countTokens("", "cl100k")).toBe(0);
    // If the empty call had warmed the singleton, this would not be null.
    expect(await countTokens("warm?", "cl100k")).toBeNull();
  });

  it("returns null while the ranks load, then an exact count after", async () => {
    expect(await countTokens("hello world", "o200k")).toBeNull();
    await ensureEngine("o200k");
    expect(await countTokens("hello world", "o200k")).toBe(2);
    // The singleton is warm — a second count is immediate and identical.
    expect(await countTokens("hello world", "o200k")).toBe(2);
  });
});

describe("estimate — OpenAI's own rules of thumb", () => {
  it("chars ÷ 4 and words × ¾, rounded", () => {
    expect(ruleOfThumb("")).toEqual({ byChars: 0, byWords: 0 });
    expect(ruleOfThumb("hello world")).toEqual({ byChars: 3, byWords: 3 });
    expect(ruleOfThumb("the capybara naps beside the warm spring")).toEqual({
      byChars: 10,
      byWords: 9,
    });
  });

  it("chat framing is the Cookbook's constants: 3 per message + 3 priming", () => {
    expect(chatOverhead(0)).toBe(3);
    expect(chatOverhead(1)).toBe(6);
    expect(chatOverhead(3)).toBe(12);
  });
});

describe("prices — the vendored snapshot", () => {
  it("carries a curated, duplicate-free set", () => {
    expect(CURATED_PRICES.length).toBeGreaterThanOrEqual(24);
    const ids = new Set(CURATED_PRICES.map((row) => row.id));
    expect(ids.size).toBe(CURATED_PRICES.length);
  });

  it("every row is well-formed: positive finite prices, sane caps, known encoding", () => {
    for (const row of CURATED_PRICES) {
      expect(row.id, row.id).toBeTruthy();
      expect(row.label, row.id).toBeTruthy();
      expect(row.provider, row.id).toBeTruthy();
      expect(["o200k", "cl100k", "estimate"], row.id).toContain(row.encoding);
      expect(Number.isFinite(row.inputPerMTok) && row.inputPerMTok > 0, row.id).toBe(true);
      expect(Number.isFinite(row.outputPerMTok) && row.outputPerMTok > 0, row.id).toBe(true);
      expect(Number.isInteger(row.maxInput) && row.maxInput > 0, row.id).toBe(true);
      expect(Number.isInteger(row.maxOutput) && row.maxOutput > 0, row.id).toBe(true);
    }
  });

  it("spans the providers the tool's copy names", () => {
    const providers = new Set(CURATED_PRICES.map((row) => row.provider));
    for (const expected of ["OpenAI", "Anthropic", "Google", "DeepSeek", "Meta", "Mistral"]) {
      expect(providers.has(expected), expected).toBe(true);
    }
  });

  it("has both exact encodings represented and the honest-estimate rows too", () => {
    const encodings = new Set(CURATED_PRICES.map((row) => row.encoding));
    expect(encodings.has("o200k")).toBe(true);
    expect(encodings.has("cl100k")).toBe(true);
    expect(encodings.has("estimate")).toBe(true);
  });

  it("stamps what it snapshots — a date and a commit the UI renders", () => {
    expect(PRICES_VERIFIED).toMatch(/^\d{4}-\d{2}$/);
    expect(PRICES_SOURCE_COMMIT).toMatch(/^[0-9a-f]{7,40}$/);
  });
});

describe("compute — cost, context fit, honesty labels", () => {
  const row = {
    id: "test-model",
    label: "Test Model",
    provider: "OpenAI",
    encoding: "o200k" as const,
    inputPerMTok: 2.5,
    outputPerMTok: 10,
    maxInput: 128_000,
    maxOutput: 4_096,
  };

  it("costFor: 1,000 tokens at $2.50/M → $0.0025; output adds; total sums", () => {
    expect(costFor(row, 1_000, 0)).toEqual({ input: 0.0025, output: 0, total: 0.0025 });
    const withOutput = costFor(row, 1_000, 512);
    expect(withOutput.output).toBeCloseTo(0.00512, 12);
    expect(withOutput.total).toBeCloseTo(0.0025 + 0.00512, 12);
  });

  it("costFor: zero tokens costs nothing", () => {
    expect(costFor(row, 0, 512)).toEqual({ input: 0, output: 0.00512, total: 0.00512 });
  });

  it("contextFit: fits, then warns by band, then hard-fails on input", () => {
    const fits = contextFit(row, 1_203, 512);
    expect(fits.fitsInput).toBe(true);
    expect(fits.fitsTotal).toBe(true);
    expect(fits.inputShare).toBeCloseTo(1_203 / 128_000, 12);

    // Input and output share the window: 127,000 in + 4,000 out clears both
    // caps individually but the combined cap is maxInput + maxOutput.
    const shares = contextFit(row, 127_000, 4_000);
    expect(shares.fitsInput).toBe(true);
    expect(shares.inputShare).toBeGreaterThan(0.8);

    const over = contextFit(row, 128_001, 0);
    expect(over.fitsInput).toBe(false);
    expect(over.inputShare).toBeGreaterThan(1);
  });

  it("estimateLabelFor maps each honesty tier to its exact copy", () => {
    expect(estimateLabelFor(row)).toEqual({ kind: "exact", text: "exact — counted with o200k_base" });
    expect(estimateLabelFor({ ...row, encoding: "cl100k" })).toEqual({
      kind: "exact",
      text: "exact — counted with cl100k_base",
    });
    const anthropic = CURATED_PRICES.find((r) => r.provider === "Anthropic");
    expect(anthropic).toBeTruthy();
    expect(estimateLabelFor(anthropic!).kind).toBe("claude-estimate");
    expect(estimateLabelFor(anthropic!).text).toContain("Claude's tokenizer differs");
    expect(estimateLabelFor(anthropic!).text).not.toContain("cl100k");
    const google = CURATED_PRICES.find((r) => r.provider === "Google");
    expect(estimateLabelFor(google!)).toEqual({
      kind: "unverified-estimate",
      text: "estimate — OpenAI-tokenizer equivalent, not verified",
    });
  });
});

describe("format — money the prompt can actually cost", () => {
  it("formatTokens groups thousands", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(1234)).toBe("1,234");
    expect(formatTokens(1_203_456)).toBe("1,203,456");
  });

  it("formatCost keeps small amounts honest instead of rounding to $0.00", () => {
    expect(formatCost(12.4)).toBe("$12.40");
    expect(formatCost(0.06)).toBe("$0.060");
    expect(formatCost(0.045)).toBe("$0.045");
    expect(formatCost(0.004678)).toBe("$0.0047");
    expect(formatCost(0.00025)).toBe("$0.0003");
    expect(formatCost(0)).toBe("$0.0000");
  });

  it("formatPerM shows the industry's per-1M convention", () => {
    expect(formatPerM(2.5e-6)).toBe("$2.50");
    expect(formatPerM(5e-6)).toBe("$5.00");
    expect(formatPerM(5e-8)).toBe("$0.05");
    expect(formatPerM(4e-9)).toBe("$0.0040");
  });
});

describe("registration — the suite knows CapyToken", () => {
  it("SUITE row 9 is CapyToken at /capytoken, with its plate", () => {
    expect(SUITE).toHaveLength(9);
    const row = SUITE[8];
    expect(row.name).toBe("CapyToken");
    expect(row.href).toBe("/capytoken");
    expect(row.cat).toBe("browser");
    expect(row.plate).toEqual({ src: "/plates/lab-9.webp", width: 896, height: 1200 });
    expect(existsSync(join(process.cwd(), "public", "plates", "lab-9.webp"))).toBe(true);
  });

  it("the page's metadata carries the tool name and the promise", () => {
    expect(metadata.title).toContain("CapyToken");
    expect(metadata.description).toContain("100% in your browser");
  });
});
