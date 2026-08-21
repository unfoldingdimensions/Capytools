// RETIRED — DO NOT RUN. Kept only as the record of how the 18 content
// categories were derived from docs/research/prompt-generator/lexicon-*.json.
//
// src/lib/promptgen/criteria.ts is now hand-maintained. This script rewrites
// that file WHOLE from the six lexicons, so running it would delete the tiers,
// platform presets, style presets, per-engine negatives and the living-artist
// filter, and leave the app failing to compile on ~10 missing exports. It also
// knows nothing about the research JSONs (negatives-per-engine, param-ranges,
// artist-restrictions, platform-aspect-ratios), so it would silently revert
// guidance_flux to include 7 (above the official API max) and video_duration
// to 4s/8s/12s.
//
// Originally: builds src/lib/promptgen/criteria.ts from the researched lexicons.
import fs from "node:fs";

const D = "docs/research/prompt-generator/";
const load = (f) => JSON.parse(fs.readFileSync(D + f, "utf8"));
const L = {
  subj: load("lexicon-subjects.json"),
  env: load("lexicon-environments.json"),
  art: load("lexicon-artists.json"),
  cinema: load("lexicon-cinema.json"),
  atmos: load("lexicon-atmos.json"),
  style: load("lexicon-style.json"),
};

const U = '["universal" as EngineTag]';
const MJF = '["MJ","SDXL","Flux"] as EngineTag[]';
const VIDMJF = '["MJ","SDXL","Flux","video"] as EngineTag[]';
const VID = '["video"] as EngineTag[]';

// Content category (uniform tags, optional weight) from a string array.
function content(id, label, source, arr, tags = U, weight = null) {
  const map = weight != null
    ? `.map((value) => ({ value, tags: ${tags}, weight: ${weight} }))`
    : `.map((value) => ({ value, tags: ${tags} }))`;
  const items = arr.map((v) => "      " + JSON.stringify(v)).join(",\n");
  return `  {\n    id: ${JSON.stringify(id)},\n    label: ${JSON.stringify(label)},\n    source: ${JSON.stringify(source)},\n    options: [\n${items}\n    ]${map},\n  },`;
}

const ctrlCat = (id, label, source, body, extra = "") =>
  `  {\n    id: ${JSON.stringify(id)},\n    label: ${JSON.stringify(label)},\n    source: ${JSON.stringify(source)},\n${body}\n  }${extra},`;

