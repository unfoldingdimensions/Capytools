"use client";

/**
 * Blend mode — 2–3 stop gradients in modern CSS, honestly doubled: the
 * primary `in`-syntax string modern engines paint, and a dense hex-stop
 * fallback for the engines that drop the declaration instead. Both strings
 * come from `gradientCss`, which samples the *same* interpolation for the
 * fallback, so the two previews agree closely rather than merely both
 * existing.
 */

import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { StageCard } from "@/components/stage-card";
import { COPIED_MS } from "@/lib/capytools/feedback";
import { copyText } from "@/lib/capytone/export";
import {
  gradientCss,
  INTERP_SPACES,
  type GradientType,
  type InterpSpace,
} from "@/lib/capytone/blend";
import type { MoodPalette } from "@/lib/capytone/types";

import { ColorPick, Pill, labelClass } from "./controls";

const TYPES: readonly { id: GradientType; label: string }[] = [
  { id: "linear", label: "linear" },
  { id: "radial", label: "radial" },
  { id: "conic", label: "conic" },
];

const THIRD_STOP_DEFAULT = "#d9a441";

/** Copy button with the house fixed width — no layout shift on "Copied". */
function WellCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    void copyText(text).then((ok) => {
      setCopied(ok);
      window.setTimeout(() => setCopied(false), COPIED_MS);
    });
  }, [text]);
  return (
    <Button
      size="sm"
      variant="outline"
      className="min-w-[84px] rounded-full"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy the CSS"}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function BlendMode({ palette }: { palette: MoodPalette | null }) {
  // Client-only mount: seed from the current card when there is one.
  const [stops, setStops] = useState<string[]>(
    palette ? [palette.bg, palette.accent] : ["#8e9b7e", "#c07952"],
  );
  const [type, setType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(135);
  const [interp, setInterp] = useState<InterpSpace>("oklab");

  const result = useMemo(() => {
    try {
      return gradientCss({ type, angle, stops, interp });
    } catch {
      return null;
    }
  }, [type, angle, stops, interp]);

  const setStop = useCallback((index: number, hex: string) => {
    setStops((prev) => prev.map((s, i) => (i === index ? hex : s)));
  }, []);

  const addStop = useCallback(() => {
    setStops((prev) => (prev.length < 3 ? [...prev, THIRD_STOP_DEFAULT] : prev));
  }, []);

  const removeStop = useCallback(() => {
    setStops((prev) => (prev.length > 2 ? prev.slice(0, -1) : prev));
  }, []);

  return (
    <>
      <StageCard index="01" title="The mix">
        <p className="mt-4 text-sm text-muted-foreground">
          two or three stops, a shape, a space to blend in. the modern string
          interpolates where css does by default — oklab — and says so out
          loud; the fallback samples the same ramp in hex for older engines.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {stops.map((stop, i) => (
            <ColorPick
              key={i}
              id={`capytone-blend-stop-${i}`}
              label={`stop ${i + 1}`}
              value={stop}
              onChange={(hex) => setStop(i, hex)}
            />
          ))}
          <div className="flex items-center gap-1.5">
            {stops.length < 3 ? (
              <Pill active={false} onClick={addStop} label="Add a third stop">
                + a stop
              </Pill>
            ) : (
              <Pill active={false} onClick={removeStop} label="Remove the third stop">
                − the third stop
              </Pill>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <span className={labelClass}>shape</span>
              <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Gradient shape">
                {TYPES.map((t) => (
                  <Pill key={t.id} active={type === t.id} onClick={() => setType(t.id)} label={`${t.label} gradient`}>
                    {t.label}
                  </Pill>
                ))}
              </div>
            </div>

            {type !== "radial" ? (
              <div className="min-w-56">
                <label htmlFor="capytone-blend-angle" className={labelClass}>
                  angle
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="capytone-blend-angle"
                    type="range"
                    min={0}
                    max={359}
                    step={1}
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                    className="w-40 accent-[var(--primary)]"
                  />
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {angle}°
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <span className={labelClass}>blend in</span>
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Interpolation space">
              {INTERP_SPACES.map((space) => (
                <Pill
                  key={space.id}
                  active={interp === space.id}
                  onClick={() => setInterp(space.id)}
                  label={`Interpolate in ${space.label}`}
                >
                  {space.label}
                </Pill>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              css defaults to oklab; “oklch longer hue” takes the long way
              round the wheel instead of the short one.
            </p>
          </div>
        </div>
      </StageCard>

      <StageCard index="02" title="The ramp">
        {result ? (
          <>
            <div
              role="img"
              aria-label="The gradient, as modern engines paint it"
              className="h-44 w-full rounded-2xl border border-border"
              style={{ background: result.css }}
            />
            <div
              role="img"
              aria-label="The gradient, as older engines paint it from the hex fallback"
              className="mt-3 h-20 w-full rounded-2xl border border-border"
              style={{ background: result.fallback }}
            />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              top — the modern string. bottom — what an older engine paints
              from the hex fallback.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className={labelClass}>the css</span>
                  <WellCopy text={result.css} />
                </div>
                <pre className="mt-1.5 overflow-x-auto rounded-2xl border border-border/70 bg-muted/50 p-4 font-mono text-[13px] leading-relaxed">
                  {result.css}
                </pre>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className={labelClass}>the fallback</span>
                  <WellCopy text={result.fallback} />
                </div>
                <pre className="mt-1.5 overflow-x-auto rounded-2xl border border-border/70 bg-muted/50 p-4 font-mono text-[13px] leading-relaxed">
                  {result.fallback}
                </pre>
              </div>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            one of the stops won’t parse — fix it above and the ramp returns.
          </p>
        )}
      </StageCard>
    </>
  );
}
