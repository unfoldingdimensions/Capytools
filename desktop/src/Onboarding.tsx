import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { COLUMNS } from "@/lib/capyexpense/schema";
import { cn } from "@/lib/utils";
import { CURRENCIES, defaultPrefs, type Prefs } from "./settings";
import { applyTheme, type Theme } from "./theme";

/**
 * First run, in five screens. Two of them only ask you to read.
 *
 * Screen order is deliberate: the theme is set on screen one so the remaining
 * four are already in the user's own light, and the folder is chosen on screen
 * three because that is the step that needs the other answers to name a file.
 */

const STEPS = 5;

export function Onboarding({
  onDone,
  demo,
}: {
  onDone: (prefs: Prefs, year: number) => Promise<void> | void;
  /** A shrunk live dashboard on seeded data — screen 4 costs almost nothing. */
  demo: React.ReactNode;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Prefs>(defaultPrefs());
  const [theme, setTheme] = useState<Theme>("system");
  const [year, setYear] = useState(new Date().getFullYear());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Prefs>) => setDraft((d) => ({ ...d, ...patch }));

  const pickFolder = async () => {
    setError(null);
    // recursive: true is REQUIRED. It defaults to false, and without it the
    // history subfolder is outside the granted scope and every snapshot fails.
    const chosen = await open({ directory: true, multiple: false, recursive: true });
    if (typeof chosen === "string") set({ folder: chosen });
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDone({ ...draft, onboardedAt: new Date().toISOString() }, year);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  };

  const canNext =
    step === 0 ? draft.name.trim().length > 0 : step === 2 ? Boolean(draft.folder) : true;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-border",
              )}
            />
          ))}
        </div>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {String(step + 1).padStart(2, "0")} ·{" "}
          {["hello", "money", "the workbook", "the dashboard", "the loop"][step]}
        </p>

        {step === 0 ? (
          <Screen title="a calm little ledger." italic="it reads a spreadsheet you already own.">
            <Field label="what should it call you?">
              <input
                autoFocus
                value={draft.name}
                maxLength={24}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="ada"
                className="w-full rounded-full border border-border bg-background px-4 py-2 text-foreground outline-none focus:border-primary"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                we&rsquo;ll only use it to say hello.
              </p>
            </Field>
            <Field label="and how do you like your light?">
              <Choices
                value={theme}
                options={[
                  ["light", "light"],
                  ["dark", "dark"],
                  ["system", "match my system"],
                ]}
                onChange={(v) => {
                  const t = v as Theme;
                  setTheme(t);
                  // Applied immediately, so the rest of onboarding is in it.
                  applyTheme(t);
                }}
              />
            </Field>
          </Screen>
        ) : null}

        {step === 1 ? (
          <Screen title="a few things it can't guess.">
            <Field label="what currency do you count in?">
              <select
                id="onboarding-currency"
                aria-label="currency"
                value={draft.currency}
                onChange={(e) => set({ currency: e.target.value })}
                className="w-full rounded-full border border-border bg-background px-4 py-2 text-foreground"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                every number uses this. it&rsquo;s a format, not a conversion — capyexpense never
                touches an exchange rate.
              </p>
            </Field>
            <Field label="when does your week start?">
              <Choices
                value={String(draft.weekStart)}
                options={[
                  ["1", "monday"],
                  ["0", "sunday"],
                ]}
                onChange={(v) => set({ weekStart: v === "0" ? 0 : 1 })}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                the heatmap and the week view follow this.
              </p>
            </Field>
            <Field label="which year are we tracking?">
              <input
                type="number"
                value={year}
                min={1900}
                max={2200}
                onChange={(e) => setYear(Number(e.target.value) || year)}
                className="w-32 rounded-full border border-border bg-background px-4 py-2 text-foreground"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                one workbook per year. january starts a clean one.
              </p>
            </Field>
          </Screen>
        ) : null}

        {step === 2 ? (
          <Screen title="this is where it lives.">
            <p className="text-sm leading-relaxed text-muted-foreground">
              capyexpense makes one excel file and then just reads it. you type in excel — the app
              never writes over your rows.
            </p>
            <button
              type="button"
              onClick={pickFolder}
              className="mt-4 rounded-full bg-primary px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--primary-foreground)]"
            >
              choose a folder
            </button>
            {draft.folder ? (
              <p className="mt-3 break-all font-mono text-[11px] text-foreground">{draft.folder}</p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">nothing chosen yet.</p>
            )}

            <div className="mt-6 rounded-2xl border border-border/70 bg-muted/40 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                the columns
              </p>
              <dl className="mt-3 space-y-1.5">
                {COLUMNS.map((c) => (
                  <div key={c.key} className="grid grid-cols-[9rem_1fr] gap-3">
                    <dt className="font-mono text-[11px] text-foreground">{c.header}</dt>
                    <dd className="text-xs text-muted-foreground">{c.hint}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                the header row is already there. add rows underneath and save. that&rsquo;s the whole
                format.
              </p>
            </div>
          </Screen>
        ) : null}

        {step === 3 ? (
          <Screen title="what you'll be looking at.">
            <div className="pointer-events-none max-h-72 overflow-hidden rounded-2xl border border-border/70">
              <div className="origin-top-left scale-[0.55]" style={{ width: "182%" }}>
                {demo}
              </div>
            </div>
            <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <b className="font-medium text-foreground">the range picker</b> rules everything
                below it. the arrows step you backwards through periods.
              </li>
              <li>
                <b className="font-medium text-foreground">this period against last</b> compares
                like for like — day 14 against day 14 — so a half-finished month never loses to a
                whole one.
              </li>
              <li>
                <b className="font-medium text-foreground">the quiet days</b> is one square per day.
                the pale ones are days you spent nothing. those are the ones worth looking at.
              </li>
              <li>
                <b className="font-medium text-foreground">what repeats</b> annualises everything
                marked as a subscription, and tells you what renews next.
              </li>
            </ul>
          </Screen>
        ) : null}

        {step === 4 ? (
          <Screen title="three steps, forever.">
            <ol className="space-y-2.5 text-sm text-muted-foreground">
              {[
                "open the workbook, type today's rows, save.",
                "come back here and hit refresh.",
                "read.",
              ].map((line, i) => (
                <li key={line} className="flex gap-3">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    0{i + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              that&rsquo;s it. there&rsquo;s no sync, no import, no waiting.
            </p>
            <div className="mt-6 rounded-2xl border border-border/70 bg-muted/40 p-4">
              <p className="text-sm text-foreground">
                capyexpense has no network code in it. no account, no cloud, no ai, no telemetry.
                the file is yours, in a format you&rsquo;ll still open in twenty years without us.
              </p>
            </div>
          </Screen>
        ) : null}

        {error ? <p className="mt-4 text-sm text-[var(--clay)]">{error}</p> : null}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
            className="rounded-full border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground disabled:opacity-30"
          >
            ← back
          </button>
          <button
            type="button"
            disabled={!canNext || busy}
            onClick={() => (step === STEPS - 1 ? finish() : setStep((s) => s + 1))}
            className="rounded-full bg-primary px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--primary-foreground)] disabled:opacity-40"
          >
            {busy ? "setting up…" : step === STEPS - 1 ? "open my dashboard →" : "next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Screen({
  title,
  italic,
  children,
}: {
  title: string;
  italic?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="mt-4 font-display text-3xl font-light leading-[1.1] tracking-tight text-foreground">
        {title}
      </h1>
      {italic ? (
        <p className="mt-1.5 font-display text-lg font-light italic text-muted-foreground">
          {italic}
        </p>
      ) : null}
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm text-foreground">{label}</p>
      {children}
    </div>
  );
}

function Choices({
  value,
  options,
  onChange,
}: {
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div role="group" className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
            value === v
              ? "bg-primary text-[var(--primary-foreground)]"
              : "border border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
