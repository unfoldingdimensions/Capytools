import { describe, expect, it } from "vitest";

import { VENDORS, checkUsage, computeCost, extractArtifact } from "../bench/run.mjs";
import { findContamination, runFolderName, slug } from "../bench/new-run.mjs";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const fence = "`".repeat(3);
const block = (body: string) => `${fence}html\n${body}\n${fence}`;

describe("extractArtifact", () => {
  it("takes the html out of a fenced block", () => {
    const out = extractArtifact(`here you go\n\n${block("<!DOCTYPE html><p>onsen</p>")}\n`);
    expect(out.extracted).toBe("fenced-html-block");
    expect(out.html.trim()).toBe("<!DOCTYPE html><p>onsen</p>");
  });

  it("takes the LAST block when a model emits several", () => {
    const out = extractArtifact(`${block("<p>draft</p>")}\n\noops, fixed:\n\n${block("<p>final</p>")}`);
    expect(out.html.trim()).toBe("<p>final</p>");
  });

  it("accepts a bare document with no fence", () => {
    const out = extractArtifact("<!DOCTYPE html>\n<html><body>onsen</body></html>");
    expect(out.extracted).toBe("bare-document");
    expect(out.html).toContain("<body>onsen</body>");
  });

  it("records an empty artifact when the model shipped no file", () => {
    const out = extractArtifact("Sure! Here is how I would approach building that simulation...");
    expect(out.extracted).toBe("none");
    expect(out.html).toBe("");
  });
});

describe("computeCost", () => {
  const pricing = { inputPerMTok: 5, outputPerMTok: 25 };

  it("prices input and output at the frozen official rates", () => {
    const cost = computeCost(
      { inputTokens: 1_204, outputTokens: 18_442, reasoningTokens: 0, cachedInputTokens: 0 },
      pricing,
    );
    expect(cost.inputUsd).toBeCloseTo(0.00602, 6);
    expect(cost.outputUsd).toBeCloseTo(0.46105, 6);
    expect(cost.totalUsd).toBeCloseTo(0.46707, 6);
  });

  it("never bills reasoning tokens twice — they are already inside outputTokens", () => {
    const usage = { inputTokens: 1_000, outputTokens: 20_000, cachedInputTokens: 0 };
    const quiet = computeCost({ ...usage, reasoningTokens: 0 }, pricing);
    const thinking = computeCost({ ...usage, reasoningTokens: 12_000 }, pricing);
    expect(thinking.totalUsd).toBe(quiet.totalUsd);
  });
});

describe("checkUsage", () => {
  const clean = { inputTokens: 1_000, outputTokens: 20_000, reasoningTokens: 8_000, cachedInputTokens: 0 };

  it("stays quiet when reasoning sits inside output and nothing was cached", () => {
    expect(checkUsage(clean)).toEqual([]);
  });

  it("shouts when reasoning exceeds output, which would mean the cost is understated", () => {
    const warnings = checkUsage({ ...clean, reasoningTokens: 25_000 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("UNDERSTATES");
  });

  it("flags cached input, which the cost overstates at the full input rate", () => {
    const warnings = checkUsage({ ...clean, cachedInputTokens: 1_024 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("OVERSTATES");
  });
});

describe("google adapter", () => {
  it("bills candidatesTokenCount and reports thoughts as a subset of it", () => {
    const out = VENDORS.google.read({
      candidates: [{ content: { parts: [{ text: "<!DOCTYPE html>" }, { text: "<p>hi</p>" }] }, finishReason: "STOP" }],
      usageMetadata: {
        promptTokenCount: 1_100,
        candidatesTokenCount: 30_000,
        thoughtsTokenCount: 9_000,
        cachedContentTokenCount: 0,
      },
    });
    expect(out.text).toBe("<!DOCTYPE html><p>hi</p>");
    expect(out.usage).toEqual({
      inputTokens: 1_100,
      outputTokens: 30_000,
      reasoningTokens: 9_000,
      cachedInputTokens: 0,
    });
    expect(out.stopReason).toBe("STOP");
    expect(checkUsage(out.usage)).toEqual([]);
  });

  it("keeps the api key out of the url", () => {
    const url = VENDORS.google.url({ baseUrl: "https://generativelanguage.googleapis.com", id: "gemini-3.8-flash" });
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent");
    expect(VENDORS.google.headers("secret")["x-goog-api-key"]).toBe("secret");
  });

  it("survives a truncated response with no candidates", () => {
    const out = VENDORS.google.read({ usageMetadata: { promptTokenCount: 1_100 } });
    expect(out.text).toBe("");
    expect(out.usage.outputTokens).toBe(0);
  });
});

describe("run folder naming", () => {
  it("strips the dots and spaces that would become %20 in a video URL", () => {
    expect(slug("gemini-3.8-flash")).toBe("gemini-3-8-flash");
    expect(slug("Claude Opus 5")).toBe("claude-opus-5");
    expect(slug("gpt-5.6-sol")).toBe("gpt-5-6-sol");
  });

  it("names a folder model__date", () => {
    expect(runFolderName("gemini-3.8-flash", "2026-09-12")).toBe("gemini-3-8-flash__2026-09-12");
  });
});

describe("findContamination", () => {
  it("treats this repo as fatally contaminated — it would hand over the design system", () => {
    const { fatal } = findContamination(process.cwd());
    expect(fatal.some((h) => h.endsWith("CLAUDE.md"))).toBe(true);
    expect(fatal.some((h) => h.endsWith("AGENTS.md"))).toBe(true);
    expect(fatal.some((h) => h.endsWith(".git"))).toBe(true);
  });

  it("looks at parents too, not just the folder itself", () => {
    // bench/ holds none of these; the repo root above it holds all three.
    const { fatal } = findContamination(join(process.cwd(), "bench"));
    expect(fatal.some((h) => h.endsWith("CLAUDE.md"))).toBe(true);
  });

  it("finds nothing fatal in a temp directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "capybench-sterile-"));
    try {
      expect(findContamination(dir).fatal).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("classifies the operator user-level config as ambient, not fatal", () => {
    const dir = mkdtempSync(join(tmpdir(), "capybench-ambient-"));
    try {
      const { fatal, ambient } = findContamination(dir);
      expect(fatal).toEqual([]);
      // Every hit reported as ambient lives directly in the home directory.
      for (const a of ambient) expect(dirname(a)).toBe(resolve(homedir()));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("catches a contaminant in the run directory itself as fatal", () => {
    const dir = mkdtempSync(join(tmpdir(), "capybench-dirty-"));
    try {
      writeFileSync(join(dir, "AGENTS.md"), "read the style guide");
      expect(findContamination(dir).fatal).toEqual([join(dir, "AGENTS.md")]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
