import { useCallback, useEffect, useState } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import { diffTransactions, type SnapshotRef, type TxDiff } from "@/lib/capyexpense/history";
import type { Transaction } from "@/lib/capyexpense/types";
import { readWorkbook } from "@/lib/capyexpense/workbook-read";
import { listSnapshots, readSnapshot, restoreSnapshot } from "./history";
import { historyDir } from "./workspace";

/**
 * The user-facing half of version history.
 *
 * Restore is offered without a confirmation dialog on purpose: `restoreSnapshot`
 * takes a `pre-restore` copy of the live file first, so the destructive action
 * is already undoable. What replaces the dialog is the diff — you can see what
 * you would lose before you press anything, which is worth more than an
 * "are you sure?" nobody reads.
 */

const REASON_LABEL: Record<SnapshotRef["reason"], string> = {
  auto: "daily copy",
  "pre-write": "before a write",
  "pre-upgrade": "before an upgrade",
  "pre-restore": "before a restore",
  manual: "you asked for it",
};

function when(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function size(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function summarise(diff: TxDiff): string {
  const parts: string[] = [];
  if (diff.added.length) parts.push(`${diff.added.length} back`);
  if (diff.removed.length) parts.push(`${diff.removed.length} lost`);
  if (diff.changed.length) parts.push(`${diff.changed.length} changed`);
  return parts.length ? parts.join(" · ") : "identical to what you have now";
}

export function HistoryPanel({
  folder,
  workbooks,
  transactions,
  onRestored,
}: {
  folder: string;
  /** The live workbooks, by filename — a snapshot with no live twin can't be diffed. */
  workbooks: { name: string; path: string }[];
  transactions: readonly Transaction[];
  onRestored: () => Promise<void> | void;
}) {
  const [refs, setRefs] = useState<SnapshotRef[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<Record<string, TxDiff | string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRefs(await listSnapshots(folder));
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, [folder]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load]);

  /**
   * The diff is `current → snapshot`, so `added` reads as "rows restoring
   * brings back" and `removed` as "rows restoring loses". Computed on demand:
   * each one parses a whole workbook, and most rows are never expanded.
   */
  const inspect = useCallback(
    async (ref: SnapshotRef) => {
      setOpen((prev) => (prev === ref.id ? null : ref.id));
      if (diffs[ref.id]) return;
      try {
        const bytes = await readSnapshot(folder, ref.id);
        const read = await readWorkbook(bytes, ref.sourceName);
        const live = transactions.filter((t) => t.source.file === ref.sourceName);
        setDiffs((d) => ({ ...d, [ref.id]: diffTransactions(live, read.transactions) }));
      } catch (err) {
        setDiffs((d) => ({ ...d, [ref.id]: `couldn't read this copy (${String(err)})` }));
      }
    },
    [folder, transactions, diffs],
  );

  const restore = useCallback(
    async (ref: SnapshotRef) => {
      const target = workbooks.find((w) => w.name === ref.sourceName);
      if (!target) {
        setError(`${ref.sourceName} is not in this folder any more`);
        return;
      }
      setBusy(ref.id);
      try {
        await restoreSnapshot(folder, ref.id, target.path, target.name);
        setDiffs({});
        setOpen(null);
        await load();
        await onRestored();
      } catch (err) {
        setError(String(err));
      } finally {
        setBusy(null);
      }
    },
    [folder, workbooks, load, onRestored],
  );

  return (
    <section className="mt-8 rounded-2xl border border-border/70 bg-muted/30 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-light text-foreground">version history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            copies this app made of your workbooks, kept in a folder you can open yourself.
            restoring takes a copy of the current file first, so it is undoable.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void historyDir(folder).then(openPath)}
          className="rounded-full border border-border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
        >
          show the copies
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--clay)]">{error}</p> : null}

      {refs === null ? (
        <p className="mt-4 text-sm text-muted-foreground">reading…</p>
      ) : refs.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          no copies yet — the first one is taken the next time a workbook reads cleanly.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border/60">
          {refs.map((ref) => {
            const diff = diffs[ref.id];
            return (
              <li key={ref.id} className="py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground">
                    {when(ref.takenAt)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {ref.sourceName} · {REASON_LABEL[ref.reason]} · {size(ref.bytes)}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void inspect(ref)}
                      aria-expanded={open === ref.id}
                      className="rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {open === ref.id ? "hide" : "what changed"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void restore(ref)}
                      className="rounded-full bg-primary px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--primary-foreground)] disabled:opacity-50"
                    >
                      {busy === ref.id ? "restoring…" : "restore"}
                    </button>
                  </span>
                </div>

                {open === ref.id ? (
                  <div className="mt-2 rounded-xl border border-border/60 bg-card p-3">
                    {diff === undefined ? (
                      <p className="text-sm text-muted-foreground">comparing…</p>
                    ) : typeof diff === "string" ? (
                      <p className="text-sm text-[var(--clay)]">{diff}</p>
                    ) : (
                      <>
                        <p className="text-sm text-foreground">
                          restoring this would leave you with {summarise(diff)}.
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {diff.unchanged} {diff.unchanged === 1 ? "row" : "rows"} are the same in
                          both.
                        </p>
                        {diff.removed.length ? (
                          <ul className="mt-2 space-y-0.5">
                            {diff.removed.slice(0, 5).map((t) => (
                              <li key={t.id} className="text-sm text-muted-foreground">
                                <span className="text-[var(--clay)]">lost</span> {t.date} ·{" "}
                                {t.category} · {t.amount} {t.note ? `· ${t.note}` : ""}
                              </li>
                            ))}
                            {diff.removed.length > 5 ? (
                              <li className="text-sm text-muted-foreground">
                                …and {diff.removed.length - 5} more
                              </li>
                            ) : null}
                          </ul>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
