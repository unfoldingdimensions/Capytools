"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Dices, Lock } from "lucide-react";

import {
  CATEGORY_BY_ID,
  ENGINE_NOTE,
  ENGINES,
  LIVING_ARTIST_BLOCKING_ENGINES,
  PLATFORM_PRESETS,
  STYLE_PRESETS,
  TIER_META,
  VIDEO_RATIOS,
  applyStylePreset,
  categoriesForTier,
  frameFor,
  isLivingArtist,
  type CategoryId,
  type Engine,
  type PickSet,
  type PromptTier,
} from "@/lib/promptgen/criteria";
import { assemble, buildPickSet, generateSeed } from "@/lib/promptgen/assemble";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Categories drawn on top of the tier list. Engine params live here too — every
 * engine's params are drawn every time, and each dialect ignores the ones it
 * doesn't speak. That keeps engine switching a pure re-format of the SAME
 * pick-set instead of a fresh random draw.
 */
const EXTRA_CATS: CategoryId[] = [
  "stylize_mj",
  "chaos_mj",
  "guidance_flux",
  "video_motion",
  "video_camera",
  "video_duration",
];

const VIDEO_CATS: CategoryId[] = ["video_camera", "video_motion", "video_duration"];

const NONE = "__none__";

/** The 95 researched artist references, for the Artist select. */
const ARTIST_OPTIONS: string[] = CATEGORY_BY_ID.artist_reference.options.map((o) => o.value);

/**
 * Always draw at the widest tier; the narrower tiers are a filter at assemble
 * time. Tier changes then re-derive from the same pick-set rather than redraw.
 */
function drawPickSet(): PickSet {
  // negative_prompt is deliberately NOT drawn. assemble() treats any value there
  // as a user override that beats the researched per-engine list, so pre-filling
  // it with random generic terms made NEGATIVES_BY_ENGINE dead code and gave all
  // five engines the same engine-blind exclusions.
  return buildPickSet([...categoriesForTier("high"), ...EXTRA_CATS]);
}

