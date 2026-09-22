/**
 * The lexicon — the actual product.
 *
 * Anchors are hand-tuned mood entries; synonyms are DERIVED from anchors with
 * small deterministic tweaks, never authored independently (one truth per
 * mood family). This module ships the bootstrap set grown across the tuning
 * sessions — 31 anchors covering warm/cold/festive/fresh, rainy/night and
 * pastel moods. Lexicon tuning happens in the standalone `capytone/` repo's
 * studio, never in the shipped suite.
 *
 * Matching: tokenize the phrase, score every anchor by exact keyword hits,
 * substring hits and token overlap; below threshold → guarded random.
 */

export interface AnchorEntry {
  id: string;
  /** Extra phrases that route here ("hearth", "warm blanket"). Not colors —
   *  the palette always comes from the anchor's own parameters. */
  keywords?: string[];
  /** Oklch hue degrees for this mood's sector. */
  hueAnchors: number[];
  /** Allowed chroma range [min, max] for large fields. */
  chromaRange: [number, number];
  /** Lightness landmarks: dark bg / mid / light surface. */
  lightnessCurve: [number, number, number];
  /** Grain tendency 0..1. */
  grain: number;
  /** Ground-truth hexes in role order: bg / mid / accent / surface / ink. */
  blessed: [string, string, string, string, string];
}

export interface SynonymEntry {
  /** Anchor this derives from. */
  ref: string;
  /** Deterministic tweaks applied on top of the anchor. */
  tweak?: {
    lightnessShift?: number;
    chromaScale?: number;
    grainDelta?: number;
  };
}

export interface Lexicon {
  anchors: Record<string, AnchorEntry>;
  synonyms: Record<string, SynonymEntry>;
}

