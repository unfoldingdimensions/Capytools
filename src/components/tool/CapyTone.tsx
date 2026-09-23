"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readHandoff } from "@/lib/capytools/handoff";

import { StageCard, StageChip } from "@/components/stage-card";
import { ExampleCards } from "@/components/capytone/ExampleCards";
import { MoodPills } from "@/components/capytone/MoodPills";
import { StartColors } from "@/components/capytone/StartColors";
import { BlendMode } from "@/components/capytone/BlendMode";
import { CheckMode } from "@/components/capytone/CheckMode";
import { ExtractMode } from "@/components/capytone/ExtractMode";
import { GenerateInputs } from "@/components/capytone/GenerateMode";
import { PosterStage } from "@/components/capytone/PosterStage";
import { Pill } from "@/components/capytone/controls";
import { generatePalette } from "@/lib/capytone/engine/generate";
import type { LayoutName } from "@/lib/capytone/render";
import {
  harmonyPalette,
  type FieldDepth,
  type HarmonyId,
} from "@/lib/capytone/harmony";
import { toOklchOrNull } from "@/lib/capytone/engine/color";
import type { CardFormat } from "@/lib/capytone/types";
import type { FamilyFilter } from "@/lib/capytone/engine/families";

/**
 * The colour hub (Phase B + C): five modes on one page — Feel (the original
 * mood flow, untouched), Generate (harmony palettes), Check (WCAG + APCA),
 * Blend (gradient builder), Extract (a URL's palette, via the suite's one
 * user-URL route). The plan's §6b.3 architecture: Feel and Generate share
 * the poster stage; the other modes own their output cards; the ?mood=&s=
 * share URLs stay byte-for-byte and no new params exist.
 */

type ModeId = "feel" | "generate" | "check" | "blend" | "extract";

const MODES: readonly { id: ModeId; label: string }[] = [
  { id: "feel", label: "feel" },
  { id: "generate", label: "generate" },
  { id: "check", label: "check" },
  { id: "blend", label: "blend" },
  { id: "extract", label: "extract" },
];

/** The house sage — Generate mode's deterministic default base colour. */
const DEFAULT_BASE = "#8e9b7e";

export function CapyTone() {
  return (
    <Suspense fallback={null}>
      <CapyToneInner />
    </Suspense>
  );
}

