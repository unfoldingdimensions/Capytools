#!/usr/bin/env node
/**
 * Renders scripts/share-cards/card.html to PNGs with headless Chrome.
 *
 *   node scripts/render-share-cards.mjs              # public/og.png + directory renders
 *   node scripts/render-share-cards.mjs og           # just the share card
 *   CHROME=/path/to/chrome node scripts/render-share-cards.mjs
 *
 * The share card is committed (src/lib/capytools/og.ts says why it is static);
 * the directory renders go to docs/research/directory-kit/, which is local.
 * The card prints no tool count, so a new tool does not make it stale.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const TEMPLATE = pathToFileURL(join(ROOT, "scripts/share-cards/card.html")).href;
const KIT = join(ROOT, "docs/research/directory-kit");

const VARIANTS = {
  og: { size: [1200, 630], out: join(ROOT, "public/og.png") },
  home: { size: [1270, 760], out: join(KIT, "capytools.png") },
  capybg: { size: [1270, 760], out: join(KIT, "capybg.png") },
  capyqr: { size: [1270, 760], out: join(KIT, "capyqr.png") },
  capyresize: { size: [1270, 760], out: join(KIT, "capyresize.png") },
  capyread: { size: [1270, 760], out: join(KIT, "capyread.png") },
  capytone: { size: [1270, 760], out: join(KIT, "capytone.png") },
};

const CHROME = process.env.CHROME ?? [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find(existsSync);
if (!CHROME) throw new Error("No Chrome found; set CHROME=/path/to/chrome");

const pick = process.argv.slice(2);
const profile = mkdtempSync(join(tmpdir(), "share-cards-"));
try {
  for (const [name, { size, out }] of Object.entries(VARIANTS)) {
    if (pick.length && !pick.includes(name)) continue;
    mkdirSync(resolve(out, ".."), { recursive: true });
    execFileSync(CHROME, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      "--allow-file-access-from-files", `--user-data-dir=${profile}`,
      `--window-size=${size[0]},${size[1]}`,
      // fonts come from Google Fonts with display=block; give them time to land
      "--virtual-time-budget=10000",
      `--screenshot=${out}`, `${TEMPLATE}?v=${name}`,
    ], { stdio: "ignore" });
    if (!existsSync(out)) throw new Error(`${name}: Chrome wrote nothing to ${out}`);
    if (name === "og") {
      // 380 KB straight from Chrome; WhatsApp and some unfurlers drop cards
      // past ~300 KB. A 256-colour palette lands near 160 KB with no visible banding.
      const small = await sharp(out).removeAlpha().png({ palette: true, quality: 90, effort: 10 }).toBuffer();
      writeFileSync(out, small);
    }
    console.log(`${name} → ${out}`);
  }
} finally {
  rmSync(profile, { recursive: true, force: true });
}