const controlCats = [
  // quality_booster — down-weighted, default off
  ctrlCat(
    "quality_booster",
    "Quality Booster (optional)",
    "agency",
    `    defaultOff: true,
    options: [
      "intricate detail", "sharp focus", "highly detailed", "fine craftsmanship",
      "photorealistic", "cinematic", "award-winning composition", "8k resolution",
      "ultra-detailed", "crisp lighting", "masterful", "richly textured",
    ].map((value) => ({ value, tags: ${U}, weight: 0.4 })),`,
  ),
  // aspect_ratio
  ctrlCat(
    "aspect_ratio",
    "Aspect Ratio",
    "backend",
    `    options: [
      { value: "1:1", tags: ${U} },
      { value: "16:9", tags: ${U} },
      { value: "9:16", tags: ${U} },
      { value: "4:3", tags: ${U} },
      { value: "21:9", tags: ${U} },
    ],`,
  ),
  // negative_prompt
  ctrlCat(
    "negative_prompt",
    "Negative Prompt (exclusions)",
    "crossref",
    `    options: [
      "motion blur", "extra fingers", "watermark", "low quality", "distorted face",
      "text artifacts", "deformed hands", "oversaturated", "plastic look", "cluttered",
      "harsh noise", "duplicate", "blurry", "jpeg artifacts", "disjointed",
    ].map((value) => ({ value, tags: ${MJF} })),`,
  ),
  // negative_space
  ctrlCat(
    "negative_space",
    "Negative Space / Minimalism",
    "agency",
    `    options: [
      "lots of empty sky", "centered subject", "minimal foreground", "vast emptiness",
      "isolated subject", "breathing room", "sparse background", "single focal point",
    ].map((value) => ({ value, tags: ${U} })),`,
  ),
  // prompt_weighting (advanced, default off)
  ctrlCat(
    "prompt_weighting",
    "Prompt Weighting (advanced)",
    "midjourney",
    `    defaultOff: true,
    options: [
      { value: "emphasize subject (::2)", tags: ["MJ","SDXL"] as EngineTag[], weight: 1 },
      { value: "soften background (::-1)", tags: ["MJ","SDXL"] as EngineTag[], weight: 1 },
      { value: "balanced (::1)", tags: ["MJ","SDXL"] as EngineTag[], weight: 1 },
      { value: "strong focus (1.3)", tags: ["SDXL"] as EngineTag[], weight: 1 },
      { value: "subtle (0.8)", tags: ["SDXL"] as EngineTag[], weight: 1 },
      { value: "exclude (::-0.5)", tags: ["MJ","SDXL"] as EngineTag[], weight: 1 },
    ],`,
  ),
  // stylize_mj
  ctrlCat(
    "stylize_mj",
    "Midjourney --stylize",
    "midjourney",
    `    defaultOff: true,
    options: [
      { value: "0", tags: ["MJ"] as EngineTag[] },
      { value: "50", tags: ["MJ"] as EngineTag[] },
      { value: "100", tags: ["MJ"] as EngineTag[] },
      { value: "250", tags: ["MJ"] as EngineTag[] },
      { value: "500", tags: ["MJ"] as EngineTag[] },
      { value: "1000", tags: ["MJ"] as EngineTag[] },
    ],`,
  ),
  // chaos_mj
  ctrlCat(
    "chaos_mj",
    "Midjourney --chaos",
    "midjourney",
    `    defaultOff: true,
    options: [
      { value: "0", tags: ["MJ"] as EngineTag[] },
      { value: "10", tags: ["MJ"] as EngineTag[] },
      { value: "25", tags: ["MJ"] as EngineTag[] },
      { value: "50", tags: ["MJ"] as EngineTag[] },
      { value: "100", tags: ["MJ"] as EngineTag[] },
    ],`,
  ),
  // guidance_flux
  ctrlCat(
    "guidance_flux",
    "Flux guidance (CFG)",
    "flux",
    `    defaultOff: true,
    options: [
      { value: "2", tags: ["Flux"] as EngineTag[] },
      { value: "3.5", tags: ["Flux"] as EngineTag[] },
      { value: "5", tags: ["Flux"] as EngineTag[] },
      { value: "7", tags: ["Flux"] as EngineTag[] },
    ],`,
  ),
  // video_motion
  ctrlCat(
    "video_motion",
    "Motion / Dynamics (video)",
    "video",
    `    options: [
      "slow drift", "sudden burst", "flowing water", "gentle sway", "rapid zoom",
      "orbiting", "collapsing", "blooming open", "fracture", "levitation",
      "cascading", "pulse",
    ].map((value) => ({ value, tags: ${VID} })),`,
  ),
  // video_camera (expanded from lexicon)
  content("video_camera", "Camera Movement (video)", "video", L.cinema.video_camera, VID),
  // video_duration
  ctrlCat(
    "video_duration",
    "Video Duration (param)",
    "seedance",
    `    defaultOff: true,
    options: [
      { value: "4s", tags: ${VID} },
      { value: "8s", tags: ${VID} },
      { value: "12s", tags: ${VID} },
    ],`,
  ),
];

const contentCats = [
  content("subject", "Subject", "agency", L.subj.subject),
  content("action", "Action / Pose", "agency", L.subj.action),
  content("setting", "Setting / Environment", "agency", L.env.setting),
  content("time_era", "Time / Era", "agency", L.env.time_era),
  content("time_of_day", "Time of Day", "agency", L.atmos.time_of_day),
  content("art_movement", "Art Movement / Style", "agency", L.art.art_movement),
  content("medium", "Medium / Material", "crossref", L.style.medium),
  content("artist_reference", "Artist / Style Reference", "agency", L.art.artist_reference, U, 1.6),
  content("lighting", "Lighting", "agency", L.atmos.lighting),
  content("camera_lens", "Camera / Lens", "midjourney", L.cinema.camera_lens, MJF),
  content("composition", "Composition / Framing", "agency", L.style.composition),
  content("color_palette", "Color Palette", "agency", L.style.color_palette),
  content("mood", "Mood / Atmosphere", "agency", L.atmos.mood),
  content("weather", "Weather / Atmosphere", "agency", L.atmos.weather),
  content("texture_detail", "Texture / Surface Detail", "crossref", L.style.texture_detail),
  content("render_engine", "Render Engine", "backend", L.cinema.render_engine, VIDMJF),
  content("film_stock", "Film Stock", "midjourney", L.cinema.film_stock, MJF),
  content("color_grade", "Color Grade", "crossref", L.style.color_grade),
];

const allCats = [...contentCats, ...controlCats].join("\n");

