/**
 * CapyResume — BYOK provider catalogue.
 *
 * Every request described here is made **directly from the user's browser to the
 * provider**. There is deliberately no CapyResume server in the path: that is
 * what makes "your key and your résumé never reach us" true rather than a
 * promise. The cost of that design is that the provider has to accept a
 * browser-origin (CORS) call, which is why some entries need an extra header.
 *
 * Adding a provider is a row here, not a branch in the request code.
 */

export type AiProviderId = 'openai' | 'gemini' | 'anthropic' | 'openai-compatible';

export interface AiProvider {
  id: AiProviderId;
  label: string;
  /** Where the user goes to make a key. Shown next to the key field. */
  keysUrl: string;
  /** Starting points for the model field. The field stays free-text on purpose. */
  suggestedModels: readonly string[];
  defaultModel: string;
  /**
   * Headers the provider requires before it will accept a call originating from
   * a web page. Anthropic refuses browser-origin calls unless it is explicitly
   * told the key is browser-held; the user is making that choice by pasting it.
   */
  browserHeaders?: Readonly<Record<string, string>>;
  docsUrl: string;
}

export const PROVIDERS: readonly AiProvider[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    keysUrl: 'https://platform.openai.com/api-keys',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    defaultModel: 'gpt-4o-mini',
    docsUrl: 'https://platform.openai.com/docs/api-reference/chat',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    keysUrl: 'https://aistudio.google.com/apikey',
    suggestedModels: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    keysUrl: 'https://console.anthropic.com/settings/keys',
    suggestedModels: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest'],
    defaultModel: 'claude-3-5-haiku-latest',
    // Anthropic rejects browser-origin calls unless this is set.
    browserHeaders: { 'anthropic-dangerous-direct-browser-access': 'true' },
    docsUrl: 'https://docs.anthropic.com/en/api/messages',
  },
  {
    id: 'openai-compatible',
    label: 'Other (OpenAI-compatible)',
    keysUrl: '',
    suggestedModels: [],
    defaultModel: '',
    docsUrl: '',
  },
];

export const DEFAULT_PROVIDER_ID: AiProviderId = 'openai';

export function getProvider(id: string): AiProvider | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}
