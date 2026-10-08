"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileArchive, RotateCcw, Undo2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CapyArt } from "@/components/mascot/CapyArt";
import { STAGE_TONE, StageCard, StageChip } from "@/components/stage-card";
import { saveBlob } from "@/lib/download";
import { drawDemoPhoto, DEMO_SPEC } from "@/lib/capystamp/demo";
import { ensureFontLoaded, FACES, fontString, readFaceVars, resolveFamilyList } from "@/lib/capystamp/fonts";
import {
  logoAspectOf,
  logoBox,
  markBox,
  SAFE_MARGIN,
  textFontSize,
  type Box,
} from "@/lib/capystamp/geometry";
import { decodeImage, formatBytes, zipPack } from "@/lib/capyresize/render";
import type { OutputFormat, PackFiles } from "@/lib/capyresize/types";
import { addPreset, loadPresets, removePreset, type StampPreset } from "@/lib/capystamp/presets";
import { drawStamp, measureTextWidth } from "@/lib/capystamp/render";
import { FREE_BATCH_LIMIT, runBatch } from "@/lib/capystamp/batch";
import { clampSpec, DEFAULT_LOGO_SPEC, DEFAULT_TEXT_SPEC, WEIGHTS } from "@/lib/capystamp/spec";
import type {
  Anchor,
  FontChoice,
  Halo,
  ItemStatus,
  OutputOptions,
  StampSpec,
  StampResult,
  Tiling,
} from "@/lib/capystamp/types";
import { cn } from "@/lib/utils";

/**
 * CapyStamp — put your mark on it. One design, drawn by the same drawStamp
 * the export uses, applied to one photo or a capped batch. Everything runs
 * in this tab: no route could receive a photo even if one wanted to, which
 * tests/capystamp-boundaries.test.ts holds by refusing any request API in
 * the tool's sources.
 */

/** Preview canvas fits inside this box, whatever the photo's shape. */
const PREVIEW_MAX = 640;

const FORMATS: OutputFormat[] = ["png", "jpeg", "webp"];
const TILINGS: Tiling[] = ["none", "grid", "diagonal"];
const HALOS: Halo[] = ["none", "shadow", "outline"];

const ANCHOR_LABELS: Record<Anchor, string> = {
  tl: "Top left",
  tc: "Top centre",
  tr: "Top right",
  ml: "Middle left",
  mc: "Centre",
  mr: "Middle right",
  bl: "Bottom left",
  bc: "Bottom centre",
  br: "Bottom right",
};
const ANCHORS = Object.keys(ANCHOR_LABELS) as Anchor[];

/** Named swatches — the house palette, readable without a colour picker. */
const MARK_SWATCHES = ["#ffffff", "#1a1a1a", "#8e9b7e", "#5f7a72", "#c07952", "#d9a441"] as const;
const SWATCH_NAMES: Record<string, string> = {
  "#ffffff": "White",
  "#1a1a1a": "Ink",
  "#8e9b7e": "Sage",
  "#5f7a72": "Water",
  "#c07952": "Clay",
  "#d9a441": "Gold",
};

const labelClass =
  "font-mono text-[13px] text-muted-foreground";

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
        <label htmlFor={id} className={labelClass}>
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

function Swatches({
  label,
  value,
  onPick,
}: {
  label: string;
  value: string;
  onPick: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pointer-coarse:gap-2.5">
      <span className={labelClass}>{label}</span>
      {MARK_SWATCHES.map((hex) => (
        <button
          key={hex}
          type="button"
          aria-label={`${label}: ${SWATCH_NAMES[hex] ?? hex}`}
          aria-pressed={value.toLowerCase() === hex}
          onClick={() => onPick(hex)}
          className={cn(
            "size-5 rounded-full border transition-colors pointer-coarse:size-11",
            value.toLowerCase() === hex
              ? "border-foreground ring-2 ring-[var(--primary)]/40"
              : "border-foreground/25 hover:border-foreground/50",
          )}
          style={{ background: hex }}
        />
      ))}
    </div>
  );
}

interface QueueItem {
  id: string;
  file: File;
  url: string; // thumbnail object URL; ours to revoke
  status: ItemStatus;
  reason?: string;
  result?: StampResult;
}

interface Decoded {
  id: string;
  img: HTMLImageElement;
  width: number;
  height: number;
}

interface Downloadables {
  links: Array<{ name: string; url: string }>;
  zip?: { name: string; url: string };
}

let nextItemId = 0;

