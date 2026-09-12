/** CapyOG's shared types — the card data model and the export knobs. */

export type OgTemplateId = "statement" | "quote" | "stat" | "announcement";

export type OgAccent = "sage" | "clay" | "water" | "gold";

export type OgVariant = "light" | "dark";

/** The editable slots. A template's schema picks which of these it renders. */
export type OgFieldKey =
  | "eyebrow"
  | "title"
  | "titleEm"
  | "subtitle"
  | "big"
  | "attribution"
  | "tag";

/** Every card carries every field; a template simply ignores the rest. That
 *  keeps the editor state one object and template switching lossless. */
export type OgCardData = Record<OgFieldKey, string>;

/** Export pixel multiplier — 1×, 2× or 3× the canonical CSS size. */
export type ExportScale = 1 | 2 | 3;

export type ExportFormat = "png" | "jpeg";
