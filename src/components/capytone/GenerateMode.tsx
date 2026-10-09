"use client";

/**
 * Generate mode's inputs — the card 01 body. State lives in the parent
 * (CapyTone), which turns these four knobs into a palette via
 * `harmonyPalette` and feeds the shared poster stage.
 */

import {
  HARMONIES,
  HARMONY_MAP,
  type FieldDepth,
  type HarmonyId,
} from "@/lib/capytone/harmony";

import { ColorPick, Pill, labelClass } from "./controls";

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function GenerateInputs({
  hex,
  onHex,
  harmony,
  onHarmony,
  field,
  onField,
  onRemix,
  feelBg,
  onUseFeel,
}: {
  hex: string;
  onHex: (hex: string) => void;
  harmony: HarmonyId;
  onHarmony: (harmony: HarmonyId) => void;
  field: FieldDepth;
  onField: (field: FieldDepth) => void;
  onRemix: () => void;
  /** The feel card's field colour, when one exists. */
  feelBg: string | null;
  onUseFeel: () => void;
}) {
  return (
    <>
      <p className="mt-4 text-sm text-muted-foreground">
        Pick a base colour and a rule — hues land exactly on the harmony
        offsets, chroma is clamped per lightness and hue, and the ink always
        clears 4.5:1. Same base, same rule, same variation, every time.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ColorPick id="capytone-gen-base" label="Base colour" value={hex} onChange={onHex} />
          {feelBg ? (
            <button
              type="button"
              onClick={onUseFeel}
              className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 font-mono text-[13px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              aria-label="Use the feel card's field colour as the base"
            >
              <span
                aria-hidden
                className="size-3 rounded-full border border-border"
                style={{ backgroundColor: feelBg }}
              />
              From the feel card
            </button>
          ) : null}
        </div>

        <div>
          <span className={labelClass}>Harmony</span>
          <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Harmony rule">
            {HARMONIES.map((rule) => (
              <Pill
                key={rule.id}
                active={harmony === rule.id}
                onClick={() => onHarmony(rule.id)}
                label={`${cap(rule.label)} harmony — ${rule.note}`}
              >
                {cap(rule.label)}
              </Pill>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{cap(HARMONY_MAP[harmony].note)}.</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <span className={labelClass}>Field</span>
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Field depth">
              <Pill active={field === "light"} onClick={() => onField("light")} label="Light field">
                Light
              </Pill>
              <Pill active={field === "deep"} onClick={() => onField("deep")} label="Deep field">
                Deep
              </Pill>
            </div>
          </div>
          <div className="mt-2">
            <Pill active={false} onClick={onRemix} label="Remix the generated palette">
              Remix ⟳
            </Pill>
          </div>
        </div>
      </div>
    </>
  );
}
