#!/usr/bin/env node
/**
 * Post-deploy sanity check.
 *
 * Everything here is only true once the app answers from its real origin: canonicals,
 * the sitemap, `robots.txt`, the social card, and the absence of any placeholder origin
 * that leaked into a build. Run it after every deploy.
 *
 *   node scripts/verify-deploy.mjs https://your-origin
 *   node scripts/verify-deploy.mjs                 # uses NEXT_PUBLIC_SITE_URL
 *
 * To exercise the checks themselves without deploying, build and serve locally with the
 * origin you are about to test:
 *
 *   NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3199 npm run build && npm start -- -p 3199
 *   node scripts/verify-deploy.mjs http://127.0.0.1:3199
 *
 * Exits 0 only when every check passes. No dependencies; Node >= 20 for global fetch.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

const LOCALHOST_VARIANTS = ['localhost', '127.0.0.1'];
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const sameResource = (a, b) => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

const rawBase = process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
if (!rawBase) {
  console.error(
    'No origin given. Pass one as an argument or set NEXT_PUBLIC_SITE_URL.\n' +
      'This script refuses to guess an origin: guessing is the failure it exists to catch.'
  );
  process.exit(2);
}

const base = rawBase.replace(/\/+$/, '');
if (!/^https?:\/\/[^/]+$/.test(base)) {
  console.error(`Origin must be absolute and bare, e.g. https://example.com — got "${rawBase}"`);
  process.exit(2);
}

// A placeholder origin is a failure unless it is the origin under test: checking a local
// build must not be reported as a leaked placeholder.
const PLACEHOLDERS = ['capyresume.example', ...LOCALHOST_VARIANTS.filter((v) => !base.includes(v))];

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
};

const get = async (url) => {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'capyresume-deploy-check' },
  });
  const body = await res.text();
  return { res, body };
};

const one = (html, pattern, label) => {
  const matches = [...html.matchAll(pattern)];
  if (matches.length !== 1)
    throw new Error(`${label}: expected exactly 1, found ${matches.length}`);
  return matches[0][1];
};

// 1. robots.txt
let sitemapUrls = [];
try {
  const { res, body } = await get(`${base}/robots.txt`);
  const pointsAtSitemap = body.includes(`Sitemap: ${base}/sitemap.xml`);
  record(
    'robots.txt answers and points at the sitemap',
    res.status === 200 && pointsAtSitemap,
    `status ${res.status}${pointsAtSitemap ? '' : ', sitemap line missing or wrong origin'}`
  );
} catch (error) {
  record('robots.txt answers and points at the sitemap', false, String(error.message));
}

// 1b. the served policy still lets the document engine compile WebAssembly
try {
  const res = await fetch(`${base}/`, { redirect: 'follow' });
  const csp = res.headers.get('content-security-policy') ?? '';
  const scriptSrc =
    csp
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('script-src')) ?? '';
  const allowsWasm = scriptSrc.includes("'wasm-unsafe-eval'");
  const allowsEval = scriptSrc.includes("'unsafe-eval'");
  record(
    'policy permits the PDF exporter to compile WebAssembly, without eval',
    allowsWasm && !allowsEval,
    allowsWasm
      ? allowsEval
        ? "'unsafe-eval' is also present in this build"
        : 'script-src ok'
      : "'wasm-unsafe-eval' missing — Download PDF will fail in this build"
  );
} catch (error) {
  record(
    'policy permits the PDF exporter to compile WebAssembly, without eval',
    false,
    String(error.message)
  );
}

// 2. sitemap.xml, and every static path from the source is in it
try {
  const { res, body } = await get(`${base}/sitemap.xml`);
  sitemapUrls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const total = sitemapUrls.length;
  const foreign = sitemapUrls.filter((u) => !u.startsWith(base));
  record(
    'sitemap.xml answers, is non-empty, and every URL is on this origin',
    res.status === 200 && total > 0 && foreign.length === 0,
    `${total} URLs${foreign.length ? `, ${foreign.length} off-origin (e.g. ${foreign[0]})` : ''}`
  );

  const source = readFileSync(path.join(process.cwd(), 'app/sitemap.ts'), 'utf8');
  const block = source.match(/export const STATIC_PATHS = \[([\s\S]*?)\]/)?.[1] ?? '';
  const staticPaths = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const missing = staticPaths.filter((p) => !sitemapUrls.includes(`${base}${p}`));
  record(
    'every STATIC_PATHS entry from app/sitemap.ts is in the sitemap',
    staticPaths.length > 0 && missing.length === 0,
    missing.length ? `missing ${missing.join(', ')}` : `${staticPaths.length} static paths`
  );
} catch (error) {
  record('sitemap.xml', false, String(error.message));
}

// 3. every sitemap URL: 200, exactly one canonical pointing at itself, no placeholder origin
if (sitemapUrls.length) {
  const failures = [];
  let checked = 0;
  for (const url of sitemapUrls) {
    try {
      const { res, body } = await get(url);
      if (res.status !== 200) {
        failures.push(`${url} → ${res.status}`);
        continue;
      }
      const canonical = one(body, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/g, url);
      if (!sameResource(canonical, url)) {
        failures.push(`${url} → canonical ${canonical}`);
        continue;
      }
      const leaked = PLACEHOLDERS.find((p) => body.includes(p));
      if (leaked) {
        failures.push(`${url} → contains "${leaked}"`);
        continue;
      }
      checked += 1;
    } catch (error) {
      failures.push(`${url} → ${error.message}`);
    }
  }
  record(
    'every sitemap URL: 200, self-canonical, no placeholder origin',
    failures.length === 0,
    failures.length
      ? `${failures.length} bad of ${sitemapUrls.length}: ${failures.slice(0, 3).join('; ')}`
      : `${checked} URLs`
  );
}

// 4. the social card exists, is on this origin, and is the size crawlers want
try {
  const { body: home } = await get(`${base}/`);
  const ogImage = one(home, /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/g, 'og:image');
  const sameOrigin = ogImage.startsWith(base);
  const card = await fetch(ogImage, { redirect: 'follow' });
  const bytes = Buffer.from(await card.arrayBuffer());
  const isPng = bytes.subarray(0, 8).equals(PNG_MAGIC);
  const width = isPng ? bytes.readUInt32BE(16) : 0;
  const height = isPng ? bytes.readUInt32BE(20) : 0;
  record(
    'social card resolves on this origin as a 1200x630 PNG',
    sameOrigin && card.status === 200 && isPng && width === 1200 && height === 630,
    `${ogImage} → ${card.status}, ${isPng ? `${width}x${height}` : 'not a PNG'}${sameOrigin ? '' : ' (off-origin!)'}`
  );
} catch (error) {
  record('social card resolves on this origin as a 1200x630 PNG', false, String(error.message));
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed against ${base}` +
    (failed.length ? `\n\nNot deployable yet. Fix the FAIL lines above and re-run.` : `\n`)
);
process.exit(failed.length ? 1 : 0);
