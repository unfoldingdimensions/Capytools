"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ErrorCard, type ErrorNotice } from "@/components/tool/ErrorCard";
import { CapyArt } from "@/components/mascot/CapyArt";
import { StageCard, StageChip } from "@/components/stage-card";
import { saveBlob } from "@/lib/download";
import { exportPng, drawIndices, previewPitchFor, exportSize } from "@/lib/capypixel/render";
import {
  DecodeFailedError,
  NoInkError,
  decodeImage,
  logoInkAspect,
  logoMask,
  maskToCells,
  sampleGrid,
} from "@/lib/capypixel/render";
import { STYLE_ORDER, STYLE_PRESETS } from "@/lib/capypixel/presets";
import { quantizeImage } from "@/lib/capypixel/quantize";
import type { QuantParams, QuantResult, StyleId } from "@/lib/capypixel/types";
import { cn } from "@/lib/utils";

/** One debounced quantize per control change — the flicker guard. */
const QUANTIZE_DEBOUNCE_MS = 120;

/** The live grid cap: past this, the preview quantizes coarser than the export. */
const LIVE_GRID_CAP = 600;

const EXPORT_SCALES = [1, 2, 4, 8] as const;

const labelClass =
  "font-mono text-[12px] text-muted-foreground";

type Source =
  | { kind: "photo"; img: HTMLImageElement; width: number; height: number; name: string }
  | { kind: "logo"; svgText: string; uw: number; uh: number; name: string };

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
        "rounded-full border px-3 py-1 font-mono text-[13px] transition-colors",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-muted/30 text-muted-foreground hover:border-primary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Slider({
  id,
  label,
  helper,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  helper: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={`${id}-helper`}
        className="mt-1 w-full accent-[var(--primary)]"
      />
      <p id={`${id}-helper`} className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
        {helper}
      </p>
    </div>
  );
}

