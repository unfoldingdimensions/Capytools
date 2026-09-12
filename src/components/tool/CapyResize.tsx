"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download, FileImage, ImageUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ErrorCard, type ErrorNotice } from "@/components/tool/ErrorCard";
import { StageCard, StageChip } from "@/components/stage-card";
import { COPIED_MS } from "@/lib/capytools/feedback";
import { IDLE_HEADLINE, IDLE_HINT, LOADER_STEPS } from "@/lib/capyresize/demo";
import { buildIco, type IcoFrame } from "@/lib/capyresize/ico";
import { HEAD_SNIPPET, ICO_SIZES, buildManifest, maskableBox } from "@/lib/capyresize/pack";
import {
  CanvasRefusedError,
  DecodeFailedError,
  decodeImage,
  drawPaddedFrom,
  drawResized,
  drawSquareFrom,
  encodeCanvas,
  formatBytes,
  isWebpFallback,
  outputRefused,
  resizeFilename,
  sampleCornerColor,
  savingsPercent,
  zipPack,
  type DecodedImage,
} from "@/lib/capyresize/render";
import { centerSquare, halveSteps, isUpscale, scaleToWidth } from "@/lib/capyresize/steps";
import type { OutputFormat, PackFiles, ResizeResult, StageId } from "@/lib/capyresize/types";
import { cn } from "@/lib/utils";

/** One debounced encode per control change — the flicker guard. */
const ENCODE_DEBOUNCE_MS = 200;

const FORMATS: OutputFormat[] = ["png", "jpeg", "webp"];

/** The strip renders at true pixel sizes; 16 and 32 are the tab's sizes. */
const PREVIEW_SIZES = [16, 32, 96] as const;

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

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

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="size-7 cursor-pointer rounded-full border border-border bg-transparent p-0.5"
      />
      <span className="font-mono text-[11px] uppercase tabular-nums text-muted-foreground">
        {value}
      </span>
    </div>
  );
}

