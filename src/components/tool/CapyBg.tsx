"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ClipboardPaste, Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StageCard, StageChip } from "@/components/stage-card";
import { ErrorCard, type ErrorNotice } from "@/components/tool/ErrorCard";
import { COPIED_MS } from "@/lib/capytools/feedback";
import { saveBlob } from "@/lib/download";
import { formatBytes } from "@/lib/capystrip/format";
import { drawDemoCut, drawDemoSource } from "@/lib/capybg/demo";
import { clearCut, nameFor, probeBackend, recomposeCut, removeBackground, UnsupportedImageError } from "@/lib/capybg/client";
import { deleteCachedModels } from "@/lib/capybg/loader";
import { MODELS } from "@/lib/capybg/models";
import type { Backdrop, BgResult, OutputFormat, Progress } from "@/lib/capybg/types";
import { cn } from "@/lib/utils";

/**
 * CapyBg — drop, paste or pick a photo; the model cuts the subject out in
 * this tab; download a transparent PNG or a flattened copy. The photo itself
 * never leaves the tab — nothing is uploaded — and the only bytes the tool
 * ever fetches are the model and its runtime, from this site, once.
 *
 * Layout follows the house three-card form (see CapyQR): photo → cut →
 * finish, the finish card a sticky right column from lg, and a portalled
 * download dock on phones while the finish card is scrolled away.
 */

const labelClass =
  "font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground";

/** The backdrop swatches: house tones, each with a spoken name. */
const SWATCHES: { hex: string; name: string }[] = [
  { hex: "#ffffff", name: "white" },
  { hex: "#f9f9f7", name: "cream" },
  { hex: "#121212", name: "charcoal" },
  { hex: "#8e9b7e", name: "sage" },
  { hex: "#5f7a72", name: "water" },
  { hex: "#c07952", name: "clay" },
  { hex: "#d9a441", name: "gold" },
];

