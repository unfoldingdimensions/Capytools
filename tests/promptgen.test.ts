import { describe, expect, it } from "vitest";
import {
  CATEGORY_BY_ID,
  LIVING_ARTISTS,
  NEGATIVE_COUNT,
  PLATFORM_PRESETS,
  STYLE_PRESETS,
  VIDEO_RATIOS,
  frameFor,
  isLivingArtist,
} from "../src/lib/promptgen/criteria";
import { assemble, type PickSet } from "../src/lib/promptgen/assemble";

/** A minimal scene, so each assertion is about the clause under test. */
const base: PickSet = {
  subject: "a heron",
  setting: "a flooded temple",
  artist_reference: "in the style of Greg Rutkowski",
};

const ratios = new Set(CATEGORY_BY_ID.aspect_ratio.options.map((o) => o.value));

describe("platform frames", () => {
  // The research added 4:5, 2:3 and 1.91:1 to aspect_ratio precisely to satisfy
  // this. It is the invariant most likely to break the next time either side moves.
  it("every image and video ratio exists as an aspect_ratio option", () => {
    for (const p of PLATFORM_PRESETS) {
      expect(ratios, `${p.id} image`).toContain(p.image.ratio);
      expect(ratios, `${p.id} video`).toContain(p.video.ratio);
    }
  });

  it("picks the video frame for the Video engine and the image frame otherwise", () => {
    // Threads is the case that was silently wrong before the split.
    expect(frameFor("threads", "Gemini")).toEqual({ ratio: "4:5", px: "1080x1350" });
    expect(frameFor("threads", "Video")).toEqual({ ratio: "9:16", px: "1080x1920" });
    expect(frameFor(null, "Gemini")).toBeUndefined();
  });

  it("knows which platform video frames no vendor supports", () => {
    // Not a bug to fix by substitution — the UI has to say so instead.
    expect(VIDEO_RATIOS.has(frameFor("pinterest", "Video")!.ratio)).toBe(false);
    expect(VIDEO_RATIOS.has(frameFor("tiktok", "Video")!.ratio)).toBe(true);
  });
});

describe("per-engine negatives", () => {
  it("Flux emits none at all", () => {
    const out = assemble(base, { engine: "Flux", seed: 1 }).prompt;
    expect(out).not.toContain("Avoid");
    expect(out).not.toContain("NEGATIVE");
  });

  it("Gemini emits an inline Avoid clause with no user override", () => {
    // Regression guard: toGemini used to read set.negative_prompt raw, so with
    // no override it emitted nothing and the researched list was dead code.
    const out = assemble(base, { engine: "Gemini", seed: 1 }).prompt;
    expect(out).toMatch(/Avoid .+\./);
    expect(out.match(/Avoid ([^.]+)\./)![1].split(",")).toHaveLength(NEGATIVE_COUNT.Gemini);
  });

  it("SDXL fills its long field and carries the destination pixels", () => {
    const out = assemble(base, { engine: "SDXL", seed: 1, px: "1080x1350" }).prompt;
    expect(out).toContain("### SIZE: 1080x1350");
    expect(out.split("### NEGATIVE: ")[1].split(",")).toHaveLength(NEGATIVE_COUNT.SDXL);
  });

  it("Midjourney emits exactly one --no, of single-word terms", () => {
    // --no reads every word independently, so a multi-word term silently
    // excludes each of its words. negative_space is a phrase and must stay out.
    const out = assemble({ ...base, negative_space: "lots of empty sky" }, {
      engine: "Midjourney",
      seed: 1,
    }).prompt;
    expect(out.match(/--no/g)).toHaveLength(1);
    expect(out).toContain("lots of empty sky"); // in the positive phrase
    expect(out.split("--no ")[1]).not.toContain("lots of empty sky");
  });
});

describe("living-artist filter", () => {
  it("drops the reference for the engines that block it, keeps it elsewhere", () => {
    const living = "in the style of Greg Rutkowski";
    for (const engine of ["Gemini", "Video"] as const) {
      expect(assemble(base, { engine, seed: 1 }).prompt).not.toContain("Greg Rutkowski");
    }
    for (const engine of ["Midjourney", "Flux", "SDXL"] as const) {
      expect(assemble(base, { engine, seed: 1 }).prompt).toContain("Greg Rutkowski");
    }
    expect(isLivingArtist(living)).toBe(true);
  });

  it("keeps deceased artists on every engine", () => {
    const set = { ...base, artist_reference: "in the style of Caravaggio" };
    expect(isLivingArtist(set.artist_reference)).toBe(false);
    expect(assemble(set, { engine: "Gemini", seed: 1 }).prompt).toContain("Caravaggio");
  });

  it("every LIVING_ARTISTS name matches a real artist_reference option", () => {
    // A typo here disables the filter for that artist in complete silence.
    const options = new Set(
      CATEGORY_BY_ID.artist_reference.options.map((o) =>
        o.value.replace(/^in the style of\s+/i, ""),
      ),
    );
    const orphans = LIVING_ARTISTS.filter((n) => !options.has(n));
    expect(orphans).toEqual([]);
  });
});

describe("style presets", () => {
  it("every bundle value resolves against a real category", () => {
    for (const preset of STYLE_PRESETS) {
      for (const bundle of preset.bundles) {
        if (bundle.startsWith("negative:")) continue;
        const id = bundle.slice(0, bundle.indexOf(":"));
        expect(CATEGORY_BY_ID, `${preset.id} → ${bundle}`).toHaveProperty(id);
      }
    }
  });
});

describe("Gemini prose", () => {
  it("agrees the article with the leading mood adjective", () => {
    expect(assemble({ ...base, mood: "ethereal" }, { engine: "Gemini", seed: 1 }).prompt).toContain(
      "An ethereal scene",
    );
    expect(assemble({ ...base, mood: "serene" }, { engine: "Gemini", seed: 1 }).prompt).toContain(
      "A serene scene",
    );
  });
});
