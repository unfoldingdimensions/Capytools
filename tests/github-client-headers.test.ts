import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPage, GITHUB_USER_AGENT } from "../src/lib/github/client";

/**
 * Regression cover for the Workers migration's sharpest surprise.
 *
 * GitHub's REST API answers any request without a User-Agent with
 * `403 Request forbidden by administrative rules`. Node's fetch supplies one of
 * its own, so this never fired on Vercel — workerd supplies none, and both
 * API-backed routes (/api/languages, /api/og) returned 502 on Cloudflare until
 * the header was set explicitly.
 *
 * The failure reads like "GitHub is down", which is exactly why it is worth a
 * test: nothing else in the suite would tell you the header had been dropped.
 */
function okJson(): Response {
  return new Response("[]", {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GitHub API request headers", () => {
  it("sends a User-Agent — without one the API 403s on Workers", async () => {
    const seen: Headers[] = [];
    vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
      seen.push(new Headers(init.headers));
      return Promise.resolve(okJson());
    });

    await fetchPage("https://api.github.com/users/octocat/repos");

    expect(seen).toHaveLength(1);
    expect(seen[0].get("User-Agent")).toBe(GITHUB_USER_AGENT);
  });

  it("identifies the project honestly and points at its home", () => {
    expect(GITHUB_USER_AGENT).toContain("Capytools");
    expect(GITHUB_USER_AGENT).toContain("https://capytools.app");
  });

  it("still sends the Accept and API-version headers alongside it", async () => {
    const seen: Headers[] = [];
    vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
      seen.push(new Headers(init.headers));
      return Promise.resolve(okJson());
    });

    await fetchPage("https://api.github.com/users/octocat/repos");

    expect(seen[0].get("Accept")).toBe("application/vnd.github+json");
    expect(seen[0].get("X-GitHub-Api-Version")).toBe("2022-11-28");
  });
});
