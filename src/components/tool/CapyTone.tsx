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
import { ExtractMode, type ExtractStatus } from "@/components/capytone/ExtractMode";
import { ImageMode } from "@/components/capytone/ImageMode";
import { GenerateInputs } from "@/components/capytone/GenerateMode";
import { PosterStage } from "@/components/capytone/PosterStage";
import { Pill } from "@/components/capytone/controls";
import { generatePalette } from "@/lib/capytone/engine/generate";
import type { LayoutName } from "@/lib/capytone/render";
import type { GradientType, InterpSpace } from "@/lib/capytone/blend";
import {
  harmonyPalette,
  fieldForBaseLightness,
  type FieldDepth,
  type HarmonyId,
} from "@/lib/capytone/harmony";
import { toOklchOrNull } from "@/lib/capytone/engine/color";
import type { CardFormat } from "@/lib/capytone/types";
import type { FamilyFilter } from "@/lib/capytone/engine/families";

/**
 * The colour hub (Phase B + C): six modes on one page — Feel (the original
 * mood flow, untouched), Generate (harmony palettes), Check (WCAG + APCA),
 * Blend (gradient builder), Extract (a URL's palette, via the suite's one
 * user-URL route), Image (a photo's palette and a pixel picker, entirely in
 * the tab — no route). The plan's §6b.3 architecture: Feel and Generate share
 * the poster stage; the other modes own their output cards; the ?mood=&s=
 * share URLs stay byte-for-byte and no new params exist.
 */

export type ModeId = "feel" | "generate" | "check" | "blend" | "extract" | "image";

const MODES: readonly { id: ModeId; label: string }[] = [
  { id: "feel", label: "Feel" },
  { id: "generate", label: "Generate" },
  { id: "check", label: "Check" },
  { id: "blend", label: "Blend" },
  { id: "extract", label: "Extract" },
  { id: "image", label: "Image" },
];

/** The house sage — Generate mode's deterministic default base colour. */
const DEFAULT_BASE = "#8e9b7e";

/** `initialMode` lets an intent page (/contrast-checker) open on its mode. */
export function CapyTone({ initialMode = "feel" }: { initialMode?: ModeId }) {
  return (
    <Suspense fallback={null}>
      <CapyToneInner initialMode={initialMode} />
    </Suspense>
  );
}

