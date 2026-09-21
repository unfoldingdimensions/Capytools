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
import { migrate } from './schema';
import { RESUME_SCHEMA_VERSION, type ResumeDoc } from './types';

/** A download filename stem for any export format. */
export function resumeFileName(doc: ResumeDoc, extension: string): string {
  const stem = fileNameSafe(doc.contact.name, 'resume');
  const ext = extension.replace(/^\./, '');
  return `${stem}.${ext}`;
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

/** True when the text looks like a JSON backup we should accept. */
export function looksLikeResumeJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}
