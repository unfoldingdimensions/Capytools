/**
 * CapyResume — the BYOK request path.
 *
 * Every call here goes **straight from the user's browser to the provider**.
 * There is no CapyResume endpoint, no proxy and no analytics hop: the key is put
 * in a request header, the provider is contacted directly, and the response is
 * returned to the caller. Nothing in this file writes to storage, logs a key, or
 * sends the résumé anywhere except to the provider the user chose.
 *
 * Two consequences of that design are handled explicitly rather than hidden:
 *   - a browser-origin call can be blocked by the provider's CORS policy, which
 *     surfaces as an opaque network failure, so it gets its own message; and
 *   - the key is in a header, never the URL, so it cannot leak into a referrer,
 *     a proxy log or a provider access log that records query strings.
 */

import { SYSTEM_PROMPT, buildUserMessage, getAction, type ActionSpec } from './prompts';
import { getProvider } from './providers';

const OPENAI_BASE = 'https://api.openai.com/v1';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';
const TIMEOUT_MS = 30_000;
const ANTHROPIC_VERSION = '2023-06-01';

export type AiErrorKind =
  | 'missing-key'
  | 'missing-model'
  | 'missing-base-url'
  | 'unauthorised'
  | 'not-found'
  | 'rate-limited'
  | 'provider-error'
  | 'network'
  | 'timeout'
  | 'bad-response';

export class AiRequestError extends Error {
  readonly kind: AiErrorKind;

  constructor(message: string, kind: AiErrorKind) {
    super(message);
    this.name = 'AiRequestError';
    this.kind = kind;
  }
}

export interface Credentials {
  providerId: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

/**
 * Whether these credentials can be used, as a message for the user (or null when
 * they are fine). Pure, so the UI can gate its button on the same rule the
 * request path enforces.
 */
export function validateCredentials(credentials: Credentials): string | null {
  const provider = getProvider(credentials.providerId);
  if (!provider) return 'Choose an AI provider.';
  if (credentials.apiKey.trim().length === 0) return 'Paste your API key to turn on AI help.';

  const model = credentials.model.trim() || provider.defaultModel;
  if (model.length === 0) return `Enter a model name for ${provider.label}.`;

  if (provider.id === 'openai-compatible') {
    if (credentials.baseUrl.trim().length === 0) {
      return 'Enter the base URL of your OpenAI-compatible endpoint.';
    }
    // `normaliseBaseUrl` refuses anything it cannot fetch, so one check covers
    // a missing scheme, a non-http scheme and malformed input.
    const url = normaliseBaseUrl(credentials.baseUrl);
    if (url.length === 0) {
      return 'The endpoint URL must start with https:// (or http:// for a local server).';
    }
    // The CSP allows plain http only to this machine, and an API key must not cross
    // the network unencrypted anyway. Refused here, the user sees why — instead of
    // a blocked request that reads as a CORS error.
    if (/^http:\/\//i.test(url) && !isLocalHost(url)) {
      return 'Use https:// for a remote endpoint — plain http:// is only allowed for a server on this machine (localhost).';
    }
  }

  return null;
}

function isLocalHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

/**
 * Turn what the user typed into a usable base URL. Accepts "api.example.com/v1"
 * or a bare host, and appends `/v1` only when no version segment is present.
 *
 * Returns an empty string for input that cannot be fetched — notably any scheme
 * other than http(s). Silently prepending `https://` to `file:///etc/passwd`
 * produced a plausible-looking URL, so a non-http scheme is refused instead.
 */
export function normaliseBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (trimmed.length === 0) return '';

  const schemeMatch = /^([a-z][a-z0-9+.-]*):\/\//i.exec(trimmed);
  if (schemeMatch) {
    const scheme = schemeMatch[1]!.toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') return '';
  }

  const withScheme = schemeMatch ? trimmed : `https://${trimmed}`;
  return /\/v\d+$/.test(withScheme) ? withScheme : `${withScheme}/v1`;
}

