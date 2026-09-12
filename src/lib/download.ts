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
