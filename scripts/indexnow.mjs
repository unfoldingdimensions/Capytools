/**
 * IndexNow ping. `node scripts/indexnow.mjs <base-url>`
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
 * The key is public by design: engines verify ownership by fetching
 * `<base>/<KEY>.txt`, which is `public/<KEY>.txt` (tests/indexnow.test.ts).
 *
 * Every page is submitted on every deploy. ponytail: with ~25 URLs that is far
 * below any rate limit; submit only changed URLs if the site grows into the
 * hundreds and 429s appear.
 */

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

async function main(baseArg) {
  const base = (baseArg ?? "").replace(/\/+$/, "");
  if (!base) {
    console.error("usage: node scripts/indexnow.mjs <base-url>");
    process.exit(2);
  }

  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urlList.length === 0) throw new Error("sitemap has no <loc> entries");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(base).host,
      key: KEY,
      keyLocation: `${base}/${KEY}.txt`,
      urlList,
    }),
  });

  console.log(`IndexNow: ${urlList.length} URLs → ${res.status} ${MEANING[res.status] ?? ""}`);
  if (res.status !== 200 && res.status !== 202) process.exit(1);
}

await main(process.argv[2]);
