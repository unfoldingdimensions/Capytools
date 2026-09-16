/**
 * The Extract orchestrator — the ordered stack of plan §7b.3, end to end:
 * validate the target, fetch the document (every hop re-resolved and
 * re-validated), parse HTML + ≤5 stylesheets + theme-color + manifest,
 * rank and cluster, return only counts and hexes.
 *
 * The suite's privacy promise under scrutiny: this module stores nothing,
 * caches nothing, and never holds fetched content beyond one request — the
 * text a guard fetched dies inside the parser that consumed it. Failures
 * are typed ExtractErrors so the route stays thin and the UI stays calm.
 *
 * Cloudflare note (§7b.1): on Workers there is no IP pinning and dns.promises
 * does not exist — the migration swaps HostResolver for a DoH pre-check and
 * documents the residual resolve-then-fetch TOCTOU as accepted risk (edge
 * egress cannot reach RFC1918; no metadata endpoint). Node now; CF later.
 */

import { fetchWithGuards, type FetchFailure, type Transport } from "./fetchDoc";
import {
  extractFromHtml,
  type PageExtraction,
} from "./parse";
import { rankPalette, type RankedColour } from "./rank";
import { validateTarget, type BlockReason, type HostResolver } from "./ssrf";

export const EXTRACT_TIMEOUT_MS = 10_000;
/** "~3MB" — the streamed cap, charged to every response body alike. */
export const MAX_RESPONSE_BYTES = 3_000_000;
/** Redirects followed after the initial request. */
export const MAX_REDIRECTS = 3;
/** A request body carries one URL — anything past this is not one. */
export const MAX_REQUEST_BYTES = 4_096;

/**
 * Shape check for the route's request, kept pure so it is table-tested:
 * only application/json bodies, and only small ones. The app's own client
 * sends exactly that (ExtractMode); refusing `text/plain` simple requests
 * means a third-party page cannot drive server fetches from its visitors'
 * browsers without a preflight — those requests would burn the visitors'
 * rate buckets and launder the page's origin through this server.
 */
export function isExtractRequest(
  contentType: string | null,
  contentLength: string | null,
): boolean {
  const type = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") return false;
  if (contentLength !== null && contentLength !== "") {
    const length = Number(contentLength);
    // A length header is non-negative decimal digits or it is a lie.
    if (!Number.isFinite(length) || length < 0 || length > MAX_REQUEST_BYTES) return false;
  }
  return true;
}

export type ExtractFailureKind = ExtractError["kind"];

export class ExtractError extends Error {
  constructor(
    public readonly kind:
      | BlockReason
      | Exclude<FetchFailure, BlockReason>
      | "no_colours",
  ) {
    super(`capytone extract failed: ${kind}`);
    this.name = "ExtractError";
  }
}

export interface ExtractDeps {
  resolver: HostResolver;
  transport: Transport;
}

export interface ExtractResult {
  url: string;
  fetchedAt: string;
  themeColors: PageExtraction["themeColors"];
  palette: RankedColour[];
  stats: PageExtraction["stats"];
}

export async function extractPalette(rawUrl: string, deps: ExtractDeps): Promise<ExtractResult> {
  const signal = AbortSignal.timeout(EXTRACT_TIMEOUT_MS);

  const check = validateTarget(rawUrl);
  if (!check.ok) throw new ExtractError(check.reason);

  const document = await fetchWithGuards(check.url, {
    resolver: deps.resolver,
    transport: deps.transport,
    signal,
    maxBytes: MAX_RESPONSE_BYTES,
    maxRedirects: MAX_REDIRECTS,
    accept: ["text/html"],
  });
  if (!document.ok) throw new ExtractError(document.failure);

  const page = await extractFromHtml(document.doc.text, document.doc.url, {
    // Stylesheets re-run the whole guarded stack — a stylesheet redirecting
    // to a private host dies exactly like the document would.
    fetchStylesheet: async (href) => {
      const target = validateTarget(href);
      if (!target.ok) return null;
      const sheet = await fetchWithGuards(target.url, {
        resolver: deps.resolver,
        transport: deps.transport,
        signal,
        maxBytes: MAX_RESPONSE_BYTES,
        maxRedirects: MAX_REDIRECTS,
        accept: ["text/css"],
      });
      return sheet.ok ? { text: sheet.doc.text, bytes: sheet.doc.bytes } : null;
    },
    fetchManifest: async (href) => {
      const target = validateTarget(href);
      if (!target.ok) return null;
      const manifest = await fetchWithGuards(target.url, {
        resolver: deps.resolver,
        transport: deps.transport,
        signal,
        maxBytes: MAX_RESPONSE_BYTES,
        maxRedirects: MAX_REDIRECTS,
        // Servers send either the spec type or plain JSON; both are the
        // manifest, and nothing else is.
        accept: ["application/manifest+json", "application/json"],
      });
      if (!manifest.ok) return null;
      try {
        return JSON.parse(manifest.doc.text) as unknown;
      } catch {
        return null;
      }
    },
  });

  const palette = rankPalette(page.occurrences);
  if (palette.length === 0 && page.themeColors.length === 0) {
    throw new ExtractError("no_colours");
  }

  return {
    url: document.doc.url,
    fetchedAt: new Date().toISOString(),
    themeColors: page.themeColors,
    palette,
    stats: page.stats,
  };
}