export function CapyResize() {
  const [stage, setStage] = useState<StageId>("resize");

  const [decoded, setDecoded] = useState<DecodedImage | null>(null);
  const [fileName, setFileName] = useState("");
  const [beforeBytes, setBeforeBytes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaderStep, setLoaderStep] = useState(-1);
  const [error, setError] = useState<ErrorNotice | null>(null);
  const [status, setStatus] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Stage A — the dial.
  const [width, setWidth] = useState(0);
  const [format, setFormat] = useState<OutputFormat>("png");
  const [quality, setQuality] = useState(0.85);
  const [flatten, setFlatten] = useState("#ffffff");
  const [result, setResult] = useState<ResizeResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Stage B — the dial.
  const [siteName, setSiteName] = useState("");
  const [shortName, setShortName] = useState("");
  const [background, setBackground] = useState("#ffffff");
  const [applePad, setApplePad] = useState(true);
  const [packFiles, setPackFiles] = useState<PackFiles | null>(null);
  const [stripUrls, setStripUrls] = useState<string[]>([]);
  const [snippetCopied, setSnippetCopied] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const runId = useRef(0);
  // The dropped File, kept for Stage B's SVG passthrough.
  const currentFile = useRef<File | null>(null);

  const processFile = useCallback(async (file: File) => {
    const run = runId.current + 1;
    runId.current = run;
    currentFile.current = file;

    // A new drop replaces the old work — and its object URLs.
    setPreviewUrl(null);
    setStripUrls([]);
    setResult(null);
    setPackFiles(null);
    setError(null);
    setFileName(file.name);
    setBeforeBytes(file.size);
    setLoading(true);
    setStatus("");

    try {
      setLoaderStep(0);
      await file.slice(0, 64).arrayBuffer();
      if (runId.current !== run) return;

      setLoaderStep(1);
      const next = await decodeImage(file);
      if (runId.current !== run) return;

      setLoaderStep(2);
      setDecoded(next);
      // A width that keeps the output under the canvas guards: start at the
      // source and halve honestly until the guard is clear.
      let w = next.width;
      while (outputRefused(w, scaleToWidth(next.width, next.height, w).h) && w > 16) {
        w = Math.round(w / 2);
      }
      setWidth(w);
      setBackground(sampleCornerColor(next.img));
      setLoading(false);
      setLoaderStep(-1);
      setStatus(
        next.animated
          ? `read ${next.width}×${next.height} — animated gif, the first frame is the one that gets used.`
          : `read ${next.width}×${next.height} — the dial above sets the rest.`,
      );
    } catch (caught) {
      if (runId.current !== run) return;
      setLoading(false);
      setLoaderStep(-1);
      setDecoded(null);
      if (caught instanceof DecodeFailedError) {
        setError({
          title: "this file wouldn't open.",
          body: "the browser's decoder refused it — some CMYK JPEGs and corrupt files do. if it opens anywhere else, re-save it there and bring that copy back.",
        });
      } else {
        setError({
          title: "something quiet went wrong.",
          body: "the file stopped partway through being read. try it once more — a second read usually says more.",
        });
      }
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

  const height = decoded ? scaleToWidth(decoded.width, decoded.height, width).h : 0;
  const upscaled = decoded ? isUpscale(decoded.width, width) : false;
  const refused = decoded ? outputRefused(width, height) : false;

  // Stage A: one debounced encode per change — the proof is always the
  // encoded bytes, never an estimate. Each run owns and revokes its own
  // preview URL.
  useEffect(() => {
    if (!decoded || stage !== "resize" || refused) return;
    let cancelled = false;
    let url: string | null = null;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const target = scaleToWidth(decoded.width, decoded.height, width);
          const canvas = drawResized(decoded.img, halveSteps(decoded.width, decoded.height, target.w, target.h));
          const blob = await encodeCanvas(canvas, format, quality, {
            flatten: format === "jpeg" ? flatten : undefined,
          });
          if (cancelled) return;
          url = URL.createObjectURL(blob);
          setResult({
            blob,
            width: target.w,
            height: target.h,
            beforeBytes,
            afterBytes: blob.size,
            webpFallback: isWebpFallback(format, blob.type),
            upscaled: isUpscale(decoded.width, width),
          });
          setPreviewUrl(url);
        } catch (caught) {
          if (cancelled) return;
          if (caught instanceof CanvasRefusedError) {
            setStatus("the browser refused this export — try a smaller size.");
          } else {
            setStatus("the export failed — dial the size down and try again.");
          }
        }
      })();
    }, ENCODE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [decoded, beforeBytes, width, format, quality, flatten, stage, refused]);

  // Stage B: one debounced pack build per change — same ownership rule for
  // the strip's URLs. `currentFile` changes only alongside `decoded`.
  useEffect(() => {
    if (!decoded || stage !== "favicon") return;
    let cancelled = false;
    const urls: string[] = [];
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const crop = centerSquare(decoded.width, decoded.height);
          const build = (size: number) => {
            const canvas = drawSquareFrom(decoded.img, crop.sx, crop.sy, crop.size, size);
            return encodeCanvas(canvas, "png", 1);
          };

          const icoFrames: IcoFrame[] = await Promise.all(
            ICO_SIZES.map(async (size) => ({ size, png: new Uint8Array(await (await build(size)).arrayBuffer()) })),
          );

          const name = siteName.trim() || "My site";
          const short = shortName.trim() || name;
          const artBox = applePad ? Math.round(180 * 0.88) : 180;
          const apple = drawPaddedFrom(decoded.img, 180, artBox, background);
          const icon192 = drawPaddedFrom(decoded.img, 192, 192, background);
          const icon512 = drawPaddedFrom(decoded.img, 512, 512, background);
          const maskable = drawPaddedFrom(decoded.img, 512, maskableBox(512), background);

          const files: PackFiles = [
            { name: "favicon.ico", blob: new Blob([buildIco(icoFrames)], { type: "image/x-icon" }) },
            { name: "apple-touch-icon.png", blob: await encodeCanvas(apple, "png", 1) },
            { name: "icon-192.png", blob: await encodeCanvas(icon192, "png", 1) },
            { name: "icon-512.png", blob: await encodeCanvas(icon512, "png", 1) },
            { name: "icon-maskable-512.png", blob: await encodeCanvas(maskable, "png", 1) },
            {
              name: "manifest.webmanifest",
              blob: new Blob([buildManifest(name, short)], { type: "application/manifest+json" }),
            },
            { name: "html-snippet.txt", blob: new Blob([`${HEAD_SNIPPET}\n`], { type: "text/plain" }) },
          ];
          if (decoded.kind === "svg" && currentFile.current) {
            // Passthrough only — raster to vector is not a thing this does.
            files.push({ name: "favicon.svg", blob: currentFile.current });
          }
          if (cancelled) return;

          const strip = await Promise.all(
            PREVIEW_SIZES.map(async (size) => {
              const blob = await build(size);
              const url = URL.createObjectURL(blob);
              urls.push(url);
              return url;
            }),
          );
          if (cancelled) {
            for (const made of urls) URL.revokeObjectURL(made);
            return;
          }
          setPackFiles(files);
          setStripUrls(strip);
        } catch (caught) {
          if (cancelled) return;
          if (caught instanceof CanvasRefusedError) {
            setStatus("the browser refused this export — try a smaller source image.");
          } else {
            setStatus("the pack build failed — try the file again.");
          }
        }
      })();
    }, ENCODE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [decoded, siteName, shortName, background, applePad, stage]);

  const download = useCallback(async () => {
    if (!result) return;
    // A Safari WebP fallback hands back PNG bytes; the name says what is inside.
    const effective: OutputFormat = result.webpFallback ? "png" : format;
    const name = resizeFilename(fileName, result.width, effective);
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(
      result.webpFallback
        ? `saved ${name} — this browser writes webp as png, so png is what you got.`
        : `saved ${name}.`,
    );
  }, [result, format, fileName]);

  const downloadZip = useCallback(async () => {
    if (!packFiles) return;
    const blob = await zipPack(packFiles);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "favicon-pack.zip";
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`saved favicon-pack.zip — ${packFiles.length} files, unzips where you drop it.`);
  }, [packFiles]);

  const copySnippet = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(HEAD_SNIPPET);
      setSnippetCopied(true);
      window.setTimeout(() => setSnippetCopied(false), COPIED_MS);
    } catch {
      setStatus("this browser blocked the copy — select the text above by hand.");
    }
  }, []);

  const savings = result ? savingsPercent(result.beforeBytes, result.afterBytes) : 0;

  return (
    <div className="flex w-full flex-col gap-5">
      {/* CARD 1: THE DROP */}
      <StageCard
        index="01"
        title="The drop"
        marks
        chips={
          decoded ? (
            <StageChip tone="sage">
              {decoded.kind}
              {decoded.animated ? " · animated" : ""}
            </StageChip>
          ) : null
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Pill
            active={stage === "resize"}
            onClick={() => setStage("resize")}
            label="Stage resize and convert"
          >
            resize &amp; convert
          </Pill>
          <Pill active={stage === "favicon"} onClick={() => setStage("favicon")} label="Stage favicon pack">
            favicon pack
          </Pill>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
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
            <ImageUp className="size-9 stroke-[1.25] text-muted-foreground" aria-hidden />
            <span className="mt-1 text-sm font-medium text-foreground">{IDLE_HEADLINE}</span>
            <span className="text-xs text-muted-foreground">{IDLE_HINT}</span>
            {loading ? (
              <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {LOADER_STEPS.map((step, i) => (
                  <span key={step} className={i <= loaderStep ? "text-foreground" : undefined}>
                    {i > 0 && " · "}
                    {step}
                  </span>
                ))}
              </span>
            ) : null}
          </button>
        )}

        {decoded && !loading ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {fileName} · {decoded.width}×{decoded.height} · {formatBytes(beforeBytes)} — drop another any time.
          </p>
        ) : null}
      </StageCard>

      {/* CARD 2: THE DIAL */}
      {decoded ? (
        stage === "resize" ? (
          <StageCard index="02" title="The dial">
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="capyresize-width" className={labelClass}>
                  target width (px)
                </label>
                <Input
                  id="capyresize-width"
                  type="number"
                  min={16}
                  max={8192}
                  value={width || ""}
                  onChange={(e) => setWidth(Math.max(1, Math.round(Number(e.target.value) || 0)))}
                  className="mt-1.5 bg-muted/40 font-sans tabular-nums"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">→ {height} px tall, aspect locked.</p>
              </div>

              <div>
                <span className={labelClass}>format</span>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {FORMATS.map((f) => (
                    <Pill key={f} active={format === f} onClick={() => setFormat(f)} label={`Format ${f}`}>
                      {f.toUpperCase()}
                    </Pill>
                  ))}
                </div>
                {format === "webp" ? (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    chrome and firefox encode webp; safari quietly saves png — the note below says which happened.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              {format !== "png" ? (
                <div className="flex items-center gap-3">
                  <label htmlFor="capyresize-quality" className={labelClass}>
                    quality
                  </label>
                  <input
                    id="capyresize-quality"
                    type="range"
                    min={0.5}
                    max={1}
                    step={0.05}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-40 accent-[var(--primary)]"
                  />
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {quality.toFixed(2)}
                  </span>
                </div>
              ) : null}

              {format === "jpeg" ? (
                <ColorField id="capyresize-flatten" label="flatten onto" value={flatten} onChange={setFlatten} />
              ) : null}
            </div>

            {format === "jpeg" ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                jpeg has no transparency — this fills the background behind every clear pixel.
              </p>
            ) : null}

            {upscaled ? (
              <p className="mt-3 text-[13px] text-[var(--clay)]">
                this grows the image — pixels get softer, not sharper.
              </p>
            ) : null}
            {refused ? (
              <p className="mt-3 text-[13px] text-[var(--clay)]">
                that size is past what a browser canvas guarantees — keep it under 8192 a side and about 16 megapixels.
              </p>
            ) : null}
          </StageCard>
        ) : (
          <StageCard index="02" title="The dial">
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="capyresize-site-name" className={labelClass}>
                  site name
                </label>
                <Input
                  id="capyresize-site-name"
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="My site"
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyresize-short-name" className={labelClass}>
                  short name
                </label>
                <Input
                  id="capyresize-short-name"
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="same as the site name"
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ColorField id="capyresize-bg" label="background" value={background} onChange={setBackground} />
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2">
                <label htmlFor="capyresize-pad" className={labelClass}>
                  pad the apple icon
                </label>
                <Switch
                  id="capyresize-pad"
                  checked={applePad}
                  onCheckedChange={(v) => setApplePad(v === true)}
                  aria-label="Pad the apple touch icon"
                />
              </div>
            </div>

            <p className="mt-2 text-[11px] text-muted-foreground">
              {applePad
                ? "the padding is ~6% of the side — a community convention, not a spec."
                : "edge to edge — some home screens will kiss the corners."}{" "}
              {decoded.kind === "svg" ? "the svg ships through as favicon.svg, untouched." : ""}
            </p>

            {decoded.width !== decoded.height ? (
              <p className="mt-3 text-[13px] text-[var(--clay)]">
                input is {decoded.width}×{decoded.height} — the icons come from a centered square crop.
              </p>
            ) : null}
          </StageCard>
        )
      ) : null}

      {/* CARD 3: THE PROOF */}
      {decoded ? (
        stage === "resize" ? (
          <StageCard index="03" title="The proof">
            {result && previewUrl ? (
              <>
                <div className="flex justify-center rounded-2xl border border-border bg-muted/30 p-4">
                  {/*
                    The output at real size, capped only by the card. A blob:
                    URL is not optimizable, so next/image has nothing to add.
                  */}
                  {
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={`resized output, ${result.width} by ${result.height} pixels`}
                      width={result.width}
                      height={result.height}
                      className="max-w-full h-auto"
                    />
                  }
                </div>

                <div className="mt-4 text-center">
                  <StageChip tone="sage">
                    {result.width}×{result.height} · {formatBytes(result.beforeBytes)} →{" "}
                    {formatBytes(result.afterBytes)} ·{" "}
                    {savings >= 0 ? `${savings}% smaller` : `${Math.abs(savings)}% larger`}
                  </StageChip>
                  {result.webpFallback ? (
                    <p className="mt-2 text-[13px] text-[var(--clay)]">
                      this browser saves webp as png — the export you got is png.
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 flex justify-center">
                  <Button size="sm" className="min-w-[84px] rounded-full" onClick={() => void download()}>
                    <Download className="mr-1.5 size-3.5" />
                    Download
                  </Button>
                </div>
                <p aria-live="polite" className="mt-3 min-h-5 text-center text-xs text-muted-foreground">
                  {status}
                </p>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {refused ? "no proof until the size fits the guard above." : "measuring the encoded bytes…"}
              </p>
            )}
          </StageCard>
        ) : (
          <StageCard index="03" title="The proof">
            {packFiles ? (
              <>
                <div className="flex items-end justify-center gap-6 rounded-2xl border border-border bg-muted/30 p-6">
                  {PREVIEW_SIZES.map((size, i) => (
                    <figure key={size} className="flex flex-col items-center gap-2">
                      {stripUrls[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          // True pixel sizes — the "does it survive the tab" strip.
                          src={stripUrls[i]}
                          alt={`icon preview at ${size} pixels`}
                          width={size}
                          height={size}
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : null}
                      <figcaption className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {size} px
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  true pixel sizes — if the 16 px one still reads like your logo, ship it.
                </p>

                <div className="mt-4">
                  <span className={labelClass}>in the zip</span>
                  <ul className="mt-1.5 rounded-2xl border border-border/70 bg-muted/50 p-4 font-mono text-[13px] leading-relaxed">
                    {packFiles.map((file) => (
                      <li key={file.name} className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2">
                          <FileImage className="size-3.5 text-muted-foreground" aria-hidden />
                          {file.name}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{formatBytes(file.blob.size)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <span className={labelClass}>paste into your head</span>
                  <div className="mt-1.5 overflow-x-auto rounded-2xl border border-border/70 bg-muted/50 p-4 font-mono text-[13px] leading-relaxed">
                    <pre className="whitespace-pre">{HEAD_SNIPPET}</pre>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    the svg line waits for a file you can add later — browsers skip it quietly until it exists.
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button size="sm" className="min-w-[84px] rounded-full" onClick={() => void downloadZip()}>
                    <Download className="mr-1.5 size-3.5" />
                    Download ZIP
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-w-[84px] rounded-full"
                    onClick={() => void copySnippet()}
                  >
                    {snippetCopied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
                    {snippetCopied ? "Copied" : "Copy snippet"}
                  </Button>
                </div>
                <p aria-live="polite" className="mt-3 min-h-5 text-center text-xs text-muted-foreground">
                  {status}
                </p>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">building the pack…</p>
            )}
          </StageCard>
        )
      ) : null}
    </div>
  );
}
