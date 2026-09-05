import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PROVIDER_PRESETS,
  getDefaultSettings,
  getStoredSettings,
  polishText,
  stripThinkingTags,
  testConnection,
} from "../src/lib/capytools/llm";

describe("Capytools shared LLM layer", () => {
  it("defines the 5 canonical provider presets", () => {
    expect(Object.keys(PROVIDER_PRESETS).sort()).toEqual([
      "command",
      "custom",
      "nous",
      "opencode",
      "openrouter",
    ]);
    for (const preset of Object.values(PROVIDER_PRESETS)) {
      expect(preset.defaultBaseUrl).toMatch(/^https?:\/\//);
      expect(preset.defaultModel.length).toBeGreaterThan(0);
    }
  });

  it("defaults to OpenCode-Go and honors a provider override", () => {
    expect(getDefaultSettings().provider).toBe("opencode");
    expect(getDefaultSettings("nous").model).toBe(PROVIDER_PRESETS.nous.defaultModel);
    expect(getDefaultSettings("nous").baseUrl).toBe(PROVIDER_PRESETS.nous.defaultBaseUrl);
  });

  it("returns safe defaults when storage is unavailable (SSR/node)", () => {
    expect(getStoredSettings("capyanything_polish_settings")).toEqual(getDefaultSettings());
  });

  it("strips complete and unclosed thinking tags", () => {
    expect(stripThinkingTags("<think>reasoning</think>Answer.")).toBe("Answer.");
    expect(stripThinkingTags("<think>truncated reasoning")).toBe("");
    expect(stripThinkingTags("")).toBe("");
  });

  it("rejects connection tests without an API key", async () => {
    const res = await testConnection(getDefaultSettings());
    expect(res.ok).toBe(false);
    expect(res.note).toBe("API key is empty");
  });

  it("polishText falls back to the original prompt when no key is set", async () => {
    const settings = getDefaultSettings();
    const res = await polishText("draft prompt", { settings, systemInstruction: "be terse" });
    expect(res).toEqual({ ok: false, text: "draft prompt", note: "No API key configured." });

    const custom = await polishText("draft prompt", {
      settings,
      systemInstruction: "be terse",
      noKeyNote: "No API key configured in Polish Settings.",
    });
    expect(custom.note).toBe("No API key configured in Polish Settings.");
  });

  it("treats a reasoning-only response as a failure and keeps the original", async () => {
    // A truncated <think> block strips to "" — returning that as a success
    // would hand callers an empty string and wipe whatever they render.
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "<think>still thinking" } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const settings = { ...getDefaultSettings(), apiKey: "test-key" };
    const res = await polishText("draft prompt", { settings, systemInstruction: "be terse" });

    expect(res.ok).toBe(false);
    expect(res.text).toBe("draft prompt");
    expect(res.note).toBe("Provider returned only reasoning — kept the original.");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
