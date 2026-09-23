import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProofBand } from "@/components/landing/ProofBand";
import { countForProof, paletteForProof } from "@/components/landing/proof-engines";
import { handoffHref, parseHandoff } from "@/lib/capytools/handoff";
import { PROOF } from "@/lib/capytools/landing";

/**
 * The proof band shows "open and local" instead of saying it. Everything here
 * guards one of the ways it could quietly stop being true.
 */

const html = () => renderToStaticMarkup(<ProofBand />);
const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("the hand-off rides in the fragment, never the query", () => {
  it("builds a fragment link, encoded", () => {
    expect(handoffHref("/capyqr", "a b&c")).toBe("/capyqr#text=a%20b%26c");
  });

  it("needs no hand-off for empty input", () => {
    expect(handoffHref("/capyqr", "   ")).toBe("/capyqr");
  });

  it("round-trips through parse", () => {
    const href = handoffHref("/capytone", "rain on the window");
    expect(parseHandoff(href.slice(href.indexOf("#")))).toBe("rain on the window");
  });

  it("ignores fragments that carry nothing", () => {
    expect(parseHandoff("")).toBeNull();
    expect(parseHandoff("#")).toBeNull();
    expect(parseHandoff("#labs")).toBeNull();
    expect(parseHandoff("#text=%20%20")).toBeNull();
  });

  it("every demo link in the band uses the fragment", () => {
    const markup = html();
    for (const demo of PROOF.demos) {
      expect(markup).toContain(`href="${demo.open.href}#text=`);
    }
    // A query string is part of the request: it would send the visitor's text
    // to the Worker, whose request logging is on.
    expect(markup).not.toMatch(/href="\/capy[a-z]+\?/);
  });
});

describe("the band is a real tablist", () => {
  it("renders one tab per demo, exactly one selected", () => {
    const markup = html();
    expect(markup.match(/role="tab"/g) ?? []).toHaveLength(PROOF.demos.length);
    expect(markup.match(/aria-selected="true"/g) ?? []).toHaveLength(1);
  });

  it("links every tab to its panel, and hides the inactive ones", () => {
    const markup = html();
    for (const demo of PROOF.demos) {
      expect(markup).toContain(`aria-controls="proof-panel-${demo.id}"`);
      expect(markup).toContain(`id="proof-panel-${demo.id}"`);
    }
    expect(markup.match(/role="tabpanel"[^>]*hidden=""/g) ?? []).toHaveLength(PROOF.demos.length - 1);
  });

  it("has its own heading for the page outline", () => {
    expect(html()).toMatch(/<h2 id="proof-heading">/);
  });

  it("renders the counter the same on server and client first paint", () => {
    // Server-side there is no PerformanceObserver; the first client render
    // must print the same placeholder, or hydration mismatches.
    expect(html()).toContain('class="lp-proof-counter-n">—<');
  });
});

describe("no engine rides in the landing's first bundle", () => {
  it("ProofBand only type-imports the engines, and loads them with import()", () => {
    const band = source("src/components/landing/ProofBand.tsx");
    expect(band).toContain('import("./proof-engines")');
    expect(band).not.toMatch(/^import (?!type)[^;]*from "\.\/proof-engines"/m);
    expect(band).not.toMatch(/from "@\/lib\/(capyqr|capytoken|capytone)\//);
  });

  it("nothing else on the landing imports the engines statically", () => {
    for (const file of ["Landing.tsx", "Hero.tsx", "Labs.tsx", "LiveWire.tsx"]) {
      expect(source(`src/components/landing/${file}`)).not.toMatch(/proof-engines|lib\/(capyqr|capytoken)\//);
    }
  });
});

describe("the demos run the tools' own engines", () => {
  it("the palette is deterministic — same phrase, same colours", () => {
    const a = paletteForProof("rain on the window");
    const b = paletteForProof("rain on the window");
    expect(a.swatches).toEqual(b.swatches);
    expect(a.swatches).toHaveLength(5);
    for (const swatch of a.swatches) expect(swatch.hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("an empty mood still yields a palette rather than throwing", () => {
    expect(paletteForProof("   ").swatches).toHaveLength(5);
  });

  it("the token count is the exact o200k count, priced for GPT-5", async () => {
    const readout = await countForProof("Calm little tools that run in your browser and keep nothing.");
    expect(Number(readout.tokens.replace(/,/g, ""))).toBeGreaterThan(5);
    expect(readout.model).toBe("GPT-5");
    // A sentence costs millionths of a dollar: never the misleading "$0.0000".
    expect(readout.cost).not.toBe("$0.0000");
    expect(readout.cost).toMatch(/\$/);
  }, 30_000);

  it("opens on a curated mood, not an improvised one", () => {
    const initial = PROOF.demos.find((demo) => demo.id === "palette")!.initial;
    expect(paletteForProof(initial).note ?? "").not.toMatch(/improvis|nothing matched/);
  });
});
