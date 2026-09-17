/**
 * Post-deploy smoke. `node scripts/smoke.mjs <base-url>`
 *
 * The phase 5 checks, written down so they run on every deploy instead of
 * living in a terminal history. This is the file that found /license returning
 * 500 on Workers — a page no migration commit had touched, which broke purely
 * because the platform underneath it changed. That is the argument for walking
 * every page rather than the ones a diff mentions.
 *
 * Deliberately NOT checked here: the rate limiter. It is enforced by a
 * Cloudflare Rate Limiting rule on the zone, ahead of this Worker, so CI
 * cannot exercise it without tripping it for everyone sharing the runner's
 * egress IP. Verify that one from the dashboard.
 *
 * Exits non-zero on the first failure count, and prints every result either
 * way so a CI log shows what passed, not just what broke.
 */

const base = (process.argv[2] ?? "").replace(/\/+$/, "");
if (!base) {
  console.error("usage: node scripts/smoke.mjs <base-url>");
  process.exit(2);
}

let passed = 0;
const failures = [];

function check(name, actual, expected) {
  const ok = String(actual) === String(expected);
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${name} — got ${actual}, want ${expected}`);
    console.log(`  FAIL  ${name} — got ${actual}, want ${expected}`);
  }
}

const get = (path, init) => fetch(`${base}${path}`, { redirect: "manual", ...init });

/** Pages that must exist. The tool list is the SUITE, plus the site's furniture. */
const PAGES = [
  "/", "/capywrapped", "/capyimagine", "/capycreator", "/capystrip",
  "/capyexpense", "/capyog", "/capyqr", "/capyresize", "/capytoken",
  "/capypixel", "/capytone", "/notes", "/design", "/license",
  "/sitemap.xml", "/robots.txt",
];

/** Byte-for-byte parity with SECURITY_HEADERS in next.config.ts. */
const SECURITY_HEADERS = {
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

async function main() {
  console.log(`\nsmoke: ${base}\n`);

  console.log("pages");
  for (const path of PAGES) {
    check(path, (await get(path)).status, 200);
  }
  // /license is generated at build from LICENSE; an empty render is the
  // failure mode the generator exists to prevent.
  check("/license carries the licence text",
    (await (await get("/license")).text()).includes("Apache License"), true);

  console.log("\nsecurity headers (page)");
  const page = await get("/");
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    check(header, page.headers.get(header), value);
  }
  check("CSP report-only present",
    Boolean(page.headers.get("content-security-policy-report-only")), true);
  check("CSP has no third-party script origin",
    (page.headers.get("content-security-policy-report-only") ?? "").includes("vercel"), false);

  // The assets binding serves /_next/static/* before the Worker runs, so
  // next.config.ts headers() never sees it — public/_headers has to carry them.
  console.log("\nsecurity headers + cache on /_next/static/* (the assets binding)");
  const html = await (await get("/")).text();
  const asset = html.match(/\/_next\/static\/[^"']+\.js/)?.[0];
  check("found a static asset to test", Boolean(asset), true);
  if (asset) {
    const res = await get(asset);
    check("asset 200", res.status, 200);
    check("asset immutable cache",
      (res.headers.get("cache-control") ?? "").includes("max-age=31536000"), true);
    for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
      check(`asset ${header}`, res.headers.get(header), value);
    }
  }

  // NEXT_PUBLIC_SITE_URL is inlined at BUILD time, so a miss here means the
  // build env was wrong — and the symptom is silent, wrong share URLs.
  console.log("\ncanonical URLs (build-time NEXT_PUBLIC_SITE_URL)");
  const sitemap = await (await get("/sitemap.xml")).text();
  const locs = (sitemap.match(/<loc>/g) ?? []).length;
  check("sitemap has entries", locs > 0, true);
  check("every sitemap URL is capytools.app",
    (sitemap.match(/https:\/\/capytools\.app/g) ?? []).length, locs);
  check("sitemap has no vercel.app", sitemap.includes("vercel.app"), false);

  console.log("\nAPI surface");
  const languages = await get("/api/languages/torvalds");
  check("languages 200", languages.status, 200);
  // Real data, not an empty 200: proves the Worker's GITHUB_TOKEN resolved and
  // that the User-Agent header is present (without it GitHub answers 403).
  check("languages returns real shares",
    (await languages.json()).languages?.length > 0, true);
  check("contributions 200", (await get("/api/contributions/torvalds")).status, 200);

  const og = await get("/api/og/torvalds");
  check("og 200", og.status, 200);
  const png = new Uint8Array(await og.arrayBuffer());
  const isPng = png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47;
  check("og is a PNG", isPng, true);
  const width = new DataView(png.buffer).getUint32(16);
  const height = new DataView(png.buffer).getUint32(20);
  check("og is 1200x630", `${width}x${height}`, "1200x630");

  console.log("\nextract route — the SSRF gate, on the deployed runtime");
  const extract = (url) =>
    get("/api/extract-palette", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

  const ok = await extract("https://example.com/");
  check("a public site extracts", ok.status, 200);
  check("…and returns a palette", Array.isArray((await ok.json()).palette), true);

  // Each row is a different way of saying "somewhere private". The DNS-based
  // and redirect cases are the ones that exercise the DoH gate and the per-hop
  // re-gating rather than the literal table.
  for (const [name, url] of [
    ["loopback literal", "http://127.0.0.1/"],
    ["IPv4-mapped loopback", "http://[::ffff:127.0.0.1]/"],
    ["decimal literal", "http://2130706433/"],
    ["cloud metadata endpoint", "http://169.254.169.254/"],
    ["public name resolving to loopback", "http://127.0.0.1.nip.io/"],
  ]) {
    const res = await extract(url);
    check(`blocked: ${name}`, (await res.json()).error, "blocked_host");
  }
  check("non-JSON body refused", (await get("/api/extract-palette", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "{}",
  })).status, 415);

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log("\nfailures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\nsmoke crashed:", error);
  process.exit(1);
});