function CapyToneInner() {
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<ModeId>("feel");

  // --- Feel (the mood flow, exactly as Phase A shipped it) ---
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [seed, setSeed] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutName>("editorial");
  const [format, setFormat] = useState<CardFormat>("wide");
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>("all");

  // The mood engine is pure and deterministic, so the palette derives in a
  // memo — no effect, no cascading state. `seed` stays null until a remix
  // pins one; the engine derives its own until then.
  const feel = useMemo(
    () => (submitted ? generatePalette(submitted, { seed: seed ?? undefined }) : null),
    [submitted, seed],
  );
  const palette = feel?.palette ?? null;
  const note = feel?.fallback
    ? "no exact match yet — improvising in the closest mood family."
    : null;

  // --- Generate (harmony palettes) — pure state, no effects needed ---
  const [genHex, setGenHex] = useState(DEFAULT_BASE);
  const [genHarmony, setGenHarmony] = useState<HarmonyId>("complementary");
  const [genField, setGenField] = useState<FieldDepth>("light");
  const [genJitter, setGenJitter] = useState("");

  const generated = useMemo(() => {
    const hue = toOklchOrNull(genHex)?.h ?? 0;
    return harmonyPalette({ baseHue: hue, harmony: genHarmony, field: genField, seed: genJitter });
  }, [genHex, genHarmony, genField, genJitter]);

  // Deep-link: ?mood=&s= reproduces the card exactly.
  // A proof-band hand-off arrives in the fragment instead, so the phrase is
  // never sent with the page request (lib/capytools/handoff).
  const applyDeepLink = useCallback(() => {
    const moodParam = searchParams.get("mood");
    if (moodParam) {
      setSeed(searchParams.get("s"));
      setSubmitted(moodParam);
      return;
    }
    const handed = readHandoff();
    if (handed) setSubmitted(handed);
  }, [searchParams]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(applyDeepLink, [applyDeepLink]);

  // Keep the address bar shareable: /capytone?mood=..&s=.. — the seed that
  // lands in the URL is the engine's resolved one (derived or remixed).
  useEffect(() => {
    if (!submitted || !palette) return;
    const params = new URLSearchParams();
    params.set("mood", submitted);
    params.set("s", palette.seed);
    window.history.replaceState(null, "", `/capytone?${params.toString()}`);
  }, [submitted, palette]);

  // Remix: same mood, fresh deterministic seed. Spacebar shortcut — feel
  // mode only; the other modes own the keyboard otherwise.
  const remix = useCallback(() => {
    if (!submitted || mode !== "feel") return;
    setSeed(Math.random().toString(36).slice(2, 7));
  }, [submitted, mode]);

  const remixGenerate = useCallback(() => {
    setGenJitter(Math.random().toString(36).slice(2, 7));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        submitted &&
        mode === "feel" &&
        !(e.target instanceof HTMLInputElement)
      ) {
        e.preventDefault();
        remix();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [remix, submitted, mode]);

  const pick = useCallback((phrase: string) => {
    setSeed(null);
    setSubmitted(phrase);
  }, []);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* THE MODES — the hub's segmented control (CapyResize's stage tabs,
          raised above the cards since each mode owns its own card 01). */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="CapyTone mode">
        {MODES.map((m) => (
          <Pill
            key={m.id}
            active={mode === m.id}
            onClick={() => setMode(m.id)}
            label={`Switch to ${m.label} mode`}
          >
            {m.label}
          </Pill>
        ))}
      </div>

      {mode === "feel" ? (
        <>
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

          {/* CARD 2: THE CARD — the shared poster stage */}
          <StageCard index="02" title="The card">
            <PosterStage
              palette={palette}
              note={note}
              layout={layout}
              format={format}
              onLayout={setLayout}
              onFormat={setFormat}
              ariaLabel={`Your card for ${submitted ?? "mood"}`}
              onRemix={remix}
              remixHint="space"
              share
              emptyState={
                <p className="py-8 text-center text-sm text-muted-foreground">
                  your card appears here. try the pills above — or “monsoon”, “late library”, “rainy tuesday”.
                </p>
              }
            />
          </StageCard>

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
        </>
      ) : mode === "generate" ? (
        <>
          {/* CARD 1: THE SEED */}
          <StageCard
            index="01"
            title="The seed"
            marks
            chips={<StageChip tone="sage">{generated.slug}</StageChip>}
          >
            <GenerateInputs
              hex={genHex}
              onHex={setGenHex}
              harmony={genHarmony}
              onHarmony={setGenHarmony}
              field={genField}
              onField={setGenField}
              onRemix={remixGenerate}
              feelBg={palette?.bg ?? null}
              onUseFeel={() => {
                if (palette) setGenHex(palette.bg);
              }}
            />
          </StageCard>

          {/* CARD 2: THE CARD — same stage, harmony palette */}
          <StageCard index="02" title="The card">
            <PosterStage
              palette={generated}
              layout={layout}
              format={format}
              onLayout={setLayout}
              onFormat={setFormat}
              ariaLabel={`Generated ${genHarmony} palette card`}
              onRemix={remixGenerate}
              emptyState={null}
            />
          </StageCard>
        </>
      ) : mode === "check" ? (
        <CheckMode palette={palette} />
      ) : mode === "blend" ? (
        <BlendMode palette={palette} />
      ) : (
        <ExtractMode
          onJumpToFeel={(phrase) => {
            setMode("feel");
            pick(phrase);
          }}
        />
      )}
    </div>
  );
}
