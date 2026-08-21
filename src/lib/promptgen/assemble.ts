// Cappytool No.2 — Prompt assembler.
// Turns a selected pick-set into per-engine prompt strings.
// Grammar derived from docs/research/prompt-generator/taxonomy.md.

import {
  type CategoryId,
  type Engine,
  CATEGORY_BY_ID,
  weightedPick,
  defaultNegatives,
  honorsNegative,
  filterArtistForEngine,
  NEGATIVE_COUNT,
} from "./criteria";

/** A resolved pick: one option value per category id. */
export type PickSet = Partial<Record<CategoryId, string>>;

export interface AssembleOptions {
  /** The currently-selected engine (dropdown). Defaults to Gemini per product decision. */
  engine: Engine;
  /** When true, also assemble the video variant. */
  video?: boolean;
  /** Override the per-engine negative count (see NEGATIVE_COUNT). */
  negativeCount?: number;
  /**
   * Recommended pixel size for the chosen destination, e.g. "1080x1350".
   * SDXL takes width/height rather than a ratio, so this is the useful number
   * there; PickSet has no slot for pixels, hence an option.
   */
  px?: string;
  /** Locked seed for reproducibility; if omitted a fresh one is generated. */
  seed?: number;
  /**
   * Optional lead-in for chat-style generators (Gemini chat, Copilot, etc.) that
   * otherwise describe instead of generate. e.g. "Create an image of: ".
   * Appended verbatim before the assembled prompt.
   */
  prefix?: string;
}

/** Wrap a finished prompt with the optional chat-style force-generate lead-in. */
function withPrefix(prompt: string, opts: AssembleOptions): string {
  return opts.prefix ? `${opts.prefix} ${prompt}` : prompt;
}

const rng = Math.random;

/** Pick one option per selected category using curated weighting. */
export function buildPickSet(
  selected: CategoryId[],
  pick: (opts: { value: string; tags: string[]; weight?: number }[]) => { value: string } = weightedPick as never,
): PickSet {
  const set: PickSet = {};
  for (const id of selected) {
    const cat = CATEGORY_BY_ID[id];
    if (!cat) continue;
    const chosen = (pick as typeof weightedPick)(cat.options, rng);
    set[id] = chosen.value;
  }
  return set;
}

export function generateSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

