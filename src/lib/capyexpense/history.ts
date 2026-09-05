import type { Transaction } from "./types";

/**
 * Version history: naming, pruning and diffing. The pure half.
 *
 * The filesystem side lives in the desktop shell; everything here is decisions
 * about strings and lists, which is what makes the retention policy testable
 * against a four-hundred-file fixture instead of against a real disk.
 *
 * THE FILENAMES ARE THE INDEX. There is no manifest, no sidecar JSON, nothing
 * that can drift out of sync with what is actually on disk. Snapshots live in a
 * plainly named, visible folder so the user can open it in Explorer and copy one
 * out without this app — which is what local-first has to mean if it means
 * anything.
 */

export const HISTORY_DIR = "CapyExpense History";

export type SnapshotReason = "auto" | "pre-write" | "pre-upgrade" | "pre-restore" | "manual";

const REASONS: readonly SnapshotReason[] = [
  "auto",
  "pre-write",
  "pre-upgrade",
  "pre-restore",
  "manual",
];

export interface SnapshotRef {
  /** The filename stem — unique, and the id the UI passes back. */
  id: string;
  fileName: string;
  /** The workbook this is a copy of. */
  sourceName: string;
  reason: SnapshotReason;
  takenAt: number;
  /** "YYYY-MM-DD" — the bucket the daily retention tier counts in. */
  dayKey: string;
  bytes: number;
}

/**
 * `2026-09-05T14-22-08Z__pre-write__CapyExpense-2026.xlsx`
 *
 * Timestamp first so a plain directory listing sorts chronologically, and
 * hyphens instead of colons because Windows will not accept a colon in a
 * filename.
 */
export function snapshotName(sourceName: string, reason: SnapshotReason, at: Date): string {
  const stamp = at.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
  return `${stamp}__${reason}__${sourceName}`;
}

const NAME_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z__([a-z-]+)__(.+)$/;

/**
 * Read one of our filenames back. Returns `null` for anything we did not write —
 * the caller must never delete or list a file it does not recognise, because
 * this folder belongs to the user and they are allowed to put things in it.
 */
export function parseSnapshotName(fileName: string, bytes = 0): SnapshotRef | null {
  const m = NAME_RE.exec(fileName);
  if (!m) return null;
  const [, day, hh, mm, ss, reason, sourceName] = m;
  if (!REASONS.includes(reason as SnapshotReason)) return null;
  const takenAt = Date.parse(`${day}T${hh}:${mm}:${ss}Z`);
  if (Number.isNaN(takenAt)) return null;
  return {
    id: fileName,
    fileName,
    sourceName,
    reason: reason as SnapshotReason,
    takenAt,
    dayKey: day,
    bytes,
  };
}

export interface PrunePolicy {
  /** Keep absolutely everything this recent. */
  keepAllDays: number;
  /** Then one per day, back to here. */
  dailyDays: number;
  /** Then one per week, back to here. */
  weeklyWeeks: number;
  /** Then one per month, forever. */
  monthlyForever: boolean;
  /** Never prune this many newest, whatever the tiers say. */
  alwaysKeepNewest: number;
  maxFiles: number;
  maxBytes: number;
}

export const DEFAULT_PRUNE: PrunePolicy = {
  keepAllDays: 7,
  dailyDays: 30,
  weeklyWeeks: 12,
  monthlyForever: true,
  alwaysKeepNewest: 5,
  maxFiles: 200,
  maxBytes: 200 * 1024 * 1024,
};

const DAY = 86_400_000;

/**
 * Which snapshots to delete. Thinning, not truncation: recent history stays
 * dense and old history stays present but sparse, which is the shape people
 * actually want from a backup — "yesterday afternoon" and "some time in March"
 * are both real requests.
 *
 * `pre-restore` snapshots are NEVER selected. They are the undo for a
 * destructive action, and an undo that retention can delete is not an undo.
 */
