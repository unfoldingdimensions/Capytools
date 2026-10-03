import { parseSpec } from "./spec";
import type { StampSpec } from "./types";

/**
 * Named designs in localStorage — settings only, never bytes: a preset
 * carries the spec (fractions and enums), and the logo is always re-picked
 * on apply. Same contract as llm.ts: read through validation on the way OUT
 * of storage, drop malformed entries silently, and swallow every storage
 * error so a private window works, just without presets.
 */

export const PRESETS_KEY = "capystamp:presets:v1";
export const MAX_PRESETS = 12;

export interface StampPreset {
  id: string;
  name: string;
  spec: StampSpec;
  createdAt: number;
}

/** Storage-optional so node tests can hand in a Map-backed fake. */
export type PresetStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeStore(explicit?: PresetStore): PresetStore | null {
  if (explicit) return explicit;
  if (typeof window === "undefined") return null;
  try {
    // Touch it once: some private modes throw on access, not on use.
    const probe = window.localStorage;
    if (typeof probe.getItem !== "function") return null;
    return probe;
  } catch {
    return null;
  }
}

function readRaw(store: PresetStore | null): unknown[] {
  if (!store) return [];
  try {
    const raw = store.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    // Corrupt JSON is treated as no presets, never as a crash.
    return [];
  }
}

function parseEntry(entry: unknown): StampPreset | null {
  if (typeof entry !== "object" || entry === null) return null;
  const raw = entry as Record<string, unknown>;
  const spec = parseSpec(raw.spec);
  if (!spec) return null;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 40) : null;
  if (!name) return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 64) : makePresetId(),
    name,
    spec,
    createdAt: typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
  };
}

function makePresetId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Every stored preset, validated; malformed entries never surface. */
export function loadPresets(store?: PresetStore): StampPreset[] {
  const entries = readRaw(safeStore(store));
  const presets: StampPreset[] = [];
  for (const entry of entries) {
    const preset = parseEntry(entry);
    if (preset) presets.push(preset);
    if (presets.length >= MAX_PRESETS) break;
  }
  return presets;
}

function writePresets(presets: StampPreset[], store: PresetStore | null): StampPreset[] {
  if (!store) return presets;
  try {
    store.setItem(PRESETS_KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)));
  } catch {
    // Quota or disabled storage: presets just don't persist this visit.
  }
  return presets;
}

/** Save a design under a name; the oldest preset falls off past 12. */
export function addPreset(name: string, spec: StampSpec, store?: PresetStore): StampPreset[] {
  const cleanName = name.trim().slice(0, 40) || "my mark";
  const existing = loadPresets(store);
  const preset: StampPreset = {
    id: makePresetId(),
    name: cleanName,
    spec,
    createdAt: Date.now(),
  };
  return writePresets([preset, ...existing].slice(0, MAX_PRESETS), safeStore(store));
}

export function removePreset(id: string, store?: PresetStore): StampPreset[] {
  const existing = loadPresets(store);
  return writePresets(existing.filter((preset) => preset.id !== id), safeStore(store));
}