function Toggle({
  id,
  label,
  helper,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  helper: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2">
      <span>
        <span className={labelClass} id={`${id}-label`}>
          {label}
        </span>
        <p id={`${id}-helper`} className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {helper}
        </p>
      </span>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-helper`}
      />
    </div>
  );
}

export function CapyPixel() {
  const [mode, setMode] = useState<"photo" | "logo">("photo");
  const [source, setSource] = useState<Source | null>(null);
  const [style, setStyle] = useState<StyleId>("faithful");
  const [params, setParams] = useState<QuantParams>(() => STYLE_PRESETS.faithful.params);
  const [scale, setScale] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorNotice | null>(null);
  const [result, setResult] = useState<(QuantResult & { cols: number; rows: number }) | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<HTMLCanvasElement>(null);
  const runId = useRef(0);

  const applyStyle = useCallback((id: StyleId) => {
    setStyle(id);
    setParams({ ...STYLE_PRESETS[id].params });
  }, []);

  const setParam = useCallback(<K extends keyof QuantParams>(key: K, value: QuantParams[K]) => {
    setParams((p) => ({ ...p, [key]: value }));
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      const run = runId.current + 1;
      runId.current = run;
      setError(null);
      setResult(null);
      setStatus("");
      setLoading(true);
      try {
        if (mode === "logo") {
          const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
          if (!isSvg) {
            setError({
              title: "That is not an SVG.",
              body: "Logo mode reads SVG files — simple-icons-style single paths are the sweet spot. Put bitmaps in the photo tab.",
            });
            return;
          }
          const svgText = await file.text();
          const { uw, uh } = logoInkAspect(svgText); // throws NoInkError on empty geometry
          if (runId.current !== run) return;
          setSource({ kind: "logo", svgText, uw, uh, name: file.name });
          setStatus(`read ${file.name} — ink is ${uw.toFixed(0)}×${uh.toFixed(0)} path units.`);
        } else {
          const { img, width, height } = await decodeImage(file);
          if (runId.current !== run) return;
          setSource({ kind: "photo", img, width, height, name: file.name });
          setStatus(`read ${width}×${height} — pick a style; it never leaves this tab.`);
        }
      } catch (caught) {
        if (runId.current !== run) return;
        setSource(null);
        if (caught instanceof NoInkError) {
          setError({
            title: "This SVG produced no ink.",
            body: "The browser parses broken path data into an empty shape with no error — nothing to rasterize here. Try re-exporting the file.",
          });
        } else if (caught instanceof DecodeFailedError) {
          setError({
            title: "This file wouldn't open.",
            body: "The browser's decoder refused it — some CMYK JPEGs and corrupt files do. If it opens anywhere else, re-save it there and bring that copy back.",
          });
        } else {
          setError({
            title: "Something quiet went wrong.",
            body: "The file stopped partway through being read. Try it once more — a second read usually says more.",
          });
        }
      } finally {
        if (runId.current === run) setLoading(false);
      }
    },
    [mode],
  );

  // Paste is a first-class input — screenshots especially.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (file) void processFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [processFile]);

  // The live run: one debounced quantize per change, at the capped grid.
  // The canvases are painted in the effect below — they mount with `result`,
  // so a first run has nowhere to draw yet.
  const painted = useRef<{ preview: HTMLCanvasElement; zoom: HTMLCanvasElement } | null>(null);
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      try {
        let cells: Uint8Array;
        let alpha: Uint8Array;
        let cols: number;
        let rows: number;
        if (source.kind === "photo") {
          cols = Math.min(params.grid, LIVE_GRID_CAP);
          rows = Math.max(1, Math.round((cols * source.height) / source.width));
          const sampled = sampleGrid(source.img, cols, rows);
          cells = sampled.cells;
          alpha = sampled.alpha;
        } else {
          cols = Math.min(params.grid, LIVE_GRID_CAP);
          rows = Math.max(1, Math.round((cols * source.uh) / source.uw));
          const mask = logoMask(source.svgText, cols, rows);
          const made = maskToCells(mask, cols, rows);
          cells = made.cells;
          alpha = made.alpha;
        }

        const out = quantizeImage(cells, cols, rows, params);
        if (cancelled) return;

        // Preview at the small pitch, the crop at the true export pitch.
        const pitch = previewPitchFor(cols, params.cell, params.gutter);
        const preview = drawIndices(out.indices, out.palette, cols, rows, pitch.cell, pitch.gutter, alpha);
        const zoom = drawIndices(out.indices, out.palette, cols, rows, params.cell, params.gutter, alpha);
        painted.current = { preview, zoom };
        setResult({ ...out, cols, rows });
        setLoading(false);
      } catch {
        if (!cancelled) {
          setStatus("This one wouldn't render — try a smaller grid or another file.");
        }
      }
    }, QUANTIZE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source, params]);

  // Paint the mounted canvases whenever a new result arrives.
  useEffect(() => {
    const made = painted.current;
    if (!result || !made) return;
    const target = previewRef.current;
    if (target) {
      target.width = made.preview.width;
      target.height = made.preview.height;
      target.getContext("2d")?.drawImage(made.preview, 0, 0);
    }
    const zoomTarget = zoomRef.current;
    if (zoomTarget) {
      const z = zoomTarget.getContext("2d");
      if (z) {
        z.clearRect(0, 0, zoomTarget.width, zoomTarget.height);
        const sx = Math.max(0, Math.floor((made.zoom.width - 96) / 2));
        const sy = Math.max(0, Math.floor((made.zoom.height - 96) / 2));
        z.drawImage(made.zoom, sx, sy, 96, 96, 0, 0, 96, 96);
      }
    }
  }, [result]);

  const exportPngAtGrid = useCallback(async () => {
    if (!source || busy) return;
    setBusy(true);
    try {
      let cells: Uint8Array;
      let alpha: Uint8Array;
      let cols: number;
      let rows: number;
      if (source.kind === "photo") {
        cols = params.grid;
        rows = Math.max(1, Math.round((cols * source.height) / source.width));
        const sampled = sampleGrid(source.img, cols, rows);
        cells = sampled.cells;
        alpha = sampled.alpha;
      } else {
        cols = params.grid;
        rows = Math.max(1, Math.round((cols * source.uh) / source.uw));
        const mask = logoMask(source.svgText, cols, rows);
        const made = maskToCells(mask, cols, rows);
        cells = made.cells;
        alpha = made.alpha;
      }
      const out = quantizeImage(cells, cols, rows, params);
      const canvas = drawIndices(out.indices, out.palette, cols, rows, params.cell, params.gutter, alpha);
      const blob = await exportPng(canvas, scale);
      const name = `capypixel-${style}-${params.grid}.png`;
      saveBlob(blob, name);
      const size = exportSize(cols, rows, params.cell, scale);
      setStatus(`saved ${name} — ${size.width}×${size.height} px.`);
    } catch {
      setStatus("The export failed — dial the grid down and try again.");
    } finally {
      setBusy(false);
    }
  }, [source, params, scale, style, busy]);

  const derived = params.palette !== "fixed";
  const coarse = params.grid > LIVE_GRID_CAP;
  const starving = derived && result !== null && result.metrics.largestShare > 0.4;
  const screenDoor = style === "1bit" && result !== null && result.metrics.flatness < 0.7;

  return (
    <div className="flex w-full flex-col gap-5">
      {/* CARD 1: THE SOURCE */}
      <StageCard
        index="01"
        title="The source"
        marks
        chips={
          source ? (
            <StageChip tone="sage">{source.kind === "photo" ? "Photo" : "Logo"}</StageChip>
          ) : null
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Pill
            active={mode === "photo"}
            onClick={() => {
              setMode("photo");
              setSource(null);
              setResult(null);
            }}
            label="Photo mode"
          >
            Photo
          </Pill>
          <Pill
            active={mode === "logo"}
            onClick={() => {
              setMode("logo");
              setSource(null);
              setResult(null);
            }}
            label="Logo mode, SVG"
          >
            Logo (SVG)
          </Pill>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept={mode === "logo" ? "image/svg+xml,.svg" : "image/*"}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void processFile(file);
            e.target.value = "";
          }}
        />

        {error ? (
          <div className="mt-4">
            <ErrorCard title={error.title} body={error.body} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file =
                Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/")) ??
                e.dataTransfer.files[0];
              if (file) void processFile(file);
            }}
            className={cn(
              "mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring/50",
              dragOver && "border-primary bg-muted/50",
            )}
          >
            <CapyArt pose="awake" className="w-16" />
            <span className="mt-1 text-sm font-medium text-foreground">
              {mode === "photo" ? "Drop a photo here" : "Drop an SVG logo here"}
            </span>
            <span className="text-xs text-muted-foreground">
              Click to pick one, or paste — it never leaves this tab.
            </span>
            {loading ? (
              <span className="mt-2 font-mono text-[12px] text-muted-foreground">
                Reading…
              </span>
            ) : null}
          </button>
        )}

        {source && !loading ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {source.name} — drop another any time.
          </p>
        ) : null}
      </StageCard>

      {/* CARD 2: THE STYLE */}
      {source ? (
        <StageCard index="02" title="The style">
          <div className="mt-4 flex flex-wrap gap-1.5">
            {STYLE_ORDER.map((id) => (
              <Pill
                key={id}
                active={style === id}
                onClick={() => applyStyle(id)}
                label={`Style ${STYLE_PRESETS[id].label}`}
              >
                {STYLE_PRESETS[id].label}
              </Pill>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {STYLE_PRESETS[style].blurb}
          </p>

          <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Slider
              id="capypixel-grid"
              label="Grid width"
              helper="How many cells across — the single biggest lever. Low is chunky and graphic; high keeps detail."
              min={20}
              max={1000}
              step={2}
              value={params.grid}
              onChange={(v) => setParam("grid", v)}
            />
            {derived ? (
              <Slider
                id="capypixel-colors"
                label="Colours"
                helper="How many colours the derived palette gets. More is faithful to the photo; fewer is bolder."
                min={2}
                max={32}
                step={1}
                value={params.colors}
                onChange={(v) => setParam("colors", v)}
              />
            ) : null}
            <Slider
              id="capypixel-band"
              label="Dither band"
              helper="How wide a range of tones gets dithered. Lower values snap more areas solid — that is what makes 1-bit read as drawing."
              min={0}
              max={1}
              step={0.05}
              value={params.band}
              onChange={(v) => setParam("band", v)}
            />
            <Slider
              id="capypixel-black"
              label="Black point"
              helper="Anything darker than this becomes solid black. Raises contrast."
              min={0}
              max={0.6}
              step={0.01}
              value={params.black}
              onChange={(v) => setParam("black", v)}
            />
            <Slider
              id="capypixel-white"
              label="White point"
              helper="Anything brighter than this becomes solid white. Brightens the highlights."
              min={0.4}
              max={1}
              step={0.01}
              value={params.white}
              onChange={(v) => setParam("white", v)}
            />
            <Slider
              id="capypixel-gamma"
              label="Gamma"
              helper="Bends the tones in between — above 1 brightens the mid-tones, below 1 darkens them."
              min={0.4}
              max={2.5}
              step={0.05}
              value={params.gamma}
              onChange={(v) => setParam("gamma", v)}
            />
            {!derived ? (
              <Slider
                id="capypixel-gutter"
                label="Gutter"
                helper="gap between cells — the visible tile grid. keep it at 0 for photographs; the gaps throw away detail."
                min={0}
                max={4}
                step={1}
                value={params.gutter}
                onChange={(v) => setParam("gutter", v)}
              />
            ) : null}
            <Toggle
              id="capypixel-outline"
              label="Outline"
              helper="Draws a dark line along strong edges so the subject stands away from the background."
              checked={params.outline}
              onChange={(v) => setParam("outline", v)}
            />
            <Toggle
              id="capypixel-levels"
              label="Auto-levels"
              helper="Stretches the darkest and lightest tones to fill the range. Good for a hazy photo — but it fills the mid-tones, the opposite of what 1-bit needs."
              checked={params.levels}
              onChange={(v) => setParam("levels", v)}
            />
          </div>

          {starving ? (
            <p className="mt-4 text-[13px] text-[var(--clay)]">
              One colour is doing half the work — fewer colours, or the portrait style (it bins
              the palette), spreads the load.
            </p>
          ) : null}
          {screenDoor ? (
            <p className="mt-4 text-[13px] text-[var(--clay)]">
              Too much dither — narrow the band and the areas go solid.
            </p>
          ) : null}
          {mode === "photo" && style === "whale" ? (
            <p className="mt-4 text-[13px] text-[var(--clay)]">
              The whale look was drawn for a pale shape on a dark background — a full photo will
              collapse into the bottom of the ramp. The logo tab is where this style belongs.
            </p>
          ) : null}
        </StageCard>
      ) : null}

      {/* CARD 3: THE PROOF */}
      {source ? (
        <StageCard index="03" title="The proof">
          {result ? (
            <>
              <div className="flex justify-center rounded-2xl border border-border bg-muted/30 p-4">
                <canvas
                  ref={previewRef}
                  aria-label={`Pixel-art preview, ${result.cols} by ${result.rows} cells`}
                  role="img"
                  className="h-auto max-w-full"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Live preview{coarse ? " (coarser than export)" : ""} — the export runs your full{" "}
                {params.grid}-cell grid.
              </p>

              <div className="mt-5 flex flex-wrap items-start justify-center gap-6">
                <figure className="flex flex-col items-center gap-2">
                  <canvas
                    ref={zoomRef}
                    width={96}
                    height={96}
                    aria-label="100% crop at true cell pitch"
                    role="img"
                    className="rounded-lg border border-border"
                  />
                  <figcaption className="font-mono text-[12px] text-muted-foreground">
                    100% crop · True pitch
                  </figcaption>
                </figure>

                <div>
                  <span className={labelClass}>Palette in use</span>
                  <ul className="mt-1.5 flex max-w-[240px] flex-wrap gap-1">
                    {result.palette.map((c) => {
                      const hexValue = `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
                      return (
                        <li
                          key={hexValue}
                          title={hexValue}
                          aria-label={`${hexValue} swatch`}
                          className="size-6 rounded-md border border-border/60"
                          style={{ backgroundColor: hexValue }}
                        />
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                <div>
                  <span className={labelClass}>Export scale</span>
                  <div className="mt-1.5 flex gap-1.5">
                    {EXPORT_SCALES.map((s) => (
                      <Pill
                        key={s}
                        active={scale === s}
                        onClick={() => setScale(s)}
                        label={`Export scale ${s} times`}
                      >
                        {s}×
                      </Pill>
                    ))}
                  </div>
                </div>
                <StageChip tone="sage">
                  {result.cols}×{result.rows} cells · cell {params.cell}px · scale {scale}×
                </StageChip>
                <Button
                  size="sm"
                  className="min-w-[84px] rounded-full"
                  onClick={() => void exportPngAtGrid()}
                  disabled={busy}
                >
                  <Download className="mr-1.5 size-3.5" />
                  Download PNG
                </Button>
              </div>
              <p aria-live="polite" className="mt-3 min-h-5 text-center text-xs text-muted-foreground">
                {status}
              </p>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {loading ? "Reading…" : "Quantizing…"}
            </p>
          )}
        </StageCard>
      ) : null}
    </div>
  );
}
