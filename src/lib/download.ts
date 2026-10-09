/**
 * Hand a Blob to the browser as a download.
 *
 * The one rule worth a module: the object URL must outlive the click. Revoking
 * it on the next line is a race the browser sometimes loses — Chrome takes the
 * blob synchronously, Firefox and Safari can drop it and the download quietly
 * never happens. A second is far past the hand-off and still tidies up.
 */
const REVOKE_AFTER_MS = 1000;

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}

/**
 * The document-tool download helpers, moved here from CapyResume so
 * CapyInvoice reuses them unchanged (`capyresume/download.ts` re-exports them).
 * The same revoke race as above, guarded a little harder for the tools that
 * download whole documents: an SSR-safe window check, and the anchor attached
 * to the document — Firefox ignores clicks on detached anchors.
 */

/** Trigger a download of an in-memory Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so Safari has started the download.
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
}

/** Trigger a download of a string (used for the JSON backup). */
export function downloadText(text: string, filename: string, mimeType = "application/json"): void {
  downloadBlob(new Blob([text], { type: `${mimeType};charset=utf-8` }), filename);
}

/** Read a user-picked file as text. Never leaves the browser. */
export function readFileAsText(file: File): Promise<string> {
  return file.text();
}
