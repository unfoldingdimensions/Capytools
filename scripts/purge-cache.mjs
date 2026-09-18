/**
 * Purge the edge-cached HTML after a deploy.
 * `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ZONE_ID=… node scripts/purge-cache.mjs [base-url]`
 *
 * Pages carry `s-maxage=31536000`, so once a zone Cache Rule caches them, a
 * deploy would keep serving last week's HTML from the edge with a green build
 * sitting next to it.
 *
 * Pages only, never purge_everything: the API routes keep their responses in
 * the same edge cache, and a single /api/og miss costs ~46 GitHub calls on the
 * server's token. Purging those every deploy would spend exactly the quota the
 * cache exists to protect, and buy nothing — their content does not change when
 * the site is redeployed.
 *
 * The URL list comes from the sitemap, so a new tool is covered the day it
 * ships rather than the day someone remembers this file.
 */

const base = (process.argv[2] ?? "https://capytools.app").replace(/\/+$/, "");
const token = process.env.CLOUDFLARE_API_TOKEN;
const zone = process.env.CLOUDFLARE_ZONE_ID;

if (!token || !zone) {
  console.error("need CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID");
  process.exit(2);
}

const sitemap = await fetch(`${base}/sitemap.xml`).then((r) => {
  if (!r.ok) throw new Error(`sitemap ${r.status}`);
  return r.text();
});

const files = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (files.length === 0) throw new Error("sitemap listed no URLs");

// Cloudflare takes 30 URLs per call. The suite is heading for 20-30 tools, so
// this will matter before anyone thinks to check it.
for (let i = 0; i < files.length; i += 30) {
  const batch = files.slice(i, i + 30);
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ files: batch }),
  });
  const body = await res.json().catch(() => ({}));
  if (!body.success) {
    // Loud on purpose: a purge that quietly fails leaves the edge serving a
    // stale site behind a green deploy, which is the hardest kind to notice.
    console.error(`purge failed: ${JSON.stringify(body.errors ?? body)}`);
    process.exit(1);
  }
  console.log(`purged ${batch.length} urls`);
}