export function PromptGen() {
  const [tier, setTier] = useState<PromptTier>("high");
  const [engine, setEngine] = useState<Engine>("Gemini");
  const [styleId, setStyleId] = useState<string | null>(null);
  const [platformId, setPlatformId] = useState<string | null>(null);
  const [artist, setArtist] = useState<string | null>(null);
  const [chatPrefix, setChatPrefix] = useState(true);
  const [locked, setLocked] = useState(false);
  const [pickSet, setPickSet] = useState<PickSet | null>(null);
  const [seed, setSeed] = useState(0);
  const [copied, setCopied] = useState(false);

  // Drawn in an effect, not in state init: buildPickSet uses Math.random, which
  // would differ between the server render and hydration.
  const randomize = useCallback(() => {
    setPickSet(drawPickSet());
    setSeed(generateSeed());
    setCopied(false);
  }, []);

  // The draw is deliberately client-only (see above): doing it in a state
  // initialiser would make the server HTML and the first client render disagree.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(randomize, [randomize]);

  const isVideo = engine === "Video";

  const { prompt, resolved, artistDropped, ratioUnsupported } = useMemo(() => {
    if (!pickSet) {
      return {
        prompt: "",
        resolved: null as PickSet | null,
        frame: undefined,
        artistDropped: false,
        ratioUnsupported: false,
      };
    }

    const keep = new Set<CategoryId>([...categoriesForTier(tier), ...EXTRA_CATS]);
    const narrowed: PickSet = {};
    for (const [id, value] of Object.entries(pickSet)) {
      if (keep.has(id as CategoryId)) narrowed[id as CategoryId] = value;
    }

    const set = applyStylePreset(narrowed, styleId);

    // An explicitly chosen artist overrides the draw, and is applied after the
    // tier filter so it survives tiers that don't include artist_reference.
    if (artist) set.artist_reference = artist;

    // Platforms carry a separate image and video frame; frameFor picks by engine.
    const frame = frameFor(platformId, engine);
    if (frame) set.aspect_ratio = frame.ratio;

    // assemble() drops living-artist references for the engines that block them.
    // Only SAY so when the artist was chosen deliberately: two thirds of the 95
    // references are living, so reporting every randomized draw made the note
    // near-permanent noise explaining a choice the reader never made.
    const artistDropped =
      !!artist && LIVING_ARTIST_BLOCKING_ENGINES.includes(engine) && isLivingArtist(artist);

    // Some platform video frames are supported by no vendor (Pinterest 2:3,
    // Instagram feed 4:5). Say so rather than silently substituting a ratio.
    const ratioUnsupported = isVideo && !!frame && !VIDEO_RATIOS.has(frame.ratio);

    const out = assemble(set, {
      engine,
      seed,
      px: frame?.px,
      prefix: chatPrefix
        ? isVideo
          ? "Create a video of:"
          : "Create an image of:"
        : undefined,
    });
    return { prompt: out.prompt, resolved: set, frame, artistDropped, ratioUnsupported };
  }, [pickSet, tier, styleId, platformId, artist, engine, seed, chatPrefix, isVideo]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      return; // denied / insecure context — the block below is selectable anyway
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {/* ---- controls ---- */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <Field label="Detail">
          <div className="inline-flex rounded-full bg-muted/50 p-1">
            {TIER_META.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTier(t.id)}
                aria-pressed={tier === t.id}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/50",
                  tier === t.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Engine">
            <Select value={engine} onValueChange={(v) => setEngine(v as Engine)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENGINES.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Style">
            <Select
              value={styleId ?? NONE}
              onValueChange={(v) => setStyleId(v === NONE ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None / randomized</SelectItem>
                {STYLE_PRESETS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Artist">
            <Select
              value={artist ?? NONE}
              onValueChange={(v) => setArtist(v === NONE ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Randomized</SelectItem>
                {ARTIST_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a.replace(/^in the style of\s+/i, "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Destination">
            <Select
              value={platformId ?? NONE}
              onValueChange={(v) => setPlatformId(v === NONE ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Any / no aspect ratio</SelectItem>
                {PLATFORM_PRESETS.map((p) => {
                  const f = isVideo ? p.video : p.image;
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label} · {f.ratio} · {f.px}
                      {p.unverified ? " · unverified" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={chatPrefix} onCheckedChange={setChatPrefix} />
            <span className="text-muted-foreground">
              Force generate in chat{" "}
              <span className="font-mono text-xs text-foreground/70">
                “{isVideo ? "Create a video of:" : "Create an image of:"}”
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 text-sm">
            <Switch checked={locked} onCheckedChange={setLocked} />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Lock className="size-3.5" aria-hidden />
              Lock this draw
            </span>
          </label>
        </div>
      </div>

      {/* ---- output ---- */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {engine} · seed {pickSet ? seed : "—"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={copy}
            disabled={!prompt}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {/* Inset panel: bg-muted against the card's bg-card reads as a well in
            both themes, so the prompt is an object you copy rather than body text. */}
        <pre className="mt-3 min-h-24 whitespace-pre-wrap break-words rounded-2xl border border-border/70 bg-muted/50 p-4 font-mono text-[13px] leading-relaxed text-foreground">
          {prompt || "…"}
        </pre>

        {/* The engine's own guidance, directly under the thing it describes. */}
        <p className="mt-3 text-xs leading-snug text-foreground">
          <span className="font-mono font-medium">{engine}</span>
          <span className="text-muted-foreground"> → </span>
          <span className="font-medium">{ENGINE_NOTE[engine]}</span>
        </p>

        {artistDropped || ratioUnsupported ? (
          <div className="mt-2 space-y-1.5">
            {artistDropped ? (
              <p className="text-xs leading-snug text-muted-foreground">
                Artist reference dropped —{" "}
                {engine === "Video" ? "the video models block" : "Gemini blocks"} living-artist
                styles. Our living/dead data is partly unverified, so this errs toward dropping.
              </p>
            ) : null}
            {ratioUnsupported ? (
              <p className="text-xs leading-snug text-muted-foreground">
                No video model takes this frame — Runway, Kling and Seedance do 16:9, 9:16 and
                1:1. The prompt still carries the platform&apos;s ratio; change it in your tool.
              </p>
            ) : null}
          </div>
        ) : null}

        {isVideo && resolved ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {VIDEO_CATS.map((id) =>
              resolved[id] ? (
                <span
                  key={id}
                  className="rounded-full bg-muted/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                >
                  {CATEGORY_BY_ID[id].label.replace(/\s*\((?:video|param)\)/i, "")}: {resolved[id]}
                </span>
              ) : null,
            )}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {locked
              ? "Draw locked — tweak the controls above to re-word the same scene."
              : "Every control re-words this scene; Randomize draws a new one."}
          </p>
          <Button className="rounded-full" onClick={randomize} disabled={locked}>
            <Dices className="size-4" />
            Randomize
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