function CapyToneInner({ initialMode }: { initialMode: ModeId }) {
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<ModeId>(initialMode);

  // The card Check and Blend review: the last card-owning mode the user
  // visited. Previously they only ever saw the feel card, so a palette just
  // built in Generate was unreachable there and the defaults showed instead.
  const [cardSource, setCardSource] = useState<"feel" | "generate">("feel");
  const switchMode = useCallback((next: ModeId) => {
    if (next === "feel" || next === "generate") setCardSource(next);
    setMode(next);
  }, []);

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
    ? "No exact match yet — improvising in the closest mood family."
    : null;

  // --- Generate (harmony palettes) — pure state, no effects needed ---
  // `genHexDraft` is what the colour box shows while typing; `genHex` only
  // ever holds a colour that parses, so the engine never sees a partial hex
  // (the old `?? 0` silently turned mid-typing into a red family).
  const [genHex, setGenHex] = useState(DEFAULT_BASE);
  const [genHexDraft, setGenHexDraft] = useState(DEFAULT_BASE);
  const [genHarmony, setGenHarmony] = useState<HarmonyId>("complementary");
  const [genField, setGenField] = useState<FieldDepth>("light");
  const [genJitter, setGenJitter] = useState("");

  const onGenHex = useCallback((v: string) => {
    setGenHexDraft(v);
    const parsed = toOklchOrNull(v);
    if (!parsed) return;
    setGenHex(v);
    // The field follows the colour: a dark pick makes a deep card, a light
    // pick a light one; mid-tones keep whatever is selected. Not on 3/4-digit
    // shorthands: typing #6b6b6b passes through #6b6, which is light, and
    // would leave a mid-tone's card on the wrong field.
    const implied = /^#?[0-9a-f]{3,4}$/i.test(v.trim()) ? null : fieldForBaseLightness(parsed.l);
    if (implied) setGenField(implied);
  }, []);

  const generated = useMemo(() => {
    const base = toOklchOrNull(genHex);
    // genHex is gated to parseable values above, so base is always set; the
    // fallback keeps the types honest and never fires.
    return harmonyPalette({
      baseHue: base?.h ?? 0,
      baseColor: base ?? undefined,
      harmony: genHarmony,
      field: genField,
      seed: genJitter,
    });
  }, [genHex, genHarmony, genField, genJitter]);

  // Declared after `generated`: the card Check and Blend review follows the
  // last card-owning mode the user visited.
  const cardPalette = cardSource === "generate" ? generated : palette;

  // Check / Blend / Extract state lives here so mode switches keep it —
  // those components unmount, and the old local state lost your work on
  // every switch. Untouched state follows the current card (the seeded view
  // the modes used to initialise with); once edited, it persists.
  const [checkEdits, setCheckEdits] = useState<{ fg?: string; bg?: string } | null>(null);
  const checkFg = checkEdits?.fg ?? cardPalette?.ink ?? "#1a1a1a";
  const checkBg = checkEdits?.bg ?? cardPalette?.bg ?? "#f9f9f7";

  const [blendEdits, setBlendEdits] = useState<
    Partial<{ stops: string[]; type: GradientType; angle: number; interp: InterpSpace }> | null
  >(null);
  const blendStops =
    blendEdits?.stops ??
    (cardPalette ? [cardPalette.bg, cardPalette.accent] : ["#8e9b7e", "#c07952"]);
  const blendType = blendEdits?.type ?? "linear";
  const blendAngle = blendEdits?.angle ?? 135;
  const blendInterp = blendEdits?.interp ?? "oklab";

  const [extractUrl, setExtractUrl] = useState("");
  const [extractStatus, setExtractStatus] = useState<ExtractStatus>({ state: "idle" });

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
      // Remix only when the page itself has focus. Exempting just inputs
      // meant Space on a focused pill/button cancelled its native
      // activation (preventDefault) and remixed instead — keyboard users
      // could not activate mood pills at all.
      if (
        e.code === "Space" &&
        submitted &&
        mode === "feel" &&
        (e.target === document.body || e.target === document.documentElement)
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
            onClick={() => switchMode(m.id)}
            label={`Switch to ${m.label.toLowerCase()} mode`}
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
              Pick a pill, or arrive from a shared link — every palette is constructed to pass the
              guardrails, never filtered after the fact. Same words, same card, every time.
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
              remixHint="Space"
              share
              emptyState={
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Your card appears here. Try the pills above — or “monsoon”, “late library”, “rainy tuesday”.
                </p>
              }
            />
          </StageCard>

          {/* CARD 3: FROM THE LEXICON — the standalone app's landing gallery,
              now a section on the tool page. */}
          <StageCard index="03" title="From the lexicon">
            <p className="mt-4 text-center font-mono text-[12px] text-muted-foreground">
              Rendered live by the engine, right now
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
              hex={genHexDraft}
              onHex={onGenHex}
              harmony={genHarmony}
              onHarmony={setGenHarmony}
              field={genField}
              onField={setGenField}
              onRemix={remixGenerate}
              feelBg={palette?.bg ?? null}
              onUseFeel={() => {
                if (palette) onGenHex(palette.bg);
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
        <CheckMode
          palette={cardPalette}
          fg={checkFg}
          bg={checkBg}
          onFg={(fg) => setCheckEdits((prev) => ({ ...prev, fg }))}
          onBg={(bg) => setCheckEdits((prev) => ({ ...prev, bg }))}
        />
      ) : mode === "blend" ? (
        <BlendMode
          stops={blendStops}
          type={blendType}
          angle={blendAngle}
          interp={blendInterp}
          onStops={(stops) => setBlendEdits((prev) => ({ ...prev, stops }))}
          onType={(type) => setBlendEdits((prev) => ({ ...prev, type }))}
          onAngle={(angle) => setBlendEdits((prev) => ({ ...prev, angle }))}
          onInterp={(interp) => setBlendEdits((prev) => ({ ...prev, interp }))}
        />
      ) : mode === "extract" ? (
        <ExtractMode
          url={extractUrl}
          onUrl={setExtractUrl}
          status={extractStatus}
          onStatus={setExtractStatus}
          onJumpToFeel={(phrase) => {
            switchMode("feel");
            pick(phrase);
          }}
        />
      ) : (
        <ImageMode
          onSendToCheck={(hex) => {
            setCheckEdits((prev) => ({ ...prev, fg: hex }));
            switchMode("check");
          }}
          onSendToGenerate={(hex) => {
            switchMode("generate");
            onGenHex(hex);
          }}
        />
      )}
    </div>
  );
}
