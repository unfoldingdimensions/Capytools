import { SITE_URL } from "@/lib/utils";

export type LlmProvider = "opencode" | "openrouter" | "nous" | "command" | "custom";

export interface LlmSettings {
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ProviderPreset {
  id: LlmProvider;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  placeholderKey: string;
  description: string;
}

export const PROVIDER_PRESETS: Record<LlmProvider, ProviderPreset> = {
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
    defaultBaseUrl: "https://api.cohere.ai/compatibility/v1",
    defaultModel: "command-a-plus-05-2026",
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

export function getDefaultSettings(provider: LlmProvider = "opencode"): LlmSettings {
  const preset = PROVIDER_PRESETS[provider];
  return {
    provider,
    apiKey: "",
    baseUrl: preset.defaultBaseUrl,
    model: preset.defaultModel,
  };
}

/**
 * Bound a stored baseUrl on the way OUT of localStorage, not just on the way in.
 *
 * This value is where the user's API key gets sent (`buildHeaders` attaches
 * `Authorization` to whatever origin it names). Anything able to write one
 * storage key — an XSS, a browser extension, someone else on the machine —
 * would otherwise silently redirect every future request, key and prompt text
 * included, with nothing visible changing in the UI.
 *
 * Plain http is allowed only for loopback, because the `custom` preset
 * legitimately defaults to a local Ollama at http://localhost:11434/v1.
 */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function safeBaseUrl(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value) return fallback;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return value;
    if (url.protocol === "http:" && LOOPBACK.has(url.hostname)) return value;
  } catch {
    // Not a URL at all — fall through to the provider default.
  }
  return fallback;
}

export function getStoredSettings(storageKey: string): LlmSettings {
  if (typeof window === "undefined") {
    return getDefaultSettings();
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return getDefaultSettings();
    const parsed = JSON.parse(raw);
    const provider: LlmProvider =
      typeof parsed.provider === "string" && parsed.provider in PROVIDER_PRESETS
        ? parsed.provider
        : "opencode";
    return {
      provider,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      baseUrl: safeBaseUrl(parsed.baseUrl, PROVIDER_PRESETS[provider].defaultBaseUrl),
      model:
        typeof parsed.model === "string" && parsed.model
          ? parsed.model
          : PROVIDER_PRESETS[provider].defaultModel,
    };
  } catch {
    return getDefaultSettings();
  }
}

export function saveStoredSettings(settings: LlmSettings, storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
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

export interface LlmAppIdentity {
  /** Sent as OpenRouter's X-Title header; also the default attribution for future providers. */
  name: string;
  /** Sent as OpenRouter's HTTP-Referer header. Defaults to the site URL. */
  url?: string;
}

function identityHeaders(identity?: LlmAppIdentity): Record<string, string> {
  return {
    "HTTP-Referer": identity?.url ?? SITE_URL,
    "X-Title": identity?.name ?? "Capytools",
  };
}

function normalizeUrl(baseUrl: string, endpoint: string): string {
  const cleanBase = baseUrl.trim().replace(/\/+$/, "");
  if (cleanBase.endsWith("/chat/completions")) {
    return cleanBase;
  }
  return `${cleanBase}${endpoint}`;
}

function buildHeaders(settings: LlmSettings, identity?: LlmAppIdentity): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${settings.apiKey.trim()}`,
  };
  if (settings.provider === "openrouter") {
    Object.assign(headers, identityHeaders(identity));
  }
  return headers;
}

export async function testConnection(
  settings: LlmSettings,
  identity?: LlmAppIdentity
): Promise<{ ok: boolean; note: string }> {
  if (!settings.apiKey.trim()) {
    return { ok: false, note: "API key is empty" };
  }

  const endpoint = normalizeUrl(settings.baseUrl, "/chat/completions");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: buildHeaders(settings, identity),
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

export interface CompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  identity?: LlmAppIdentity;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
}

export async function runCompletion(
  settings: LlmSettings,
  messages: CompletionMessage[],
  options: CompletionOptions = {}
): Promise<{ ok: boolean; text: string; note: string }> {
  if (!settings.apiKey.trim()) {
    return { ok: false, text: "", note: "No API key configured." };
  }

  const endpoint = normalizeUrl(settings.baseUrl, "/chat/completions");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: buildHeaders(settings, options.identity),
      body: JSON.stringify({
        model: settings.model.trim(),
        messages,
        temperature: options.temperature ?? 0.3,
        ...(options.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 401) return { ok: false, text: "", note: "401 Invalid API key" };
      if (res.status === 402) return { ok: false, text: "", note: "402 Out of credits" };
      if (res.status === 429) return { ok: false, text: "", note: "429 Rate limit exceeded" };
      return { ok: false, text: "", note: `Provider error (HTTP ${res.status})` };
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      return { ok: false, text: "", note: "Provider returned empty response" };
    }

    return { ok: true, text: rawContent, note: `Completed via ${settings.model} (${settings.provider})` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, text: "", note: `Request failed: ${msg}` };
  }
}

export interface PolishOptions extends CompletionOptions {
  settings: LlmSettings;
  systemInstruction: string;
  userPrefix?: string;
  /** Note returned when no API key is set. Defaults to "No API key configured." */
  noKeyNote?: string;
}

export async function polishText(
  prompt: string,
  options: PolishOptions
): Promise<{ ok: boolean; text: string; note: string }> {
  if (!options.settings.apiKey.trim()) {
    return {
      ok: false,
      text: prompt,
      note: options.noKeyNote ?? "No API key configured.",
    };
  }

  const res = await runCompletion(
    options.settings,
    [
      { role: "system", content: options.systemInstruction },
      {
        role: "user",
        content: `${options.userPrefix ?? "Please polish this draft prompt:"}\n\n${prompt}`,
      },
    ],
    options
  );

  if (!res.ok) {
    return { ok: false, text: prompt, note: res.note };
  }

  const cleaned = stripThinkingTags(res.text);
  if (!cleaned) {
    return { ok: false, text: prompt, note: "Provider returned only reasoning — kept the original." };
  }

  return {
    ok: true,
    text: cleaned,
    note: `Polished via ${options.settings.model} (${options.settings.provider})`,
  };
}
