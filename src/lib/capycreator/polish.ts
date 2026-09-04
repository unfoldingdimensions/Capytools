import { PolishProvider, PolishSettings } from "./types";

export interface ProviderPreset {
  id: PolishProvider;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  placeholderKey: string;
  description: string;
}

export const PROVIDER_PRESETS: Record<PolishProvider, ProviderPreset> = {
  opencode: {
    id: "opencode",
    name: "OpenCode-Go",
    defaultBaseUrl: "https://opencode.ai/zen/go/v1",
    defaultModel: "qwen3.8-flash",
    placeholderKey: "opencode-go API key...",
    description: "High-speed Qwen 3.8 Flash via opencode.ai GO endpoint",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
    placeholderKey: "sk-or-v1-...",
    description: "Universal API for Claude, DeepSeek, Llama, and Gemma",
  },
  nous: {
    id: "nous",
    name: "Nous Portal",
    defaultBaseUrl: "https://inference.nousresearch.com/v1",
    defaultModel: "hermes-3-llama-3.1-70b",
    placeholderKey: "nous-portal API key...",
    description: "Nous Research Hermes 3 and reasoning models",
  },
  command: {
    id: "command",
    name: "Command Code (Cohere)",
    defaultBaseUrl: "https://api.cohere.com/v2",
    defaultModel: "command-r-plus",
    placeholderKey: "cohere API key...",
    description: "Cohere Command Code / Command R models",
  },
  custom: {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen2.5-coder",
    placeholderKey: "API key or token (if needed)...",
    description: "Local Ollama, vLLM, LM Studio, or private proxy",
  },
};

const STORAGE_KEY = "capycreator_polish_settings";

export function getDefaultSettings(provider: PolishProvider = "opencode"): PolishSettings {
  const preset = PROVIDER_PRESETS[provider];
  return {
    provider,
    apiKey: "",
    baseUrl: preset.defaultBaseUrl,
    model: preset.defaultModel,
  };
}

export function getStoredSettings(): PolishSettings {
  if (typeof window === "undefined") {
    return getDefaultSettings();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSettings();
    const parsed = JSON.parse(raw);
    const provider: PolishProvider = parsed.provider in PROVIDER_PRESETS ? parsed.provider : "opencode";
    return {
      provider,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      baseUrl: typeof parsed.baseUrl === "string" && parsed.baseUrl ? parsed.baseUrl : PROVIDER_PRESETS[provider].defaultBaseUrl,
      model: typeof parsed.model === "string" && parsed.model ? parsed.model : PROVIDER_PRESETS[provider].defaultModel,
    };
  } catch {
    return getDefaultSettings();
  }
}

export function saveStoredSettings(settings: PolishSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or disabled localStorage errors
  }
}

export function stripThinkingTags(raw: string): string {
  if (!raw) return "";
  // Strip complete <think>...</think> blocks
  let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // Strip unclosed <think> if model output was truncated
  s = s.replace(/<think>[\s\S]*$/gi, "");
  return s.trim();
}

function normalizeUrl(baseUrl: string, endpoint: string): string {
  const cleanBase = baseUrl.trim().replace(/\/+$/, "");
  if (cleanBase.endsWith("/chat/completions")) {
    return cleanBase;
  }
  return `${cleanBase}${endpoint}`;
}

export async function testConnection(
  settings: PolishSettings
): Promise<{ ok: boolean; note: string }> {
  if (!settings.apiKey.trim()) {
    return { ok: false, note: "API key is empty" };
  }

  const endpoint = normalizeUrl(settings.baseUrl, "/chat/completions");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${settings.apiKey.trim()}`,
  };

  if (settings.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://capytools.vercel.app";
    headers["X-Title"] = "CapyCreator";
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: settings.model.trim(),
        messages: [{ role: "user", content: "Ping: reply with 'pong'" }],
        max_tokens: 10,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      return { ok: true, note: `Connected to ${settings.model} (${res.status} OK)` };
    }

    if (res.status === 401) {
      return { ok: false, note: "401 Unauthorized: Invalid API key" };
    }
    if (res.status === 402) {
      return { ok: false, note: "402 Payment Required: Out of credits" };
    }
    if (res.status === 403) {
      return { ok: false, note: "403 Forbidden: Access denied or Cloudflare block" };
    }
    if (res.status === 404) {
      return { ok: false, note: `404 Not Found: Model '${settings.model}' or endpoint not found` };
    }
    if (res.status === 429) {
      return { ok: false, note: "429 Rate Limited: Too many requests" };
    }

    return { ok: false, note: `HTTP error ${res.status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("aborted")) {
      return { ok: false, note: "Connection timed out (12s)" };
    }
    return { ok: false, note: `Network error: ${msg} (check CORS or URL)` };
  }
}

export async function polishPrompt(
  prompt: string,
  targetFamily: string,
  tier: number,
  settings: PolishSettings
): Promise<{ ok: boolean; text: string; note: string }> {
  if (!settings.apiKey.trim()) {
    return {
      ok: false,
      text: prompt,
      note: "No API key configured in Polish Settings.",
    };
  }

  const endpoint = normalizeUrl(settings.baseUrl, "/chat/completions");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${settings.apiKey.trim()}`,
  };

  if (settings.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://capytools.vercel.app";
    headers["X-Title"] = "CapyCreator";
  }

  const systemInstruction = `You are an expert prompt engineer specializing in prompt architecture for ${targetFamily} (capability tier ${tier}).
Your job is to polish the provided deterministic draft prompt into the most effective, clear, and natural instruction set for this model family.
CRITICAL RULES:
1. Preserve all specific constraints, parameters, format requirements, and negative rules.
2. Optimize structure and wording for ${targetFamily}'s instruction-following behavior.
3. Do not add introductory conversational prose, preambles, or concluding remarks. Output ONLY the polished prompt itself.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: settings.model.trim(),
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Please polish this draft prompt:\n\n${prompt}` },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 401) return { ok: false, text: prompt, note: "401 Invalid API key" };
      if (res.status === 402) return { ok: false, text: prompt, note: "402 Out of credits" };
      if (res.status === 429) return { ok: false, text: prompt, note: "429 Rate limit exceeded" };
      return { ok: false, text: prompt, note: `Provider error (HTTP ${res.status})` };
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      return { ok: false, text: prompt, note: "Provider returned empty response" };
    }

    const cleaned = stripThinkingTags(rawContent);
    return {
      ok: true,
      text: cleaned,
      note: `Polished via ${settings.model} (${settings.provider})`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, text: prompt, note: `Request failed: ${msg}` };
  }
}
