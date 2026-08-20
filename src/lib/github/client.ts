import { GithubError } from "./types";

export const GITHUB_API_BASE = "https://api.github.com";

const DEFAULT_TIMEOUT_MS = 10_000;

const API_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

/**
 * Fetch and parse a GitHub REST response, mapping failures to GithubError:
 * 404 → not_found, 403/429 → rate_limited, everything else (incl. network
 * errors, timeouts and aborts) → network.
 *
 * Internal helper — also returns the `rel="next"` URL from the Link header so
 * callers can paginate. `fetchJSON` is the public wrapper that discards it.
 */
export async function fetchPage<T>(
  url: string,
  init?: RequestInit,
): Promise<{ data: T; next: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    headers.set("Accept", API_HEADERS.Accept);
    headers.set("X-GitHub-Api-Version", API_HEADERS["X-GitHub-Api-Version"]);
    const token = typeof process !== "undefined" ? process.env?.GITHUB_TOKEN : undefined;
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    response = await fetch(url, { ...init, headers, signal: controller.signal });
  } catch {
    throw new GithubError("network", `Request to ${url} failed (network error or timeout)`);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) {
    throw new GithubError("not_found", `GitHub returned 404 for ${url}`);
  }
  if (response.status === 403 || response.status === 429) {
    throw new GithubError(
      "rate_limited",
      `GitHub rate limit exceeded (HTTP ${response.status}) for ${url}`,
    );
  }
  if (!response.ok) {
    throw new GithubError("network", `GitHub returned HTTP ${response.status} for ${url}`);
  }

  try {
    const data = (await response.json()) as T;
    return { data, next: extractNextPage(response.headers.get("link")) };
  } catch {
    throw new GithubError("network", `Failed to parse response body from ${url}`);
  }
}

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const { data } = await fetchPage<T>(url, init);
  return data;
}

/**
 * Parse an RFC 5988 `Link` header (e.g. GitHub's pagination header) and return
 * the URL for `rel="next"`, or null when absent.
 */
export function extractNextPage(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const segments = part.split(";").map((s) => s.trim());
    const urlSegment = segments.shift() ?? "";
    const urlMatch = /^<(.+)>$/.exec(urlSegment);
    if (!urlMatch) continue;
    const isNext = segments.some((segment) => {
      const rel = /^rel=(?:"([^"]+)"|(\S+))$/.exec(segment);
      return rel !== null && (rel[1] ?? rel[2]) === "next";
    });
    if (isNext) return urlMatch[1];
  }
  return null;
}
