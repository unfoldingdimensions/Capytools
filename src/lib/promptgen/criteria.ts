// Cappytool No.2 — Prompt Generator seed data store. HAND-MAINTAINED: edit here.
//
// The 18 content categories were originally generated from
// docs/research/prompt-generator/lexicon-*.json; that generator now lives at
// tools/archive/build-criteria.mjs and MUST NOT be run — it rewrites this file
// whole and knows nothing about the tiers, presets or per-engine research below.
//
// Provenance for everything past the CATEGORIES array is cited inline against
// docs/research/prompt-generator/*.json. Findings flagged `unverified` there are
// flagged here too; do not present them to the reader as fact.
//
// Provenance: every category carries the research brief it was synthesized from (SourceKey).
// Options are strings; `weight` biases the within-category draw (curated weighting: style refs up, generic boosters down).

export type EngineTag = "universal" | "MJ" | "Flux" | "Gemini" | "SDXL" | "video";

export type SourceKey =
  | "gemini"
  | "midjourney"
  | "seedance"
  | "flux"
  | "crossref"
  | "video"
  | "runway"
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
  {
    id: "subject",
    label: "Subject",
    source: "agency",
    options: [
      "blacksmith",
      "archivist",
      "diplomat",
      "wandering cartographer",
      "lighthouse keeper",
      "apothecary",
      "beekeeper",
      "toymaker",
      "gravedigger",
      "quartermaster",
      "astronomer",
      "falconer",
      "alchemist",
      "midwife",
      "clockmaker",
      "ferryman",
      "taxidermist",
      "botanist",
      "chimney sweep",
      "glassblower",
      "kitsune",
      "tengu",
      "thunderbird",
      "naga",
      "ghoul",
      "djinn",
      "vila",
      "leshy",
      "domovoy",
      "baba yaga",
      "ninki nanka",
      "kongamato",
      "rakshasa",
      "vetala",
      "alkonost",
      "sirin",
      "gamayun",
      "poludnitsa",
      "vukodlak",
      "minotaur",
      "medusa",
      "hydra",
      "sphinx",
      "cyclops",
      "echidna",
      "manticore",
      "wendigo",
      "peri",
      "mantis shrimp",
      "koi dragon",
      "nine tailed fox",
      "junkyard kraken",
      "moon jellyfish",
      "shadow stag",
      "bone collector",
      "paper lantern spirit",
      "red fox",
      "arctic owl",
      "pangolin",
      "axolotl",
      "narwhal",
      "snow leopard",
      "thorny devil",
      "leafcutter ant",
      "peacock spider",
      "naked mole rat",
      "quetzal bird",
      "sea turtle",
      "musk ox",
      "capybara",
      "renegade android",
      "companion droid",
      "sentinel unit",
      "salvage robot",
      "clockwork automaton",
      "holographic guide",
      "warforged soldier",
      "rogue ai construct",
      "repair mech",
      "porcelain android",
      "forest spirit",
      "water nymph",
      "fire elemental",
      "storm elemental",
      "will o wisp",
      "mountain spirit",
      "river spirit",
      "dawn spirit",
      "ash elemental",
      "frost wraith",
      "the talking clock",
      "the weeping lighthouse",
      "the wandering violin",
      "the forgotten typewriter",
      "the lonely vending machine",
      "the sleeping library",
      "the broken compass",
      "the humming telegraph",
      "the patient anvil",
      "the whispering mirror",
      "memory",
      "silence",
      "gravity",
      "entropy",
      "fortune",
      "decay",
      "vertigo",
      "nostalgia",
      "insomnia",
      "serendipity",
      "forgotten time",
      "neon confessor",
      "ash covered pilgrim",
      "glass winged orphan",
      "brass faced detective",
      "velvet masked thief",
      "paper skinned acrobat",
      "iron lunged diver",
      "hollow crowned queen",
      "smoke wreathed widow",
      "gilded tongued liar"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "action",
    label: "Action / Pose",
    source: "agency",
    options: [
      "mid-stride",
      "weeping quietly",
      "forging a blade",
      "levitating",
      "reading by glow",
      "reaching for the light",
      "mid-spin",
      "crouching low",
      "kneeling in prayer",
      "mid-leap",
      "dancing in the rain",
      "holding a lantern",
      "gazing upward",
      "shielded by wings",
      "drawing a sword",
      "whispering a secret",
      "shielding eyes from sun",
      "balancing on one foot",
      "mid-backflip",
      "reaching into the void",
      "sitting cross-legged",
      "turning to look back",
      "running through smoke",
      "floating weightlessly",
      "clutching a relic",
      "casting a spell",
      "bowing in reverence",
      "lunging forward",
      "perched on a branch",
      "dissolving into light",
      "weeping stone tears",
      "offering a flower",
      "striding into wind",
      "curled in sleep",
      "pointing at the horizon",
      "dragging a chain",
      "shielding a child",
      "mid-fall",
      "playing a lute",
      "meditating in lotus",
      "crawling through ruins",
      "ascending in flight",
      "grasping at stars",
      "standing in silhouette",
      "vanishing in mist",
      "blowing a kiss",
      "carrying a lantern"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "setting",
    label: "Setting / Environment",
    source: "agency",
    options: [
      "misty fjord",
      "cactus desert",
      "coral atoll",
      "snowy tundra",
      "alpine meadow",
      "bamboo grove",
      "mangrove swamp",
      "volcanic plateau",
      "ancient rainforest",
      "windswept steppe",
      "frozen taiga",
      "salt flat",
      "glacial valley",
      "rolling savanna",
      "rocky canyon",
      "misty bog",
      "coastal cliff",
      "dry riverbed",
      "lush oasis",
      "barren wasteland",
      "abandoned library",
      "neon arcade",
      "candlelit chapel",
      "dusty attic",
      "grand ballroom",
      "empty cathedral",
      "cozy bookstore",
      "opulent throne room",
      "dimly lit laboratory",
      "bustling kitchen",
      "crumbling manor",
      "ornate conservatory",
      "silent museum",
      "underground bunker",
      "floating marketplace",
      "derelict cathedral",
      "cloud citadel",
      "crystal palace",
      "ruined castle",
      "towering lighthouse",
      "vine-covered ruin",
      "hanging gardens",
      "subterranean temple",
      "wooded fortress",
      "glass observatory",
      "megastructure",
      "ink river",
      "crystal cavern",
      "floating island",
      "enchanted forest",
      "bioluminescent cave",
      "molten core",
      "mirrored lake",
      "floating garden",
      "starlit grotto",
      "petrified forest",
      "gravity-bending realm",
      "molten lava lake",
      "rainy souk",
      "cyberpunk rooftop",
      "empty station",
      "neon-lit alley",
      "bustling market square",
      "foggy harbor",
      "crowded subway",
      "rooftop garden",
      "abandoned factory",
      "neon marketplace",
      "futuristic train station",
      "dense slum",
      "seaside promenade",
      "night market",
      "asteroid belt",
      "nebula nursery",
      "frozen moon",
      "ringed planet",
      "space colony",
      "derelict space station",
      "alien marketplace",
      "comet trail",
      "binary star system",
      "deep space void",
      "cratered lunar base",
      "gas giant surface",
      "wormhole gateway",
      "underwater city",
      "mars colony",
      "orbital habitat",
      "desert outpost",
      "jungle ruin",
      "iceberg lagoon",
      "mountain pass",
      "windswept dune sea",
      "floating city",
      "glacier cave",
      "meteorite crater",
      "skybridge metropolis",
      "terraformed dome",
      "volcanic island",
      "crop circle field"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "time_era",
    label: "Time / Era",
    source: "agency",
    options: [
      "prehistoric",
      "ancient Egypt",
      "classical antiquity",
      "medieval",
      "renaissance",
      "baroque",
      "industrial revolution",
      "roaring twenties",
      "art deco",
      "postwar",
      "swinging sixties",
      "cyberpunk near-future",
      "far-future",
      "post-apocalyptic",
      "bronze age",
      "stone age",
      "victorian",
      "edwardian",
      "belle epoque",
      "golden age of sail",
      "space age",
      "info age",
      "solarpunk",
      "steam age",
      "timeless"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "time_of_day",
    label: "Time of Day",
    source: "agency",
    options: [
      "dawn",
      "golden hour",
      "blue hour",
      "midday",
      "overcast noon",
      "afternoon",
      "dusk",
      "twilight",
      "midnight",
      "pre-dawn",
      "magic hour",
      "night"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "art_movement",
    label: "Art Movement / Style",
    source: "agency",
    options: [
      "art nouveau",
      "art deco",
      "surrealism",
      "baroque",
      "brutalism",
      "vaporwave",
      "ukiyo-e",
      "constructivism",
      "dada",
      "fauvism",
      "impressionism",
      "expressionism",
      "cubism",
      "gothic",
      "psychedelic",
      "minimalism",
      "maximalism",
      "biomimicry",
      "afrofuturism",
      "solarpunk",
      "dieselpunk",
      "lowbrow",
      "glitch art",
      "pointillism",
      "romanticism",
      "neoclassicism",
      "rococo",
      "symbolism",
      "realism",
      "photorealism",
      "pop art",
      "op art",
      "art brut",
      "tachisme",
      "suprematism",
      "futurism",
      "mannerism",
      "hudson river school",
      "pre-raphaelite",
      "arts and crafts",
      "memphis",
      "bauhaus",
      "de stijl",
      "socialist realism",
      "new realism",
      "magical realism",
      "line art",
      "woodblock",
      "pixel art",
      "cel shading",
      "flat design",
      "low poly",
      "ray tracing",
      "chiaroscuro painting",
      "en plein air",
      "kinetic art",
      "land art",
      "environmental art",
      "outsider art",
      "visionary art",
      "dark academia",
      "cottagecore",
      "goblincore",
      "liminal",
      "weirdcore",
      "dreamcore"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "medium",
    label: "Medium / Material",
    source: "crossref",
    options: [
      "oil painting",
      "watercolor",
      "35mm photograph",
      "charcoal sketch",
      "digital render",
      "clay sculpture",
      "pixel art",
      "ink wash",
      "mosaic",
      "tapestry",
      "woodcut",
      "neon sign",
      "stained glass",
      "papercraft",
      "3d render",
      "collage",
      "daguerreotype",
      "linocut",
      "holographic print",
      "risograph",
      "pencil drawing",
      "pastel",
      "gouache",
      "acrylic",
      "vector art",
      "concept art",
      "matte painting",
      "engraving",
      "screen print",
      "cyanotype",
      "chalk",
      "sculpture",
      "graphic novel",
      "ukiyo-e print",
      "fresco"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "artist_reference",
    label: "Artist / Style Reference",
    source: "agency",
    options: [
      "in the style of Caravaggio",
      "in the style of Vermeer",
      "in the style of Hokusai",
      "in the style of Alphonse Mucha",
      "in the style of Gustav Klimt",
      "in the style of Dalí",
      "in the style of Magritte",
      "in the style of Escher",
      "in the style of Kandinsky",
      "in the style of Kahlo",
      "in the style of Banksy",
      "in the style of Keith Haring",
      "in the style of Greg Rutkowski",
      "in the style of Artgerm",
      "in the style of James Jean",
      "in the style of Ross Tran",
      "in the style of Loish",
      "in the style of Sakimichan",
      "in the style of Ilya Kuvshinov",
      "in the style of Charlie Bowater",
      "in the style of WLOP",
      "in the style of Guweiz",
      "in the style of Makoto Shinkai",
      "in the style of Hayao Miyazaki",
      "in the style of Akira Toriyama",
      "in the style of Moebius/Jean Giraud",
      "in the style of Syd Mead",
      "in the style of Roger Deakins",
      "in the style of Zaha Hadid",
      "in the style of Beeple",
      "in the style of H.R. Giger",
      "in the style of Yoshitaka Amano",
      "in the style of Junji Ito",
      "in the style of Norman Rockwell",
      "in the style of Yayoi Kusama",
      "in the style of Tintin (Hergé)",
      "in the style of Eyvind Earle",
      "in the style of Charley Harper",
      "in the style of Lotte Reiniger",
      "in the style of Cy Twombly",
      "in the style of Antonio Gaudí",
      "in the style of Paul Cadden",
      "in the style of Roberto Ferri",
      "in the style of John Singer Sargent",
      "in the style of Aubrey Beardsley",
      "in the style of Hiroshi Yoshida",
      "in the style of Tadahiro Uesugi",
      "in the style of Kim Jung Gi",
      "in the style of Craig Mullins",
      "in the style of John Howe",
      "in the style of Alan Lee",
      "in the style of Brian Froud",
      "in the style of Victo Ngai",
      "in the style of Rovina Cai",
      "in the style of Tran Nguyen",
      "in the style of Audrey Kawasaki",
      "in the style of Noein",
      "in the style of Seb McKinnon",
      "in the style of Magali Villeneuve",
      "in the style of Karol Bak",
      "in the style of Darek Zabrocki",
      "in the style of Alejandro Burdisio",
      "in the style of Stephan Martiniere",
      "in the style of Peter Mohrbacher",
      "in the style of Tom Bagshaw",
      "in the style of Android Jones",
      "in the style of Android (Tara)",
      "in the style of Kilian Eng",
      "in the style of Simon Stalenhag",
      "in the style of Kazumasa Nagai",
      "in the style of Shusei Nagaoka",
      "in the style of Perico Pastor",
      "in the style of Henrik Uldalen",
      "in the style of Pascal Campion",
      "in the style of Tomasz Alen Kopera",
      "in the style of Zdzislaw Beksinski",
      "in the style of Gerald Brom",
      "in the style of Frank Frazetta",
      "in the style of Boris Vallejo",
      "in the style of Julie Bell",
      "in the style of Josephine Wall",
      "in the style of Amy Brown",
      "in the style of Nene Thomas",
      "in the style of Luis Royo",
      "in the style of Hajime Sorayama",
      "in the style of Hajime Sorayama (chrome)",
      "in the style of Hajdú János",
      "in the style of Wes Anderson",
      "in the style of Sofia Coppola",
      "in the style of Guillermo del Toro",
      "in the style of Tim Burton",
      "in the style of Christopher Nolan",
      "in the style of Denis Villeneuve",
      "in the style of Zhang Yimou",
      "in the style of Wong Kar-wai"
    ].map((value) => ({ value, tags: ["universal" as EngineTag], weight: 1.6 })),
  },
  {
    id: "lighting",
    label: "Lighting",
    source: "agency",
    options: [
      "golden hour",
      "volumetric light",
      "neon rim light",
      "overcast diffused",
      "hard shadows",
      "soft box",
      "backlit silhouette",
      "chiaroscuro",
      "bioluminescent",
      "candlelit",
      "studio strobe",
      "dappled sunlight",
      "moonlit",
      "infrared",
      "double-exposure glow",
      "rim-lit fog",
      "tungsten warm",
      "high-key",
      "low-key noir",
      "prismatic",
      "god rays",
      "light leak",
      "strobe freeze",
      "practical lamps",
      "window light",
      "silhouette backlight",
      "laser grid",
      "aurora light",
      "sunbeam",
      "diffused bounce",
      "short key",
      "broad key",
      "split lighting",
      "beauty dish",
      "ring light",
      "underlight",
      "sidelight",
      "top light",
      "ambient occlusion glow",
      "caustics",
      "subsurface glow",
      "neon wash",
      "spotlight",
      "practical neon",
      "glowstick",
      "ember light",
      "starlight",
      "dawn glow",
      "firelight",
      "butterfly lighting",
      "rembrandt lighting"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "camera_lens",
    label: "Camera / Lens",
    source: "midjourney",
    options: [
      "50mm",
      "85mm f/1.4",
      "24mm wide",
      "35mm",
      "macro",
      "tilt-shift",
      "fisheye",
      "telephoto",
      "anamorphic",
      "drone aerial",
      "gopro pov",
      "large format",
      "polaroid",
      "medium format",
      "200mm",
      "100mm macro",
      "14mm ultra-wide",
      "70-200mm",
      "super-telephoto",
      "shift lens",
      "probe lens",
      "snorriCam",
      "schneider-kreuznach",
      "cooke s4",
      "zeiss master prime",
      "leica summicron",
      "helios 44",
      "canon fd",
      "nikkor",
      "angénieux",
      "panavision",
      "arri signature",
      "cooke anamorphic",
      "leica summilux",
      "sigma art"
    ].map((value) => ({ value, tags: ["MJ","SDXL","Flux"] as EngineTag[] })),
  },
  {
    id: "composition",
    label: "Composition / Framing",
    source: "agency",
    options: [
      "rule of thirds",
      "dutch angle",
      "close-up",
      "wide shot",
      "birds-eye view",
      "perfect symmetry",
      "off-center",
      "foreground framing",
      "silhouette",
      "panoramic",
      "vignette",
      "flat lay",
      "worm's-eye",
      "diptych",
      "negative-space lead",
      "centered",
      "low angle",
      "high angle",
      "extreme close-up",
      "establishing shot",
      "over-the-shoulder",
      "profile",
      "three-quarter view",
      "fisheye distortion",
      "leading lines",
      "golden spiral",
      "canted frame",
      "shallow depth of field",
      "deep focus",
      "split diopter"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "color_palette",
    label: "Color Palette",
    source: "agency",
    options: [
      "muted earth tones",
      "high-contrast monochrome",
      "pastel dream",
      "neon cyber",
      "sepia",
      "iridescent",
      "deep jewel tones",
      "desaturated",
      "burned orange",
      "teal and coral",
      "black and white",
      "candy pop",
      "forest greens",
      "lunar silver",
      "sunset gradient",
      "acid tones",
      "ink and vermillion",
      "cream and ochre",
      "duotone cyan",
      "magenta and teal",
      "olive and rust",
      "slate and amber",
      "midnight blue",
      "rose gold",
      "emerald and gold",
      "cobalt and sand",
      "violet haze",
      "tangerine and charcoal",
      "snow and pine",
      "copper and jade",
      "plum and moss",
      "steel grey",
      "honey and ink",
      "coral and navy",
      "mustard and teal",
      "blush and graphite",
      "indigo and bone",
      "lime and charcoal",
      "peach fuzz",
      "aurora pastels",
      "smoke and ember",
      "patriotic tri-color",
      "harlequin",
      "opalescent",
      "ochre and slate",
      "frostbite cyan",
      "sunbleached"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "mood",
    label: "Mood / Atmosphere",
    source: "agency",
    options: [
      "serene",
      "ominous",
      "whimsical",
      "melancholic",
      "euphoric",
      "tense",
      "nostalgic",
      "dreamlike",
      "solemn",
      "playful",
      "haunting",
      "triumphant",
      "intimate",
      "otherworldly",
      "cozy",
      "apocalyptic",
      "meditative",
      "mischievous",
      "ethereal",
      "foreboding",
      "wistful",
      "jubilant",
      "uncanny",
      "tranquil",
      "brooding",
      "hopeful",
      "desolate",
      "majestic",
      "surreal",
      "mysterious",
      "tender",
      "menacing",
      "pensive",
      "radiant",
      "wondrous",
      "weary",
      "vibrant",
      "still",
      "frantic",
      "quiet"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "weather",
    label: "Weather / Atmosphere",
    source: "agency",
    options: [
      "fog",
      "snowfall",
      "heat haze",
      "rain streaks",
      "clear and crisp",
      "sandstorm",
      "aurora",
      "thunderstorm",
      "morning dew",
      "mist",
      "smog",
      "starlit calm",
      "blizzard",
      "drizzle",
      "overcast",
      "sun shower",
      "frost",
      "hail",
      "monsoon",
      "dust devil"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "texture_detail",
    label: "Texture / Surface Detail",
    source: "crossref",
    options: [
      "weathered",
      "polished chrome",
      "cracked",
      "intricate filigree",
      "rough stone",
      "silken",
      "crystalline",
      "corroded brass",
      "frosted",
      "velvet",
      "oxidized copper",
      "splintered wood",
      "liquid mercury",
      "hammered gold",
      "mossy",
      "glassy",
      "feathered",
      "knitted",
      "marbled",
      "scratched lacquer",
      "brushed steel",
      "worn leather",
      "porous",
      "gilded",
      "matte",
      "satin",
      "rough-hewn",
      "delicate lace",
      "wet clay",
      "petrified"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "render_engine",
    label: "Render Engine",
    source: "backend",
    options: [
      "Blender Cycles",
      "Blender Eevee",
      "Unreal Engine 5",
      "Octane Render",
      "Redshift",
      "Corona Renderer",
      "V-Ray",
      "Arnold",
      "Lumion",
      "Twinmotion",
      "RenderMan",
      "KeyShot",
      "Mental Ray",
      "Maxwell",
      "Clarisse",
      "Houdini Karma",
      "Cinema 4D"
    ].map((value) => ({ value, tags: ["MJ","SDXL","Flux","video"] as EngineTag[] })),
  },
  {
    id: "film_stock",
    label: "Film Stock",
    source: "midjourney",
    options: [
      "Kodak Portra 400",
      "KodakGold 200",
      "Kodachrome",
      "Fujifilm Pro 400H",
      "Cinestill 800T",
      "Ilford HP5",
      "Agfa Vista",
      "Polaroid 600",
      "Lomography 800",
      "Kodak Ektachrome",
      "Fujifilm Velvia 50",
      "CineStill 50D",
      "Super 8",
      "16mm film",
      "35mm film",
      "Kodak Vision3 500T",
      "Kodak Ektar 100",
      "CineStill 400D",
      "Fujichrome Provia"
    ].map((value) => ({ value, tags: ["MJ","SDXL","Flux"] as EngineTag[] })),
  },
  {
    id: "color_grade",
    label: "Color Grade",
    source: "crossref",
    options: [
      "teal and orange",
      "bleach bypass",
      "muted film",
      "high contrast noir",
      "warm vintage",
      "cold clinical",
      "pastel wash",
      "desaturated teal",
      "orange and teal blockbuster",
      "silver retention",
      "cross-processed",
      "faded nostalgia",
      "rich saturated",
      "monochrome with one accent",
      "kodak printed look",
      "fuji printed look",
      "low-contrast dreamy",
      "crushed blacks"
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "quality_booster",
    label: "Quality Booster (optional)",
    source: "agency",
    defaultOff: true,
    options: [
      "intricate detail", "sharp focus", "highly detailed", "fine craftsmanship",
      "photorealistic", "cinematic", "award-winning composition", "8k resolution",
      "ultra-detailed", "crisp lighting", "masterful", "richly textured",
    ].map((value) => ({ value, tags: ["universal" as EngineTag], weight: 0.4 })),
  },
  {
    id: "aspect_ratio",
    label: "Aspect Ratio",
    source: "backend",
    options: [
      { value: "1:1", tags: ["universal" as EngineTag] },
      { value: "16:9", tags: ["universal" as EngineTag] },
      { value: "9:16", tags: ["universal" as EngineTag] },
      { value: "4:3", tags: ["universal" as EngineTag] },
      { value: "21:9", tags: ["universal" as EngineTag] },
      // Platform ratios (researched; unverified — see platform-aspect-ratios.json).
      { value: "4:5", tags: ["universal" as EngineTag] },
      { value: "2:3", tags: ["universal" as EngineTag] },
      { value: "1.91:1", tags: ["universal" as EngineTag] },
    ],
  },
  {
    id: "negative_prompt",
    label: "Negative Prompt (exclusions / override)",
    source: "crossref",
    options: [
      "motion blur", "extra fingers", "watermark", "low quality", "distorted face",
      "text artifacts", "deformed hands", "oversaturated", "plastic look", "cluttered",
      "harsh noise", "duplicate", "blurry", "jpeg artifacts", "disjointed",
    ].map((value) => ({ value, tags: ["MJ","SDXL","video"] as EngineTag[], weight: 0.4 })),
  },
  {
    id: "negative_space",
    label: "Negative Space / Minimalism",
    source: "agency",
    options: [
      "lots of empty sky", "centered subject", "minimal foreground", "vast emptiness",
      "isolated subject", "breathing room", "sparse background", "single focal point",
    ].map((value) => ({ value, tags: ["universal" as EngineTag] })),
  },
  {
    id: "prompt_weighting",
    label: "Prompt Weighting (advanced)",
    source: "midjourney",
    defaultOff: true,
    options: [
      { value: "emphasize subject (::2)", tags: ["MJ","SDXL"] as EngineTag[], weight: 1 },
      { value: "soften background (::-1)", tags: ["MJ","SDXL"] as EngineTag[], weight: 1 },
      { value: "balanced (::1)", tags: ["MJ","SDXL"] as EngineTag[], weight: 1 },
      { value: "strong focus (1.3)", tags: ["SDXL"] as EngineTag[], weight: 1 },
      { value: "subtle (0.8)", tags: ["SDXL"] as EngineTag[], weight: 1 },
      { value: "exclude (::-0.5)", tags: ["MJ","SDXL"] as EngineTag[], weight: 1 },
    ],
  },
  {
    id: "stylize_mj",
    label: "Midjourney --stylize",
    source: "midjourney",
    defaultOff: true,
    options: [
      { value: "0", tags: ["MJ"] as EngineTag[] },
      { value: "50", tags: ["MJ"] as EngineTag[] },
      { value: "100", tags: ["MJ"] as EngineTag[] },
      { value: "250", tags: ["MJ"] as EngineTag[] },
      { value: "500", tags: ["MJ"] as EngineTag[] },
      { value: "1000", tags: ["MJ"] as EngineTag[] },
    ],
  },
  {
    id: "chaos_mj",
    label: "Midjourney --chaos",
    source: "midjourney",
    defaultOff: true,
    options: [
      { value: "0", tags: ["MJ"] as EngineTag[] },
      { value: "10", tags: ["MJ"] as EngineTag[] },
      { value: "25", tags: ["MJ"] as EngineTag[] },
      { value: "50", tags: ["MJ"] as EngineTag[] },
      { value: "100", tags: ["MJ"] as EngineTag[] },
    ],
  },
  {
    id: "guidance_flux",
    label: "Flux guidance (CFG)",
    source: "flux",
    defaultOff: true,
    options: [
      { value: "2", tags: ["Flux"] as EngineTag[] },
      { value: "3.5", tags: ["Flux"] as EngineTag[] },
      { value: "5", tags: ["Flux"] as EngineTag[] },
    ],
  },
  {
    id: "video_motion",
    label: "Motion / Dynamics (video)",
    source: "video",
    options: [
      "slow drift", "sudden burst", "flowing water", "gentle sway", "rapid zoom",
      "orbiting", "collapsing", "blooming open", "fracture", "levitation",
      "cascading", "pulse",
    ].map((value) => ({ value, tags: ["video"] as EngineTag[] })),
  },
  {
    id: "video_camera",
    label: "Camera Movement (video)",
    source: "video",
    options: [
      "dolly in",
      "dolly out",
      "orbit",
      "handheld",
      "crane up",
      "tracking",
      "push-in",
      "pan left",
      "static lockoff",
      "aerial descend",
      "whip pan",
      "arc shot",
      "dutch tilt",
      "zoom out",
      "jib up",
      "steadicam",
      "fpv dive",
      "top-down",
      "snorriCam",
      "roll",
      "dolly zoom",
      "rack focus",
      "gimbal",
      "tilt up",
      "crane down"
    ].map((value) => ({ value, tags: ["video"] as EngineTag[] })),
  },
  {
    id: "video_duration",
    label: "Video Duration (param)",
    source: "runway",
    defaultOff: true,
    options: [
      { value: "5s", tags: ["video"] as EngineTag[] },
      { value: "10s", tags: ["video"] as EngineTag[] },
    ],
  },
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

/**
 * Intensity presets — the user-facing "how detailed" control.
 * LOW  = 7  categories  (everyday quick prompt)
 * MEDIUM = 10 categories (balanced)
 * HIGH = 13 categories  (maximum richness — pulls from all major axes)
 * Each tier is a superset escalation of the previous.
 */
export type PromptTier = "low" | "medium" | "high";

export const TIER_META: { id: PromptTier; label: string; count: number }[] = [
  { id: "low", label: "Low (7)", count: 7 },
  { id: "medium", label: "Medium (10)", count: 10 },
  { id: "high", label: "High (13)", count: 13 },
];

export const TIER_PRESETS: Record<PromptTier, CategoryId[]> = {
  low: [
    "subject",
    "setting",
    "art_movement",
    "lighting",
    "mood",
    "color_palette",
    "composition",
  ],
  medium: [
    "subject",
    "action",
    "setting",
    "art_movement",
    "medium",
    "lighting",
    "camera_lens",
    "color_palette",
    "mood",
    "weather",
  ],
  high: [
    "subject",
    "action",
    "setting",
    "time_of_day",
    "art_movement",
    "medium",
    "artist_reference",
    "lighting",
    "camera_lens",
    "composition",
    "color_palette",
    "mood",
    "weather",
  ],
};

/** Resolve the category list for a tier (default: medium). */
export function categoriesForTier(tier: PromptTier = "medium"): CategoryId[] {
  return TIER_PRESETS[tier];
}

/**
 * Platform destination presets — where the image or video is going, so the
 * prompt can carry the right frame for it.
 *
 * Numbers are live-verified from official help-center docs on 2026-08-22; see
 * docs/research/prompt-generator/platform-aspect-ratios.json for the per-entry
 * source URL and whether the pixel figure is published or conventional.
 *
 * Every platform carries BOTH an image and a video frame because several
 * diverge (Threads posts images at 4:5 but video at 9:16; LinkedIn 1.91:1 vs
 * 16:9), and the old single-ratio shape silently used the image ratio for video.
 */
export interface PlatformFrame {
  /** Aspect ratio string — must exist in the `aspect_ratio` category. */
  ratio: string;
  /** Recommended pixel size, e.g. "1080x1350". */
  px: string;
}

export interface PlatformPreset {
  id: string;
  label: string;
  image: PlatformFrame;
  video: PlatformFrame;
  /** True when the numbers are not from an official published figure. */
  unverified?: boolean;
  note?: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  { id: "twitter", label: "Twitter / X", image: { ratio: "16:9", px: "1200x675" }, video: { ratio: "16:9", px: "1280x720" } },
  { id: "instagram-feed", label: "Instagram (Feed)", image: { ratio: "4:5", px: "1080x1350" }, video: { ratio: "4:5", px: "1080x1350" } },
  { id: "instagram-story", label: "Instagram (Story / Reel)", image: { ratio: "9:16", px: "1080x1920" }, video: { ratio: "9:16", px: "1080x1920" } },
  { id: "pinterest", label: "Pinterest (Pin)", image: { ratio: "2:3", px: "1000x1500" }, video: { ratio: "2:3", px: "1000x1500" } },
  { id: "youtube-thumbnail", label: "YouTube (Thumbnail)", image: { ratio: "16:9", px: "1280x720" }, video: { ratio: "16:9", px: "1920x1080" } },
  { id: "youtube-channel-art", label: "YouTube (Channel Art)", image: { ratio: "16:9", px: "2560x1440" }, video: { ratio: "16:9", px: "2560x1440" } },
  { id: "facebook-post", label: "Facebook (Post)", image: { ratio: "4:5", px: "1080x1350" }, video: { ratio: "16:9", px: "1280x720" } },
  // The research gives ratio 16:9 but px 851x315 (~2.7:1) for the cover; those
  // disagree and 2.7:1 is not an `aspect_ratio` value. Keeping both verbatim
  // rather than inventing a ratio — the px is the figure Facebook publishes.
  { id: "facebook-cover", label: "Facebook (Cover)", image: { ratio: "16:9", px: "851x315" }, video: { ratio: "16:9", px: "851x315" }, note: "Facebook publishes 851x315 (~2.7:1); the 16:9 ratio is approximate." },
  { id: "linkedin-post", label: "LinkedIn (Post)", image: { ratio: "1.91:1", px: "1200x627" }, video: { ratio: "16:9", px: "1280x720" } },
  { id: "tiktok", label: "TikTok", image: { ratio: "9:16", px: "1080x1920" }, video: { ratio: "9:16", px: "1080x1920" } },
  // Reddit's help center publishes no feed-post dimensions; both figures are conventional.
  { id: "reddit", label: "Reddit (Post)", image: { ratio: "1:1", px: "1080x1080" }, video: { ratio: "16:9", px: "1280x720" }, unverified: true },
  { id: "discord-icon", label: "Discord (Server Icon)", image: { ratio: "1:1", px: "512x512" }, video: { ratio: "1:1", px: "512x512" } },
  { id: "discord-banner", label: "Discord (Server Banner)", image: { ratio: "16:9", px: "960x540" }, video: { ratio: "16:9", px: "960x540" } },
  { id: "threads", label: "Threads", image: { ratio: "4:5", px: "1080x1350" }, video: { ratio: "9:16", px: "1080x1920" } },
  // Generic fallbacks — no platform doc behind these, just common conventions.
  { id: "square", label: "Square", image: { ratio: "1:1", px: "1080x1080" }, video: { ratio: "1:1", px: "1080x1080" }, unverified: true },
  { id: "landscape", label: "Landscape", image: { ratio: "16:9", px: "1920x1080" }, video: { ratio: "16:9", px: "1920x1080" }, unverified: true },
  { id: "portrait", label: "Portrait", image: { ratio: "9:16", px: "1080x1920" }, video: { ratio: "9:16", px: "1080x1920" }, unverified: true },
];

/** Look up a platform preset by id (returns undefined if not found). */
export function platformById(id: string): PlatformPreset | undefined {
  return PLATFORM_PRESETS.find((p) => p.id === id);
}

/** The frame a platform wants for the engine in play — video engines get the video block. */
export function frameFor(id: string | null, engine: Engine): PlatformFrame | undefined {
  if (!id) return undefined;
  const p = platformById(id);
  if (!p) return undefined;
  return engine === "Video" ? p.video : p.image;
}

/**
 * Aspect ratios the video vendors actually accept, from
 * docs/research/prompt-generator/param-ranges.json (Seedance ∪ Runway ∪ Kling).
 * Some platform video frames fall outside this — Pinterest's 2:3 and Instagram
 * feed's 4:5 are supported by no vendor. Callers should SAY so rather than
 * silently substituting a nearest ratio.
 */
export const VIDEO_RATIOS: ReadonlySet<string> = new Set([
  "16:9",
  "9:16",
  "1:1",
  "4:3",
  "3:4",
  "21:9",
]);

/**
 * Style presets — curated bundles of category values that produce a named look
 * (photorealistic, monochrome, anime, noir, …). Compiled from
 * docs/research/prompt-generator/lexicon-style-presets.json (validated against
 * the lexicons — every bundle value exists in CATEGORY_BY_ID).
 *
 * Each bundle entry is either "categoryId:value" or "negative:a, b, c" (which
 * appends exclusion terms to the negative_prompt category).
 */
import stylePresetsJson from "../../../docs/research/prompt-generator/lexicon-style-presets.json";

export interface StylePreset {
  id: string;
  label: string;
  bundles: string[];
}

/** A resolved pick: one option value per category id (mirrors assemble.PickSet). */
export type PickSet = Partial<Record<CategoryId, string>>;

export const STYLE_PRESETS: StylePreset[] = stylePresetsJson.presets as StylePreset[];

/**
 * Per-engine negative-prompt behavior, grounded in official docs
 * (see docs/research/prompt-generator/negatives-per-engine.json).
 * - Flux: no negative support at all — drop entirely.
 * - Gemini: no negative field; short inline "Avoid X, Y" clause only.
 * - Midjourney: --no honored, but each term read independently → short atomic list.
 * - SDXL: true dedicated field; sane 10-20 terms.
 * - Video: split — Kling has a field; Runway/Seedance/Veo do not (use inline "Avoid").
 */
export const NEGATIVES_BY_ENGINE: Record<Engine, string[]> = {
  Gemini: ["extra fingers", "watermark", "distorted face", "blurry", "text artifacts"],
  Midjourney: ["extra fingers", "watermark", "blurry", "distorted face", "low quality", "text artifacts"],
  Flux: [],
  SDXL: [
    "low quality", "worst quality", "lowres", "jpeg artifacts", "watermark",
    "blurry", "extra fingers", "deformed hands", "bad anatomy", "distorted face",
    "text", "signature",
  ],
  Video: ["camera shake", "warped face", "flicker", "extra limbs", "watermark", "text overlay", "motion blur", "morphing"],
};

/**
 * HOW each engine takes exclusions — not merely whether it does.
 * "field"  a real negatives field/flag (MJ --no, SDXL's negative box).
 * "inline" no field; the exclusions ride in the prompt as "Avoid x, y".
 * "none"   unsupported; exclusions have to be re-phrased positively instead.
 *
 * Note this deliberately disagrees with the `honorsNegative` booleans in
 * negatives-per-engine.json for Gemini and Video. That flag answers "is there a
 * field?" (no, for both), which collapses two different behaviours into one —
 * Gemini and the non-Kling video models still respond to an inline clause, and
 * Flux responds to nothing. Three values keep that distinction.
 */
export type NegativeStyle = "field" | "inline" | "none";

export const NEGATIVE_STYLE: Record<Engine, NegativeStyle> = {
  Gemini: "inline",
  Midjourney: "field",
  Flux: "none",
  SDXL: "field",
  Video: "inline",
};

/**
 * How many exclusion terms each engine wants, per its own docs:
 * Midjourney's --no page says 3-8 discrete terms; the SDXL negative-prompt wiki
 * runs 10-20; an inline clause has to stay short or it eats the prompt.
 */
export const NEGATIVE_COUNT: Record<Engine, number> = {
  Gemini: 3,
  Midjourney: 6,
  Flux: 0,
  SDXL: 12,
  Video: 5,
};

/**
 * One line per engine for the UI, condensed from the `bestForm` and `notes`
 * fields of negatives-per-engine.json. Sources, in the same order:
 *   ai.google.dev/gemini-api/docs/image-generation
 *   docs.midjourney.com/hc/en-us/articles/32173351982093-No
 *   docs.bfl.ml/guides/prompting_guide_flux2
 *   github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Negative-prompt
 *   mstudio.ai/blog/ai-filmmaking/how-to-prompt-ai-video-models
 */
export const ENGINE_NOTE: Record<Engine, string> = {
  Gemini: "No negatives field — exclusions ride inline, so they stay short.",
  Midjourney: "--no reads every word on its own, so terms stay single-word.",
  Flux: "Flux takes no negatives at all — phrase exclusions positively instead.",
  SDXL: "Has a real negative field, and it likes a long list.",
  Video: "Only Kling has a negatives field; the rest read an inline clause.",
};

/** Whether the engine takes exclusions in any form. */
export function honorsNegative(engine: Engine): boolean {
  return NEGATIVE_STYLE[engine] !== "none";
}

/** Default exclusion terms for an engine (empty for Flux). */
export function defaultNegatives(engine: Engine): string[] {
  return NEGATIVES_BY_ENGINE[engine] ?? [];
}

/**
 * Living-artist filter. Some engines block prompts referencing living artists'
 * styles (Gemini blocks public-figure/celebrity + photorealistic people; the
 * major video engines — Runway, Seedance, Kling — ban living-artist style).
 * Deceased/historical artists are safe everywhere. Midjourney, SDXL and
 * open-weight Flux do NOT apply an automated living-artist filter (see
 * docs/research/prompt-generator/artist-restrictions.json — Midjourney marked
 * unverified, only offensive public-figure images + IP are prohibited).
 *
 * LIVING_ARTISTS is verified against Wikidata (description birth-death years +
 * P570 where resolvable) on 2026-08-22 — see
 * docs/research/prompt-generator/artist-living.json for per-artist sourcing and
 * unverified flags. Entries not confirmed deceased are defaulted to living
 * (conservative: dropping a living reference for Gemini/Video is the safe side).
 * Each entry is the artist NAME as it appears AFTER "in the style of " in
 * artist_reference values.
 */
export const LIVING_ARTISTS: string[] = [
  "Alan Lee", "Alejandro Burdisio", "Amy Brown", "Android (Tara)", "Android Jones",
  "Artgerm", "Audrey Kawasaki", "Banksy", "Beeple", "Boris Vallejo", "Brian Froud",
  "Charlie Bowater", "Christopher Nolan", "Craig Mullins", "Darek Zabrocki",
  "Denis Villeneuve", "Gerald Brom", "Greg Rutkowski", "Guillermo del Toro", "Guweiz",
  "Hajdú János", "Hajime Sorayama", "Hajime Sorayama (chrome)", "Hayao Miyazaki",
  "Henrik Uldalen", "Ilya Kuvshinov", "James Jean", "John Howe", "Josephine Wall",
  "Julie Bell", "Junji Ito", "Karol Bak", "Kilian Eng", "Loish", "Luis Royo",
  "Magali Villeneuve", "Makoto Shinkai", "Nene Thomas", "Noein", "Pascal Campion",
  "Paul Cadden", "Perico Pastor", "Peter Mohrbacher", "Roberto Ferri", "Roger Deakins",
  "Ross Tran", "Rovina Cai", "Sakimichan", "Seb McKinnon", "Simon Stalenhag",
  "Sofia Coppola", "Stephan Martiniere", "Tadahiro Uesugi", "Tim Burton", "Tom Bagshaw",
  "Tomasz Alen Kopera", "Tran Nguyen", "Victo Ngai", "WLOP", "Wes Anderson",
  "Wong Kar-wai", "Yayoi Kusama", "Yoshitaka Amano", "Zhang Yimou",
];

const LIVING_SET = new Set(LIVING_ARTISTS.map((n) => n.toLowerCase()));

/** True if an "in the style of X" reference points at a living artist. */
export function isLivingArtist(ref: string | undefined): boolean {
  if (!ref) return false;
  const name = ref.replace(/^in the style of\s+/i, "").trim().toLowerCase();
  return LIVING_SET.has(name);
}

/**
 * Engines that block living-artist style prompts (per artist-restrictions.json).
 * Gemini + all Video engines filter; MJ/SDXL/Flux keep them.
 */
export const LIVING_ARTIST_BLOCKING_ENGINES: Engine[] = ["Gemini", "Video"];

/** Drop a living-artist reference when the target engine blocks it. */
export function filterArtistForEngine(ref: string | undefined, engine: Engine): string | undefined {
  if (!ref) return ref;
  if (LIVING_ARTIST_BLOCKING_ENGINES.includes(engine) && isLivingArtist(ref)) {
    return undefined;
  }
  return ref;
}

/** Apply a style preset's bundles onto a pick-set (overriding those categories). */
export function applyStylePreset(
  set: PickSet,
  presetId: string | null,
): PickSet {
  if (!presetId) return set;
  const preset = STYLE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return set;
  const next: PickSet = { ...set };
  for (const bundle of preset.bundles) {
    if (bundle.startsWith("negative:")) {
      const terms = bundle.slice("negative:".length).split(",").map((s) => s.trim()).filter(Boolean);
      const existing = next.negative_prompt ? next.negative_prompt.split(",").map((s) => s.trim()) : [];
      next.negative_prompt = [...existing, ...terms].join(", ");
      continue;
    }
    const idx = bundle.indexOf(":");
    const cat = bundle.slice(0, idx) as CategoryId;
    const val = bundle.slice(idx + 1).trim();
    next[cat] = val;
  }
  return next;
}

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