const file = `// Cappytool No.2 — Prompt Generator seed data store (AUTO-GENERATED by tools/build-criteria.mjs).
// Source-grounded in docs/research/prompt-generator/lexicon-*.json (researched via /research + /grounded-citations).
// Regenerate with: node tools/build-criteria.mjs  — do not hand-edit the CATEGORIES array.
//
// Provenance: every category carries the research brief it was synthesized from (SourceKey).
// Options are strings; \`weight\` biases the within-category draw (curated weighting: style refs up, generic boosters down).

export type EngineTag = "universal" | "MJ" | "Flux" | "Gemini" | "SDXL" | "video";

export type SourceKey =
  | "gemini"
  | "midjourney"
  | "seedance"
  | "flux"
  | "crossref"
  | "video"
  | "backend"
  | "agency";

export type CategoryId =
  | "subject"
  | "action"
  | "setting"
  | "time_era"
  | "time_of_day"
  | "art_movement"
  | "medium"
  | "artist_reference"
  | "lighting"
  | "camera_lens"
  | "composition"
  | "color_palette"
  | "mood"
  | "weather"
  | "texture_detail"
  | "render_engine"
  | "film_stock"
  | "color_grade"
  | "quality_booster"
  | "aspect_ratio"
  | "negative_prompt"
  | "negative_space"
  | "prompt_weighting"
  | "stylize_mj"
  | "chaos_mj"
  | "guidance_flux"
  | "video_motion"
  | "video_camera"
  | "video_duration";

export interface Option {
  value: string;
  tags: EngineTag[];
  /** Within-category draw bias. >1 up-weighted, <1 down-weighted. Default 1. */
  weight?: number;
}

export interface Category {
  id: CategoryId;
  label: string;
  /** Research brief this category was synthesized from. */
  source: SourceKey;
  options: Option[];
  /** When true, this category is opt-in (not in the default 4-5 pick). */
  defaultOff?: boolean;
}

export const CATEGORIES: Category[] = [
${allCats}
];

export const CATEGORY_BY_ID: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<CategoryId, Category>,
);

/** Categories offered by default in the 4-5 pick (the rest are opt-in toggles). */
export const DEFAULT_SELECTED: CategoryId[] = [
  "subject",
  "setting",
  "art_movement",
  "lighting",
  "mood",
];

export type Engine = "Gemini" | "Midjourney" | "Flux" | "SDXL" | "Video";

export const ENGINES: { id: Engine; label: string; isVideo: boolean }[] = [
  { id: "Gemini", label: "Gemini", isVideo: false },
  { id: "Midjourney", label: "Midjourney", isVideo: false },
  { id: "Flux", label: "Flux", isVideo: false },
  { id: "SDXL", label: "SDXL", isVideo: false },
  { id: "Video", label: "Video (Seedance/Runway/Kling)", isVideo: true },
];

/** Weighted draw within a category's options. */
export function weightedPick(options: Option[], rng: () => number = Math.random): Option {
  const weights = options.map((o) => Math.max(0.0001, o.weight ?? 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}
`;

fs.writeFileSync("src/lib/promptgen/criteria.ts", file, "utf8");

// Report counts.
const counts = {
  subject: L.subj.subject.length,
  action: L.subj.action.length,
  setting: L.env.setting.length,
  time_era: L.env.time_era.length,
  time_of_day: L.atmos.time_of_day.length,
  art_movement: L.art.art_movement.length,
  medium: L.style.medium.length,
  artist_reference: L.art.artist_reference.length,
  lighting: L.atmos.lighting.length,
  camera_lens: L.cinema.camera_lens.length,
  composition: L.style.composition.length,
  color_palette: L.style.color_palette.length,
  mood: L.atmos.mood.length,
  weather: L.atmos.weather.length,
  texture_detail: L.style.texture_detail.length,
  render_engine: L.cinema.render_engine.length,
  film_stock: L.cinema.film_stock.length,
  color_grade: L.style.color_grade.length,
};
const contentTotal = Object.values(counts).reduce((a, b) => a + b, 0);
console.log("Wrote src/lib/promptgen/criteria.ts");
console.log("Content categories:", Object.keys(counts).length, "| distinct content options:", contentTotal);
const d = ["subject", "setting", "art_movement", "lighting", "mood"].map((k) => counts[k]);
const defaultProduct = d.reduce((a, b) => a * b, 1);
console.log("Default 5-pick combination space:", defaultProduct.toLocaleString());
console.log("=> unique prompts reachable (lower bound):", defaultProduct > 100000 ? "EXCEEDS 100,000 ✅" : "BELOW TARGET ❌");