/** The full anchor set: Phase 1 fixtures + every later tuning session. */
export const BOOTSTRAP_LEXICON: Lexicon = {
  anchors: {
    "cozy-autumn-morning": {
      id: "cozy-autumn-morning",
      keywords: ["warm blanket", "morning coffee", "steam", "kitchen light"],
      hueAnchors: [55, 38],
      chromaRange: [0.05, 0.11],
      lightnessCurve: [0.24, 0.62, 0.91],
      grain: 0.35,
      blessed: ["#2B1D16", "#8C5A3C", "#C98F5E", "#E8CBA8", "#F5EBDD"],
    },
    // Scene: dark room, hearth burning. Charred oak, ember orange-red,
    // firelight cream on lamp-warm walls.
    "fireside-night": {
      id: "fireside-night",
      keywords: ["hearth", "fireplace", "embers", "campfire", "log fire"],
      hueAnchors: [45, 30],
      chromaRange: [0.05, 0.12],
      lightnessCurve: [0.2, 0.58, 0.9],
      grain: 0.4,
      blessed: ["#1A0F0A", "#7A3E22", "#D96C3A", "#F2D9B8", "#FAEBDA"],
    },
    // Scene: slow Sunday baking — LIGHT field. Parchment, butter crust,
    // milk glass, espresso-dark ink.
    "vanilla-sunday": {
      id: "vanilla-sunday",
      keywords: ["baking", "sunday morning", "vanilla", "butter", "slow sunday"],
      hueAnchors: [80, 65],
      chromaRange: [0.04, 0.085],
      lightnessCurve: [0.92, 0.82, 0.97],
      grain: 0.28,
      blessed: ["#F3E9D6", "#D9BE93", "#A67B3F", "#FDFAF2", "#40301E"],
    },
    // Scene: corner cafe, cinnamon-dusted latte, walnut counter, window light.
    "cinnamon-cafe": {
      id: "cinnamon-cafe",
      keywords: ["cafe", "latte", "cinnamon", "coffee shop", "espresso"],
      hueAnchors: [50, 35],
      chromaRange: [0.06, 0.115],
      lightnessCurve: [0.23, 0.6, 0.89],
      grain: 0.33,
      blessed: ["#241611", "#8A5A38", "#CE8352", "#E9CDAA", "#FBF0DF"],
    },
    // Scene: 4pm sun through honey curtains, dust motes, golden warmth.
    "honeyed-afternoon": {
      id: "honeyed-afternoon",
      keywords: ["honey", "golden hour", "lazy afternoon", "sun through curtains"],
      hueAnchors: [85, 75],
      chromaRange: [0.06, 0.13],
      lightnessCurve: [0.22, 0.6, 0.9],
      grain: 0.3,
      blessed: ["#221708", "#B08432", "#DBA83E", "#F4E3BC", "#FCF3DE"],
    },
    "rainy-tuesday": {
      id: "rainy-tuesday",
      keywords: ["wet streets", "umbrella weather", "grey rain", "city drizzle"],
      hueAnchors: [210, 190],
      chromaRange: [0.04, 0.09],
      lightnessCurve: [0.26, 0.55, 0.86],
      grain: 0.45,
      blessed: ["#232B30", "#4E6570", "#8FB3AD", "#AFC4BF", "#E4ECEA"],
    },
    // Scene: dawn over a frosted meadow — LIGHT field. Rime-white grass,
    // pale blue shadow, slate-dark fence post ink.
    "first-frost": {
      id: "first-frost",
      keywords: ["frost", "rime", "cold dawn", "icy morning"],
      hueAnchors: [255, 235],
      chromaRange: [0.02, 0.055],
      lightnessCurve: [0.92, 0.84, 0.97],
      grain: 0.22,
      blessed: ["#E9EDF2", "#C9D3DE", "#7A8CA6", "#F7FAFC", "#232B36"],
    },
    // Scene: polar night — snowfield under starlight. Deep indigo field,
    // steel-blue mid, pale ice accent.
    "arctic-night": {
      id: "arctic-night",
      keywords: ["polar night", "moonlit snow", "midnight winter"],
      hueAnchors: [270, 285],
      chromaRange: [0.04, 0.09],
      lightnessCurve: [0.18, 0.45, 0.8],
      grain: 0.35,
      blessed: ["#10131F", "#3A4763", "#8FA3C8", "#C7D3E6", "#EAEFF7"],
    },
    // Scene: sea fog swallowing a harbour — MID-TONE, ultra-low chroma.
    // Wet stone, pale rope, a kelp-green whisper. The muddy-palette stress test.
    "coastal-fog": {
      id: "coastal-fog",
      keywords: ["sea mist", "harbour", "misty morning", "fog"],
      hueAnchors: [195, 175],
      chromaRange: [0.015, 0.045],
      lightnessCurve: [0.62, 0.72, 0.9],
      grain: 0.5,
      blessed: ["#C9CFCC", "#A8B3AE", "#5F7A72", "#E8EBE9", "#2A3330"],
    },
    // Scene: glacial meltwater over dark stones — cyan-slate, clear and cold.
    "alpine-stream": {
      id: "alpine-stream",
      keywords: ["glacier", "meltwater", "icy water", "snowmelt"],
      hueAnchors: [210, 195],
      chromaRange: [0.06, 0.11],
      lightnessCurve: [0.2, 0.52, 0.88],
      grain: 0.3,
      blessed: ["#131C21", "#3E5A66", "#6FA5B2", "#C2D8DD", "#ECF4F6"],
    },
    // Scene: storm front at dusk — near-black slate-violet, rain-hazed
    // streetlights, one electric pale moment.
    "thunderstorm": {
      id: "thunderstorm",
      keywords: ["storm", "summer storm", "rolling thunder", "storm front"],
      hueAnchors: [285, 300],
      chromaRange: [0.04, 0.085],
      lightnessCurve: [0.17, 0.42, 0.78],
      grain: 0.4,
      blessed: ["#14121F", "#39364F", "#8B87B0", "#C9C6DC", "#ECEBF3"],
    },
    // Scene: first rain on a hot dusty road — wet earth, crushed leaves,
    // steam rising. Warm-dark olive-brown.
    "petrichor": {
      id: "petrichor",
      keywords: ["rain on dry earth", "after the rain", "wet garden"],
      hueAnchors: [95, 70],
      chromaRange: [0.04, 0.09],
      lightnessCurve: [0.22, 0.52, 0.85],
      grain: 0.42,
      blessed: ["#1D1B10", "#4A4A2A", "#7F8B4E", "#CBD1A8", "#EFF1DE"],
    },
    // Scene: peak monsoon — drenched palm black-green, wet slate roads,
    // steel-blue shower clouds, foam-white runnels. Green sliding into blue.
    "monsoon": {
      id: "monsoon",
      keywords: ["monsoon season", "monsoon rains", "rainy season"],
      hueAnchors: [195, 172],
      chromaRange: [0.05, 0.1],
      lightnessCurve: [0.19, 0.47, 0.84],
      grain: 0.46,
      blessed: ["#0F1E1C", "#275B54", "#4E93A6", "#BFDCDC", "#EAF4F2"],
    },
    // Scene: watching rain under a streetlamp after midnight — deep
    // blue-teal dark, wet asphalt sheen.
    "night-rain": {
      id: "night-rain",
      keywords: ["midnight rain", "rain on the window", "sleepless"],
      hueAnchors: [230, 215],
      chromaRange: [0.05, 0.1],
      lightnessCurve: [0.16, 0.4, 0.76],
      grain: 0.45,
      blessed: ["#0E141B", "#28425A", "#5E88A6", "#A9C6D6", "#E3EEF4"],
    },
    // Scene: the library after closing — one desk lamp, indigo dusk through
    // tall windows, spines in shadow.
    "late-library": {
      id: "late-library",
      keywords: ["night study", "reading late", "quiet hours"],
      hueAnchors: [265, 250],
      chromaRange: [0.04, 0.08],
      lightnessCurve: [0.18, 0.44, 0.82],
      grain: 0.35,
      blessed: ["#131122", "#33305A", "#6C68A0", "#B7B4D4", "#E8E7F2"],
    },
    // Scene: a grey Sunday with nowhere to be — pale silver light,
    // concrete-and-linen neutrals. LIGHT-field grey stress case.
    "overcast-saturday": {
      id: "overcast-saturday",
      keywords: ["grey day", "cloudy saturday", "slow grey morning"],
      hueAnchors: [245, 230],
      chromaRange: [0.008, 0.03],
      lightnessCurve: [0.88, 0.78, 0.96],
      grain: 0.38,
      blessed: ["#DDDEE1", "#C0C3CA", "#83899A", "#F4F5F7", "#262A33"],
    },
    // Scene: brass under stage light — see original. Extended keywords.
    "brass-band-evening": {
      id: "brass-band-evening",
      keywords: ["big band", "live jazz", "horn section", "stage light"],
      hueAnchors: [70, 45],
      chromaRange: [0.07, 0.14],
      lightnessCurve: [0.22, 0.58, 0.9],
      grain: 0.3,
      blessed: ["#24170E", "#96682E", "#D9A441", "#EBCF9C", "#F7EDDC"],
    },
    // Scene: Diwali night — oil lamps on dark verandas, marigold garlands,
    // spark-sparks of gold in the deep. Warmest, brightest festive anchor.
    "diwali-lights": {
      id: "diwali-lights",
      keywords: ["festival of lights", "diya", "fairy lights", "lanterns"],
      hueAnchors: [75, 60],
      chromaRange: [0.09, 0.15],
      lightnessCurve: [0.17, 0.55, 0.88],
      grain: 0.32,
      blessed: ["#1C1004", "#8A5A14", "#E8A81E", "#FFD98A", "#FFF3D6"],
    },
    // Scene: carnival at full spin — candy-red booth stripes, bubblegum
    // pink, warm bulb glow over asphalt.
    "carnival-night": {
      id: "carnival-night",
      keywords: ["funfair", "carousel", "fairground", "ferris wheel"],
      hueAnchors: [25, 350],
      chromaRange: [0.1, 0.16],
      lightnessCurve: [0.19, 0.52, 0.86],
      grain: 0.3,
      blessed: ["#230B10", "#8E2F42", "#E0576B", "#F5AE9C", "#FFE9DE"],
    },
    // Scene: confetti mid-air — paper scraps catching club light, magenta
    // and electric blue against a dark room.
    "confetti-pop": {
      id: "confetti-pop",
      keywords: ["party", "celebration", "new year's eve", "confetti"],
      hueAnchors: [330, 260],
      chromaRange: [0.11, 0.16],
      lightnessCurve: [0.2, 0.5, 0.85],
      grain: 0.28,
      blessed: ["#17091A", "#5A2470", "#C74FA8", "#8FB7E8", "#EDDDF4"],
    },
    // Scene: harvest festival afternoon — pumpkin stacks, corn husks,
    // cider, bunting in wind. Daylight festive, amber-forward.
    "harvest-fair": {
      id: "harvest-fair",
      keywords: ["autumn fair", "farmers market", "pumpkin patch", "bunting"],
      hueAnchors: [60, 40],
      chromaRange: [0.08, 0.14],
      lightnessCurve: [0.23, 0.56, 0.89],
      grain: 0.31,
      blessed: ["#211507", "#7E5416", "#C68A2B", "#EBC689", "#FBF0DB"],
    },
    // Scene: sakura in late-March sun — pale petal pink, branch-silhouette
    // ink, soft cream sky. The signature pastel.
    "cherry-blossom": {
      id: "cherry-blossom",
      keywords: ["sakura", "blossom season", "hanami", "spring bloom"],
      hueAnchors: [20, 350],
      chromaRange: [0.03, 0.06],
      lightnessCurve: [0.93, 0.84, 0.97],
      grain: 0.22,
      blessed: ["#FBEDF0", "#F2CDD5", "#D98A9E", "#FDF7F4", "#4A2C33"],
    },
    // Scene: a newborn's room in morning light — powder blue, cream wool,
    // the palest warm white. Quietest anchor in the lexicon.
    "baby-blanket": {
      id: "baby-blanket",
      keywords: ["nursery", "newborn", "powder blue", "lullaby"],
      hueAnchors: [230, 250],
      chromaRange: [0.02, 0.045],
      lightnessCurve: [0.92, 0.86, 0.98],
      grain: 0.18,
      blessed: ["#EAF0F6", "#D3DEEA", "#A8BDD3", "#FAFCFE", "#39434F"],
    },
    // Scene: dusk haze over lavender rows — purple mist, silver-green
    // foliage, honeyed last light on the far hill.
    "lavender-haze": {
      id: "lavender-haze",
      keywords: ["lavender field", "provence", "purple dusk"],
      hueAnchors: [300, 285],
      chromaRange: [0.04, 0.075],
      lightnessCurve: [0.88, 0.78, 0.95],
      grain: 0.24,
      blessed: ["#F1EAF4", "#DFCFE8", "#B493C8", "#FBF6EF", "#463A50"],
    },
    // Scene: first peach of the day — skin-warm apricot light, cream and
    // rosewater, one deeper coral moment.
    "peach-morning": {
      id: "peach-morning",
      keywords: ["apricot dawn", "soft sunrise", "rosewater"],
      hueAnchors: [45, 30],
      chromaRange: [0.035, 0.07],
      lightnessCurve: [0.92, 0.83, 0.97],
      grain: 0.2,
      blessed: ["#FBF0E5", "#F6DAC2", "#EBA47E", "#FEFAF5", "#55372A"],
    },
    // Scene: sea foam on pale sand — the greenest pastel, barely-there
    // aqua over shell cream.
    "sea-foam": {
      id: "sea-foam",
      keywords: ["foam", "tide pool", "pale aqua", "coastal morning"],
      hueAnchors: [170, 155],
      chromaRange: [0.03, 0.06],
      lightnessCurve: [0.91, 0.84, 0.97],
      grain: 0.22,
      blessed: ["#ECF5F0", "#D2E7DC", "#96C4AE", "#F8FCFA", "#33473D"],
    },
    // Scene: eucalyptus canopy — see original. Extended keywords.
    "eucalyptus-light": {
      id: "eucalyptus-light",
      keywords: ["gum trees", "bushland", "sage air"],
      hueAnchors: [140, 120],
      chromaRange: [0.05, 0.1],
      lightnessCurve: [0.25, 0.6, 0.92],
      grain: 0.25,
      blessed: ["#1E2620", "#5F7A5D", "#A3B18A", "#CBD5C0", "#EEF2E6"],
    },
    // Scene: April meadow at noon — LIGHT field. New grass, daisy-white
    // foam, buttercup dot, rich loam ink.
    // TUNING NOTE: accent drifts olive-mustard at some seeds; should bias
    // toward fresh grass-green (raise chromaRange floor, narrow wander).
    "spring-meadow": {
      id: "spring-meadow",
      keywords: ["meadow", "fresh grass", "april field", "wildflowers"],
      hueAnchors: [130, 110],
      chromaRange: [0.06, 0.11],
      lightnessCurve: [0.9, 0.78, 0.96],
      grain: 0.24,
      blessed: ["#E7EDD8", "#C3D6A0", "#6F9448", "#F6FAEC", "#2A3520"],
    },
    // Scene: deep moss on a forest boulder — saturated cushion green,
    // damp bark mid, mist-light surface.
    "moss-carpet": {
      id: "moss-carpet",
      keywords: ["moss", "forest floor", "old growth", "woodland"],
      hueAnchors: [135, 145],
      chromaRange: [0.06, 0.12],
      lightnessCurve: [0.21, 0.5, 0.86],
      grain: 0.38,
      blessed: ["#141F14", "#31502C", "#5F8B4E", "#BCCBA4", "#EBF1DF"],
    },
    // Scene: tree-fern gully, shaded ravine — near-black humus base, vivid
    // yellow-green fronds catching light shafts. Deliberately distinct from
    // monsoon's teal gradient: this is dark + lively chartreuse.
    "fern-gully": {
      id: "fern-gully",
      keywords: ["ferns", "ravine", "rainforest floor", "tree fern"],
      hueAnchors: [125, 105],
      chromaRange: [0.07, 0.13],
      lightnessCurve: [0.16, 0.42, 0.8],
      grain: 0.36,
      blessed: ["#10150A", "#3D5220", "#7FA33C", "#C9DCA0", "#EFF4E2"],
    },
    // Scene: bamboo grove after rain — pale celadon culms, cool green
    // filter light. Light-mid composition, calm and airy.
    "bamboo-grove": {
      id: "bamboo-grove",
      keywords: ["bamboo", "celadon", "grove walk"],
      hueAnchors: [150, 165],
      chromaRange: [0.04, 0.085],
      lightnessCurve: [0.72, 0.62, 0.94],
      grain: 0.26,
      blessed: ["#C6D8C6", "#93B295", "#3F7355", "#EDF4EC", "#1E2B22"],
    },
  },
  synonyms: {
    hygge: { ref: "cozy-autumn-morning", tweak: { lightnessShift: 0.03 } },
    snug: { ref: "cozy-autumn-morning", tweak: { chromaScale: 0.85 } },
    drizzle: { ref: "rainy-tuesday", tweak: { lightnessShift: -0.02 } },
    "sweater weather": { ref: "cozy-autumn-morning" },
    brass: { ref: "brass-band-evening", tweak: { chromaScale: 1.15 } },
    gumtrees: { ref: "eucalyptus-light", tweak: { grainDelta: 0.05 } },
  },
};

