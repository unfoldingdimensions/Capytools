"use client";

/**
 * Image mode — the colour hub's sixth mode: a photo in, a ranked palette out,
 * and a picker for any single pixel.
 *
 * Everything happens in this tab. The photo is decoded by the browser
 * (`decodeImage`, which honours EXIF orientation), drawn to canvases and read
 * back; no request is made and nothing is stored. Extract mode is the other
 * way round — it asks the server to fetch a website — and the copy says so.
 *
 * A pick reads the ORIGINAL pixel (a 1×1 source rect straight from the
 * decoded image), not the downscaled sampling copy or the on-screen canvas.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { CapyArt } from "@/components/mascot/CapyArt";
import { StageCard } from "@/components/stage-card";
import { ErrorCard } from "@/components/tool/ErrorCard";
import { BTN, FOCUS, GROUP } from "@/components/ui/house";
import { DecodeFailedError, decodeImage } from "@/lib/capyresize/render";
import { COPIED_MS } from "@/lib/capytools/feedback";
import { copyText, cssVariables, tailwindColors } from "@/lib/capytone/export";
import {
  DISPLAY_MAX_SIDE,
  SAMPLE_MAX_SIDE,
  clientToPixel,
  colourFormats,
  fitWithin,
  paletteFromPixels,
  rgbToHex,
  type ImagePalette,
} from "@/lib/capytone/image";
import { cn } from "@/lib/utils";

import { labelClass } from "./controls";

interface Loaded {
  img: HTMLImageElement;
  width: number;
  height: number;
  name: string;
  palette: ImagePalette;
}

/** `hex` is null on a fully transparent pixel — there is no colour to report. */
interface Picked {
  x: number;
  y: number;
  hex: string | null;
  alpha: number;
}

const ARROWS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const CHECKER =
  "repeating-conic-gradient(var(--border) 0% 25%, var(--card) 0% 50%) 0 0 / 16px 16px";

function drawCanvas(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new DecodeFailedError();
  return ctx;
}