export function CapyStamp() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spec, setSpec] = useState<StampSpec>(DEMO_SPEC);
  const [beforeDemo, setBeforeDemo] = useState<{ before: StampSpec; after: StampSpec } | null>(null);
  const [output, setOutput] = useState<OutputOptions>({ format: "png", quality: 0.9 });
  const [logo, setLogo] = useState<{ img: HTMLImageElement; name: string; aspect: number } | null>(null);
  const [presets, setPresets] = useState<StampPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [faceVars, setFaceVars] = useState<Record<string, string>>({});
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [cancelledRun, setCancelledRun] = useState(false);
  const [overCap, setOverCap] = useState(0);
  const [downloads, setDownloads] = useState<Downloadables | null>(null);
  const [status, setStatus] = useState("");
  const [portalReady, setPortalReady] = useState(false);
  const [card03InView, setCard03InView] = useState(true);

  const fileInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const dockThumb = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef(false);
  const downloadRefs = useRef<Array<{ url: string }>>([]);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const selectedItemId = selected?.id ?? null;
  const selectedFile = selected?.file ?? null;
  const isDemo = items.length === 0;
  const stamped = items.filter((item): item is QueueItem & { result: StampResult } => Boolean(item.result));
  const failed = items.filter((item) => item.status === "failed");
  const missingText = spec.kind === "text" && !spec.text.trim();
  const missingLogo = spec.kind === "logo" && !logo;
  const canRun = !running && items.length > 0 && !missingText && !missingLogo;

  // Presets are settings in localStorage — read in a hydrate effect, never in
  // a useState initializer, so the server markup can't depend on them.
  const hydratePresets = useCallback(() => {
    setPresets(loadPresets());
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(hydratePresets, [hydratePresets]);

  // The house faces' real family names only exist at runtime, in CSS
  // variables on <html> — read them once the client is up.
  const hydrateFaceVars = useCallback(() => {
    setFaceVars(readFaceVars());
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(hydrateFaceVars, [hydrateFaceVars]);

  // The dock only exists once the client mounts (portalled to <body>).
  const markPortalReady = useCallback(() => setPortalReady(true), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(markPortalReady, [markPortalReady]);

  useEffect(() => {
    const card = document.getElementById("capystamp-output");
    if (!card || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setCard03InView(entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // Free every object URL we ever made when the tab goes away.
  useEffect(() => {
    return () => {
      for (const { url } of downloadRefs.current) URL.revokeObjectURL(url);
      downloadRefs.current = [];
    };
  }, []);

  const releaseDownloads = useCallback(() => {
    for (const { url } of downloadRefs.current) URL.revokeObjectURL(url);
    downloadRefs.current = [];
    setDownloads(null);
  }, []);

  // ——— the queue ———

  const addFiles = useCallback(
    (incoming: File[]) => {
      const images = incoming.filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|avif|gif|bmp)$/i.test(f.name));
      if (images.length === 0) return;
      // The run writes results back by queue position — the queue holds still.
      if (running) {
        setStatus("Wait for this run to finish, then add more.");
        return;
      }
      const room = Math.max(0, FREE_BATCH_LIMIT - items.length);
      const accepted = images.slice(0, room);
      const overflow = images.length - accepted.length;
      if (accepted.length === 0) {
        setOverCap((prev) => prev + overflow);
        setStatus(`CapyStamp does ${FREE_BATCH_LIMIT} images at a time. Finish or clear this run first.`);
        return;
      }
      const queued: QueueItem[] = accepted.map((file) => {
        nextItemId += 1;
        return {
          id: `f${nextItemId}`,
          file,
          url: URL.createObjectURL(file),
          status: "queued",
        };
      });
      setItems((prev) => {
        const next = [...prev, ...queued];
        setSelectedId((current) => current ?? next[0]?.id ?? null);
        return next;
      });
      setOverCap(overflow);
      releaseDownloads();
      setStatus("");
    },
    [items.length, running, releaseDownloads],
  );

  const removeItem = useCallback(
    (id: string) => {
      if (running) return;
      setOverCap(0);
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        const gone = prev.find((item) => item.id === id);
        if (gone) URL.revokeObjectURL(gone.url);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
      releaseDownloads();
    },
    [running, selectedId, releaseDownloads],
  );

  const clearAll = useCallback(() => {
    if (running) return;
    setItems((prev) => {
      for (const item of prev) URL.revokeObjectURL(item.url);
      return [];
    });
    setSelectedId(null);
    setDecoded(null);
    setOverCap(0);
    setStatus("");
    releaseDownloads();
  }, [running, releaseDownloads]);

  // Drop, pick and paste all land here.
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length > 0) {
        event.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  // ——— the logo ———

  const onLogoFile = useCallback((file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // A loaded image keeps its pixels; the URL is no longer needed.
      URL.revokeObjectURL(url);
      setLogo({ img, name: file.name, aspect: logoAspectOf(img.naturalWidth, img.naturalHeight) });
      setStatus(`Logo set — ${file.name}. Pick it again after a preset applies; presets never store it.`);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setStatus("That logo wouldn't open — try a PNG, WebP or SVG.");
    };
    img.src = url;
  }, []);

  // ——— drawing: the demo, then the live preview ———

  /** The dock's 56px stand-in: centre-cropped (cover), never squashed. */
  const drawDockThumb = useCallback(() => {
    const thumb = dockThumb.current;
    const source = previewCanvas.current;
    if (!thumb || !source || source.width < 2) return;
    const ctx = thumb.getContext("2d");
    if (!ctx) return;
    const s = 56;
    const crop = Math.min(source.width, source.height);
    const sx = (source.width - crop) / 2;
    const sy = (source.height - crop) / 2;
    ctx.clearRect(0, 0, s, s);
    ctx.drawImage(source, sx, sy, crop, crop, 0, 0, s, s);
  }, []);

  const drawNow = useCallback(
    (source: HTMLImageElement, width: number, height: number) => {
      const canvas = previewCanvas.current;
      if (!canvas) return;
      const scale = Math.min(1, PREVIEW_MAX / Math.max(width, height));
      const cw = Math.max(1, Math.round(width * scale));
      const ch = Math.max(1, Math.round(height * scale));
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const aspect = logo?.aspect ?? 1;
      drawStamp(ctx, source, clampSpec(spec), spec.kind === "logo" ? logo?.img ?? null : null, {
        vars: faceVars,
        logoAspect: aspect,
      });
    },
    [spec, logo, faceVars],
  );

  const drawDemo = useCallback(() => {
    const canvas = previewCanvas.current;
    if (!canvas) return;
    // The demo "photo" is painted by canvas calls — no asset, no request.
    drawDemoPhoto(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawStamp(ctx, canvas, DEMO_SPEC, null, { vars: faceVars });
    drawDockThumb();
  }, [faceVars, drawDockThumb]);

  // Decode the selected file (EXIF orientation honoured) when the selection moves.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!selectedFile || !selectedItemId) {
        setDecoded(null);
        return;
      }
      try {
        const next = await decodeImage(selectedFile);
        if (cancelled) return;
        setDecoded({ id: selectedItemId, img: next.img, width: next.width, height: next.height });
      } catch {
        if (cancelled) return;
        setDecoded(null);
        setStatus(`Couldn't preview ${selectedFile.name} — the browser couldn't read it.`);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Keyed on the file, not the item: a status change during a run makes a
    // new item object, and must not re-decode a full-size photo.
  }, [selectedItemId, selectedFile]);

  // Redraw whenever the design, the face variables or the decoded image move.
  useEffect(() => {
    let cancelled = false;
    if (isDemo || !decoded) {
      if (isDemo) drawDemo();
      return;
    }
    void (async () => {
      // Font readiness is the silent preview/export mismatch — ask first.
      if (spec.kind === "text") {
        await ensureFontLoaded(spec.font, spec.weight, textFontSize(decoded.width, decoded.height, spec), spec.text, faceVars);
      }
      if (cancelled) return;
      drawNow(decoded.img, decoded.width, decoded.height);
      drawDockThumb();
    })();
    return () => {
      cancelled = true;
    };
  }, [isDemo, decoded, spec, logo, faceVars, drawNow, drawDemo, drawDockThumb]);

  // ——— dragging the mark ———

  const displayBox = useCallback(
    (w: number, h: number): Box => {
      const canvas = previewCanvas.current;
      if (spec.kind !== "text") return logoBox(w, h, spec, logo?.aspect ?? 1);
      const fontPx = textFontSize(w, h, spec);
      const ctx = canvas?.getContext("2d");
      if (!ctx) return { width: spec.text.length * fontPx * 0.55, height: fontPx };
      // Measure with the face and spacing the preview draws with.
      ctx.font = fontString(spec.weight, fontPx, resolveFamilyList(spec.font, faceVars));
      return { width: measureTextWidth(ctx, spec, fontPx), height: fontPx };
    },
    [spec, logo, faceVars],
  );

  const applyDrag = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = previewCanvas.current;
      if (!canvas || canvas.width < 1) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const w = canvas.width;
      const h = canvas.height;
      const px = ((clientX - rect.left) / rect.width) * w;
      const py = ((clientY - rect.top) / rect.height) * h;
      const box = displayBox(w, h);
      const rest = markBox(w, h, { ...spec, offset: { x: 0, y: 0 } }, box);
      const ox = (px - box.width / 2 - rest.x) / w;
      const oy = (py - box.height / 2 - rest.y) / h;
      const round = (n: number) => Math.round(n * 1000) / 1000;
      setSpec((prev) => {
        if (prev.tiling !== "none") return prev;
        return { ...prev, offset: { x: round(ox), y: round(oy) } };
      });
    },
    [displayBox, spec],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isDemo || spec.tiling !== "none") return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      applyDrag(e.clientX, e.clientY);
    },
    [applyDrag, isDemo, spec.tiling],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragging) return;
      applyDrag(e.clientX, e.clientY);
    },
    [applyDrag, dragging],
  );

  const endDrag = useCallback(() => setDragging(false), []);

  const nudge = useCallback(
    (dx: number, dy: number) => {
      setSpec((prev) => {
        if (prev.tiling !== "none") return prev;
        const round = (n: number) => Math.round(n * 1000) / 1000;
        return {
          ...prev,
          offset: {
            x: round(Math.min(1, Math.max(-1, prev.offset.x + dx))),
            y: round(Math.min(1, Math.max(-1, prev.offset.y + dy))),
          },
        };
      });
    },
    [],
  );

  const onCanvasKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (isDemo || spec.tiling !== "none") return;
      const step = e.shiftKey ? 0.05 : 0.01;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const move = moves[e.key];
      if (move) {
        e.preventDefault();
        nudge(move[0], move[1]);
      }
    },
    [isDemo, spec.tiling, nudge],
  );

  // ——— the design controls ———

  const setPatch = useCallback((patch: Partial<StampSpec>) => {
    setSpec((prev) => {
      const next = { ...prev, ...patch } as StampSpec;
      // Switching kind swaps the discriminator's defaults in cleanly.
      if (patch.kind && patch.kind !== prev.kind) {
        return patch.kind === "logo" ? { ...DEFAULT_LOGO_SPEC } : { ...DEFAULT_TEXT_SPEC };
      }
      return next;
    });
  }, []);

  // Undo reverses the last reset or preset — and only while the design is
  // still exactly what that change left; a later edit supersedes it.
  const canUndo = beforeDemo !== null && beforeDemo.after === spec;

  const undo = useCallback(() => {
    if (beforeDemo && beforeDemo.after === spec) setSpec(beforeDemo.before);
    setBeforeDemo(null);
  }, [beforeDemo, spec]);

  const record = useCallback((next: StampSpec) => {
    setBeforeDemo({ before: spec, after: next });
    setSpec(next);
  }, [spec]);

  const resetAll = useCallback(() => {
    record(spec.kind === "logo" ? { ...DEFAULT_LOGO_SPEC } : { ...DEFAULT_TEXT_SPEC });
  }, [record, spec]);

  const savePreset = useCallback(() => {
    setPresets(addPreset(presetName, spec));
    setPresetName("");
    setStatus("Preset saved in this browser — settings only, never your photos or logo.");
  }, [presetName, spec]);

  const applyPreset = useCallback(
    (preset: StampPreset) => {
      record(clampSpec(preset.spec));
      // The logo is never in a preset, by design — point at the picker,
      // don't yank the visitor into the OS file dialog from a chip click.
      if (preset.spec.kind === "logo") {
        setStatus(`"${preset.name}" is a logo mark — pick a logo beside it to finish applying.`);
      } else {
        setStatus(`Applied "${preset.name}".`);
      }
    },
    [record],
  );

  const deletePreset = useCallback((id: string) => {
    setPresets(removePreset(id));
  }, []);

  // ——— the run ———

  const runStamp = useCallback(async () => {
    if (!canRun) return;
    const queue = items.map((item) => item.file);
    stopRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: queue.length });
    setCancelledRun(false);
    releaseDownloads();
    setItems((prev) => prev.map((item) => ({ ...item, status: "queued", reason: undefined, result: undefined })));
    setStatus("");

    try {
      // One last font ask before the batch — the export draws with the same
      // face the preview settled on.
      if (spec.kind === "text") {
        await ensureFontLoaded(spec.font, spec.weight, 64, spec.text, faceVars);
      }
  
      const outcome = await runBatch(queue, spec, output, {
        logo: spec.kind === "logo" ? logo?.img ?? null : null,
        vars: faceVars,
        shouldStop: () => stopRef.current,
        onItem: (index, itemStatus, payload) => {
          setProgress((prev) => ({
            done: itemStatus === "done" || itemStatus === "failed" ? prev.done + 1 : prev.done,
            total: queue.length,
          }));
          setItems((prev) =>
            prev.map((item, at) =>
              at === index
                ? {
                    ...item,
                    status: itemStatus,
                    reason: payload?.reason,
                    result: payload?.result,
                  }
                : item,
            ),
          );
        },
      });
  
      // Direct download for one; a ZIP plus per-file links for a batch.
      const fresh: Downloadables = { links: [] };
      for (const result of outcome.results) {
        const url = URL.createObjectURL(result.blob);
        fresh.links.push({ name: result.name, url });
        downloadRefs.current.push({ url });
      }
      // Links first, so a failed ZIP still leaves every file downloadable.
      setDownloads({ links: fresh.links });
      if (outcome.results.length === 1) {
        saveBlob(outcome.results[0].blob, outcome.results[0].name);
      } else if (outcome.results.length > 1) {
        const pack: PackFiles = outcome.results.map((result) => ({ name: result.name, blob: result.blob }));
        const zip = await zipPack(pack);
        const zipUrl = URL.createObjectURL(zip);
        fresh.zip = { name: `capystamp-${outcome.results.length}-images.zip`, url: zipUrl };
        downloadRefs.current.push({ url: zipUrl });
        saveBlob(zip, fresh.zip.name);
      }
      setDownloads(fresh);
      setCancelledRun(outcome.cancelled);
      // The count itself lives on the results note (one announcement, not two);
      // the status line carries only what the note doesn't say.
      const notes = outcome.results.flatMap((result) => result.notes);
      setStatus(
        [
          outcome.overflow > 0 ? `${outcome.overflow} file${outcome.overflow === 1 ? " was" : "s were"} past the cap of ${FREE_BATCH_LIMIT} — drop them after this run.` : "",
          outcome.results.length === 0 ? "Nothing stamped." : "",
          outcome.cancelled ? "Cancelled — finished files are kept." : "",
          ...notes,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch {
      setStatus("The run stopped unexpectedly — finished files are listed above; try a smaller batch.");
    } finally {
      setOverCap(0);
      setRunning(false);
    }
  }, [canRun, items, spec, output, logo, faceVars, releaseDownloads]);

  const cancelRun = useCallback(() => {
    stopRef.current = true;
  }, []);

  const totals = useMemo(() => {
    let before = 0;
    let after = 0;
    for (const item of stamped) {
      before += item.result.bytesBefore;
      after += item.result.bytesAfter;
    }
    return { before, after };
  }, [stamped]);

  const queueBytes = useMemo(() => items.reduce((sum, item) => sum + item.file.size, 0), [items]);

  const stampButtonLabel =
    items.length > 1 ? `Stamp ${items.length} photos` : "Stamp & download";

  const previewHint = isDemo
    ? "A demo — drop a photo to stamp your own."
    : spec.tiling === "none"
      ? "Drag the mark, or nudge with arrow keys (Shift for bigger steps)."
      : "Tiled marks cover the photo — the anchor picks up again when tiling is off.";

  return (
    <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_368px] lg:items-start">
      {/* CARD 1: THE PHOTOS */}
      <StageCard index="01" title="The photos" marks className="lg:col-start-1">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />

        {items.length === 0 ? (
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
              "flex w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring/50",
              dragOver && "border-primary bg-muted/50",
            )}
          >
            <CapyArt pose="awake" className="w-16" />
            <span className="mt-1 text-sm font-medium text-foreground">
              Drop photos — up to {FREE_BATCH_LIMIT} at a time
            </span>
            <span className="text-xs text-muted-foreground">
              Or click to pick, or paste. Your photos never leave this tab.
            </span>
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-2.5 transition-colors",
                dragOver && "border-primary",
              )}
            >
              <p className="text-[13px] text-muted-foreground">
                {items.length} photo{items.length === 1 ? "" : "s"} · {formatBytes(queueBytes)} — more can join, or paste.
              </p>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="rounded-full" disabled={running} onClick={() => fileInput.current?.click()}>
                  Add
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full" disabled={running} onClick={clearAll}>
                  Clear all
                </Button>
              </div>
            </div>

            {/* Keyboard-navigable strip; the selected photo drives the preview. */}
            <ul
              role="listbox"
              aria-label="Queued photos"
              aria-orientation="horizontal"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {items.map((item) => (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    role="option"
                    aria-selected={item.id === selectedId}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "group relative block size-16 overflow-hidden rounded-2xl border transition-colors pointer-coarse:size-20",
                      item.id === selectedId ? "border-primary ring-2 ring-[var(--primary)]/40" : "border-border hover:border-primary",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt="" className="size-full object-cover" />
                    <span className="sr-only">{item.file.name}</span>
                    {item.status === "failed" ? (
                      <span aria-hidden className="absolute inset-x-0 bottom-0 bg-[var(--clay)]/85 py-0.5 text-center font-mono text-[12px] text-white">
                        Failed
                      </span>
                    ) : item.status === "stamping" ? (
                      <span aria-hidden className="absolute inset-x-0 bottom-0 bg-primary/85 py-0.5 text-center font-mono text-[12px] text-[#141412]">
                        Stamping
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${item.file.name}`}
                    disabled={running}
                    onClick={() => removeItem(item.id)}
                    className="mt-1 flex w-full items-center justify-center text-muted-foreground transition-colors hover:text-foreground pointer-coarse:min-h-11"
                  >
                    <X className="size-3.5" aria-hidden />
                    <span className="sr-only">remove</span>
                  </button>
                </li>
              ))}
            </ul>

            {overCap > 0 ? (
              <p className={cn("rounded-2xl border px-4 py-2 text-[13px] leading-snug", STAGE_TONE.clay)} role="status">
                CapyStamp does {FREE_BATCH_LIMIT} images at a time; the first {FREE_BATCH_LIMIT} are queued. Drop the rest after this run.
              </p>
            ) : null}
          </div>
        )}

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Nothing uploaded — the stamping happens in this tab.
        </p>
      </StageCard>

      {/* CARD 2: THE MARK */}
      <StageCard
        index="02"
        title="The mark"
        className="lg:col-start-1"
        actions={
          <div className="flex items-center gap-1.5">
            <Pill active={false} disabled={!canUndo} onClick={undo} label="Undo the last reset or preset">
              <Undo2 className="mr-1 inline size-3" aria-hidden />
              Undo
            </Pill>
            <Pill active={false} onClick={resetAll} label="Reset the design to its defaults">
              <RotateCcw className="mr-1 inline size-3" aria-hidden />
              Reset
            </Pill>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill active={spec.kind === "text"} onClick={() => setPatch({ kind: "text" })} label="Text mark">
            Text
          </Pill>
          <Pill active={spec.kind === "logo"} onClick={() => setPatch({ kind: "logo" })} label="Logo mark">
            Logo
          </Pill>
        </div>

        {spec.kind === "text" ? (
          <div className="mt-4 grid gap-4">
            <div>
              <label htmlFor="capystamp-text" className={labelClass}>
                Text
              </label>
              <Input
                id="capystamp-text"
                type="text"
                maxLength={80}
                value={spec.text}
                onChange={(e) => setSpec((prev) => (prev.kind === "text" ? { ...prev, text: e.target.value } : prev))}
                placeholder="© Your name, or anything"
                className="mt-1.5 bg-muted/40 font-sans"
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={labelClass}>Font</span>
                {(Object.keys(FACES) as FontChoice[]).map((choice) => (
                  <Pill
                    key={choice}
                    active={spec.kind === "text" && spec.font === choice}
                    onClick={() => setSpec((prev) => (prev.kind === "text" ? { ...prev, font: choice } : prev))}
                    label={`Font ${FACES[choice].label}`}
                  >
                    {FACES[choice].label}
                  </Pill>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={labelClass}>Weight</span>
                {WEIGHTS.map((w) => (
                  <Pill
                    key={w}
                    active={spec.kind === "text" && spec.weight === w}
                    onClick={() => setSpec((prev) => (prev.kind === "text" ? { ...prev, weight: w } : prev))}
                    label={`Weight ${w}`}
                  >
                    {w}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Swatches
                label="Colour"
                value={spec.kind === "text" ? spec.colour : "#ffffff"}
                onPick={(hex) => setSpec((prev) => (prev.kind === "text" ? { ...prev, colour: hex } : prev))}
              />
              <div className="flex items-center gap-2">
                <label htmlFor="capystamp-colour" className={labelClass}>
                  Picker
                </label>
                <input
                  id="capystamp-colour"
                  type="color"
                  value={spec.kind === "text" ? spec.colour : "#ffffff"}
                  onChange={(e) => setSpec((prev) => (prev.kind === "text" ? { ...prev, colour: e.target.value } : prev))}
                  aria-label="Custom colour"
                  className="size-7 cursor-pointer rounded-full border border-border bg-transparent p-0.5 pointer-coarse:size-11"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={labelClass}>Halo</span>
                {HALOS.map((h) => (
                  <Pill
                    key={h}
                    active={spec.kind === "text" && spec.halo === h}
                    onClick={() => setSpec((prev) => (prev.kind === "text" ? { ...prev, halo: h } : prev))}
                    label={`Legibility halo ${h}`}
                  >
                    {h.charAt(0).toUpperCase() + h.slice(1)}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Slider
                id="capystamp-spacing"
                label="Letter spacing"
                min={0}
                max={0.4}
                step={0.01}
                value={spec.kind === "text" ? spec.letterSpacing : 0}
                onChange={(n) => setSpec((prev) => (prev.kind === "text" ? { ...prev, letterSpacing: n } : prev))}
                display={`${(spec.kind === "text" ? spec.letterSpacing : 0).toFixed(2)}em`}
              />
              <div className="flex items-end">
                <p className="text-xs text-muted-foreground">
                  The halo is a soft shadow or thin outline — it keeps the mark readable on busy photos.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label
              htmlFor="capystamp-logo"
              className="inline-flex cursor-pointer items-center rounded-full border border-border bg-muted/30 px-3 py-1 font-sans text-[13px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground pointer-coarse:min-h-11 pointer-coarse:px-4"
            >
              Pick a logo
            </label>
            <input
              ref={logoInput}
              id="capystamp-logo"
              type="file"
              accept="image/png,image/webp,image/svg+xml,image/*"
              className="sr-only"
              onChange={(e) => {
                onLogoFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            {logo ? (
              <>
                <span className="max-w-48 truncate text-xs text-muted-foreground">{logo.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => {
                    setLogo(null);
                    setStatus("Logo removed.");
                  }}
                >
                  Remove
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">PNG, WebP or SVG — it stays in this tab.</span>
            )}
          </div>
        )}

        {/* Common controls: size, opacity, rotation, anchor, tiling. */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Slider
            id="capystamp-size"
            label="Size"
            min={0.02}
            max={0.5}
            step={0.005}
            value={spec.size}
            onChange={(n) => setPatch({ size: n })}
            display={`${Math.round(spec.size * 100)}% of short side`}
          />
          <Slider
            id="capystamp-opacity"
            label="Opacity"
            min={0.05}
            max={1}
            step={0.05}
            value={spec.opacity}
            onChange={(n) => setPatch({ opacity: n })}
            display={`${Math.round(spec.opacity * 100)}%`}
          />
          <Slider
            id="capystamp-rotation"
            label="Rotation"
            min={-180}
            max={180}
            step={1}
            value={spec.rotation}
            onChange={(n) => setPatch({ rotation: n })}
            display={`${spec.rotation}°`}
          />
          <div className="flex items-end">
            <Pill active={false} disabled={spec.rotation === 0} onClick={() => setPatch({ rotation: 0 })} label="Reset rotation to zero">
              Reset to 0°
            </Pill>
          </div>
        </div>

        <div className="mt-5">
          <span className={cn(labelClass, "block")} id="capystamp-anchor-label">
            Position
          </span>
          <div
            role="radiogroup"
            aria-labelledby="capystamp-anchor-label"
            className="mt-2 inline-grid grid-cols-3 gap-1"
          >
            {ANCHORS.map((anchor) => (
              <button
                key={anchor}
                type="button"
                role="radio"
                aria-checked={spec.tiling === "none" && spec.anchor === anchor}
                aria-label={ANCHOR_LABELS[anchor]}
                disabled={spec.tiling !== "none"}
                onClick={() => setPatch({ anchor, offset: { x: 0, y: 0 } })}
                className={cn(
                  "size-8 rounded-md border transition-colors pointer-coarse:size-11",
                  spec.tiling === "none" && spec.anchor === anchor
                    ? "border-primary bg-primary/25"
                    : "border-border bg-muted/30 hover:border-primary",
                  spec.tiling !== "none" && "opacity-40",
                )}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {spec.tiling === "none" ? ANCHOR_LABELS[spec.anchor] : "Tiling covers the whole photo"} — drag the preview to fine-tune.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={labelClass}>Tiling</span>
            {TILINGS.map((t) => (
              <Pill key={t} active={spec.tiling === t} onClick={() => setPatch({ tiling: t })} label={`Tiling ${t}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Pill>
            ))}
          </div>
          <div className={cn("w-44", spec.tiling === "none" && "opacity-40")}>
            <Slider
              id="capystamp-gap"
              label="Gap"
              min={0}
              max={2}
              step={0.1}
              value={spec.gap}
              disabled={spec.tiling === "none"}
              onChange={(n) => setPatch({ gap: n })}
              display={`${spec.gap.toFixed(1)}× mark`}
            />
          </div>
        </div>

        {/* Presets: named designs, settings only. Folded — they answer a
            question a first visit hasn't asked yet. */}
        <details className="mt-6 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <summary className="cursor-pointer select-none">
            <span className={labelClass}>Presets</span>
            {presets.length > 0 ? (
              <span className="ml-2 font-mono text-[12px] text-muted-foreground">
                {presets.length} saved
              </span>
            ) : null}
          </summary>
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Save current design as…"
                aria-label="Preset name"
                maxLength={40}
                className="h-9 w-44 rounded-full bg-muted/40 font-sans"
              />
              <Button size="sm" variant="outline" className="rounded-full" onClick={savePreset}>
                Save
              </Button>
            </div>
            {presets.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <li key={preset.id} className="flex items-center gap-1 rounded-full border border-border bg-card pl-1 pr-1">
                    <button
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="max-w-40 truncate rounded-full px-2 py-0.5 font-sans text-[13px] text-muted-foreground transition-colors hover:text-foreground pointer-coarse:min-h-11"
                      title={`Apply ${preset.name}`}
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete preset ${preset.name}`}
                      onClick={() => deletePreset(preset.id)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Saved in this browser only — a preset is the design, never your photos or logo.
              </p>
            )}
          </div>
        </details>
      </StageCard>

      {/* CARD 3: THE PREVIEW AND OUTPUT — sticky on desktop. */}
      <StageCard
        id="capystamp-output"
        index="03"
        title="The preview"
        className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        chips={
          isDemo ? (
            <StageChip>Demo</StageChip>
          ) : (
            <StageChip>
              {running ? `${progress.total} stamping` : `${items.length} queued`}
            </StageChip>
          )
        }
      >
        <div className="relative">
          <canvas
            ref={previewCanvas}
            role="img"
            aria-label={
              isDemo
                ? "Demo photo with the demo mark"
                : `Live preview of ${selected?.file.name ?? "the selected photo"} with the mark`
            }
            tabIndex={spec.tiling === "none" && !isDemo ? 0 : -1}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onCanvasKeyDown}
            className={cn(
              "mx-auto block h-auto max-h-[540px] w-full max-w-full rounded-2xl border border-border bg-muted/40 object-contain",
              !isDemo && spec.tiling === "none" && "cursor-move touch-none",
            )}
          />
          {/* The safe margin, while dragging. */}
          {dragging ? (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-xl border border-dashed border-primary/70"
              style={{
                left: `${SAFE_MARGIN * 100}%`,
                top: `${SAFE_MARGIN * 100}%`,
                right: `${SAFE_MARGIN * 100}%`,
                bottom: `${SAFE_MARGIN * 100}%`,
              }}
            />
          ) : null}
        </div>

        <p aria-live="polite" className="mt-2 text-center text-xs text-muted-foreground">
          {previewHint}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-1.5">
            <span className={labelClass}>Format</span>
            {FORMATS.map((f) => (
              <Pill key={f} active={output.format === f} onClick={() => setOutput((prev) => ({ ...prev, format: f }))} label={`Format ${f}`}>
                {f === "jpeg" ? "JPEG" : f.toUpperCase()}
              </Pill>
            ))}
          </div>
          <div className={cn("w-44", output.format === "png" && "opacity-40")}>
            <Slider
              id="capystamp-quality"
              label="Quality"
              min={0.5}
              max={1}
              step={0.01}
              value={output.quality}
              disabled={output.format === "png"}
              onChange={(n) => setOutput((prev) => ({ ...prev, quality: n }))}
              display={`${Math.round(output.quality * 100)}%`}
            />
          </div>
        </div>

        {/* The one sage primary on the screen. */}
        <Button className="mt-4 h-11 w-full rounded-full text-base" onClick={runStamp} disabled={!canRun}>
          <Download className="mr-1.5 size-4" aria-hidden />
          {running ? `Stamping ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : stampButtonLabel}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Your photos never leave this tab.
        </p>
        {running ? (
          <Button variant="ghost" className="mt-2 h-11 w-full rounded-full" onClick={cancelRun}>
            Cancel — finished files are kept
          </Button>
        ) : null}

        {!running && items.length > 0 && (missingText || missingLogo) ? (
          <p className="mt-2 text-center text-xs text-[var(--clay)]">
            {missingText ? "Type the text to stamp first." : "Pick a logo to stamp first."}
          </p>
        ) : null}

        {/* Results. The note is the one live region — links stay out of the
            announcement, and the count is said once. */}
        <div className="mt-4">
          {stamped.length > 0 && !running ? (
            <div className="flex flex-col gap-3">
              <p aria-live="polite" className={cn("rounded-2xl border px-4 py-2 text-[13px] leading-snug", STAGE_TONE.sage)}>
                {stamped.length} stamped · {formatBytes(totals.before)} → {formatBytes(totals.after)}
                {totals.after > totals.before ? " — a stamp adds pixels, so sizes can grow." : ""}
                {cancelledRun ? " · Cancelled, finished files kept" : ""}
              </p>
              {downloads?.zip ? (
                <a
                  href={downloads.zip.url}
                  download={downloads.zip.name}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-primary/20 pointer-coarse:min-h-11"
                >
                  <FileArchive className="size-4" aria-hidden />
                  Download {downloads.zip.name}
                </a>
              ) : null}
              {downloads && downloads.links.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {downloads.links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        download={link.name}
                        className="flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground pointer-coarse:min-h-11"
                      >
                        <span className="truncate">{link.name}</span>
                        <Download className="size-3.5 shrink-0" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {failed.length > 0 && !running ? (
            <ul className="mt-3 flex flex-col gap-1.5">
              {failed.map((item) => (
                <li key={item.id} className={cn("rounded-2xl border px-4 py-2 text-[13px] leading-snug", STAGE_TONE.clay)}>
                  <span className="font-medium">{item.file.name}</span> {item.reason}
                </li>
              ))}
            </ul>
          ) : null}
          {status ? (
            <p aria-live="polite" className="mt-3 min-h-5 text-xs text-muted-foreground">{status}</p>
          ) : null}
        </div>
      </StageCard>

      {/* Below lg, the run follows the thumb (CapyQR's dock). Portalled to
          <body>: a transformed ancestor re-anchors position: fixed. */}
      {portalReady
        ? createPortal(
            <div
              inert={card03InView || items.length === 0}
              aria-hidden={card03InView || items.length === 0}
              className={cn(
                "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden",
                card03InView || items.length === 0 ? "translate-y-full" : "translate-y-0",
              )}
            >
              <div className="mx-auto flex max-w-xl items-center gap-3">
                <canvas
                  ref={dockThumb}
                  aria-hidden
                  width={56}
                  height={56}
                  className="size-14 flex-none rounded-lg border border-border"
                />
                <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground" aria-live="polite">
                  {running
                    ? `Stamping ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                    : stamped.length > 0
                      ? `${stamped.length} stamped, in this tab.`
                      : `${items.length} photo${items.length === 1 ? "" : "s"} waiting.`}
                </p>
                <Button className="h-11 flex-none rounded-full px-5" onClick={running ? cancelRun : runStamp} disabled={!running && !canRun}>
                  {running ? "cancel" : <Download className="mr-1.5 size-4" aria-hidden />}
                  {running ? "Cancel" : "Stamp"}
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