function Pill({
  active,
  onClick,
  children,
  label,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 font-sans text-[13px] transition-colors pointer-coarse:min-h-11 pointer-coarse:px-4",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-muted/30 text-muted-foreground hover:border-primary hover:text-foreground",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function noticeFor(error: unknown): ErrorNotice {
  if (error instanceof UnsupportedImageError) {
    return { title: "That file won't open.", body: error.message };
  }
  return {
    title: "The cut didn't make it.",
    body:
      error instanceof Error
        ? error.message
        : "Something went wrong inside the tab. Try the file again.",
    retry: true,
  };
}

/** The options a (re)compose runs with — the recompose key's contents. */
function optionsKey(backdrop: Backdrop, format: OutputFormat, quality: number): string {
  return JSON.stringify({ backdrop, format, quality });
}

export function CapyBg() {
  const [phase, setPhase] = useState<"idle" | "working" | "done" | "error">("idle");
  const [isDemo, setIsDemo] = useState(true);
  const [file, setFile] = useState<{ blob: Blob; name: string } | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<BgResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [backdrop, setBackdrop] = useState<Backdrop>("transparent");
  const [format, setFormat] = useState<OutputFormat>("png");
  const [quality, setQuality] = useState(92);
  const [error, setError] = useState<ErrorNotice | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const [backend, setBackend] = useState<string>("");

  const fileInput = useRef<HTMLInputElement>(null);
  // One cancellation token per run: a new drop replaces the old work.
  const runId = useRef(0);
  const startedAt = useRef(0);
  // The option key the current result was composed with.
  const appliedKey = useRef("");
  // The dock only exists once the client mounts (portalled to <body>).
  const [portalReady, setPortalReady] = useState(false);
  const markPortalReady = useCallback(() => setPortalReady(true), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(markPortalReady, [markPortalReady]);
  // Below lg the finish card stacks; while it is off-screen the dock carries
  // the download.
  const [finishInView, setFinishInView] = useState(true);

  // The WebGPU line under the model pill — read after mount, never during
  // render, so the server markup never forks on it. (setState happens in the
  // promise, not the effect body, so no set-state-in-effect guard is needed.)
  const hydrateBackend = useCallback(() => {
    probeBackend()
      .then((decision) => setBackend(decision.backend))
      .catch(() => setBackend(""));
  }, []);
  useEffect(hydrateBackend, [hydrateBackend]);

  // The idle demo teaches the cut with canvas calls — no model, no download.
  const drawDemo = useCallback(() => {
    const cut = document.getElementById("capybg-demo-cut") as HTMLCanvasElement | null;
    const source = document.getElementById("capybg-demo-source") as HTMLCanvasElement | null;
    if (cut) drawDemoCut(cut);
    if (source) drawDemoSource(source);
  }, []);
  useEffect(drawDemo, [drawDemo]);

  // Watch the finish card so the dock knows when to stand in for it.
  useEffect(() => {
    const card = document.getElementById("capybg-finish");
    if (!card || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setFinishInView(entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, [phase]);

  // Object URLs are transport, not property: revoke on replacement and on leave.
  useEffect(() => {
    const url = resultUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [resultUrl]);
  useEffect(() => {
    const url = originalUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [originalUrl]);

  // The cutting clock: the honest seconds, whatever the backend turns out to be.
  useEffect(() => {
    if (phase !== "working") return;
    const timer = window.setInterval(() => {
      setElapsed((performance.now() - startedAt.current) / 1000);
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Backdrop/format/quality changes recompose from the kept matte — the model
  // does not run again. Debounced while the quality slider drags.
  useEffect(() => {
    if (phase !== "done" || !file) return;
    const key = optionsKey(backdrop, format, quality);
    if (key === appliedKey.current) return;
    const timer = window.setTimeout(() => {
      recomposeCut({ model: "modnet", backdrop, format, quality: quality / 100 })
        .then((next) => {
          appliedKey.current = key;
          setResult(next);
          setResultUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return URL.createObjectURL(next.blob);
          });
        })
        .catch(() => {
          // The previous render stays on screen; the failed wish is dropped.
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [phase, file, backdrop, format, quality]);

  const processFile = useCallback(
    async (blob: Blob, name: string) => {
      const run = ++runId.current;
      clearCut();
      setError(null);
      setResult(null);
      setStatus("");
      setShowOriginal(false);
      setIsDemo(false);
      setFile({ blob, name });
      setOriginalUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      setPhase("working");
      setProgress(null);
      startedAt.current = performance.now();
      setElapsed(0);
      try {
        const next = await removeBackground(
          blob,
          { model: "modnet", backdrop, format, quality: quality / 100 },
          (p) => {
            if (runId.current !== run) return;
            setProgress(p);
          },
        );
        if (runId.current !== run) return;
        appliedKey.current = optionsKey(backdrop, format, quality);
        setResult(next);
        setResultUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(next.blob);
        });
        setPhase("done");
        window.setTimeout(() => {
          document.getElementById("capybg-cut")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      } catch (err) {
        if (runId.current !== run) return;
        setPhase("error");
        setError(noticeFor(err));
      }
    },
    [backdrop, format, quality],
  );

  // Paste is a first-class input — screenshots especially.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const pasted = item?.getAsFile();
      if (pasted) {
        event.preventDefault();
        void processFile(pasted, pasted.name || "pasted image");
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [processFile]);

  const downloadName = file && result ? nameFor(file.name, { format: result.mimeType === "image/jpeg" ? "jpeg" : "png" }) : "";

  const handleDownload = useCallback(() => {
    if (!result || !file) return;
    saveBlob(result.blob, nameFor(file.name, { format: result.mimeType === "image/jpeg" ? "jpeg" : "png" }));
    setStatus(`saved ${nameFor(file.name, { format: result.mimeType === "image/jpeg" ? "jpeg" : "png" })} (${formatBytes(result.bytesAfter)}).`);
  }, [result, file]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      let blob = result.blob;
      if (blob.type !== "image/png") {
        // The clipboard wants PNG; the cut flatten is what ships otherwise.
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
        bitmap.close();
        blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no png"))), "image/png"),
        );
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setStatus("this browser blocked the image copy. download instead — same pixels.");
    }
  }, [result]);

  const handleRemoveModels = useCallback(async () => {
    await deleteCachedModels();
    setStatus("downloaded models removed from this browser — the next cut downloads them again.");
  }, []);

  const model = MODELS.modnet;
  const working = phase === "working";
  const downloadPct = progress?.total ? Math.min(100, Math.round(((progress.received ?? 0) / progress.total) * 100)) : 0;
  const backendLine =
    result !== null
      ? `ran on your ${result.backend === "webgpu" ? "GPU (WebGPU)" : "CPU (WebAssembly)"} · ${Math.round(result.modelMs) >= 1000 ? `${(result.modelMs / 1000).toFixed(1)} s` : `${Math.round(result.modelMs)} ms`}`
      : "";

  const previewSrc = showOriginal ? originalUrl : resultUrl;

  return (
    <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_368px] lg:items-start">
      {/* CARD 1: THE PHOTO */}
      <StageCard index="01" title="The photo" marks className="lg:col-start-1">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) void processFile(picked, picked.name);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/")) ?? e.dataTransfer.files[0];
            if (dropped) void processFile(dropped, dropped.name);
          }}
          className="mt-1 flex w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring/50"
        >
          <span className="mt-1 text-sm font-medium text-foreground">Drop a photo here</span>
          <span className="text-xs text-muted-foreground">
            or click to pick one — or paste a screenshot. it never leaves this tab, and nothing is uploaded.
          </span>
        </button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <ClipboardPaste className="size-3" aria-hidden />
          ctrl/⌘+V works too
        </p>

        <div className="mt-5 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <span className={labelClass}>model</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary bg-primary/10 px-3 py-1 font-sans text-[13px] text-foreground pointer-coarse:min-h-11 pointer-coarse:px-4">
              {model.label.toLowerCase()} · {formatBytes(model.bytes)}, once
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {backend === "wasm"
              ? "this browser has no GPU support, so the cut runs on your CPU — it works, just slower."
              : "the only download is the model. your photo never leaves this tab."}
          </p>
        </div>
      </StageCard>

      {/* CARD 2: THE CUT */}
      <StageCard
        id="capybg-cut"
        index="02"
        title="The cut"
        className="lg:col-start-1"
        ariaLive="polite"
        chips={
          <>
            {isDemo && <StageChip>demo</StageChip>}
            {result && <StageChip>{result.width}×{result.height}</StageChip>}
          </>
        }
      >
        {working ? (
          <div className="flex flex-col gap-3 py-6" role="status">
            {progress?.phase === "download" && progress.total ? (
              <>
                {/* The real bar: streamed bytes against the manifest's known total. */}
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={downloadPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="model download progress"
                >
                  <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${downloadPct}%` }} />
                </div>
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {progress.message} — {formatBytes(progress.received ?? 0)} of {formatBytes(progress.total)}
                  {progress.message?.includes("model") ? " · once" : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {progress?.message ?? "reading the photo"} — {elapsed.toFixed(1)} s
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              a multi-second cut on the CPU is normal — the page stays responsive because it runs off the main thread.
            </p>
          </div>
        ) : error ? (
          <div className="py-4">
            <ErrorCard title={error.title} body={error.body} onRetry={
              file
                ? () => void processFile(file.blob, file.name)
                : undefined
            } />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            <div
              className="relative w-full max-w-[360px] overflow-hidden rounded-2xl border border-border"
              style={{
                background:
                  "repeating-conic-gradient(var(--border) 0% 25%, var(--card) 0% 50%) 0 0 / 24px 24px",
              }}
            >
              {isDemo ? (
                // Two canvases, one hidden: the demo's original and its cut,
                // both drawn by hand — the press-and-hold teaches on them too.
                <>
                  <canvas
                    id="capybg-demo-cut"
                    aria-hidden={showOriginal}
                    className={cn("mx-auto block w-full", showOriginal && "hidden")}
                  />
                  <canvas
                    id="capybg-demo-source"
                    aria-hidden={!showOriginal}
                    className={cn("mx-auto block w-full", !showOriginal && "hidden")}
                  />
                </>
              ) : previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  data-capybg-preview
                  src={previewSrc}
                  alt={showOriginal ? "the original photo" : "the cutout, on a checkerboard"}
                  className="mx-auto block max-h-[420px] w-auto max-w-full"
                />
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {!isDemo ? (
                <button
                  type="button"
                  aria-pressed={showOriginal}
                  aria-label="Show the original photo while held"
                  onPointerDown={() => setShowOriginal(true)}
                  onPointerUp={() => setShowOriginal(false)}
                  onPointerLeave={() => setShowOriginal(false)}
                  onKeyDown={(e) => {
                    if (e.key === " ") {
                      e.preventDefault();
                      setShowOriginal(true);
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.key === " ") setShowOriginal(false);
                  }}
                  className="rounded-full border border-border bg-muted/30 px-3 py-1 font-sans text-[13px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground pointer-coarse:min-h-11 pointer-coarse:px-4"
                >
                  {showOriginal ? "release to see the cut" : "press and hold to show original"}
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  this is a hand-drawn demo — drop a photo above to cut your own.
                </span>
              )}
            </div>

            {result && !isDemo ? (
              <div className="text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{backendLine}</p>
                {result.notes.length > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">{result.notes.join(" ")}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </StageCard>

      {/* CARD 3: THE FINISH */}
      <StageCard
        id="capybg-finish"
        index="03"
        title="The finish"
        className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1"
      >
        <div className="mt-1 flex flex-wrap items-center gap-1.5" role="group" aria-label="Backdrop">
          <span className={labelClass}>backdrop</span>
          <Pill active={backdrop === "transparent"} onClick={() => setBackdrop("transparent")} label="Transparent backdrop">
            transparent
          </Pill>
          <Pill active={backdrop === "light"} onClick={() => setBackdrop("light")} label="Light backdrop">
            light
          </Pill>
          <Pill active={backdrop === "dark"} onClick={() => setBackdrop("dark")} label="Dark backdrop">
            dark
          </Pill>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={cn(labelClass, "sr-only")}>backdrop colour swatches</span>
          {SWATCHES.map((swatch) => (
            <button
              key={swatch.hex}
              type="button"
              aria-label={`backdrop colour: ${swatch.name}`}
              aria-pressed={backdrop === swatch.hex}
              onClick={() => setBackdrop({ color: swatch.hex })}
              className={cn(
                "size-5 rounded-full border transition-colors pointer-coarse:size-11",
                backdrop === swatch.hex
                  ? "border-foreground ring-2 ring-[var(--primary)]/40"
                  : "border-foreground/25 hover:border-foreground/50",
              )}
              style={{ background: swatch.hex }}
            />
          ))}
          <input
            id="capybg-colour"
            type="color"
            aria-label="backdrop colour picker"
            value={backdrop === "transparent" || backdrop === "light" || backdrop === "dark" ? "#ffffff" : backdrop.color}
            onChange={(e) => setBackdrop({ color: e.target.value })}
            className="size-7 cursor-pointer rounded-full border border-border bg-transparent p-0.5 pointer-coarse:size-11"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="Format">
          <span className={labelClass}>format</span>
          <Pill active={format === "png"} onClick={() => setFormat("png")} label="PNG format">
            PNG
          </Pill>
          <Pill
            active={format === "jpeg"}
            disabled={backdrop === "transparent"}
            onClick={() => setFormat("jpeg")}
            label="JPEG format"
          >
            JPEG
          </Pill>
        </div>
        {backdrop === "transparent" ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            JPEG has no transparency — pick a backdrop to enable it.
          </p>
        ) : null}

        {format === "jpeg" && backdrop !== "transparent" ? (
          <div className="mt-3">
            <label htmlFor="capybg-quality" className={labelClass}>
              JPEG quality
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                id="capybg-quality"
                type="range"
                min={50}
                max={100}
                step={1}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-32 accent-[var(--primary)] pointer-coarse:min-h-11"
              />
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{quality}</span>
            </div>
          </div>
        ) : null}

        {result && file ? (
          <p className="mt-4 font-mono text-[11px] tabular-nums text-muted-foreground">
            {formatBytes(result.bytesBefore)} → {formatBytes(result.bytesAfter)} · {downloadName}
          </p>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">the download waits for a cut.</p>
        )}

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <Button className="h-11 rounded-full" onClick={handleDownload} disabled={!result}>
            <Download className="mr-1.5 size-4" />
            Download
          </Button>
          <Button variant="ghost" className="h-11 rounded-full px-5" onClick={() => void handleCopy()} disabled={!result}>
            {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
            {copied ? "Copied" : "Copy image"}
          </Button>
        </div>

        <p aria-live="polite" className="mt-3 min-h-5 text-xs text-muted-foreground">
          {status || (result ? "nothing uploaded, nothing stored — the cut was made in this tab." : "")}
        </p>

        <button
          type="button"
          onClick={() => void handleRemoveModels()}
          className="mt-3 text-xs text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground pointer-coarse:min-h-11"
        >
          remove downloaded models ({formatBytes(model.bytes)}) from this browser
        </button>
      </StageCard>

      {/* The phone dock: portalled to <body> because the shell's Reveal animates
          transform, which re-anchors position: fixed. Inert while card 03 is in
          view — the same contract as CapyQR's. */}
      {portalReady
        ? createPortal(
            <div
              inert={finishInView}
              aria-hidden={finishInView}
              className={cn(
                "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden",
                finishInView ? "translate-y-full" : "translate-y-0",
              )}
            >
              <div className="mx-auto flex max-w-xl items-center gap-3">
                {resultUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resultUrl}
                    alt=""
                    aria-hidden
                    className="size-14 flex-none rounded-lg border border-border object-contain"
                  />
                ) : (
                  <span aria-hidden className="size-14 flex-none rounded-lg border border-border bg-muted" />
                )}
                <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground" aria-live="polite">
                  {result
                    ? "cut ready — download the PNG here."
                    : working
                      ? "cutting, in this tab…"
                      : "drop a photo to cut."}
                </p>
                <Button className="h-11 flex-none rounded-full px-5" onClick={handleDownload} disabled={!result}>
                  <Download className="mr-1.5 size-4" />
                  Download
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
      <div aria-hidden className="h-24 lg:hidden" />
    </div>
  );
}
