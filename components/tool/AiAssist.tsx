'use client';

/**
 * CapyResume — optional AI assist, bring your own key.
 *
 * This component is the only place in the app that makes a network request, and
 * it says so on screen. The key is held in the user's own browser and sent
 * straight to the provider they chose (see lib/capyresume/ai/client.ts); there
 * is no CapyResume server involved, so the copy here has to be accurate rather
 * than reassuring.
 *
 * Styling is deliberately plain — the visual pass comes later.
 */

import { useId, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AiRequestError, improveText, validateCredentials } from '@/lib/capyresume/ai/client';
import {
  clearAiSettings,
  maskApiKey,
  saveAiSettings,
  useAiSettings,
  type AiSettings,
} from '@/lib/capyresume/ai/keys';
import { IMPROVE_ACTIONS, getAction, type ImproveAction } from '@/lib/capyresume/ai/prompts';
import { PROVIDERS, getProvider } from '@/lib/capyresume/ai/providers';
import { collectTextTargets } from '@/lib/capyresume/ai/targets';
import type { ResumeDoc } from '@/lib/capyresume/types';

interface Suggestion {
  targetId: string;
  before: string;
  after: string;
}

export function AiAssist({
  doc,
  onApply,
}: {
  doc: ResumeDoc;
  onApply: (targetId: string, text: string) => void;
}) {
  const ids = useId();
  const settings = useAiSettings();

  // The form is a draft until saved, so a half-typed key is never persisted and
  // a stored key is never re-rendered into an input.
  const [draft, setDraft] = useState<AiSettings | null>(null);
  const form = draft ?? settings;
  const provider = getProvider(form.providerId);

  const credentialsProblem = validateCredentials(form);
  const keyIsSet = settings.apiKey.trim().length > 0;

  const targets = useMemo(() => collectTextTargets(doc), [doc]);
  const [targetId, setTargetId] = useState('');
  const [actionId, setActionId] = useState<ImproveAction>(IMPROVE_ACTIONS[0]?.id ?? 'tighten');

  const activeTarget = targets.find((target) => target.id === targetId) ?? targets[0];

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  /** Removing the stored key is irreversible here, so it asks first. */
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  const update = (patch: Partial<AiSettings>) => setDraft({ ...form, ...patch });

  const saveKey = () => {
    setError(null);
    saveAiSettings(form);
    setDraft(null);
  };

  const removeKey = () => {
    clearAiSettings();
    setDraft(null);
    setSuggestion(null);
    setError(null);
  };

  const run = async () => {
    if (!activeTarget) return;
    setBusy(true);
    setError(null);
    setSuggestion(null);

    try {
      const after = await improveText({
        providerId: settings.providerId,
        apiKey: settings.apiKey,
        model: settings.model,
        baseUrl: settings.baseUrl,
        actionId,
        fieldLabel: activeTarget.label,
        text: activeTarget.text,
      });
      setSuggestion({ targetId: activeTarget.id, before: activeTarget.text, after });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(
        caught instanceof AiRequestError || caught instanceof Error
          ? caught.message
          : 'Something went wrong.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <div>
        <h3 className="font-display text-base font-semibold">AI assist (optional)</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Off unless you add your own key. When you use it, the request goes straight from this
          browser to the provider you choose — your key and the text you send never reach a server
          of ours.
        </p>
      </div>

      {/* ------------------------------------------------------------ key */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor={`${ids}-provider`}>
              provider
            </label>
            <select
              id={`${ids}-provider`}
              name={`${ids}-provider`}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
              value={form.providerId}
              onChange={(event) => {
                const next = getProvider(event.target.value);
                update({
                  providerId: next?.id ?? form.providerId,
                  model: '',
                });
              }}
            >
              {PROVIDERS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[240px] flex-1 flex-col gap-1">
            <label className="text-xs font-medium" htmlFor={`${ids}-key`}>
              API key
            </label>
            <input
              id={`${ids}-key`}
              name={`${ids}-key`}
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={
                keyIsSet ? 'Key saved — paste a new one to replace it' : 'Paste your key'
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
              value={draft ? form.apiKey : ''}
              onChange={(event) => update({ apiKey: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor={`${ids}-model`}>
              model
            </label>
            <input
              id={`${ids}-model`}
              name={`${ids}-model`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={provider?.defaultModel ?? 'model name'}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
              value={form.model}
              onChange={(event) => update({ model: event.target.value })}
            />
          </div>
        </div>

        {provider?.id === 'openai-compatible' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor={`${ids}-base`}>
              endpoint base URL
            </label>
            <input
              id={`${ids}-base`}
              name={`${ids}-base`}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="http://localhost:11434"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
              value={form.baseUrl}
              onChange={(event) => update({ baseUrl: event.target.value })}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="min-w-[84px] rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
            onClick={saveKey}
            disabled={credentialsProblem !== null}
          >
            save key
          </button>
          <button
            type="button"
            className="min-w-[84px] rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
            onClick={() => {
              // Only worth confirming when a key is actually stored; otherwise this
              // is a no-op button and a dialog would be noise.
              if (keyIsSet) setConfirmingRemoval(true);
              else removeKey();
            }}
          >
            remove key
          </button>

          {keyIsSet ? (
            <span className="text-xs text-muted-foreground">
              Saved in this browser as{' '}
              <code className="font-mono">{maskApiKey(settings.apiKey)}</code>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No key saved yet.</span>
          )}
        </div>

        {draft !== null && credentialsProblem !== null && (
          <p className="text-xs text-muted-foreground">{credentialsProblem}</p>
        )}

        {provider?.keysUrl ? (
          <p className="text-xs text-muted-foreground">
            Get a key from{' '}
            <a
              className="underline underline-offset-4"
              href={provider.keysUrl}
              rel="noreferrer"
              target="_blank"
            >
              {provider.label}
            </a>
            . You pay them directly; we are not involved in that transaction.
          </p>
        ) : null}
      </div>

      {/* ------------------------------------------------------- the request */}
      {keyIsSet && (
        <div className="space-y-3 border-t border-border pt-3">
          {activeTarget ? (
            <>
              <div className="flex flex-wrap gap-3">
                <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                  <label className="text-xs font-medium" htmlFor={`${ids}-target`}>
                    text to improve
                  </label>
                  <select
                    id={`${ids}-target`}
                    name={`${ids}-target`}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                    value={activeTarget.id}
                    onChange={(event) => {
                      setTargetId(event.target.value);
                      setSuggestion(null);
                    }}
                  >
                    {targets.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" htmlFor={`${ids}-action`}>
                    what to do
                  </label>
                  <select
                    id={`${ids}-action`}
                    name={`${ids}-action`}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                    value={actionId}
                    onChange={(event) => {
                      const next = getAction(event.target.value);
                      if (next) setActionId(next.id);
                      setSuggestion(null);
                    }}
                  >
                    {IMPROVE_ACTIONS.map((action) => (
                      <option key={action.id} value={action.id}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="min-w-[84px] rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                  onClick={() => {
                    void run();
                  }}
                  disabled={busy}
                >
                  {busy ? 'Asking…' : 'Improve'}
                </button>
                <span className="text-xs text-muted-foreground">
                  {IMPROVE_ACTIONS.find((action) => action.id === actionId)?.hint}
                </span>
              </div>

              {suggestion && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Suggestion — nothing has been changed yet
                  </p>
                  <p className="text-sm text-muted-foreground line-through">{suggestion.before}</p>
                  <p className="text-sm">{suggestion.after}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="min-w-[84px] rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                      onClick={() => {
                        onApply(suggestion.targetId, suggestion.after);
                        setSuggestion(null);
                      }}
                    >
                      use this
                    </button>
                    <button
                      type="button"
                      className="min-w-[84px] rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                      onClick={() => setSuggestion(null)}
                    >
                      discard
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {suggestion.before.length} → {suggestion.after.length} characters. Read it
                      before you keep it — you are the one signing this.
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add some experience or a summary first — there is nothing to improve yet.
            </p>
          )}

          {error !== null && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmingRemoval}
        title="remove the saved key?"
        message="The key is deleted from this browser. You will need to paste it again to use the AI assist, and there is no copy anywhere else."
        confirmText="remove it"
        confirmVariant="destructive"
        onConfirm={() => {
          removeKey();
          setConfirmingRemoval(false);
        }}
        onCancel={() => setConfirmingRemoval(false)}
      />
    </div>
  );
}
