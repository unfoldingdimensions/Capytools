import { describe, expect, it } from "vitest";
import { MODEL_PROFILES, FAMILIES } from "../src/lib/capycreator/profiles";
import {
  detectTaskType,
  requiredForTier,
  buildQuestionnaire,
  buildIntent,
} from "../src/lib/capycreator/intent";
import { assemble } from "../src/lib/capycreator/assemble";
import {
  stripThinkingTags,
  PROVIDER_PRESETS,
  getDefaultSettings,
} from "../src/lib/capycreator/polish";

describe("CapyCreator Model Profiles", () => {
  it("defines all 7 canonical model families", () => {
    const ids = FAMILIES.map((f) => f.id);
    expect(ids).toEqual([
      "claude",
      "deepseek",
      "gemini",
      "glm",
      "gpt",
      "hunyuan",
      "qwen",
    ]);
  });

  it("each profile has required properties and principles", () => {
    for (const f of FAMILIES) {
      expect(f.vendor).toBeTruthy();
      expect(f.family).toBeTruthy();
      expect(f.capability_tier).toBeGreaterThanOrEqual(1);
      expect(f.capability_tier).toBeLessThanOrEqual(5);
      expect(f.prompt_principles.do.length).toBeGreaterThan(0);
    }
  });
});

describe("CapyCreator Intent Detection", () => {
  it("detects design review tasks", () => {
    expect(detectTaskType("do a design review of the login screen")).toBe("design_review");
    expect(detectTaskType("UX review of checkout")).toBe("design_review");
  });

  it("detects code review tasks", () => {
    expect(detectTaskType("code review for this pull request")).toBe("code_review");
  });

  it("detects debugging tasks", () => {
    expect(detectTaskType("debug why this test is failing with a stack trace")).toBe("debugging");
  });

  it("detects writing tasks", () => {
    expect(detectTaskType("write a blog article about rust")).toBe("writing");
  });

  it("detects analysis tasks", () => {
    expect(detectTaskType("compare and analyze the pros and cons of redis vs postgres")).toBe("analysis");
  });

  it("falls back to generic on unrecognized asks", () => {
    expect(detectTaskType("help me plan a weekend trip")).toBe("generic");
  });
});

describe("CapyCreator Tier-Scaled Questionnaire", () => {
  it("requires all intent-defining dimensions for Flash / Tier 2 models", () => {
    expect(requiredForTier("current_state", 2)).toBe(true);
    expect(requiredForTier("desired_state", 2)).toBe(true);
    expect(requiredForTier("constraints", 2)).toBe(true);
    expect(requiredForTier("non_negotiables", 2)).toBe(true);
    expect(requiredForTier("output_format", 2)).toBe(true);
    expect(requiredForTier("audience", 2)).toBe(false);
  });

  it("makes non_negotiables optional for Mid / Tier 3 models", () => {
    expect(requiredForTier("current_state", 3)).toBe(true);
    expect(requiredForTier("desired_state", 3)).toBe(true);
    expect(requiredForTier("non_negotiables", 3)).toBe(false);
  });

  it("makes all dimensions optional for Frontier / Tier 4-5 models", () => {
    expect(requiredForTier("current_state", 4)).toBe(false);
    expect(requiredForTier("desired_state", 5)).toBe(false);
    expect(requiredForTier("non_negotiables", 5)).toBe(false);
  });

  it("builds questionnaire with correct required flags for Gemini (Tier 2 default)", () => {
    const qs = buildQuestionnaire("review the design of the modal", "gemini");
    const requiredList = qs.filter((q) => q.required).map((q) => q.id);
    expect(requiredList).toContain("current_state");
    expect(requiredList).toContain("desired_state");
    expect(requiredList).toContain("non_negotiables");
  });

  it("builds questionnaire with optional flags for Claude (Tier 4 default)", () => {
    const qs = buildQuestionnaire("review the design of the modal", "claude");
    const requiredList = qs.filter((q) => q.required);
    expect(requiredList).toHaveLength(0);
  });
});

describe("CapyCreator Prompt Assembly", () => {
  it("injects role, numbered steps, negative constraints, and ONLY artifact rule for Flash / Tier 2", () => {
    const intent = buildIntent(
      "do a design review",
      "gemini",
      {
        current_state: "cramped layout",
        desired_state: "8px grid spacing",
        non_negotiables: "no new CSS libraries",
      },
      2
    );
    const prompt = assemble(intent, MODEL_PROFILES.gemini, 2);

    expect(prompt).toContain("You are a senior, meticulous Gemini assistant");
    expect(prompt).toContain("Steps:");
    expect(prompt).toContain("1. Review the starting point: cramped layout");
    expect(prompt).toContain("Do NOT:");
    expect(prompt).toContain("no new CSS libraries");
    expect(prompt).toContain("Respond with ONLY the requested artifact. No prose before or after it.");
  });

  it("stays intent-first and omits rigid step scaffolding for Frontier / Tier 5", () => {
    const intent = buildIntent(
      "do a design review",
      "claude",
      {
        current_state: "cramped layout",
        desired_state: "8px grid spacing",
      },
      5
    );
    const prompt = assemble(intent, MODEL_PROFILES.claude, 5);

    expect(prompt).not.toContain("Steps:");
    expect(prompt).not.toContain("Do NOT:");
    expect(prompt).toContain("Proceed directly and use your judgment to satisfy the intent above.");
  });
  it("carries the raw ask through even when nothing is required and nothing is answered", () => {
    // Tier 4-5 requires no answers, so the ask is the only thing describing the work.
    const ask = "do a design review of the login page";
    const intent = buildIntent(ask, "claude", {}, 5);
    const prompt = assemble(intent, MODEL_PROFILES.claude, 5);

    expect(prompt).toContain("of the login page");
    expect(prompt).toContain(`Ask: ${ask}`);
  });

  it("omits the Ask line when the ask is blank", () => {
    const intent = buildIntent("   ", "claude", {}, 5);
    const prompt = assemble(intent, MODEL_PROFILES.claude, 5);
    expect(prompt).not.toContain("Ask:");
  });
});

describe("CapyCreator Polish & Multi-Provider Support", () => {
  it("correctly strips thinking tags from Qwen and reasoning models", () => {
    const withThink = "<think>Let me reflect on the constraints...\nDone reflection.</think>Here is the polished prompt.";
    expect(stripThinkingTags(withThink)).toBe("Here is the polished prompt.");

    const unclosedThink = "<think>Truncated reasoning... Here is";
    expect(stripThinkingTags(unclosedThink)).toBe("");
  });

  it("provides presets for all requested providers", () => {
    expect(PROVIDER_PRESETS.opencode.defaultModel).toBe("qwen3.8-flash");
    expect(PROVIDER_PRESETS.openrouter.defaultBaseUrl).toBe("https://openrouter.ai/api/v1");
    expect(PROVIDER_PRESETS.nous.defaultModel).toBe("hermes-3-llama-3.1-70b");
    expect(PROVIDER_PRESETS.command.name).toContain("Command Code");
  });

  it("initializes default settings cleanly", () => {
    const def = getDefaultSettings("openrouter");
    expect(def.provider).toBe("openrouter");
    expect(def.baseUrl).toBe("https://openrouter.ai/api/v1");
    expect(def.apiKey).toBe("");
  });
});
