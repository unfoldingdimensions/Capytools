"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { StageCard, StageChip } from "@/components/stage-card";
import { ExampleCards } from "@/components/capytone/ExampleCards";
import { MoodPills } from "@/components/capytone/MoodPills";
import { StartColors } from "@/components/capytone/StartColors";
import { COPIED_MS } from "@/lib/capytools/feedback";
import { renderCard, type LayoutName } from "@/lib/capytone/render";
import { generatePalette } from "@/lib/capytone/engine/generate";
import {
  copyPngToClipboard,
  copyText,
  cssTokens,
  downloadPng,
  pngFilename,
  shareText,
  tailwindTokens,
} from "@/lib/capytone/export";
import { CARD_FORMATS, type CardFormat, type MoodPalette } from "@/lib/capytone/types";
import type { FamilyFilter } from "@/lib/capytone/engine/families";
import { cn } from "@/lib/utils";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

/** House export convention (Wrapped/OG): PNGs render at twice the logical size. */
const EXPORT_SCALE = 2;

function Pill({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-muted/30 text-muted-foreground hover:border-primary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function CapyTone() {
  return (
    <Suspense fallback={null}>
      <CapyToneInner />
    </Suspense>
  );
}

function CapyToneInner() {
  const searchParams = useSearchParams();

  const [submitted, setSubmitted] = useState<string | null>(null);
  const [seed, setSeed] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutName>("editorial");
  const [format, setFormat] = useState<CardFormat>("wide");
  const [palette, setPalette] = useState<MoodPalette | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>("all");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const flash = useCallback((msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(""), COPIED_MS);
  }, []);

  const render = useCallback(
    (phrase: string, seedChoice: string | null) => {
      const canvas = canvasRef.current;
      if (!canvas || !phrase) return;
      const result = generatePalette(phrase, { seed: seedChoice ?? undefined });
      setPalette(result.palette);
      setSeed(result.palette.seed);
      // The preview draws at the screen's own density; the drawing maths
      // stays at the format's logical size either way.
      const dpr = window.devicePixelRatio || 1;
      renderCard(canvas, result.palette, layout, format, dpr).catch(() => {
        setNote("something went wrong drawing that one — try again");
      });
      setNote(
        result.fallback
          ? "no exact match yet — improvising in the closest mood family."
          : null,
      );
    },
    [layout, format],
  );

  // Deep-link: ?mood=&s= reproduces the card exactly.
  const applyDeepLink = useCallback(() => {
    const moodParam = searchParams.get("mood");
    if (moodParam) {
      setSeed(searchParams.get("s"));
      setSubmitted(moodParam);
    }
  }, [searchParams]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(applyDeepLink, [applyDeepLink]);

  useEffect(() => {
    if (submitted) render(submitted, seed);
  }, [submitted, seed, layout, format, render]);

  // Keep the address bar shareable: /capytone?mood=..&s=..
  useEffect(() => {
    if (!submitted) return;
    const params = new URLSearchParams();
    params.set("mood", submitted);
    if (seed) params.set("s", seed);
    window.history.replaceState(null, "", `/capytone?${params.toString()}`);
  }, [submitted, seed]);

  // Remix: same mood, fresh deterministic seed. Spacebar shortcut.
  const remix = useCallback(() => {
    if (!submitted) return;
    const nextSeed = Math.random().toString(36).slice(2, 7);
    setSeed(nextSeed);
    render(submitted, nextSeed);
  }, [submitted, render]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && submitted && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        remix();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [remix, submitted]);

  /** A fresh offscreen card at export density — the preview stays untouched. */
  const exportCanvas = useCallback(
    async (p: MoodPalette): Promise<HTMLCanvasElement> => {
      const offscreen = document.createElement("canvas");
      await renderCard(offscreen, p, layout, format, EXPORT_SCALE);
      return offscreen;
    },
    [layout, format],
  );

  const download = useCallback(async () => {
    if (!palette) return;
    downloadPng(await exportCanvas(palette), palette);
    flash(`saved ${pngFilename(palette)} — 2× density.`);
  }, [palette, exportCanvas, flash]);

  const copyImage = useCallback(async () => {
    if (!palette) return;
    const ok = await copyPngToClipboard(await exportCanvas(palette));
    flash(ok ? "card copied — paste anywhere" : "clipboard blocked; try download");
  }, [palette, exportCanvas, flash]);

  const pick = useCallback((phrase: string) => {
    setSeed(null);
    setSubmitted(phrase);
  }, []);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* CARD 1: THE MOOD */}
      <StageCard
        index="01"
        title="The mood"
        marks
        chips={submitted ? <StageChip tone="sage">{palette?.slug ?? "…"}</StageChip> : null}
      >
        <p className="mt-4 text-sm text-muted-foreground">
          pick a pill, or arrive from a shared link — every palette is constructed to pass the
          guardrails, never filtered after the fact. same words, same card, every time.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <MoodPills
            filter={familyFilter}
            onFilterChange={setFamilyFilter}
            onPick={pick}
          />
          {/* Start-color row follows the active filter — every family
              carries its own ladder now. */}
          {familyFilter !== "all" && (
            <StartColors
              family={familyFilter}
              onPick={(phrase) => {
                // Engine syntax: stops activate via the explicit
                // "start from <stop>" command so bare phrases like
                // "golden hour" keep resolving to their real moods.
                pick(`start from ${phrase}`);
              }}
            />
          )}
        </div>
      </StageCard>

      {/* CARD 2: THE CARD */}
      {submitted ? (
        <StageCard index="02" title="The card">
          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <span className={labelClass}>poster style</span>
              <div className="flex flex-wrap items-center gap-1.5" role="group">
                <Pill active={layout === "editorial"} onClick={() => setLayout("editorial")} label="Editorial poster style">
                  Editorial
                </Pill>
                <Pill active={layout === "minimal"} onClick={() => setLayout("minimal")} label="Minimal poster style">
                  Minimal
                </Pill>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={labelClass}>format</span>
              <div className="flex flex-wrap items-center gap-1.5" role="group">
                {(Object.keys(CARD_FORMATS) as CardFormat[]).map((f) => (
                  <Pill
                    key={f}
                    active={format === f}
                    onClick={() => setFormat(f)}
                    label={`${f} format, ${CARD_FORMATS[f].w} by ${CARD_FORMATS[f].h}`}
                  >
                    {f === "wide" ? "Wide 1200×630" : "Square 1080×1080"}
                  </Pill>
                ))}
              </div>
            </div>
          </div>

          {/* Mounted on `submitted` alone: render() needs this node to exist
              before it can compute the palette that fills the actions below. */}
          <div className="mt-5 flex justify-center rounded-2xl border border-border bg-muted/30 p-4">
            <canvas
              key={format}
              ref={canvasRef}
              aria-label={`Your card for ${submitted}`}
              className="h-auto w-full max-w-[880px] rounded-xl border border-border"
            />
          </div>

          {note ? (
            <p className="mt-3 text-center text-[13px] text-[var(--clay)]">{note}</p>
          ) : null}

          {palette ? (
            <>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" className="min-w-[84px] rounded-full" onClick={() => void download()}>
                  {pngFilename(palette)}
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => void copyImage()}>
                  Copy image
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => void copyText(cssTokens(palette)).then(() => flash("CSS variables copied"))}
                >
                  Copy CSS
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => void copyText(tailwindTokens(palette)).then(() => flash("Tailwind tokens copied"))}
                >
                  Copy Tailwind
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    void copyText(shareText(palette, window.location.href)).then(() => flash("share text copied"))
                  }
                >
                  Copy share text
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={remix}>
                  Remix ⏎space
                </Button>
              </div>
              <p aria-live="polite" className="mt-3 min-h-5 text-center text-xs text-muted-foreground">
                {status}
              </p>
            </>
          ) : null}
        </StageCard>
      ) : (
        <StageCard index="02" title="The card">
          <p className="py-8 text-center text-sm text-muted-foreground">
            your card appears here. try the pills above — or “monsoon”, “late library”, “rainy tuesday”.
          </p>
        </StageCard>
      )}

      {/* CARD 3: FROM THE LEXICON — the standalone app's landing gallery,
          now a section on the tool page. */}
      <StageCard index="03" title="From the lexicon">
        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          rendered live by the engine, right now
        </p>
        <div className="mt-4">
          <ExampleCards />
        </div>
      </StageCard>
    </div>
  );
}
