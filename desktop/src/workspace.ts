import { exists, readDir, readFile, writeFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import type { WorkbookMeta } from "@/lib/capyexpense/migrate";
import { parseWorkbookYear } from "@/lib/capyexpense/migrate";
import { sortTransactions } from "@/lib/capyexpense/normalize";
import type { Lists, LoadProblem, Transaction } from "@/lib/capyexpense/types";
import { readWorkbook } from "@/lib/capyexpense/workbook-read";
import type { NewWorkbookOptions } from "@/lib/capyexpense/workbook-plan";
import { workbookFileName } from "@/lib/capyexpense/workbook-plan";
import { generateWorkbook } from "@/lib/capyexpense/workbook-write";
import { HISTORY_DIR } from "@/lib/capyexpense/history";

/**
 * Reading the user's folder.
 *
 * Every workbook in the folder is loaded and concatenated, which is what makes
 * "one file per year" work: a range spanning two years just reads two files.
 *
 * READING NEVER WRITES. Nothing in here touches the user's workbook.
 */

export interface WorkbookFile {
  name: string;
  path: string;
  year: number | null;
  bytes: number;
  meta: WorkbookMeta;
  compat: "current" | "older" | "newer";
  /** Columns an explicit upgrade would append. Empty when there is nothing to do. */
  pending: string[];
}

export interface Workspace {
  folder: string;
  files: WorkbookFile[];
  transactions: Transaction[];
  lists: Lists;
  problems: LoadProblem[];
  loadedAt: number;
}

const isWorkbook = (name: string) =>
  name.toLowerCase().endsWith(".xlsx") &&
  // Excel writes a lock file beside an open workbook. It is not a workbook, and
  // trying to read it produces a spurious error every time the user has the
  // real file open.
  !name.startsWith("~$");

export async function loadWorkspace(folder: string): Promise<Workspace> {
  const entries = await readDir(folder);
  const names = entries
    .filter((e) => e.isFile && isWorkbook(e.name))
    .map((e) => e.name)
    .sort();

  const files: WorkbookFile[] = [];
  const transactions: Transaction[] = [];
  const problems: LoadProblem[] = [];
  let lists: Lists = { categories: [], paymentMethods: [], accounts: [] };

  for (const name of names) {
    const path = await join(folder, name);
    try {
      const bytes = await readFileWithRetry(path);
      const read = await readWorkbook(bytes, name);
      files.push({
        name,
        path,
        year: read.meta.year ?? parseWorkbookYear(name),
        bytes: bytes.length,
        meta: read.meta,
        compat: read.compat,
        pending: read.map.missing,
      });
      transactions.push(...read.transactions);
      problems.push(...read.problems);
      lists = mergeLists(lists, read.lists);
    } catch (err) {
      problems.push({
        level: "error",
        file: name,
        message: describeReadError(err),
      });
    }
  }

  return {
    folder,
    files,
    transactions: sortTransactions(transactions),
    lists,
    problems,
    loadedAt: Date.now(),
  };
}

/**
 * Excel saves by writing a temp file and renaming it over the original, so for
 * a moment the path is missing or locked. A single read that happens to land in
 * that window would report a corrupt workbook to someone who just pressed
 * ctrl+S. Retry a few times before believing it.
 */
async function readFileWithRetry(path: string, attempts = 3): Promise<Uint8Array> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await readFile(path);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  throw lastErr;
}

/** Turn an fs error into something a person can act on. */
export function describeReadError(err: unknown): string {
  const text = String(err ?? "").toLowerCase();
  if (text.includes("denied") || text.includes("permission")) {
    return "this folder is not readable — try choosing it again so the app can be granted access";
  }
  if (text.includes("busy") || text.includes("lock") || text.includes("used by another")) {
    return "excel still has this file open — save and close it, then refresh";
  }
  if (text.includes("no such") || text.includes("not found")) {
    return "that file is not there any more";
  }
  return `couldn't read this workbook (${String(err)})`;
}

function mergeLists(a: Lists, b: Lists): Lists {
  const uniq = (x: string[], y: string[]) => {
    const seen = new Map<string, string>();
    for (const v of [...x, ...y]) if (v.trim()) seen.set(v.toLowerCase(), v);
    return [...seen.values()].sort((p, q) => p.localeCompare(q));
  };
  return {
    categories: uniq(a.categories, b.categories),
    paymentMethods: uniq(a.paymentMethods, b.paymentMethods),
    accounts: uniq(a.accounts, b.accounts),
  };
}

/** Create a year's workbook. Refuses to overwrite one that already exists. */
export async function createWorkbook(
  folder: string,
  opts: NewWorkbookOptions,
): Promise<{ path: string; created: boolean }> {
  const name = workbookFileName(opts.year);
  const path = await join(folder, name);
  if (await exists(path)) return { path, created: false };

  const bytes = await generateWorkbook(opts);
  await writeFile(path, bytes);
  return { path, created: true };
}

export async function historyDir(folder: string): Promise<string> {
  return join(folder, HISTORY_DIR);
}
