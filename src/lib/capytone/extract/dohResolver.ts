/**
 * The Workers half of gate 2 — DNS over HTTPS, because workerd has no
 * `node:dns`.
 *
 * `HostResolver` is the seam `resolveAndCheck` already resolves through, so
 * the gate itself is untouched: every A and AAAA record still has to be
 * public, a mixed public/private answer is still refused, and an empty answer
 * is still a `dns` failure rather than a pass. Only the lookup moves.
 *
 * What is the same as Node:
 * - Every record is returned and judged. Nothing is sampled.
 * - An unparseable or absent answer fails CLOSED (empty array → `dns`).
 * - CNAME chains are followed to their terminal records: the resolver does
 *   the chasing and the answer section carries the final A/AAAA rows, which
 *   are what we filter for. A name that answers with CNAMEs and no address
 *   yields nothing, and nothing is a refusal.
 *
 * What is NOT the same, and is accepted risk (see the header of
 * `workersTransport.ts` for the full statement):
 * - The query is visible to the DoH resolver. On Node the resolver was
 *   whatever the platform had configured; here it is explicitly Cloudflare.
 * - This is advisory, not binding. Node's `request-filtering-agent` re-checked
 *   the address at connect time; on Workers the binding check is the
 *   platform's `global_fetch_strictly_public`, and this pre-check exists to
 *   refuse early and to keep the every-record-public rule the tests encode.
 */

/** Cloudflare's DoH endpoint, JSON flavour. Public by construction. */
const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";

/** RR type numbers. 1 = A, 28 = AAAA. */
const TYPE_A = 1;
const TYPE_AAAA = 28;

/** DNS RCODE 0 — anything else (NXDOMAIN, SERVFAIL, REFUSED) is not an answer. */
const RCODE_NOERROR = 0;

/**
 * A DoH answer row. Only `type` and `data` are load-bearing; the rest of the
 * response is ignored rather than trusted.
 */
type DohAnswer = { type?: unknown; data?: unknown };
type DohResponse = { Status?: unknown; Answer?: unknown };

/**
 * One lookup. Returns the addresses of exactly the requested record type.
 *
 * Every failure path returns `[]` rather than throwing: `resolveAndCheck`
 * runs the two lookups through `Promise.allSettled` and treats "no records at
 * all" as a `dns` refusal, so an empty array is already the fail-closed
 * answer. Throwing would only add a second way to say the same thing.
 */
async function lookup(hostname: string, type: number, signal?: AbortSignal): Promise<string[]> {
  const query = new URL(DOH_ENDPOINT);
  query.searchParams.set("name", hostname);
  query.searchParams.set("type", String(type));

  let response: Response;
  try {
    response = await fetch(query, {
      method: "GET",
      // A resolver that answers with a redirect is not answering.
      redirect: "manual",
      headers: { Accept: "application/dns-json" },
      signal,
    });
  } catch {
    return [];
  }
  if (response.status !== 200) return [];

  let payload: DohResponse;
  try {
    payload = (await response.json()) as DohResponse;
  } catch {
    return [];
  }

  if (payload.Status !== RCODE_NOERROR) return [];
  if (!Array.isArray(payload.Answer)) return [];

  const addresses: string[] = [];
  for (const row of payload.Answer as DohAnswer[]) {
    // Rows of any other type — CNAME included — are the chain, not the
    // destination. The destination rows are the ones this filter keeps, and
    // if the chain never reaches one, nothing is returned.
    if (row?.type !== type) continue;
    if (typeof row.data !== "string") continue;
    const value = row.data.trim();
    // The range check downstream re-parses this; anything it cannot parse it
    // already treats as reserved. Empty is dropped here so it cannot pad the
    // record count and turn a no-answer into an answer.
    if (value !== "") addresses.push(value);
  }
  return addresses;
}

/**
 * The `HostResolver` for Workers. Swap-in for `node:dns`'s
 * `{ resolve4, resolve6 }` — same shape, same fail-closed contract.
 *
 * `signal` is optional and threaded into both lookups so the extract route's
 * shared 10s deadline can cut a hanging resolver. `fetchWithGuards` also
 * races resolution against that deadline, so this is belt to that braces.
 */
export function createDohResolver(signal?: AbortSignal) {
  return {
    resolve4: (hostname: string) => lookup(hostname, TYPE_A, signal),
    resolve6: (hostname: string) => lookup(hostname, TYPE_AAAA, signal),
  };
}

/** Exported for the tests, which drive it against a stubbed `fetch`. */
export const DOH_INTERNALS = { DOH_ENDPOINT, TYPE_A, TYPE_AAAA, lookup };