export interface CompleteParams extends Credentials {
  system: string;
  user: string;
  signal?: AbortSignal;
}

/** One request, one string back. Throws `AiRequestError` with a readable message. */
export async function completeText(params: CompleteParams): Promise<string> {
  const provider = getProvider(params.providerId);
  if (!provider) throw new AiRequestError('Choose an AI provider.', 'missing-model');

  const apiKey = params.apiKey.trim();
  const model = params.model.trim() || provider.defaultModel;

  const problem = validateCredentials({ ...params, apiKey, model });
  if (problem !== null) {
    const kind: AiErrorKind = apiKey.length === 0 ? 'missing-key' : 'missing-base-url';
    throw new AiRequestError(problem, kind);
  }

  const signal = params.signal ?? createTimeoutSignal(TIMEOUT_MS);

  switch (provider.id) {
    case 'gemini':
      return callGemini({ ...params, apiKey, model, signal });
    case 'anthropic':
      return callAnthropic({ ...params, apiKey, model, signal });
    case 'openai':
      return callOpenAiCompatible(
        { ...params, apiKey, model, signal },
        OPENAI_BASE,
        provider.label
      );
    case 'openai-compatible':
      return callOpenAiCompatible(
        { ...params, apiKey, model, signal },
        normaliseBaseUrl(params.baseUrl),
        provider.label
      );
    default:
      throw new AiRequestError('That provider is not supported yet.', 'provider-error');
  }
}

export interface ImproveParams extends Credentials {
  actionId: string;
  /** Where the text lives, e.g. "a bullet point under Experience · Analyst". */
  fieldLabel: string;
  text: string;
  signal?: AbortSignal;
}

/**
 * The one entry point the UI uses: pick an action, name the field, hand over the
 * text. The prompts stay in ./prompts.ts so this file is only plumbing.
 */
export async function improveText(params: ImproveParams): Promise<string> {
  const action: ActionSpec | undefined = getAction(params.actionId);
  if (!action) throw new AiRequestError('Choose what you want the AI to do.', 'provider-error');

  return completeText({
    providerId: params.providerId,
    apiKey: params.apiKey,
    model: params.model,
    baseUrl: params.baseUrl,
    system: SYSTEM_PROMPT,
    user: buildUserMessage(action, params.fieldLabel, params.text),
    ...(params.signal ? { signal: params.signal } : {}),
  });
}

// --------------------------------------------------------------------- calls

type Prepared = CompleteParams & { apiKey: string; model: string; signal: AbortSignal };

async function callOpenAiCompatible(
  params: Prepared,
  baseUrl: string,
  providerLabel: string
): Promise<string> {
  const response = await request(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
        temperature: 0.3,
      }),
      signal: params.signal,
    },
    providerLabel
  );

  const data = await readJson(response, providerLabel);
  return requireText(pick(data, ['choices', 0, 'message', 'content']), providerLabel);
}

