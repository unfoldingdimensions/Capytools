import { describe, expect, it } from "vitest";

import { computeCost, extractArtifact } from "../bench/run.mjs";

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
