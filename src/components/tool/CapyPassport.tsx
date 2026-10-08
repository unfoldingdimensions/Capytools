"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Download, FileImage, Printer, RotateCcw } from "lucide-react";

import { CapyArt } from "@/components/mascot/CapyArt";
import { Button } from "@/components/ui/button";
import { STAGE_TONE, StageCard, StageChip } from "@/components/stage-card";
import { ErrorCard, type ErrorNotice } from "@/components/tool/ErrorCard";
import { removeBackground, CutCancelledError as BgCutCancelledError } from "@/lib/capybg/client";
import { saveBlob } from "@/lib/download";
import { checkCorners, FILL_WARNING, type BackgroundVerdict } from "@/lib/capypassport/background";
import { decodePortrait, drawGuides, exportCanvas, photoFilename, renderCrop, sheetFilename } from "@/lib/capypassport/compose";
import { detectFace } from "@/lib/capypassport/detect";
import { demoFit, drawDemoPhoto } from "@/lib/capypassport/demo";
import { flag, fitCrop, DEFAULT_TWEAK, type FaceGeometry, type Fit, type Tweak } from "@/lib/capypassport/geometry";
import { formatBytes, formatMm, formatPct, mmLabel } from "@/lib/capypassport/format";
import { deleteCachedModel } from "@/lib/capypassport/loader";
import { DEFAULT_SPEC, SPECS, specById } from "@/lib/capypassport/specs";
import { maxCopies, renderSheet, sheetLayout } from "@/lib/capypassport/sheet";
import { cn } from "@/lib/utils";

/**
 * CapyPassport — a photo that fits the published rules, made in your tab
 * (plan §6). Three stages: the shot, the fit, the sheet. The photo never
 * leaves this tab: detection and (opt-in) background fill both run here,
 * and the only downloads are the files you ask for.
 *
 * The honest-checks posture (plan §3, §9 — read twice, enforced in copy): the
 * tool CHECKS GEOMETRY against the published numbers; it never promises an
 * application's outcome. The crown is an estimate and the UI says so; the
 * background is left as shot by default, and the opt-in fill carries the
 * alteration warning verbatim; every spec row prints its checked date and
 * its source.
 */

/** Preview canvas fits inside this box, whatever the photo's shape. */
const PREVIEW_MAX = 640;

/** Re-rendering the master export on every slider tick would re-run the
 *  matte; this is the settle time. */
const EXPORT_DEBOUNCE_MS = 250;

const flagTone = { pass: "sage", near: "plain", fail: "clay" } as const;

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

function Slider({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
  display,
  disabled = false,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
  display: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn(disabled && "opacity-40")}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </label>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 block w-full accent-[var(--primary)] pointer-coarse:h-11"
      />
    </div>
  );
}

/** One measured row: what was measured, what it reads, and a WORD for how it
 *  sits against the published band — never colour alone. */
function ReadoutRow({
  label,
  value,
  level,
  word,
}: {
  label: string;
  value: string;
  level?: "pass" | "near" | "fail";
  word?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="font-mono text-[13px] tabular-nums text-foreground">{value}</span>
        {level && word ? <StageChip tone={flagTone[level]}>{word}</StageChip> : null}
      </span>
    </div>
  );
}

interface LoadedPhoto {
  /** Bitmap or image element — whatever decodePortrait handed back. */
  img: CanvasImageSource;
  width: number;
  height: number;
  name: string;
  bytes: number;
  url: string; // thumbnail object URL; ours to revoke
  close: () => void; // bitmap handle, released on replace/clear
}

let nextPhotoId = 0;

