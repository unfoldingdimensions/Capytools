import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { watchImmediate } from "@tauri-apps/plugin-fs";
import { ExpenseDashboard, type Greeting } from "@/components/capyexpense/ExpenseDashboard";
import { buildDashboard } from "@/lib/capyexpense/aggregate";
import type { RangeState } from "@/lib/capyexpense/bucket";
import { dataSpanOf, resolveRange } from "@/lib/capyexpense/bucket";
import { todayIso } from "@/lib/capyexpense/dates";
import { SAMPLE_CURRENCY, SAMPLE_NOW, SAMPLE_TRANSACTIONS } from "@/lib/capyexpense/sample";
import { workbookFileName } from "@/lib/capyexpense/workbook-plan";
import { HistoryPanel } from "./HistoryPanel";
import { Onboarding } from "./Onboarding";
import { readPrefs, savePrefs, type Prefs } from "./settings";
import { applyTheme, readTheme, watchSystemTheme } from "./theme";
import { pruneSnapshots, takeSnapshot } from "./history";
import { createWorkbook, loadWorkspace, type Workspace } from "./workspace";

function greetingFor(hour: number): Greeting {
  if (hour < 12) return "good morning";
  if (hour < 18) return "good afternoon";
  return "good evening";
}

export function App() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [state, setState] = useState<RangeState>({ preset: "month", anchor: todayIso() });
  const [historyOpen, setHistoryOpen] = useState(false);

  // Hydrate stored values on client mount (AGENTS.md pattern).
  const hydrate = useCallback(() => {
    applyTheme(readTheme());
    setPrefs(readPrefs());
    setHydrated(true);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(hydrate, [hydrate]);

  useEffect(() => watchSystemTheme(readTheme), []);

  const refresh = useCallback(
    async (folder: string, opts: { snapshot?: boolean } = {}) => {
      setLoading(true);
      try {
        const ws = await loadWorkspace(folder);
        setWorkspace(ws);
        setFatal(null);
        if (opts.snapshot) {
          // One automatic copy per workbook per day, taken after a successful
          // read so we never snapshot a file we could not parse.
          for (const f of ws.files) {
            await takeSnapshot(folder, f.path, f.name, "auto").catch(() => null);
          }
          await pruneSnapshots(folder).catch(() => []);
        }
      } catch (err) {
        setFatal(String(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // First load once prefs exist.
  const folder = prefs?.folder ?? null;
  useEffect(() => {
    if (folder) void refresh(folder, { snapshot: true });
  }, [folder, refresh]);

  /**
   * Watch the folder.
   *
   * Excel saves by writing a temp file and RENAMING it over the original, so on
   * Windows the event is a Rename, not Modify(Data). Filtering on Modify would
   * see no saves at all. Match anything touching the folder, ignore Excel's
   * ~$ lock files, and debounce because one save is a burst of events.
   */
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!folder) return;
    let stop: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const unwatch = await watchImmediate(
          folder,
          (event) => {
            const paths = (event as { paths?: string[] }).paths ?? [];
            if (paths.length && paths.every((p) => p.split(/[\\/]/).pop()?.startsWith("~$"))) return;
            if (timer.current) window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => void refresh(folder), 400);
          },
          { recursive: false },
        );
        if (cancelled) unwatch();
        else stop = unwatch;
      } catch {
        // Watching is a convenience; the refresh button is the contract.
      }
    })();

    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
      stop?.();
    };
  }, [folder, refresh]);

  const today = todayIso();
  const model = useMemo(() => {
    const rows = workspace?.transactions ?? [];
    const range = resolveRange(state, {
      weekStart: prefs?.weekStart ?? 1,
      dataSpan: dataSpanOf(rows),
    });
    return buildDashboard(rows, range, {
      now: today,
      weekStart: prefs?.weekStart ?? 1,
      currency: prefs?.currency ?? "GBP",
    });
  }, [workspace, state, prefs, today]);

  const demoModel = useMemo(() => {
    const range = resolveRange({ preset: "month", anchor: SAMPLE_NOW }, { weekStart: 1 });
    return buildDashboard(SAMPLE_TRANSACTIONS, range, {
      now: SAMPLE_NOW,
      weekStart: 1,
      currency: SAMPLE_CURRENCY,
    });
  }, []);

  if (!hydrated) return null;

  if (!prefs || !prefs.folder) {
    return (
      <Onboarding
        demo={
          <ExpenseDashboard
            model={demoModel}
            state={{ preset: "month", anchor: SAMPLE_NOW }}
            greeting="good evening"
            name="ada"
            weekStart={1}
            today={SAMPLE_NOW}
            onRangeChange={() => {}}
          />
        }
        onDone={async (next, year) => {
          await createWorkbook(next.folder!, {
            year,
            currency: next.currency,
            weekStart: next.weekStart,
          });
          savePrefs(next);
          setPrefs(next);
        }}
      />
    );
  }

  const activeWorkbook =
    workspace?.files.find((f) => f.year === Number(today.slice(0, 4))) ?? workspace?.files[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <ExpenseDashboard
        model={model}
        state={state}
        greeting={greetingFor(new Date().getHours())}
        name={prefs.name}
        weekStart={prefs.weekStart}
        today={today}
        locale={prefs.locale}
        workbookLabel={
          workspace
            ? `${workspace.files.length} ${workspace.files.length === 1 ? "workbook" : "workbooks"} · ${workspace.transactions.length} entries · ${prefs.folder}`
            : undefined
        }
        problems={workspace?.problems ?? []}
        onRangeChange={setState}
        refreshSlot={
          <div className="flex items-center gap-2">
            {activeWorkbook ? (
              <button
                type="button"
                onClick={() => void openPath(activeWorkbook.path)}
                className="rounded-full border border-border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
              >
                open the workbook
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void openPath(prefs.folder!)}
              className="rounded-full border border-border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              show the folder
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
              aria-controls="capyexpense-history"
              className="rounded-full border border-border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {historyOpen ? "hide history" : "version history"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void refresh(prefs.folder!)}
              className="min-w-[84px] rounded-full bg-primary px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--primary-foreground)] disabled:opacity-50"
            >
              {loading ? "reading…" : "refresh"}
            </button>
          </div>
        }
        banner={
          fatal ? (
            <div className="rounded-2xl border border-[var(--clay)]/30 bg-[var(--clay)]/10 p-4">
              <p className="font-display text-lg font-light text-foreground">
                couldn&rsquo;t read that folder.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{fatal}</p>
            </div>
          ) : !workspace?.files.length ? (
            <FirstRunWell
              folder={prefs.folder}
              year={Number(today.slice(0, 4))}
              onCreate={async () => {
                await createWorkbook(prefs.folder!, {
                  year: Number(today.slice(0, 4)),
                  currency: prefs.currency,
                  weekStart: prefs.weekStart,
                });
                await refresh(prefs.folder!);
              }}
            />
          ) : null
        }
      />

      {historyOpen ? (
        <div id="capyexpense-history">
          <HistoryPanel
            folder={prefs.folder}
            workbooks={workspace?.files ?? []}
            transactions={workspace?.transactions ?? []}
            onRestored={() => refresh(prefs.folder!)}
          />
        </div>
      ) : null}

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          read from your disk · nothing left this machine
        </p>
        {activeWorkbook ? (
          <button
            type="button"
            onClick={() =>
              void invoke("create_workbook_shortcut", {
                workbookPath: activeWorkbook.path,
                label: `CapyExpense ${activeWorkbook.year ?? ""}`.trim(),
              })
            }
            className="rounded-full border border-border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            put the workbook on my desktop
          </button>
        ) : null}
      </footer>
    </div>
  );
}

function FirstRunWell({
  folder,
  year,
  onCreate,
}: {
  folder: string;
  year: number;
  onCreate: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
      <p className="font-display text-lg font-light text-foreground">no workbook here yet.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        we were expecting {workbookFileName(year)} in {folder}.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onCreate().finally(() => setBusy(false));
        }}
        className="mt-3 rounded-full bg-primary px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--primary-foreground)] disabled:opacity-50"
      >
        {busy ? "making it…" : `create ${workbookFileName(year)}`}
      </button>
    </div>
  );
}

export default App;
