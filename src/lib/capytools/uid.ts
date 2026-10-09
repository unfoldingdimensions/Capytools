/**
 * A deterministic-enough unique id for persisted list items.
 *
 * Moved here from CapyResume's schema (which re-exports it) so CapyInvoice's
 * documents mint ids the same way rather than carrying a second copy. Prefers
 * the platform UUID when available.
 */
export function uid(prefix = 'id'): string {
  const cryptoRef = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return `${prefix}_${cryptoRef.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