export function CapyPassport() {
  const [specId, setSpecId] = useState(DEFAULT_SPEC.id);
  const spec = specById(specId) ?? DEFAULT_SPEC;
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [face, setFace] = useState<FaceGeometry | null>(null);
  const [tweak, setTweak] = useState<Tweak>(DEFAULT_TWEAK);
  const [fill, setFill] = useState<string>("off");
  const [fillStatus, setFillStatus] = useState("");
  const [guidesExport, setGuidesExport] = useState(false);
  const [copies, setCopies] = useState(6);
  const [verdict, setVerdict] = useState<BackgroundVerdict | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [modelBytes, setModelBytes] = useState<{ received: number; total: number } | null>(null);
  const [exported, setExported] = useState<Blob | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<ErrorNotice | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const masterRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const runId = useRef(0);
  // Every object URL we create, freed when the tab goes away.
  const ownedUrls = useRef<Array<{ url: string }>>([]);

  const isDemo = !photo;

  // ——— derived geometry: one useMemo, through the pure engine ———

  const fit: Fit | null = useMemo(() => {
    if (photo && face) return fitCrop(spec, face, photo.width, photo.height, tweak);
    if (isDemo) return demoFit(spec);
    return null;
  }, [photo, face, spec, tweak, isDemo]);

  const layout = useMemo(() => sheetLayout(spec, Math.min(copies, maxCopies(spec))), [spec, copies]);
  const copiesMax = maxCopies(spec);

  // The dock only exists once the client mounts (portalled to <body>).
  const [portalReady, setPortalReady] = useState(false);
  const markPortalReady = useCallback(() => setPortalReady(true), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(markPortalReady, [markPortalReady]);
  const [card03InView, setCard03InView] = useState(true);
  useEffect(() => {
    const card = document.getElementById("capypassport-sheet");
    if (!card || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setCard03InView(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // Free every object URL we ever made when the tab goes away.
  useEffect(() => {
    const owned = ownedUrls.current;
    return () => {
      for (const { url } of owned) URL.revokeObjectURL(url);
    };
  }, []);

  const ownUrl = useCallback((url: string) => {
    ownedUrls.current.push({ url });
    return url;
  }, []);

  // ——— the camera ———

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  // The <video> element mounts with the state flip; attach the stream then.
  useEffect(() => {
    if (!cameraOn) return;
    const video = videoRef.current;
    if (video && streamRef.current && video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
      void video.play();
    }
  }, [cameraOn]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setCameraError("the browser refused the camera — pick or drop a photo instead; nothing is lost.");
    }
  }, []);

  // ——— the photo ———

  const addFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|avif|gif|bmp)$/i.test(file.name)) return;
      nextPhotoId += 1;
      const mine = nextPhotoId;
      runId.current += 1;
      setError(null);
      setStatus("");
      setFace(null);
      setExported(null);
      setVerdict(null);
      setDetecting(true);
      setModelBytes(null);
      const url = ownUrl(URL.createObjectURL(file));
      let decoded: Awaited<ReturnType<typeof decodePortrait>> | null = null;
      try {
        const d = await decodePortrait(file);
        decoded = d;
        if (mine !== nextPhotoId) {
          URL.revokeObjectURL(url);
          d.close();
          return;
        }
        setPhoto((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev.url);
            prev.close();
          }
          return {
            img: d.source,
            width: d.width,
            height: d.height,
            name: file.name,
            bytes: file.size,
            url,
            close: d.close,
          };
        });
        // Detection reads the decoded source — EXIF orientation already
        // honoured by the decode. The model download reports once.
        const geometry = await detectFace(d.source, ({ received, total }) => setModelBytes({ received, total }));
        if (mine !== nextPhotoId) return;
        setDetecting(false);
        if (!geometry) {
          setFace(null);
          setError({
            title: "No face found in this photo.",
            body: "The rules are written for one person, facing the camera. A clear, front-facing portrait works best — try another shot.",
          });
          return;
        }
        setFace(geometry);
        setStatus(`face found — head height is an estimate; the sliders fine-tune it.`);
      } catch (detectError) {
        if (mine !== nextPhotoId) {
          decoded?.close();
          return;
        }
        setDetecting(false);
        if (detectError instanceof Error && detectError.name === "PortraitDecodeError") {
          setError({
            title: "That file won't open.",
            body: "The browser couldn't read that image. A JPEG, PNG or WebP exported from your camera roll will work.",
          });
          URL.revokeObjectURL(url);
          return;
        }
        // A failed run holds a decoded bitmap; a retry re-decodes from the
        // file, so give this one back either way.
        decoded?.close();
        setError({
          title: "The fit didn't make it.",
          body: detectError instanceof Error ? detectError.message : "Something went wrong inside the tab. Try the file again.",
          retry: true,
        });
      }
    },
    [ownUrl],
  );

  const captureCamera = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      void addFile(file);
    }, "image/jpeg", 0.95);
    stopCamera();
  }, [addFile, stopCamera]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void addFile(file);
    },
    [addFile],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        void addFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFile]);

  const clearPhoto = useCallback(() => {
    runId.current += 1;
    nextPhotoId += 1;
    if (photo) {
      URL.revokeObjectURL(photo.url);
      photo.close();
    }
    setPhoto(null);
    setFace(null);
    setVerdict(null);
    setExported(null);
    setTweak(DEFAULT_TWEAK);
    setStatus("");
    setError(null);
    setFill("off");
  }, [photo]);

  // The last file the visitor handed over, for a retry that could work —
  // state, not a ref: the error card reads it during render.
  const [lastFile, setLastFile] = useState<File | null>(null);
  const pickFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      setLastFile(file);
      void addFile(file);
    },
    [addFile],
  );

  // ——— the background question (photo only, never the demo) ———

  useEffect(() => {
    if (!photo || !fit) return;
    let cancelled = false;
    void (async () => {
      const small = renderCrop(photo.img, fit.crop, 240, Math.max(1, Math.round((240 * fit.crop.h) / fit.crop.w)));
      try {
        const ctx = small.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        const data = ctx.getImageData(0, 0, small.width, small.height);
        const next = checkCorners(data.data, small.width, small.height);
        if (!cancelled) setVerdict(next);
      } finally {
        // The crop canvas is scratch; nothing to revoke.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photo, fit]);

  // ——— the master export: the single photo's pixels, kept for both downloads ———

  useEffect(() => {
    if (!photo || !fit) return;
    const mine = ++runId.current;
    const render = async () => {
      // The fill path hands the crop to CapyBg's people matte; the model
      // stays loaded between exports, so a re-tint is fast after the first.
      let master: HTMLCanvasElement;
      if (fill !== "off") {
        setFillStatus("separating you from the background…");
        const cropCanvas = renderCrop(photo.img, fit.crop, spec.px.w, spec.px.h);
        const cropBlob = await exportCanvas(cropCanvas, "image/png");
        if (mine !== runId.current) return;
        const filled = await removeBackground(
          cropBlob,
          { model: "modnet", backdrop: { color: fill }, format: "jpeg", quality: 0.95 },
          ({ received = 0, total = 0 }) =>
            setFillStatus(total > 0 ? `fetching the people model — ${formatBytes(received)} of ${formatBytes(total)}, once` : "warming the people model…"),
        );
        if (mine !== runId.current) return;
        const bitmap = await createImageBitmap(filled.blob);
        master = renderCrop(bitmap, { x: 0, y: 0, w: bitmap.width, h: bitmap.height }, spec.px.w, spec.px.h);
        bitmap.close();
        setFillStatus("");
      } else {
        master = renderCrop(photo.img, fit.crop, spec.px.w, spec.px.h);
      }
      if (guidesExport) drawGuides(master, spec, fit);
      const blob = await exportCanvas(master, "image/jpeg", 0.92);
      if (mine !== runId.current) return;
      masterRef.current = master;
      setExported(blob);
    };
    const timer = setTimeout(() => {
      void render().catch((renderError) => {
        if (mine !== runId.current) return;
        setFillStatus("");
        if (renderError instanceof BgCutCancelledError) return;
        setStatus(renderError instanceof Error ? `${renderError.message}` : "the export didn't make it — try again.");
      });
    }, EXPORT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [photo, fit, spec, fill, guidesExport]);

  // ——— the preview ———

  const drawPreview = useCallback(() => {
    const canvas = previewCanvas.current;
    if (!canvas || !fit) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = Math.min(1, PREVIEW_MAX / Math.max(fit.crop.w, fit.crop.h));
    const w = Math.max(1, Math.round(fit.crop.w * scale));
    const h = Math.max(1, Math.round(fit.crop.h * scale));
    canvas.width = w;
    canvas.height = h;

    // The filled master when there is one, the raw crop otherwise — the
    // preview always shows what the export will be. `exported` is a
    // dependency precisely so a fresh master repaints the preview.
    if (fill !== "off" && masterRef.current && exported) {
      ctx.drawImage(masterRef.current, 0, 0, w, h);
    } else if (photo) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(photo.img, fit.crop.x, fit.crop.y, fit.crop.w, fit.crop.h, 0, 0, w, h);
    } else {
      const demo = document.createElement("canvas");
      drawDemoPhoto(demo);
      ctx.drawImage(demo, fit.crop.x, fit.crop.y, fit.crop.w, fit.crop.h, 0, 0, w, h);
    }

    // The overlay: where the measured bands sit on THIS crop. Dashed sage
    // edges for the head band, a dotted water line for the eyes.
    const rowOf = (mm: number) => (mm / spec.physical.hMm) * h;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "rgba(74, 103, 65, 0.85)";
    for (const mm of [fit.topMarginMm, fit.topMarginMm + fit.headMm]) {
      const y = Math.round(rowOf(mm)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    if (fit.eyeLineMm !== null) {
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = "rgba(95, 122, 114, 0.9)";
      const y = Math.round(rowOf(spec.physical.hMm - fit.eyeLineMm)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }, [fit, spec, photo, fill, exported]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // ——— downloads ———

  const exportReady = exported !== null && !detecting;

  const downloadSingle = useCallback(() => {
    if (!exported) return;
    saveBlob(exported, photoFilename(spec.id, spec.px.w, spec.px.h));
    setStatus(`photo saved — ${spec.px.w} × ${spec.px.h} px, ${formatBytes(exported.size)}.`);
  }, [exported, spec]);

  const downloadSheet = useCallback(() => {
    const master = masterRef.current;
    if (!master || !layout) return;
    const sheet = renderSheet(master, layout);
    void exportCanvas(sheet, "image/png").then((blob) => {
      saveBlob(blob, sheetFilename(spec.id));
      setStatus(`sheet saved — ${sheet.width} × ${sheet.height} px, exactly 4 × 6 in at ${spec.dpi} dpi, ${formatBytes(blob.size)}.`);
    });
  }, [layout, spec]);

  const forgetModel = useCallback(() => {
    void deleteCachedModel().then(() => setStatus("the downloaded face model is gone from this browser; it re-downloads next time."));
  }, []);

  // ——— readouts ———

  const headFlag = fit ? flag(fit.headMm, spec.head.minMm, spec.head.maxMm) : null;
  const eyeBand = spec.eyeLineFromBottom;
  const eyeFlag =
    fit && fit.eyeLineMm !== null && eyeBand
      ? flag(fit.eyeLineMm, eyeBand.minMm, eyeBand.maxMm)
      : null;
  const bytesLow = exported && spec.digitalMin.minKB ? exported.size < spec.digitalMin.minKB * 1024 : false;

  const dockText = detecting
    ? "reading the photo…"
    : !photo
      ? "a photo to check, when you're ready."
      : exportReady
        ? "your photo fits its frame — downloads beside it."
        : "framing…";

  return (
    <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_368px] lg:items-start">
      {/* CARD 1: THE SHOT */}
      <StageCard index="01" title="The shot" marks className="lg:col-start-1">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">document</span>
          {SPECS.map((row) => (
            <Pill key={row.id} active={row.id === specId} onClick={() => setSpecId(row.id)} label={`Document ${row.label}`}>
              {row.label}
            </Pill>
          ))}
        </div>

        {cameraOn ? (
          <div className="mt-4 flex flex-col gap-2">
            <video ref={videoRef} autoPlay playsInline muted className="mx-auto block max-h-[380px] w-full rounded-2xl border border-border bg-muted/40 object-contain" />
            <div className="flex items-center justify-center gap-2">
              <Button className="h-9 rounded-full px-4" onClick={captureCamera}>
                capture the shot
              </Button>
              <Button variant="ghost" className="rounded-full" onClick={stopCamera}>
                turn the camera off
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              the camera opens only because you asked; the frame is grabbed in this tab and never sent anywhere.
            </p>
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
            onDrop={onDrop}
            className={cn(
              "mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring/50",
              dragOver && "border-primary bg-muted/50",
            )}
          >
            <CapyArt pose="awake" className="w-16" />
            <span className="mt-1 text-sm font-medium text-foreground">Drop a portrait photo</span>
            <span className="text-xs text-muted-foreground">or click to pick, or paste. your photo never leaves this tab.</span>
          </button>
        )}

        {cameraError ? (
          <p role="status" className={cn("mt-3 rounded-2xl border px-4 py-2 text-[13px] leading-snug", STAGE_TONE.clay)}>
            {cameraError}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Pill active={false} onClick={() => void startCamera()} label="Use the camera">
            <Camera className="mr-1 inline size-3.5" aria-hidden />
            use the camera
          </Pill>
          {photo ? (
            <>
              <Pill active={false} onClick={() => fileInput.current?.click()} label="Pick a different photo">
                different photo
              </Pill>
              <Pill active={false} onClick={clearPhoto} label="Clear the photo">
                <RotateCcw className="mr-1 inline size-3" aria-hidden />
                clear
              </Pill>
            </>
          ) : null}
        </div>

        {photo ? (
          <p className="mt-3 text-center text-xs text-muted-foreground" aria-live="polite">
            {photo.name} · {photo.width} × {photo.height} px · {formatBytes(photo.bytes)}
          </p>
        ) : (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            one person, facing the camera, in even light — the rules every document writes down.
          </p>
        )}
      </StageCard>

      {/* CARD 2: THE FIT */}
      <StageCard
        index="02"
        title="The fit"
        className="lg:col-start-1"
        chips={<StageChip>estimate</StageChip>}
      >
        <div className="relative">
          <canvas
            ref={previewCanvas}
            role="img"
            aria-label={
              isDemo
                ? "Demo portrait framed to the chosen document, with the head band drawn"
                : `Your photo framed to the chosen document, head band drawn between the estimated crown and chin`
            }
            className="mx-auto block h-auto max-h-[460px] w-auto max-w-full rounded-2xl border border-border bg-muted/40 object-contain"
          />
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground" aria-live="polite">
          {detecting
            ? modelBytes
              ? `fetching the face model — ${formatBytes(modelBytes.received)} of ${formatBytes(modelBytes.total)}, once per browser`
              : "reading the photo…"
            : isDemo
              ? "a demo — drop a photo to see your own fit."
              : "dashed lines: the estimated crown and chin. dotted: the eye line."}
        </p>

        {detecting ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="face model download progress">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: modelBytes?.total ? `${Math.min(100, Math.round((modelBytes.received / modelBytes.total) * 100))}%` : "40%" }}
            />
          </div>
        ) : null}

        {fit ? (
          <div className="mt-4 flex flex-col gap-2" aria-live="polite">
            <ReadoutRow
              label="head height, chin to crown (estimated)"
              value={`${mmLabel(fit.headMm)} · ${formatPct(fit.headPct)} of the frame`}
              level={headFlag?.level}
              word={headFlag?.word}
            />
            <ReadoutRow label="top margin to the crown (estimated)" value={mmLabel(fit.topMarginMm)} />
            {spec.eyeLineFromBottom && fit.eyeLineMm !== null ? (
              <ReadoutRow
                label="eye line above the bottom edge"
                value={mmLabel(fit.eyeLineMm)}
                level={eyeFlag?.level}
                word={eyeFlag?.word}
              />
            ) : null}
            {fit.clamped ? (
              <p className={cn("rounded-2xl border px-4 py-2 text-[13px] leading-snug", STAGE_TONE.clay)} role="status">
                the photo is too tight to frame like this, so the crop stayed inside it — step back and reshoot if you can.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Slider
            id="capypassport-head"
            label="head size"
            min={0}
            max={1}
            step={0.01}
            value={tweak.headT}
            onChange={(n) => setTweak((prev) => ({ ...prev, headT: n }))}
            display={fit ? `${formatMm(fit.headMm)} mm` : "—"}
          />
          <Slider
            id="capypassport-margin"
            label="vertical position"
            min={0}
            max={1}
            step={0.01}
            value={tweak.marginT}
            onChange={(n) => setTweak((prev) => ({ ...prev, marginT: n }))}
            display={fit ? `${formatMm(fit.topMarginMm)} mm to crown` : "—"}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            sliders can leave the published range on purpose — the readout tells you when they do.
          </p>
          <Pill
            active={false}
            onClick={() => setTweak(DEFAULT_TWEAK)}
            label="Reset the fine-tune"
          >
            reset
          </Pill>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Pill active={guidesExport} onClick={() => setGuidesExport((v) => !v)} label="Draw the measured lines in the downloaded file">
            draw the lines in the download
          </Pill>
          <span className="text-xs text-muted-foreground">off by default — a photo with ruler lines is itself altered.</span>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">background</span>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill active={fill === "off"} onClick={() => setFill("off")} label="Leave the background as shot">
              leave as shot
            </Pill>
            {spec.allowedFills.map((option) => (
              <Pill
                key={option.hex}
                active={fill === option.hex}
                onClick={() => setFill(option.hex)}
                label={`Fill the background with ${option.label}`}
              >
                fill {option.label}
              </Pill>
            ))}
          </div>
          {fill !== "off" ? (
            <p className={cn("mt-2 rounded-2xl border px-4 py-2 text-[13px] leading-snug", STAGE_TONE.clay)} role="note">
              {FILL_WARNING} The fill runs the same people-cutting model CapyBg uses, here in this tab.
            </p>
          ) : null}
          {fill !== "off" && fillStatus ? (
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {fillStatus}
            </p>
          ) : null}
          {fill === "off" && verdict?.note ? (
            <p className={cn("mt-2 rounded-2xl border px-4 py-2 text-[13px] leading-snug", STAGE_TONE.clay)} role="status">
              {verdict.note}
            </p>
          ) : null}
        </div>
      </StageCard>

      {/* CARD 3: THE SHEET — sticky on desktop */}
      <StageCard
        id="capypassport-sheet"
        index="03"
        title="The sheet"
        className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        chips={
          isDemo ? (
            <StageChip>demo</StageChip>
          ) : (
            <StageChip tone={exportReady ? "sage" : "plain"}>{exportReady ? "ready" : "framing"}</StageChip>
          )
        }
      >
        <p className="text-[13px] leading-snug text-muted-foreground">
          the single file for the online portal, and a print sheet to cut at home — both drawn from the same fit.
        </p>

        <div className="mt-3 flex flex-col gap-1 rounded-2xl border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-muted-foreground">single photo (jpeg)</span>
            <span className="font-mono text-[12px] tabular-nums text-foreground">
              {spec.px.w} × {spec.px.h} px{exported ? ` · ${formatBytes(exported.size)}` : ""}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-muted-foreground">print sheet (png)</span>
            <span className="font-mono text-[12px] tabular-nums text-foreground">
              {layout ? `${layout.w} × ${layout.h} px · exactly 4 × 6 in at ${spec.dpi} dpi` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-muted-foreground">copies on the sheet</span>
            <span className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-3"
                aria-label="One copy fewer"
                disabled={copies <= 1}
                onClick={() => setCopies((n) => Math.max(1, n - 1))}
              >
                −
              </Button>
              <span className="min-w-6 text-center font-mono text-[13px] tabular-nums">{Math.min(copies, copiesMax)}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-3"
                aria-label="One copy more"
                disabled={copies >= copiesMax}
                onClick={() => setCopies((n) => Math.min(copiesMax, n + 1))}
              >
                +
              </Button>
            </span>
          </div>
        </div>

        {bytesLow ? (
          <p className={cn("mt-3 rounded-2xl border px-4 py-2 text-[13px] leading-snug", STAGE_TONE.clay)} role="status">
            this file is {formatBytes(exported?.size ?? 0)} — the {spec.label} guidance asks for at least {spec.digitalMin.minKB} kB.
            a busier background (or the fill) raises the size.
          </p>
        ) : null}

        <Button className="mt-4 h-11 w-full min-w-[84px] rounded-full text-base" onClick={downloadSingle} disabled={!exportReady}>
          <Download className="mr-1.5 size-4" aria-hidden />
          download the photo
        </Button>
        <Button
          variant="outline"
          className="mt-2 h-11 w-full min-w-[84px] rounded-full"
          onClick={downloadSheet}
          disabled={!exportReady || !layout}
        >
          <Printer className="mr-1.5 size-4" aria-hidden />
          download the print sheet
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {isDemo ? "drop a photo to enable the downloads." : "your photo never leaves this tab — the only network request here is the face model, from this site."}
        </p>
        {!isDemo ? (
          <button type="button" onClick={forgetModel} className="mx-auto mt-1 block text-[11px] text-muted-foreground underline-offset-2 hover:underline">
            remove the downloaded face model from this browser
          </button>
        ) : null}

        {/* The provenance block: the plan's §6.3 rules live here. */}
        <div className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            specs last checked {spec.verifiedOn} ·{" "}
            <a href={spec.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:text-primary">
              {spec.sourceLabel}
            </a>
          </p>
          <p className="mt-1">
            always confirm on the official site before you file —{spec.provenance === "surfaced"
              ? " this authority blocks automated checks, so its figures are corroborated from published summaries."
              : " these figures were read from the source above on the date shown."}
          </p>
          <p className="mt-1">
            this tool checks the geometry against the published rules. it cannot judge expression, glasses, headwear,
            print quality, or whether a photo is unaltered — and it will never claim to.
          </p>
        </div>

        {status ? (
          <p aria-live="polite" className="mt-3 min-h-5 text-xs text-muted-foreground">
            {status}
          </p>
        ) : null}
      </StageCard>

      {/* The hard failures, where the shot card can show them. */}
      {error ? (
        <div className="lg:col-span-2">
          <ErrorCard
            title={error.title}
            body={error.body}
            onRetry={
              error.retry && lastFile
                ? () => pickFile(lastFile)
                : undefined
            }
          />
        </div>
      ) : null}

      {/* Below lg, the run follows the thumb (CapyQR's dock). Portalled to
          <body>: a transformed ancestor re-anchors position: fixed. */}
      {portalReady
        ? createPortal(
            <div
              inert={card03InView || !photo}
              aria-hidden={card03InView || !photo}
              className={cn(
                "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden",
                card03InView || !photo ? "translate-y-full" : "translate-y-0",
              )}
            >
              <div className="mx-auto flex max-w-xl items-center gap-3">
                <span className="flex size-14 flex-none items-center justify-center rounded-lg border border-border bg-muted/40">
                  <FileImage className="size-5 text-muted-foreground" aria-hidden />
                </span>
                <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground" aria-live="polite">
                  {dockText}
                </p>
                <Button className="h-11 flex-none rounded-full px-5" onClick={downloadSingle} disabled={!exportReady}>
                  <Download className="mr-1.5 size-4" aria-hidden />
                  photo
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
