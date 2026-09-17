import { NextResponse } from "next/server";

import {
  extractPalette,
  ExtractError,
  isExtractRequest,
  type ExtractFailureKind,
} from "@/lib/capytone/extract";
import { createDohResolver } from "@/lib/capytone/extract/dohResolver";
import { workersTransport } from "@/lib/capytone/extract/workersTransport";

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
 * Runtime: Cloudflare Workers. There is no `node:dns` and no `http.Agent`
 * here, so the two injected dependencies are the DoH resolver and the
 * fetch-based transport. The ordered stack, the reserved-range table and
 * every refusal are unchanged — only the lookup and the socket moved. What
 * that cost, and what the platform gives back in exchange, is stated in full
 * at the top of `workersTransport.ts`; the short version is that
 * `global_fetch_strictly_public` in wrangler.jsonc is now doing the job
 * `request-filtering-agent` used to, which makes that flag part of this
 * route's security surface.
 *
 * `runtime = "nodejs"` stays: it selects the Node-compatible build under
 * `nodejs_compat` (ssrf.ts reads `node:net`'s isIP), not a Node server.
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
  if (!isExtractRequest(request.headers.get("content-type"), request.headers.get("content-length"))) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  if (typeof body?.url !== "string") {
    return NextResponse.json({ error: "bad_url" }, { status: 400 });
  }

  try {
    const result = await extractPalette(body.url, {
      resolver: createDohResolver(),
      transport: workersTransport,
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