function join(parts: (string | undefined | false)[]): string {
  const s = parts
    .filter(Boolean)
    .join(" ")
    .replace(/\s+\.\s+/g, ". ") // flush " . " -> ". " but leave decimals like 1.1 alone
    .replace(/\s+,/g, ",") // flush "word , clause" -> "word, clause"
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/** Indefinite article that picks "a"/"an" by leading sound. */
function art(v: string): string {
  return /^[aeiou]/i.test(v.trim()) ? `an ${v.trim()}` : `a ${v.trim()}`;
}

/**
 * Resolve the negative clause for an engine.
 * - Flux: no negative support → always empty.
 * - User override (set.negative_prompt) wins if present.
 * - Otherwise use the per-engine default list (see NEGATIVES_BY_ENGINE),
 *   capped at `count` items.
 */
function resolveNegatives(set: PickSet, engine: Engine, count?: number): string {
  if (!honorsNegative(engine)) return "";
  const limit = count ?? NEGATIVE_COUNT[engine];
  const override = set.negative_prompt?.split(",").map((s) => s.trim()).filter(Boolean);
  const source = override && override.length ? override : defaultNegatives(engine);
  return source.slice(0, limit).join(", ");
}

export interface Assembled {
  engine: Engine;
  prompt: string;
  seed: number;
  isVideo: boolean;
}

/** Assemble a single-engine prompt from a pick-set. */
export function assemble(set: PickSet, opts: AssembleOptions): Assembled {
  const seed = opts.seed ?? generateSeed();
  const isVideo = opts.engine === "Video" || !!opts.video;

  // Drop living-artist references for engines that block them (Gemini, Video).
  const effSet: PickSet = {
    ...set,
    artist_reference: filterArtistForEngine(set.artist_reference, opts.engine),
  };

  switch (opts.engine) {
    case "Gemini":
      return { engine: "Gemini", seed, isVideo, prompt: withPrefix(toGemini(effSet, opts.engine), opts) };
    case "Midjourney":
      return { engine: "Midjourney", seed, isVideo, prompt: withPrefix(toMidjourney(effSet, opts.negativeCount, opts.engine), opts) };
    case "Flux":
      return { engine: "Flux", seed, isVideo, prompt: withPrefix(toFlux(effSet), opts) };
    case "SDXL":
      return { engine: "SDXL", seed, isVideo, prompt: withPrefix(toSDXL(effSet, opts.negativeCount, opts.engine, opts.px), opts) };
    case "Video":
      return { engine: "Video", seed, isVideo: true, prompt: withPrefix(toVideo(effSet, opts.negativeCount, opts.engine), opts) };
  }
}

/** Gemini: LLM prose + semantic (positive) negatives. Narrative sentence(s). */
function toGemini(set: PickSet, engine: Engine): string {
  const subject = set.subject ?? "a solitary figure";
  const action = set.action ? `, ${set.action}` : "";
  const setting = set.setting ? `in ${set.setting}` : "";
  const time = set.time_era ? `, set in a ${set.time_era} world` : "";
  const medium = set.medium ? `, rendered as ${art(set.medium)}` : "";
  const artist = set.artist_reference ? `, ${set.artist_reference}` : "";
  const movement = set.art_movement ? `, ${set.art_movement} aesthetic` : "";
  const lighting = set.lighting ? `, lit by ${set.lighting}` : "";
  const camera = set.camera_lens ? `, shot on ${set.camera_lens}` : "";
  const composition = set.composition ? `, ${set.composition} composition` : "";
  const color = set.color_palette ? `, with ${art(set.color_palette)} palette` : "";
  const weather = set.weather ? `, under ${set.weather} conditions` : "";
  const texture = set.texture_detail ? `, with ${set.texture_detail} surfaces` : "";
  const timeOfDay = set.time_of_day ? `, during ${set.time_of_day}` : "";
  const render = set.render_engine ? `, rendered in ${set.render_engine}` : "";
  const stock = set.film_stock ? `, on ${set.film_stock}` : "";
  const grade = set.color_grade ? `, with a ${set.color_grade} grade` : "";
  const boos = set.quality_booster ? `, ${set.quality_booster}` : "";

  // Leading article has to agree with the mood adjective ("An ethereal scene",
  // not "A ethereal scene"), so route it through art() and re-capitalise.
  const lead = art(`${set.mood ?? "quiet"} scene`);

  const scene = join([
    `${lead.charAt(0).toUpperCase()}${lead.slice(1)} of ${subject}${action} ${setting}${time}${timeOfDay}`,
    `${medium}${artist}${movement}${lighting}${camera}${composition}${color}${weather}${texture}${render}${stock}${grade}${boos}.`,
  ]);

  // Gemini has no negatives field, so exclusions ride inline as a short clause.
  // Goes through resolveNegatives like every other dialect, which is what makes
  // the researched per-engine default list apply when there is no override.
  const list = resolveNegatives(set, engine);
  const negs = list ? ` Avoid ${list}.` : "";

  const ar = set.aspect_ratio ? ` Aspect ratio ${set.aspect_ratio}.` : "";
  return (scene + negs + ar).replace(/\s+/g, " ").trim();
}

/** Midjourney: short keyword phrases + suffix params. */
function toMidjourney(set: PickSet, negCount: number | undefined, engine: Engine): string {
  const phrase = join([
    set.subject,
    set.action,
    set.setting,
    set.time_era,
    set.time_of_day,
    set.medium,
    set.art_movement,
    set.artist_reference,
    set.lighting,
    set.camera_lens,
    set.render_engine,
    set.film_stock,
    set.composition,
    set.color_palette,
    set.color_grade,
    set.mood,
    set.weather,
    set.texture_detail,
    set.negative_space,
    set.quality_booster,
  ]);
  // ONE --no: Midjourney honours a single flag, and it reads every word in it
  // independently, so multi-word phrases backfire ("--no modern clothing" is
  // parsed as no-modern AND no-clothing). negative_space values are phrases
  // ("lots of empty sky"), so they stay in the positive text above rather than
  // being fed to --no.
  const negs = resolveNegatives(set, engine, negCount);
  const params = join([
    set.aspect_ratio ? `--ar ${set.aspect_ratio}` : "",
    set.stylize_mj ? `--s ${set.stylize_mj}` : "--s 100",
    set.chaos_mj ? `--c ${set.chaos_mj}` : "",
    negs ? `--no ${negs}` : "",
  ]);
  return join([phrase, params]);
}

/** Flux: natural-language, subject-first, emphasis via word order (no parentheses). */
function toFlux(set: PickSet): string {
  const subject = set.subject ?? "a solitary figure";
  const action = set.action ? ` (${set.action})` : "";
  const setting = set.setting ? ` ${set.setting}.` : "";
  const lighting = set.lighting ? ` ${set.lighting} lighting.` : "";
  const medium = set.medium ? ` ${set.medium}` : "";
  const movement = set.art_movement ? `, ${set.art_movement} style` : "";
  const artist = set.artist_reference ? `, ${set.artist_reference}` : "";
  const camera = set.camera_lens ? `, ${set.camera_lens}` : "";
  const composition = set.composition ? `, ${set.composition}` : "";
  const color = set.color_palette ? `. ${set.color_palette} palette` : "";
  const mood = set.mood ? `. ${set.mood} atmosphere` : "";
  const weather = set.weather ? `. ${set.weather}` : "";
  const texture = set.texture_detail ? `. ${set.texture_detail} detail` : "";
  const timeOfDay = set.time_of_day ? `. ${set.time_of_day}` : "";
  const render = set.render_engine ? `, ${set.render_engine}` : "";
  const stock = set.film_stock ? `. ${set.film_stock}` : "";
  const grade = set.color_grade ? `. ${set.color_grade} grade` : "";
  const boos = set.quality_booster ? `. ${set.quality_booster}` : "";
  const guidance = set.guidance_flux ? ` [guidance ${set.guidance_flux}]` : "";
  // Flux takes the frame as an API param, same bracket convention as guidance.
  const aspect = set.aspect_ratio ? ` [aspect ${set.aspect_ratio}]` : "";
  return join([
    `${subject}${action}.${setting}${lighting}${medium}${movement}${artist}${camera}${composition}${color}${mood}${weather}${texture}${timeOfDay}${render}${stock}${grade}${boos}${guidance}${aspect}`,
  ]);
}

/** SDXL: weighted-keyword + separate negative field. */
function toSDXL(set: PickSet, negCount: number | undefined, engine: Engine, px?: string): string {
  const pos = join([
    set.subject,
    set.action,
    set.setting,
    set.medium,
    set.art_movement,
    set.artist_reference,
    set.lighting ? `(${set.lighting.replace(/\s+/g, " ")}:1.1)` : "",
    set.camera_lens,
    set.composition,
    set.color_palette,
    set.mood,
    set.weather,
    set.texture_detail,
    set.time_of_day,
    set.render_engine,
    set.film_stock,
    set.color_grade,
    set.quality_booster,
  ]);
  const negs = resolveNegatives(set, engine, negCount);
  // SDXL is driven by width/height, not a ratio string, so the destination's
  // pixel figure is the useful number to hand over.
  return join([pos, px ? `### SIZE: ${px}` : "", negs ? `### NEGATIVE: ${negs}` : ""]);
}

/** Video (Seedance/Runway/Kling): director's formula; first words weighted. */
function toVideo(set: PickSet, negCount: number | undefined, engine: Engine): string {
  const camera = set.video_camera ? `${set.video_camera} shot of` : "shot of";
  const subject = set.subject ?? "a solitary figure";
  const action = set.action ? ` ${set.action}` : "";
  const setting = set.setting ? ` in ${set.setting}` : "";
  const lighting = set.lighting ? `. ${set.lighting} lighting` : "";
  const styleParts = [
    set.art_movement ? `${set.art_movement} style` : "",
    set.medium ?? "",
    set.artist_reference ?? "",
    set.render_engine ?? "",
    set.film_stock ? `${set.film_stock} look` : "",
  ].filter(Boolean);
  const style = styleParts.length ? `. ${styleParts.join(", ")}` : "";
  const grade = set.color_grade ? `. ${set.color_grade} grade` : "";
  const motion = set.video_motion ? `. ${set.video_motion}` : "";
  const duration = set.video_duration ? ` [duration ${set.video_duration}]` : "";
  // Video dialects take the frame as a param, same bracket style as duration.
  const aspect = set.aspect_ratio ? ` [aspect ${set.aspect_ratio}]` : "";
  const negs = resolveNegatives(set, engine, negCount);
  const sentence = join([
    `${camera} ${subject}${action}${setting}`,
    lighting,
    style,
    grade,
    motion,
    duration,
    aspect,
  ]);
  return join([sentence.endsWith(".") ? sentence : `${sentence}.`, negs ? `Avoid: ${negs}.` : ""]);
}
