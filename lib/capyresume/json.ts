/**
 * CapyResume — JSON import/export.
 *
 * `localStorage` is a convenience, not a vault: clearing site data wipes the
 * résumé. The JSON backup is the user's escape hatch and the reason they are
 * never trapped in this tool — which is also why the export is unlimited and
 * unconditional.
 *
 * Both directions run through `migrate()`, so a file written by an older build
 * still imports and a hand-edited file cannot crash the app.
 */

import { fileNameSafe } from './format';
import { isResumeEmpty, migrate } from './schema';
import { RESUME_SCHEMA_VERSION, type ResumeDoc } from './types';

/** A download filename stem for any export format. */
export function resumeFileName(doc: ResumeDoc, extension: string): string {
  const stem = fileNameSafe(doc.contact.name, 'resume');
  const ext = extension.replace(/^\./, '');
  return `${stem}.${ext}`;
}

/**
 * The JSON backup is named differently on purpose (plan §5.5). It lands in a
 * downloads folder alongside everything else, where a bare `maya-okafor.json`
 * says nothing about what it is — whereas the PDF and DOCX keep the bare name,
 * because those are the files a person actually attaches to an application.
 *
 * A nameless résumé becomes `resume-backup.json` rather than the double-prefixed
 * `resume-resume.json`.
 */
export function resumeBackupFileName(doc: ResumeDoc): string {
  return `resume-${fileNameSafe(doc.contact.name, 'backup')}.json`;
}

/** Pretty-printed so a user can open, read and hand-edit their own data. */
export function exportResumeJson(doc: ResumeDoc): string {
  const stamped: ResumeDoc = { ...doc, version: RESUME_SCHEMA_VERSION };
  return `${JSON.stringify(stamped, null, 2)}\n`;
}

/**
 * Parse a JSON backup. Never throws: anything unreadable degrades to a valid
 * (possibly empty) document via `migrate()`, so a bad file cannot brick the app.
 */
export function importResumeJson(text: string): ResumeDoc {
  return migrate(text);
}

/** A real backup is a few KB; anything this large is not one. */
export const MAX_BACKUP_BYTES = 1024 * 1024;

/**
 * Read a file the user picked as a backup, refusing what is not one.
 *
 * `importResumeJson` never throws — right for storage, wrong for an import that is
 * about to replace the open résumé: an unrelated or truncated file would silently
 * become an empty document. Here a file must parse, be an object that carries the
 * résumé's own fields, and hold something, or the import is refused with a reason.
 */
export function parseResumeBackup(text: string): { doc: ResumeDoc } | { error: string } {
  const notOurs = "That file isn't a CapyResume backup — pick the .json the backup button saved.";
  if (!looksLikeResumeJson(text)) return { error: notOurs };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: 'That backup is damaged (it is not valid JSON), so nothing was replaced.' };
  }
  if (typeof raw !== 'object' || raw === null || !('sections' in raw || 'contact' in raw)) {
    return { error: notOurs };
  }
  const doc = migrate(raw);
  if (isResumeEmpty(doc)) return { error: 'That backup is empty, so nothing was replaced.' };
  return { doc };
}

/** True when the text looks like a JSON backup we should accept. */
export function looksLikeResumeJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}
