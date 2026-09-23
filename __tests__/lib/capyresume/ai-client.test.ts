import {
  AiRequestError,
  completeText,
  improveText,
  normaliseBaseUrl,
  validateCredentials,
} from '@/lib/capyresume/ai/client';
import { SYSTEM_PROMPT, getAction } from '@/lib/capyresume/ai/prompts';

const SECRET = 'sk-do-not-leak-me-1234567890';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function firstCall(): { url: string; init: RequestInit } {
  const call = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url: call[0], init: call[1] };
}

function headersOf(init: RequestInit): Record<string, string> {
  return (init.headers ?? {}) as Record<string, string>;
}

/** `RequestInit.body` is a union; every call under test sends a JSON string. */
function bodyOf(init: RequestInit): string {
  if (typeof init.body !== 'string') {
    throw new Error(`expected a string request body, received ${typeof init.body}`);
  }
  return init.body;
}

const openAiOk = { choices: [{ message: { content: '  Rebuilt the monthly close.  ' } }] };

describe('capyresume/ai/client — validateCredentials', () => {
  it('requires a key before anything is sent', () => {
    expect(
      validateCredentials({ providerId: 'openai', apiKey: '', model: '', baseUrl: '' })
    ).toMatch(/Paste your API key/);
  });

  it('rejects an unknown provider', () => {
    expect(
      validateCredentials({ providerId: 'nope', apiKey: 'k', model: '', baseUrl: '' })
    ).toMatch(/Choose an AI provider/);
  });

  it('accepts a provider that supplies its own default model', () => {
    expect(
      validateCredentials({ providerId: 'openai', apiKey: 'sk-1', model: '', baseUrl: '' })
    ).toBeNull();
  });

  it('requires an explicit model when the provider has no default', () => {
    expect(
      validateCredentials({
        providerId: 'openai-compatible',
        apiKey: 'sk-1',
        model: '',
        baseUrl: 'https://example.com/v1',
      })
    ).toMatch(/Enter a model name/);
  });

  it('requires a base URL for a custom endpoint', () => {
    expect(
      validateCredentials({
        providerId: 'openai-compatible',
        apiKey: 'sk-1',
        model: 'llama-3',
        baseUrl: '',
      })
    ).toMatch(/base URL/);
  });

  it('rejects a base URL that is not http(s)', () => {
    expect(
      validateCredentials({
        providerId: 'openai-compatible',
        apiKey: 'sk-1',
        model: 'llama-3',
        baseUrl: 'file:///etc/passwd',
      })
    ).toMatch(/must start with https/);
  });
});

describe('capyresume/ai/client — normaliseBaseUrl', () => {
  it('adds https and /v1 to a bare host', () => {
    expect(normaliseBaseUrl('api.example.com')).toBe('https://api.example.com/v1');
  });

  it('leaves an existing version segment alone', () => {
    expect(normaliseBaseUrl('https://api.example.com/v1')).toBe('https://api.example.com/v1');
    expect(normaliseBaseUrl('https://api.example.com/v2/')).toBe('https://api.example.com/v2');
  });

  it('keeps a local http endpoint usable', () => {
    expect(normaliseBaseUrl('http://localhost:11434/v1')).toBe('http://localhost:11434/v1');
  });

  it('returns an empty string for empty input', () => {
    expect(normaliseBaseUrl('   ')).toBe('');
  });

  it('refuses a non-http scheme instead of inventing an https URL', () => {
    // Regression: prepending https:// to "file:///etc/passwd" produced a
    // plausible-looking URL that passed validation.
    expect(normaliseBaseUrl('file:///etc/passwd')).toBe('');
    expect(normaliseBaseUrl('ftp://example.com')).toBe('');
    expect(normaliseBaseUrl('javascript://alert(1)')).toBe('');
  });
});

