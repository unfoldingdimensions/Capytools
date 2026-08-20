import { NextResponse } from "next/server";
import { fetchContributions } from "@/lib/github/contributions";
import { GithubError } from "@/lib/github/types";
import { sanitizeUsername } from "@/lib/utils";

export const runtime = "nodejs";
export const revalidate = 1800; // 30 min: the calendar only changes once a day

/**
 * Daily contribution counts for the last ~12 months.
 *
 * GitHub's public events feed (see lib/github/user.ts) only retains ~300 events
 * and ~90 days, which is far too short for a year-long chart. The contribution
 * calendar GitHub renders on every public profile carries an exact per-day
 * count for 365 days and needs no auth — but it is HTML on github.com, so it
 * can't be fetched from the browser. This route proxies + parses it.
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
      { days: await fetchContributions(clean) },
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