export function selectForPrune(
  refs: readonly SnapshotRef[],
  policy: PrunePolicy = DEFAULT_PRUNE,
  now: Date = new Date(),
): SnapshotRef[] {
  const sorted = [...refs].sort((a, b) => b.takenAt - a.takenAt);
  const nowMs = now.getTime();
  const keep = new Set<string>();

  sorted.slice(0, Math.max(0, policy.alwaysKeepNewest)).forEach((r) => keep.add(r.id));

  const bucketSeen = new Set<string>();
  for (const ref of sorted) {
    if (ref.reason === "pre-restore") {
      keep.add(ref.id);
      continue;
    }

    const ageDays = (nowMs - ref.takenAt) / DAY;
    if (ageDays <= policy.keepAllDays) {
      keep.add(ref.id);
      continue;
    }

    // One survivor per bucket, and because `sorted` is newest-first the survivor
    // is always the most recent snapshot in that bucket.
    let bucket: string | null = null;
    if (ageDays <= policy.dailyDays) bucket = `d:${ref.dayKey}`;
    else if (ageDays <= policy.weeklyWeeks * 7) bucket = `w:${Math.floor(ref.takenAt / (7 * DAY))}`;
    else if (policy.monthlyForever) bucket = `m:${ref.dayKey.slice(0, 7)}`;

    if (bucket && !bucketSeen.has(bucket)) {
      bucketSeen.add(bucket);
      keep.add(ref.id);
    }
  }

  // Hard caps, trimmed oldest-first from whatever the tiers decided to keep.
  const kept = sorted.filter((r) => keep.has(r.id));
  let totalBytes = kept.reduce((s, r) => s + r.bytes, 0);
  let count = kept.length;
  for (let i = kept.length - 1; i >= 0; i--) {
    if (count <= policy.maxFiles && totalBytes <= policy.maxBytes) break;
    const ref = kept[i];
    if (ref.reason === "pre-restore") continue;
    keep.delete(ref.id);
    count -= 1;
    totalBytes -= ref.bytes;
  }

  return sorted.filter((r) => !keep.has(r.id));
}

/**
 * Content fingerprint, deliberately NOT the transaction id.
 *
 * Ids carry the Excel row number, and inserting one row in the middle of a sheet
 * renumbers everything below it. An id-keyed diff would then report the entire
 * rest of the file as changed, which is both useless and alarming.
 */
export function diffKey(tx: Transaction): string {
  return `${tx.date}|${tx.category.toLowerCase()}|${tx.amount}|${tx.note.trim().toLowerCase()}`;
}

/** Weaker key, for spotting an edit rather than an add plus a delete. */
function loosKey(tx: Transaction): string {
  return `${tx.date}|${tx.category.toLowerCase()}`;
}

const COMPARED: (keyof Transaction)[] = [
  "date",
  "category",
  "type",
  "kind",
  "amount",
  "note",
  "paymentMethod",
  "account",
  "needWant",
  "interval",
];

export interface TxChange {
  before: Transaction;
  after: Transaction;
  fields: (keyof Transaction)[];
}

export interface TxDiff {
  added: Transaction[];
  removed: Transaction[];
  changed: TxChange[];
  unchanged: number;
}

/**
 * What restoring a snapshot would actually do, in rows.
 *
 * Two passes: exact content matches settle first, then whatever is left is
 * paired up on date-and-category so a corrected amount reads as one edit
 * instead of a deletion next to an unrelated addition.
 */
export function diffTransactions(
  before: readonly Transaction[],
  after: readonly Transaction[],
): TxDiff {
  const pool = new Map<string, Transaction[]>();
  for (const tx of before) {
    const list = pool.get(diffKey(tx)) ?? [];
    list.push(tx);
    pool.set(diffKey(tx), list);
  }

  const survivors: Transaction[] = [];
  let unchanged = 0;

  for (const tx of after) {
    const list = pool.get(diffKey(tx));
    if (list && list.length > 0) {
      list.pop();
      unchanged += 1;
    } else {
      survivors.push(tx);
    }
  }

  const leftovers = [...pool.values()].flat();
  const byLoose = new Map<string, Transaction[]>();
  for (const tx of leftovers) {
    const list = byLoose.get(loosKey(tx)) ?? [];
    list.push(tx);
    byLoose.set(loosKey(tx), list);
  }

  const added: Transaction[] = [];
  const changed: TxChange[] = [];
  const matched = new Set<Transaction>();

  for (const tx of survivors) {
    const list = byLoose.get(loosKey(tx));
    const partner = list?.find((c) => !matched.has(c));
    if (partner) {
      matched.add(partner);
      changed.push({
        before: partner,
        after: tx,
        fields: COMPARED.filter((f) => partner[f] !== tx[f]),
      });
    } else {
      added.push(tx);
    }
  }

  return {
    added,
    removed: leftovers.filter((t) => !matched.has(t)),
    changed,
    unchanged,
  };
}
