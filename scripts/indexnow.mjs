/**
 * IndexNow ping. `node scripts/indexnow.mjs <base-url> [last-submitted-sitemap.xml]`
 *
 * Tells Bing, Yandex, Seznam, Naver and the other IndexNow engines that the
 * site's URLs changed, instead of waiting for them to recrawl. One POST to
 * api.indexnow.org is shared with every participating engine. Google does
 * not take part — it still finds changes through the sitemap.
 *
 * Runs in CI after the deploy and its smoke pass, so engines are never sent to
 * a version that failed. The URL list is the LIVE sitemap: the same list we
 * already tell crawlers about, so this can never announce a page the sitemap
 * doesn't carry.
 *
 * Only what changed is sent: URLs that are new, or whose <lastmod> moved, since
 * the sitemap of the last SUCCESSFUL submission (the file passed as the second
 * argument, which CI keeps in its cache). Diffing against the last submission
 * rather than the pre-deploy sitemap matters: a deploy whose smoke fails skips
 * this step, and its new pages must still go out with the next one. Sending
 * every URL on every deploy — docs-only ones included — put 171 submissions on
 * Bing's report in 8 hours (D49). With no readable previous sitemap, everything
 * is sent, and the log says why.
 *
 * The key is public by design: engines verify ownership by fetching
 * `<base>/<KEY>.txt`, which is `public/<KEY>.txt` (tests/indexnow.test.ts).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

const KEY = "2ec68e8c36e34163d2272fadc58b34fe";

const ENDPOINT = "https://api.indexnow.org/indexnow";

/** What each documented status means, so a CI log says why, not just a number. */
const MEANING = {
  200: "submitted",
  202: "accepted — key validation pending",
  400: "bad request — invalid format",
  403: "key not valid — is the key file deployed?",
  422: "URLs don't belong to this host, or the key doesn't match",
  429: "too many requests — treated as spam",
};

/** loc → lastmod ("" when a <url> has none) for every <url> in a sitemap. */
export function parseSitemap(xml) {
  const entries = new Map();
  for (const [, body] of (xml ?? "").matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = body.match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1];
    if (loc) entries.set(loc, body.match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/)?.[1] ?? "");
  }
  return entries;
}

/**
 * The URLs to submit: new since `previousXml`, or with a different lastmod.
 * Removed URLs are not sent. An unusable previous sitemap (missing, empty,
 * unparsable) means everything is sent, with the reason.
 */
export function changedUrls(previousXml, currentXml) {
  const current = parseSitemap(currentXml);
  const previous = parseSitemap(previousXml);
  if (previous.size === 0) {
    return { urls: [...current.keys()], reason: "no previous sitemap — submitting every URL" };
  }
  const urls = [...current].filter(([loc, lastmod]) => previous.get(loc) !== lastmod).map(([loc]) => loc);
  return { urls, reason: null };
}

function readOptional(path) {
  if (!path) return "";
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

async function main(baseArg, lastPath) {
  const base = (baseArg ?? "").replace(/\/+$/, "");
  if (!base) {
    console.error("usage: node scripts/indexnow.mjs <base-url> [last-submitted-sitemap.xml]");
    process.exit(2);
  }

  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  const total = parseSitemap(sitemap).size;
  if (total === 0) throw new Error("sitemap has no <loc> entries");

  const { urls, reason } = changedUrls(readOptional(lastPath), sitemap);
  if (reason) console.log(`IndexNow: ${reason}`);
  const remember = () => {
    if (!lastPath) return;
    mkdirSync(dirname(lastPath), { recursive: true });
    writeFileSync(lastPath, sitemap);
  };

  if (urls.length === 0) {
    console.log(`IndexNow: 0 changed of ${total} — nothing to submit`);
    remember();
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(base).host,
      key: KEY,
      keyLocation: `${base}/${KEY}.txt`,
      urlList: urls,
    }),
  });

  console.log(`IndexNow: ${urls.length} changed of ${total} → ${res.status} ${MEANING[res.status] ?? ""}`);
  if (urls.length <= 10) for (const url of urls) console.log(`  ${url}`);
  if (res.status !== 200 && res.status !== 202) process.exit(1);
  // Only a submission the engines took becomes the next baseline.
  remember();
}

// Run only as a script; tests import the functions above.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv[2], process.argv[3]);
}
