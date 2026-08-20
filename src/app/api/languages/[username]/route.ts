import { NextResponse } from "next/server";
import { fetchLanguageShares } from "@/lib/github/languages";
import { GithubError } from "@/lib/github/types";
import { sanitizeUsername } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60; // fans out to GitHub; do not inherit the short default
export const revalidate = 1800; // 30 min: language mix barely moves

/**
 * Byte-based language shares, the same measure as GitHub's own language bar.
 *
 * Proxied rather than fetched in the browser because it costs one request per
 * repository: a visitor's unauthenticated allowance is 60 per hour, which even
 * a modest account would exhaust in a single card. Server-side it uses
 * GITHUB_TOKEN when present (5,000/hr) and the response is cached.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const clean = sanitizeUsername(username);
  if (!clean) return NextResponse.json({ error: "bad_username" }, { status: 400 });

  try {
    return NextResponse.json(
      { languages: await fetchLanguageShares(clean) },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    const notFound = err instanceof GithubError && err.kind === "not_found";
    return NextResponse.json(
      { error: notFound ? "not_found" : "upstream" },
      { status: notFound ? 404 : 502 },
    );
  }
}
