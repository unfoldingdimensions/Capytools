/**
 * CapyResume — browser download helpers.
 *
 * The only place in the library that touches the DOM, and only to hand a Blob
 * to the user's browser. Nothing here uploads anything.
 */

/** Trigger a download of an in-memory Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so Safari has started the download.
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
}

/** Trigger a download of a string (used for the JSON backup). */
export function downloadText(text: string, filename: string, mimeType = 'application/json'): void {
  downloadBlob(new Blob([text], { type: `${mimeType};charset=utf-8` }), filename);
}

/** Read a user-picked file as text. Never leaves the browser. */
export function readFileAsText(file: File): Promise<string> {
  return file.text();
}
