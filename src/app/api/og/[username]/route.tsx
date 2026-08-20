import { ImageResponse } from "next/og";
import { getUser, getRepos, getEvents } from "@/lib/github/user";
import { fetchContributions } from "@/lib/github/contributions";
import { fetchLanguageShares } from "@/lib/github/languages";
import { GithubError } from "@/lib/github/types";
import { computeWrapped } from "@/lib/github/stats";
import { CardArt } from "@/components/card/CardArt";

export const runtime = "nodejs";
export const maxDuration = 60; // fans out to GitHub; do not inherit the short default // Next 16 deprecates edge — ImageResponse works on node too.

// Lazy, module-level font cache — each family/weight fetched from Google Fonts
// once per cold start, then reused by every OG image.
const fontCache = new Map<string, ArrayBuffer>();

async function googleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const key = `${family}:${weight}`;
  const hit = fontCache.get(key);
  if (hit) return hit;
  // Very-old UA (pre-woff/woff2 Netscape) makes Google serve .ttf —
  // @vercel/og/Satori can only parse OpenType TTF/OTF, not woff/woff2.
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family.split(" ").join("+")}:wght@${weight}&display=swap`,
    {
      headers: {
        "User-Agent": "Mozilla/4.0",
      },
    },
  ).then((r) => r.text());
  const url = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error(`no ttf for ${family} ${weight}`);
  const buf = await (await fetch(url)).arrayBuffer();
  fontCache.set(key, buf);
  return buf;
}

// Params are async (a Promise) in Next 15/16 route handlers.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  try {
    const [user, repos, events, contributions, languages] = await Promise.all([
      getUser(username),
      getRepos(username),
      getEvents(username),
      // Same chart and language sources as the page, so the social preview
      // matches what the visitor saw.
      fetchContributions(username).catch(() => []),
      fetchLanguageShares(username).catch(() => []),
    ]);
    const stats = computeWrapped(user, repos, events, new Date(), contributions, languages);

    const [fraunces300, fraunces500, sans500, plex400] = await Promise.all([
      googleFont("Fraunces", 300),
      googleFont("Fraunces", 500),
      googleFont("Plus Jakarta Sans", 500),
      googleFont("IBM Plex Mono", 400),
    ]);

    return new ImageResponse(
      <CardArt stats={stats} variant="light" format="wide" />,
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: "Fraunces", data: fraunces300, weight: 300, style: "normal" },
          { name: "Fraunces", data: fraunces500, weight: 500, style: "normal" },
          { name: "Plus Jakarta Sans", data: sans500, weight: 500, style: "normal" },
          { name: "IBM Plex Mono", data: plex400, weight: 400, style: "normal" },
        ],
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    const notFound = err instanceof GithubError && err.kind === "not_found";
    console.error(`og: ${username} failed`, err);
    return new Response(notFound ? "Not found" : "OG render failed", {
      status: notFound ? 404 : 500,
    });
  }
}