async function callGemini(params: Prepared): Promise<string> {
  const label = 'Google Gemini';
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(params.model)}:generateContent`;

  const response = await request(
    url,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Header rather than ?key= so the secret cannot reach a URL log.
        'x-goog-api-key': params.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.system }] },
        contents: [{ role: 'user', parts: [{ text: params.user }] }],
        generationConfig: { temperature: 0.3 },
      }),
      signal: params.signal,
    },
    label
  );

  const data = await readJson(response, label);
  const parts = pick(data, ['candidates', 0, 'content', 'parts']);
  if (!Array.isArray(parts)) throw new AiRequestError(unexpected(label), 'bad-response');

  const text = parts
    .map((part) => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  return requireText(text, label);
}

async function callAnthropic(params: Prepared): Promise<string> {
  const label = 'Anthropic';
  const provider = getProvider('anthropic');

  const response = await request(
    `${ANTHROPIC_BASE}/messages`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': params.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        ...provider?.browserHeaders,
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: 1024,
        system: params.system,
        messages: [{ role: 'user', content: params.user }],
      }),
      signal: params.signal,
    },
    label
  );

  const data = await readJson(response, label);
  const content = pick(data, ['content']);
  if (!Array.isArray(content)) throw new AiRequestError(unexpected(label), 'bad-response');

  const text = content
    .map((part) => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  return requireText(text, label);
}

// ------------------------------------------------------------------- helpers

/**
 * `AbortSignal.timeout` is not available in every environment this code runs in
 * (notably jsdom under test), so fall back to a controller rather than throwing
 * at the call site.
 */
function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function request(url: string, init: RequestInit, providerLabel: string): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new AiRequestError(`${providerLabel} did not respond in time. Try again.`, 'timeout');
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      // The caller cancelled; let it through unchanged so the UI can stay quiet.
      throw error;
    }
    throw new AiRequestError(
      `Could not reach ${providerLabel} from this browser. That is usually a blocked cross-origin (CORS) request, or no connection. Check the browser console for details.`,
      'network'
    );
  }

  if (!response.ok) throw await describeFailure(response, providerLabel);
  return response;
}

async function describeFailure(response: Response, providerLabel: string): Promise<AiRequestError> {
  const detail = await readErrorDetail(response);
  const suffix = detail.length > 0 ? ` Provider said: ${detail}` : '';

  if (response.status === 401 || response.status === 403) {
    return new AiRequestError(
      `${providerLabel} rejected that key (${response.status}). Check the key is valid and allowed to use this model.${suffix}`,
      'unauthorised'
    );
  }
  if (response.status === 404) {
    return new AiRequestError(
      `${providerLabel} does not recognise that model at this endpoint (404). Check the model name.${suffix}`,
      'not-found'
    );
  }
  if (response.status === 429) {
    return new AiRequestError(
      `${providerLabel} is rate limiting this key, or its quota is used up (429). Wait a moment and try again.${suffix}`,
      'rate-limited'
    );
  }
  if (response.status >= 500) {
    return new AiRequestError(
      `${providerLabel} had a server error (${response.status}). Try again shortly.${suffix}`,
      'provider-error'
    );
  }
  return new AiRequestError(
    `${providerLabel} refused the request (${response.status}).${suffix}`,
    'provider-error'
  );
}

/** Pull a short, human-readable reason out of a provider error body. */
async function readErrorDetail(response: Response): Promise<string> {
  let body = '';
  try {
    body = await response.text();
  } catch {
    return '';
  }
  if (body.length === 0) return '';

  try {
    const parsed: unknown = JSON.parse(body);
    const message =
      pick(parsed, ['error', 'message']) ?? pick(parsed, ['message']) ?? pick(parsed, ['error']);
    if (typeof message === 'string') return truncate(message);
  } catch {
    // Not JSON — fall through to the raw body.
  }
  return truncate(body);
}

async function readJson(response: Response, providerLabel: string): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new AiRequestError(unexpected(providerLabel), 'bad-response');
  }
}

/**
 * Reasoning models (DeepSeek-R1, Qwen3 behind an OpenAI-compatible endpoint) put
 * their working in <think>…</think> — and an unclosed one when output is cut off.
 * None of it may reach a résumé. Same rule as Capytools' stripThinkingTags.
 */
export function stripThinkingTags(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();
}

function requireText(value: unknown, providerLabel: string): string {
  const text = typeof value === 'string' ? stripThinkingTags(value) : '';
  if (text.length === 0) {
    throw new AiRequestError(unexpected(providerLabel), 'bad-response');
  }
  return text;
}

function unexpected(providerLabel: string): string {
  return `${providerLabel} replied with something unexpected, so nothing was changed.`;
}

function truncate(text: string, limit = 200): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Safe path lookup: any missing link yields `undefined` rather than throwing. */
function pick(source: unknown, path: readonly (string | number)[]): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (typeof key === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[key];
    } else {
      if (!isRecord(current)) return undefined;
      current = current[key];
    }
  }
  return current;
}
