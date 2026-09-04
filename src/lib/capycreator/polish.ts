import {
  PROVIDER_PRESETS,
  getDefaultSettings,
  getStoredSettings as getStoredLlmSettings,
  polishText,
  saveStoredSettings as saveStoredLlmSettings,
  stripThinkingTags,
  testConnection as testLlmConnection,
  LlmSettings,
} from "@/lib/capytools/llm";

export { PROVIDER_PRESETS, getDefaultSettings, stripThinkingTags };
export type { ProviderPreset } from "@/lib/capytools/llm";

const STORAGE_KEY = "capycreator_polish_settings";

const APP_IDENTITY = { name: "CapyCreator" } as const;

export function getStoredSettings(): LlmSettings {
  return getStoredLlmSettings(STORAGE_KEY);
}

export function saveStoredSettings(settings: LlmSettings): void {
  saveStoredLlmSettings(settings, STORAGE_KEY);
}

export function testConnection(settings: LlmSettings) {
  return testLlmConnection(settings, APP_IDENTITY);
}

export async function polishPrompt(
  prompt: string,
  targetFamily: string,
  tier: number,
  settings: LlmSettings
): Promise<{ ok: boolean; text: string; note: string }> {
  const systemInstruction = `You are an expert prompt engineer specializing in prompt architecture for ${targetFamily} (capability tier ${tier}).
Your job is to polish the provided deterministic draft prompt into the most effective, clear, and natural instruction set for this model family.
CRITICAL RULES:
1. Preserve all specific constraints, parameters, format requirements, and negative rules.
2. Optimize structure and wording for ${targetFamily}'s instruction-following behavior.
3. Do not add introductory conversational prose, preambles, or concluding remarks. Output ONLY the polished prompt itself.`;

  return polishText(prompt, {
    settings,
    systemInstruction,
    identity: APP_IDENTITY,
    noKeyNote: "No API key configured in Polish Settings.",
  });
}
