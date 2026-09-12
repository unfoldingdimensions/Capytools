/**
 * The five Capy starting points — one per house color, each scannable by
 * construction: module-vs-background contrast ≥ 4.5:1, quiet zone at the
 * spec's four modules. `tests/capyqr.test.ts` runs every preset through the
 * guard set, so a preset that does not scan is a bug, not a taste call.
 *
 * On palette: sage-deep stands in for the mid sage (#8e9b7e), which measures
 * under 3:1 on cream and cannot carry the dark modules of a scannable code.
 */

import type { QrStyleState } from "./types";

export interface CapyPreset {
  id: string;
  label: string;
  style: QrStyleState;
}

export const CAPY_PRESETS: CapyPreset[] = [
  {
    id: "sage",
    label: "sage",
    style: {
      dotType: "square",
      cornerSquareType: "square",
      cornerDotType: "square",
      fg: { mode: "solid", color: "#4a6741" },
      bg: "#f9f9f7",
      quietModules: 4,
      ecc: "Q",
      cornerColor: null,
    },
  },
  {
    id: "water",
    label: "water",
    style: {
      dotType: "rounded",
      cornerSquareType: "extra-rounded",
      cornerDotType: "dot",
      fg: { mode: "solid", color: "#5f7a72" },
      bg: "#ffffff",
      quietModules: 4,
      ecc: "Q",
      cornerColor: "#4a6741",
    },
  },
  {
    id: "clay",
    label: "clay",
    style: {
      dotType: "classy-rounded",
      cornerSquareType: "dot",
      cornerDotType: "dot",
      fg: { mode: "solid", color: "#1a1a1a" },
      bg: "#c07952",
      quietModules: 4,
      ecc: "Q",
      cornerColor: null,
    },
  },
  {
    id: "gold",
    label: "gold",
    style: {
      dotType: "extra-rounded",
      cornerSquareType: "square",
      cornerDotType: "square",
      fg: { mode: "solid", color: "#d9a441" },
      bg: "#1e1e1e",
      quietModules: 4,
      ecc: "Q",
      cornerColor: null,
    },
  },
  {
    id: "mono",
    label: "mono",
    style: {
      dotType: "dots",
      cornerSquareType: "square",
      cornerDotType: "square",
      fg: { mode: "solid", color: "#1a1a1a" },
      bg: "#ffffff",
      quietModules: 4,
      ecc: "Q",
      cornerColor: null,
    },
  },
];

/** The style the editor opens with — the sage preset. */
export const DEFAULT_STYLE: QrStyleState = CAPY_PRESETS[0].style;