/** The one original pixel at (x, y): a 1×1 source rect, no resampling. */
function readPixel(img: HTMLImageElement, x: number, y: number): Picked {
  const ctx = drawCanvas(1, 1);
  ctx.drawImage(img, x, y, 1, 1, 0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return { x, y, hex: a === 0 ? null : rgbToHex(r, g, b), alpha: a };
}

export function ImageMode() {
  const fileInput = useRef<HTMLInputElement>(null);
  const display = useRef<HTMLCanvasElement>(null);
  const copiedTimer = useRef<number | undefined>(undefined);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setFailed(false);
    try {
      const { img, width, height } = await decodeImage(file);
      const { w, h } = fitWithin(width, height, SAMPLE_MAX_SIDE);
      const ctx = drawCanvas(w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const palette = paletteFromPixels(ctx.getImageData(0, 0, w, h).data);
      setLoaded({ img, width, height, name: file.name, palette });
      setPicked(null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Paste is a first-class input — screenshots especially.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) void processFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [processFile]);

  // The on-screen picture: drawn from the original, at most DISPLAY_MAX_SIDE.
  useEffect(() => {
    const canvas = display.current;
    if (!loaded || !canvas) return;
    const { w, h } = fitWithin(loaded.width, loaded.height, DISPLAY_MAX_SIDE);
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(loaded.img, 0, 0, w, h);
  }, [loaded]);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const copy = useCallback((key: string, text: string) => {
    void copyText(text).then((ok) => {
      if (!ok) return;
      setCopied(key);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(null), COPIED_MS);
    });
  }, []);

  const pickAt = useCallback(
    (x: number, y: number) => {
      if (loaded) setPicked(readPixel(loaded.img, x, y));
    },
    [loaded],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!loaded) return;
    const arrow = ARROWS[event.key];
    if (arrow) {
      event.preventDefault();
      if (!picked) return pickAt(Math.floor(loaded.width / 2), Math.floor(loaded.height / 2));
      // Shift jumps 1% of the long side (at least 10 px), so a 4000 px photo
      // is crossable from the keyboard.
      const step = event.shiftKey ? Math.max(10, Math.round(Math.max(loaded.width, loaded.height) / 100)) : 1;
      const clamp = (v: number, max: number) => Math.min(max - 1, Math.max(0, v));
      pickAt(clamp(picked.x + arrow[0] * step, loaded.width), clamp(picked.y + arrow[1] * step, loaded.height));
    } else if ((event.key === "Enter" || event.key === " ") && picked?.hex) {
      event.preventDefault();
      copy("picked-hex", picked.hex);
    }
  };

  const colours = loaded?.palette.colours ?? [];
  const roles = colours.map((c, i) => [String(i + 1), c.hex] as const);
  const formats = picked?.hex ? colourFormats(picked.hex) : null;

  return (
    <>
      {/* CARD 1: THE PHOTO */}
      <StageCard index="01" title="The photo" marks>
        <p className="mt-4 text-sm text-muted-foreground">
          Drop, paste or pick a photo, then click anywhere on it to read that pixel’s colour. It is
          read right here in your tab — nothing is uploaded and no server is involved (unlike Extract,
          which fetches a website for you). Photos are shrunk to {SAMPLE_MAX_SIDE}px on the long side
          before the palette is sampled; a click always reads the original pixel.
        </p>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Choose a photo to read colours from"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void processFile(file);
            e.target.value = "";
          }}
        />

        {failed ? (
          <div className="mt-4">
            <ErrorCard
              title="That file wouldn't open."
              body="The browser's decoder refused it — some CMYK JPEGs, HEIC photos outside Safari, and SVGs without a size do. If it opens anywhere else, re-save it as a PNG or JPEG and bring that copy back."
              onRetry={() => setFailed(false)}
            />
          </div>
        ) : loaded ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative inline-block max-w-full overflow-hidden rounded-2xl border border-border"
                style={{ background: CHECKER }}
              >
                <canvas
                  ref={display}
                  tabIndex={0}
                  role="application"
                  aria-label={`${loaded.name}, ${loaded.width} by ${loaded.height} pixels. Click to pick a colour, or use the arrow keys to move the picker, Shift with an arrow for bigger steps, Enter to copy the hex.`}
                  onClick={(e) => {
                    const { x, y } = clientToPixel(
                      e.clientX,
                      e.clientY,
                      e.currentTarget.getBoundingClientRect(),
                      loaded.width,
                      loaded.height,
                    );
                    pickAt(x, y);
                  }}
                  onKeyDown={onKeyDown}
                  className={cn("block h-auto max-h-[70vh] w-auto max-w-full cursor-crosshair rounded-2xl", FOCUS)}
                />
                {picked ? (
                  <span
                    aria-hidden
                    data-testid="image-picker-ring"
                    className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.7)]"
                    style={{
                      left: `${((picked.x + 0.5) / loaded.width) * 100}%`,
                      top: `${((picked.y + 0.5) / loaded.height) * 100}%`,
                    }}
                  />
                ) : null}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {loaded.name} · {loaded.width}×{loaded.height} · click to pick, or focus the photo and
                use the arrow keys (Shift for bigger steps)
              </p>
            </div>

            <div className="flex flex-col gap-3" aria-live="polite">
              <p className={GROUP}>Picked pixel</p>
              {picked ? (
                <>
                  <div
                    aria-hidden
                    className="h-20 rounded-2xl border border-border"
                    style={{ background: picked.hex ? picked.hex : CHECKER }}
                  />
                  {formats ? (
                    <div className="flex flex-col gap-2">
                      {(["hex", "rgb", "hsl"] as const).map((kind) => (
                        <div key={kind} className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "min-w-0 truncate font-mono",
                              kind === "hex" ? "text-2xl text-foreground" : "text-[12px] text-muted-foreground",
                            )}
                          >
                            {formats[kind]}
                          </span>
                          <button
                            type="button"
                            className={cn(BTN, "min-w-20 justify-center")}
                            onClick={() => copy(`picked-${kind}`, formats[kind])}
                            aria-label={copied === `picked-${kind}` ? "Copied" : `Copy the ${kind}`}
                          >
                            {copied === `picked-${kind}` ? "Copied" : `Copy ${kind}`}
                          </button>
                        </div>
                      ))}
                      {picked.alpha < 255 ? (
                        <p className="text-[12px] text-muted-foreground">
                          Partly see-through ({Math.round((picked.alpha / 255) * 100)}% opaque) — the
                          colour shown is the pixel’s own, without the see-through.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      That pixel is fully transparent — there is no colour there. Pick another.
                    </p>
                  )}
                  <p className={labelClass}>
                    x {picked.x}, y {picked.y} of {loaded.width}×{loaded.height}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing picked yet. Click the photo, or focus it and press an arrow key.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {!failed ? (
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
              "mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-muted/30 px-6 text-center transition-colors hover:border-primary hover:bg-muted/50",
              loaded ? "py-4" : "py-12",
              dragOver && "border-primary bg-muted/50",
              FOCUS,
            )}
          >
            {loaded ? null : <CapyArt pose="awake" className="w-16" />}
            <span className="text-sm font-medium text-foreground">
              {loading
                ? "Reading the photo…"
                : loaded
                  ? "Drop, paste or choose another photo"
                  : "Drop a photo here, paste one, or choose a file"}
            </span>
            {loaded ? null : (
              <span className="text-xs text-muted-foreground">
                PNG, JPEG, WebP, GIF or AVIF — whatever your browser can open. Stays on your device.
              </span>
            )}
          </button>
        ) : null}
      </StageCard>

      {/* CARD 2: THE PALETTE */}
      <StageCard index="02" title="The palette">
        {!loaded ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            The palette appears here — ranked by how much of the photo each colour covers,
            near-duplicates merged.
          </p>
        ) : colours.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            This photo has no opaque pixels to read — it is entirely see-through.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="mt-4 text-sm text-muted-foreground">
              Click a swatch to copy its hex. Ranked by share of the photo; colours within a hair of
              each other (CIEDE2000) are merged into one swatch.
            </p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {colours.map((colour) => (
                <button
                  key={colour.hex}
                  type="button"
                  onClick={() => copy(`swatch-${colour.hex}`, colour.hex)}
                  aria-label={copied === `swatch-${colour.hex}` ? "Copied" : `Copy ${colour.hex}`}
                  className={cn(
                    "group overflow-hidden rounded-2xl border border-border/70 bg-card text-left transition-colors hover:border-primary",
                    FOCUS,
                  )}
                >
                  <span
                    aria-hidden
                    className="block h-16 border-b border-border/50"
                    style={{ backgroundColor: colour.hex }}
                  />
                  <span className="flex items-baseline justify-between gap-2 px-3 py-2 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <span className="font-mono text-xs">
                      {copied === `swatch-${colour.hex}` ? "Copied" : colour.hex}
                    </span>
                    <span className="font-mono text-[12px] opacity-70">
                      {Math.max(1, Math.round((colour.count / loaded.palette.sampled) * 100))}%
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-border/60 pt-5">
              <p className={GROUP}>Copy the palette as code</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={BTN}
                  onClick={() => copy("css", cssVariables("image", roles))}
                >
                  {copied === "css" ? "Copied" : "Copy CSS variables"}
                </button>
                <button
                  type="button"
                  className={BTN}
                  onClick={() => copy("tailwind", tailwindColors("image", roles))}
                >
                  {copied === "tailwind" ? "Copied" : "Copy Tailwind tokens"}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              {loaded.palette.sampled.toLocaleString("en-GB")} opaque pixels sampled · nothing
              uploaded · nothing stored
            </p>
          </div>
        )}
      </StageCard>
    </>
  );
}
