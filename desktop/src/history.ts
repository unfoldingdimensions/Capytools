import { exists, mkdir, readDir, readFile, remove, stat, writeFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import type { SnapshotReason, SnapshotRef } from "@/lib/capyexpense/history";
import {
  DEFAULT_PRUNE,
  parseSnapshotName,
  selectForPrune,
  snapshotName,
} from "@/lib/capyexpense/history";
import { historyDir } from "./workspace";

/**
 * The filesystem half of version history. All the decisions live in
 * `src/lib/capyexpense/history.ts`; this is the part that touches the disk.
 */

async function ensureDir(folder: string): Promise<string> {
  const dir = await historyDir(folder);
  if (!(await exists(dir))) await mkdir(dir, { recursive: true });
  return dir;
}

export async function listSnapshots(folder: string): Promise<SnapshotRef[]> {
  const dir = await historyDir(folder);
  if (!(await exists(dir))) return [];

  const entries = await readDir(dir);
  const refs: SnapshotRef[] = [];
  for (const entry of entries) {
    if (!entry.isFile) continue;
    // parseSnapshotName returns null for anything we did not write. The folder
    // is the user's; they are allowed to keep their own things in it, and we
    // must never list or delete those.
    const ref = parseSnapshotName(entry.name);
    if (!ref) continue;
    try {
      const info = await stat(await join(dir, entry.name));
      refs.push({ ...ref, bytes: info.size ?? 0 });
    } catch {
      refs.push(ref);
    }
  }
  return refs.sort((a, b) => b.takenAt - a.takenAt);
}

/**
 * Copy a workbook into the history folder.
 *
 * `auto` is deduped to one per workbook per calendar day, which is why the
 * existence check is a filename lookup and not a hash: at most 365 automatic
 * snapshots per workbook per year, and no bookkeeping to keep in sync.
 */
export async function takeSnapshot(
  folder: string,
  workbookPath: string,
  workbookName: string,
  reason: SnapshotReason,
  now: Date = new Date(),
): Promise<SnapshotRef | null> {
  if (reason === "auto") {
    const dayKey = now.toISOString().slice(0, 10);
    const already = (await listSnapshots(folder)).some(
      (r) => r.reason === "auto" && r.sourceName === workbookName && r.dayKey === dayKey,
    );
    if (already) return null;
  }

  const dir = await ensureDir(folder);
  const name = snapshotName(workbookName, reason, now);
  const bytes = await readFile(workbookPath);
  await writeFile(await join(dir, name), bytes);
  return parseSnapshotName(name, bytes.length);
}

export async function readSnapshot(folder: string, id: string): Promise<Uint8Array> {
  return readFile(await join(await historyDir(folder), id));
}

/**
 * Put a snapshot back over the live workbook.
 *
 * Takes a `pre-restore` snapshot of the current file FIRST, which makes restore
 * itself undoable — the only version-history design that does not need a
 * confirmation dialog to be safe.
 */
export async function restoreSnapshot(
  folder: string,
  id: string,
  workbookPath: string,
  workbookName: string,
): Promise<void> {
  if (await exists(workbookPath)) {
    await takeSnapshot(folder, workbookPath, workbookName, "pre-restore");
  }
  await writeFile(workbookPath, await readSnapshot(folder, id));
}

/** Thin old snapshots. Runs after a write, never on load. */
export async function pruneSnapshots(folder: string): Promise<SnapshotRef[]> {
  const refs = await listSnapshots(folder);
  const doomed = selectForPrune(refs, DEFAULT_PRUNE, new Date());
  const dir = await historyDir(folder);
  const removed: SnapshotRef[] = [];
  for (const ref of doomed) {
    try {
      await remove(await join(dir, ref.fileName));
      removed.push(ref);
    } catch {
      /* a file we cannot remove is not worth failing a save over */
    }
  }
  return removed;
}
