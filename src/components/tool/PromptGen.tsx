"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Dices, Lock } from "lucide-react";

import {
  CATEGORY_BY_ID,
  ENGINES,
  PLATFORM_PRESETS,
  STYLE_PRESETS,
  TIER_META,
  applyStylePreset,
  categoriesForTier,
  platformById,
  weightedPick,
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
  "negative_prompt",
  "stylize_mj",
  "chaos_mj",
  "guidance_flux",
  "video_motion",
  "video_camera",
  "video_duration",
];

const VIDEO_CATS: CategoryId[] = ["video_camera", "video_motion", "video_duration"];

/** How many exclusion terms to feed the engines' negative slots. */
const NEGATIVE_COUNT = 4;

const NONE = "__none__";

/**
 * Each `negative_prompt` option is a single term, but assemble() reads the
 * category value as a comma list (it splits and slices to negativeCount). One
 * draw would therefore yield exactly one negative, so draw a few and join.
 */
function drawNegatives(): string {
  const opts = CATEGORY_BY_ID.negative_prompt.options;
  const out = new Set<string>();
  for (let i = 0; out.size < NEGATIVE_COUNT && i < 40; i++) {
    out.add(weightedPick(opts).value);
  }
  return [...out].join(", ");
}

/**
 * Always draw at the widest tier; the narrower tiers are a filter at assemble
 * time. Tier changes then re-derive from the same pick-set rather than redraw.
 */
function drawPickSet(): PickSet {
  const set = buildPickSet([...categoriesForTier("high"), ...EXTRA_CATS]);
  set.negative_prompt = drawNegatives();
  return set;
}

export function PromptGen() {
  const [tier, setTier] = useState<PromptTier>("high");
  const [engine, setEngine] = useState<Engine>("Gemini");
  const [styleId, setStyleId] = useState<string | null>(null);
  const [platformId, setPlatformId] = useState<string | null>(null);
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

  const { prompt, resolved } = useMemo(() => {
    if (!pickSet) return { prompt: "", resolved: null as PickSet | null };

    const keep = new Set<CategoryId>([...categoriesForTier(tier), ...EXTRA_CATS]);
    const narrowed: PickSet = {};
    for (const [id, value] of Object.entries(pickSet)) {
      if (keep.has(id as CategoryId)) narrowed[id as CategoryId] = value;
    }

    const set = applyStylePreset(narrowed, styleId);
    const ratio = platformId ? platformById(platformId)?.ratio : undefined;
    if (ratio) set.aspect_ratio = ratio;

    const out = assemble(set, {
      engine,
      seed,
      prefix: chatPrefix
        ? isVideo
          ? "Create a video of:"
          : "Create an image of:"
        : undefined,
    });
    return { prompt: out.prompt, resolved: set };
  }, [pickSet, tier, styleId, platformId, engine, seed, chatPrefix, isVideo]);

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

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
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
                {PLATFORM_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label} · {p.ratio}
                  </SelectItem>
                ))}
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

        <pre className="mt-3 min-h-24 whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-foreground">
          {prompt || "…"}
        </pre>

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
