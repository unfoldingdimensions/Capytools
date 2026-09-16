import { NextResponse } from "next/server";
import { promises as dns } from "node:dns";

import {
  extractPalette,
  ExtractError,
  type ExtractFailureKind,
} from "@/lib/capytone/extract";
import { nodeTransport } from "@/lib/capytone/extract/nodeTransport";

export const runtime = "nodejs";

/**
 * CapyTone's Extract mode — the suite's first fetch-a-user-URL route, and
 * the only server code CapyTone will ever have (plan §1/§7).
 *
 * The promise it keeps: fetch on behalf of the person who asked, keep
 * nothing, cache nothing, and return only counts and hexes. Fetched HTML
 * and CSS never outlive the request that parsed them and are never logged
 * or echoed; DNS is validated against the reserved ranges before every
 * request and every redirect hop (see lib/capytone/extract/ssrf.ts).
 *
 * Cloudflare migration note (plan §7b.1): Workers has no dns.promises and
 * no IP pinning — swap the resolver for a DoH pre-check there and carry the
 * documented TOCTOU as accepted risk. Node runtime today by design.
 */

const FAILURE_STATUS: Record<ExtractFailureKind, number> = {
  bad_url: 400,
  scheme: 400,
  port: 400,
  credentials: 400,
  dns: 400,
  blocked_host: 403,
  timed_out: 504,
  too_large: 413,
  not_html: 415,
  upstream: 502,
  too_many_redirects: 508,
  network: 502,
  no_colours: 422,
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  if (typeof body?.url !== "string") {
    return NextResponse.json({ error: "bad_url" }, { status: 400 });
  }

  try {
    const result = await extractPalette(body.url, {
      resolver: {
        resolve4: (hostname) => dns.resolve4(hostname),
        resolve6: (hostname) => dns.resolve6(hostname),
      },
      transport: nodeTransport,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (!(error instanceof ExtractError)) throw error;
    return NextResponse.json(
      { error: error.kind },
      { status: FAILURE_STATUS[error.kind] },
    );
  }
}