const STOP_WORDS = new Set(["the", "a", "an", "of", "and", "in", "on", "with", "for"]);

/** Lowercase, strip punctuation, drop stop words. */
export function tokenize(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

export interface MatchResult {
  entry: AnchorEntry;
  /** Effective tweaks after synonym derivation. */
  tweak: NonNullable<SynonymEntry["tweak"]>;
  /** How the match was made — drives the fallback note in the UI. */
  viaSynonym: boolean;
  score: number;
}

/**
 * Resolve a free-text phrase to its nearest curated entry.
 * `matchedPhrase` is the canonical form that matched ("hygge", not "hyggely").
 */
export function resolveMood(
  phrase: string,
  lexicon: Lexicon = BOOTSTRAP_LEXICON,
): { result: MatchResult | null; matchedPhrase: string | null } {
  const tokens = tokenize(phrase);
  if (!tokens.length) return { result: null, matchedPhrase: null };
  const normalized = tokens.join(" ");

  interface Candidate {
    result: MatchResult;
    matched: string;
  }

  /** Pure scorer — no closure state, so TS narrowing stays intact. */
  const scoreCandidate = (
    key: string,
    viaSynonym: boolean,
    refId: string,
    tweak: NonNullable<SynonymEntry["tweak"]>,
  ): Candidate | null => {
    const entry = lexicon.anchors[refId];
    if (!entry) return null;
    let score = 0;
    let matched = "";
    if (key === normalized) {
      score = 100;
      matched = normalized;
    } else if (normalized.includes(key)) {
      score = 70 + key.length;
      matched = key;
    } else {
      const keyTokens = tokenize(key);
      const overlap = keyTokens.filter((k) => tokens.includes(k)).length;
      if (!overlap) return null;
      score = (overlap / Math.max(keyTokens.length, tokens.length)) * 50;
      matched = keyTokens.filter((k) => tokens.includes(k)).join(" ");
    }
    return { result: { entry, tweak, viaSynonym, score }, matched };
  };

  // Collect candidates in-scope, then reduce.
  const candidates: Candidate[] = [];
  for (const [id, anchor] of Object.entries(lexicon.anchors)) {
    const keys = [id, ...(anchor.keywords ?? [])];
    for (const key of keys) {
      const c = scoreCandidate(key, false, id, {});
      if (c) candidates.push(c);
    }
  }
  for (const [syn, s] of Object.entries(lexicon.synonyms)) {
    const c = scoreCandidate(syn, true, s.ref, s.tweak ?? {});
    if (c) candidates.push(c);
  }
  const best = candidates.reduce<Candidate | null>(
    (acc, c) => (!acc || c.result.score > acc.result.score ? c : acc),
    null,
  );

  if (!best || best.result.score < 30) return { result: null, matchedPhrase: null };
  return { result: best.result, matchedPhrase: best.matched };
}