describe('capyresume/ai/client — the request goes straight to the provider', () => {
  const base = { apiKey: SECRET, system: 'sys', user: 'usr' };

  it('OpenAI: correct endpoint, bearer auth, model in the body', async () => {
    fetchMock.mockResolvedValue(makeResponse(openAiOk));

    const text = await completeText({ ...base, providerId: 'openai', model: '', baseUrl: '' });

    const { url, init } = firstCall();
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(headersOf(init).authorization).toBe(`Bearer ${SECRET}`);

    const body = JSON.parse(bodyOf(init)) as Record<string, unknown>;
    expect(body.model).toBe('gpt-4o-mini');
    expect(text).toBe('Rebuilt the monthly close.');
  });

  it('Gemini: key in a header, model in the path, system instruction carried', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ candidates: [{ content: { parts: [{ text: 'Tighter wording.' }] } }] })
    );

    const text = await completeText({ ...base, providerId: 'gemini', model: '', baseUrl: '' });

    const { url, init } = firstCall();
    expect(url).toContain('/models/gemini-2.0-flash:generateContent');
    expect(headersOf(init)['x-goog-api-key']).toBe(SECRET);
    expect(bodyOf(init)).toContain('systemInstruction');
    expect(text).toBe('Tighter wording.');
  });

  it('Anthropic: browser-access header present, x-api-key used', async () => {
    fetchMock.mockResolvedValue(makeResponse({ content: [{ type: 'text', text: 'Done.' }] }));

    const text = await completeText({ ...base, providerId: 'anthropic', model: '', baseUrl: '' });

    const { url, init } = firstCall();
    const headers = headersOf(init);
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(headers['x-api-key']).toBe(SECRET);
    expect(headers['anthropic-version']).toBeDefined();
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(text).toBe('Done.');
  });

  it('a custom endpoint uses the normalised base URL', async () => {
    fetchMock.mockResolvedValue(makeResponse(openAiOk));

    await completeText({
      ...base,
      providerId: 'openai-compatible',
      model: 'llama-3',
      baseUrl: 'http://localhost:11434',
    });

    expect(firstCall().url).toBe('http://localhost:11434/v1/chat/completions');
  });

  it('never puts the key in the URL or the request body, for any provider', async () => {
    // This is the property the whole privacy story rests on: the secret travels
    // in an authorization header only, so it cannot reach a URL log, a referrer
    // or a cache key.
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('anthropic')) {
        return Promise.resolve(makeResponse({ content: [{ type: 'text', text: 'ok' }] }));
      }
      if (url.includes('generativelanguage')) {
        return Promise.resolve(
          makeResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })
        );
      }
      return Promise.resolve(makeResponse(openAiOk));
    });

    for (const providerId of ['openai', 'gemini', 'anthropic', 'openai-compatible']) {
      fetchMock.mockClear();
      await completeText({
        ...base,
        providerId,
        model: providerId === 'openai-compatible' ? 'llama-3' : '',
        baseUrl: providerId === 'openai-compatible' ? 'https://example.com/v1' : '',
      });

      const { url, init } = firstCall();
      expect(url).not.toContain(SECRET);
      expect(bodyOf(init)).not.toContain(SECRET);
    }
  });

  it('does not send the résumé anywhere when the key is missing', async () => {
    await expect(
      completeText({ ...base, apiKey: '', providerId: 'openai', model: '', baseUrl: '' })
    ).rejects.toBeInstanceOf(AiRequestError);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('capyresume/ai/client — failure messages', () => {
  const base = {
    providerId: 'openai',
    apiKey: SECRET,
    model: '',
    baseUrl: '',
    system: 's',
    user: 'u',
  };

  it('maps a rejected key to a readable, actionable error', async () => {
    fetchMock.mockResolvedValue(makeResponse({ error: { message: 'Incorrect API key' } }, 401));

    await expect(completeText(base)).rejects.toMatchObject({ kind: 'unauthorised' });
    await expect(completeText(base)).rejects.toThrow(/rejected that key/);
  });

  it('maps a used-up quota to rate-limited', async () => {
    fetchMock.mockResolvedValue(makeResponse({ error: { message: 'quota exceeded' } }, 429));
    await expect(completeText(base)).rejects.toMatchObject({ kind: 'rate-limited' });
  });

  it('maps a provider outage', async () => {
    fetchMock.mockResolvedValue(makeResponse('bad gateway', 502));
    await expect(completeText(base)).rejects.toMatchObject({ kind: 'provider-error' });
  });

  it('surfaces the provider’s own words for an unexplained status', async () => {
    fetchMock.mockResolvedValue(makeResponse({ message: 'unsupported parameter' }, 400));
    await expect(completeText(base)).rejects.toThrow(/unsupported parameter/);
  });

  it('explains a blocked cross-origin call instead of showing "Failed to fetch"', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(completeText(base)).rejects.toMatchObject({ kind: 'network' });
    await expect(completeText(base)).rejects.toThrow(/cross-origin \(CORS\)/);
  });

  it('refuses a success response with no usable text', async () => {
    fetchMock.mockResolvedValue(makeResponse({ choices: [] }));
    await expect(completeText(base)).rejects.toMatchObject({ kind: 'bad-response' });
  });

  it('never echoes the key back in an error message', async () => {
    fetchMock.mockResolvedValue(makeResponse({ error: { message: 'nope' } }, 401));

    let message = '';
    try {
      await completeText(base);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toContain(SECRET);
  });
});

describe('capyresume/ai/client — improveText', () => {
  it('sends the system prompt and the chosen action’s instruction', async () => {
    fetchMock.mockResolvedValue(makeResponse(openAiOk));

    await improveText({
      providerId: 'openai',
      apiKey: SECRET,
      model: '',
      baseUrl: '',
      actionId: 'tighten',
      fieldLabel: 'a bullet point under Experience · Analyst',
      text: 'Was responsible for the monthly close process',
    });

    const body = JSON.parse(bodyOf(firstCall().init)) as {
      messages: { role: string; content: string }[];
    };
    expect(body.messages[0]!.content).toBe(SYSTEM_PROMPT);
    expect(body.messages[1]!.content).toContain(getAction('tighten')!.instruction);
    expect(body.messages[1]!.content).toContain('Was responsible for the monthly close process');
  });

  it('refuses an unknown action rather than sending a vague request', async () => {
    await expect(
      improveText({
        providerId: 'openai',
        apiKey: SECRET,
        model: '',
        baseUrl: '',
        actionId: 'do-something-random',
        fieldLabel: 'a bullet',
        text: 'text',
      })
    ).rejects.toMatchObject({ kind: 'provider-error' });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
