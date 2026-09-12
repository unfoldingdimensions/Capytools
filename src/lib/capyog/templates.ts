/**
 * The template registry — the pack seam.
 *
 * Future template packs (a storefront idea, deliberately unbuilt) are new
 * entries in this record, not new code paths: the editor reads the schema for
 * which inputs to show, and OgCard switches on the id for the layout. Nothing
 * here knows about paywalls or storage.
 */

import type { OgFieldKey, OgTemplateId } from "./types";

export const TEMPLATE_PRESETS: Record<
  OgTemplateId,
  { id: OgTemplateId; name: string; line: string; fields: OgFieldKey[] }
> = {
  statement: {
    id: "statement",
    name: "Statement",
    line: "an eyebrow, a big two-line title, a rule and a handle",
    fields: ["eyebrow", "title", "titleEm", "attribution"],
  },
  quote: {
    id: "quote",
    name: "Quote",
    line: "an oversized quotation mark around one italic line",
    fields: ["big", "attribution"],
  },
  stat: {
    id: "stat",
    name: "Stat",
    line: "one giant number, a label and a caption",
    fields: ["eyebrow", "big", "title", "subtitle"],
  },
  announcement: {
    id: "announcement",
    name: "Announcement",
    line: "a tag pill over a title and a date-ish line",
    fields: ["tag", "title", "subtitle", "attribution"],
  },
};

export const DEFAULT_TEMPLATE_ID: OgTemplateId = "statement";

export const TEMPLATE_IDS = Object.keys(TEMPLATE_PRESETS) as OgTemplateId[];
