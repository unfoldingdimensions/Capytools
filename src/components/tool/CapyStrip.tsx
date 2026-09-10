"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ClipboardPaste, Copy, Download, ImageUp } from "lucide-react";

import {
  CleanUnsupportedError,
  TIFF_UNSUPPORTED_MESSAGE,
  cleanImage,
} from "@/lib/capystrip/clean";
import { DEMO_REPORT } from "@/lib/capystrip/demo";
import { formatBytes, formatGpsDms } from "@/lib/capystrip/format";
import { readRawMetadata } from "@/lib/capystrip/parse";
import { VERDICT_COPY, buildReport } from "@/lib/capystrip/report";
import { sniffImageKind } from "@/lib/capystrip/detect";
import type {
  CleanResult,
  FieldCategory,
  ImageKind,
  MetadataField,
  MetadataReport,
  RawMetadata,
} from "@/lib/capystrip/types";
import { CapyScene } from "@/components/mascot/CapyScene";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { TerminalLoader, type LoadStep } from "@/components/tool/TerminalLoader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * CapyStrip — the drop, the report, the clean copy. Every byte the tool sees
 * stays in this tab: the parsing is local, the redraw is a local canvas, and
 * the only network request on this page is the one you're reading it from.
 */

const CATEGORY_ORDER: FieldCategory[] = ["privacy", "time", "camera", "software_ai", "technical"];

const CATEGORY_LABELS: Record<FieldCategory, string> = {
  privacy: "Privacy",
  time: "Time",
  camera: "Camera settings",
  software_ai: "Software & AI",
  technical: "Technical",
};

const KIND_LABELS: Record<ImageKind, string> = {
  jpeg: "JPEG",
  png: "PNG",
  webp: "WebP",
  heic: "HEIC",
  avif: "AVIF",
  tiff: "TIFF",
  unknown: "unknown",
};

/** Only these get a clean copy; TIFF is report-only everywhere. */
const CLEANABLE_KINDS = new Set<ImageKind>(["jpeg", "png", "webp", "avif", "heic"]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/**
 * Input ceiling. `accept="image/*"` is advisory and the paste listener has no
 * gate at all, so nothing bounded what got read: parse.ts materialises the
 * whole file and then hands the same Blob to exifr three more times. 60MB
 * clears any phone camera (a 48MP HEIC is ~10MB, a RAW-ish TIFF ~40MB) while
 * keeping a hostile file from being the cheap half of a memory attack.
 */
const MAX_FILE_MB = 60;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

function loaderSteps(): LoadStep[] {
  return [
    { label: "reading bytes", state: "pending" },
    { label: "walking EXIF", state: "pending" },
    { label: "scanning for AI fingerprints", state: "pending" },
  ];
}

export function CapyStrip() {
  // Idle state shows the demo report (repo pattern: DEMO_STATS) so the card
  // teaches before it works.
  const [isDemo, setIsDemo] = useState(true);
  const [report, setReport] = useState<MetadataReport | null>(DEMO_REPORT);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<LoadStep[]>(loaderSteps());
  const [error, setError] = useState<{ title: string; body: string } | null>(null);
  const [unsupportedMessage, setUnsupportedMessage] = useState<string | null>(null);
  const [clean, setClean] = useState<CleanResult | null>(null);
  const [cleanUrl, setCleanUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState(0.92);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingName, setPendingName] = useState("your photo");

  const runId = useRef(0);
  const currentFile = useRef<File | null>(null);
  const currentRaw = useRef<RawMetadata | null>(null);
  const cleanUrlRef = useRef<string | null>(null);
  const qualityRef = useRef(quality);
  const reencodeTimer = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const releaseCleanUrl = useCallback(() => {
    if (cleanUrlRef.current) URL.revokeObjectURL(cleanUrlRef.current);
    cleanUrlRef.current = null;
    setCleanUrl(null);
  }, []);

  // Revive nothing on mount (no storage in this tool); only clean up the
  // preview URL when the tab goes away.
  const revokeOnUnmount = useCallback(() => {
    if (cleanUrlRef.current) URL.revokeObjectURL(cleanUrlRef.current);
  }, []);

  useEffect(revokeOnUnmount, [revokeOnUnmount]);

  const swapCleanUrl = useCallback(
    (blob: Blob | null) => {
      if (cleanUrlRef.current) URL.revokeObjectURL(cleanUrlRef.current);
      cleanUrlRef.current = blob ? URL.createObjectURL(blob) : null;
      setCleanUrl(cleanUrlRef.current);
    },
    [],
  );

  const runClean = useCallback(
    async (file: File, raw: RawMetadata, run: number) => {
      try {
        const result = await cleanImage(file, raw, { quality: qualityRef.current });
        if (runId.current !== run) return;
        setClean(result);
        swapCleanUrl(result.blob);
      } catch (err) {
        if (runId.current !== run) return;
        if (err instanceof CleanUnsupportedError) {
          setClean(null);
          swapCleanUrl(null);
          setUnsupportedMessage(err.message);
        } else {
          setClean(null);
          swapCleanUrl(null);
          setUnsupportedMessage("The clean copy failed quietly — the report above still stands.");
        }
      }
    },
    [swapCleanUrl],
  );

  const processFile = useCallback(
    async (file: File) => {
      const run = ++runId.current;
      currentFile.current = file;
      setPendingName(file.name);
      releaseCleanUrl();
      setClean(null);
      setUnsupportedMessage(null);
      setError(null);
      setIsDemo(false);
      setReport(null);

      // Guarded here rather than at each entry point: the picker, the drop zone
      // and the window paste listener all land in this function.
      if (file.size > MAX_FILE_BYTES) {
        setError({
          title: "That photo is a bit much.",
          body: `CapyStrip reads files up to ${MAX_FILE_MB}MB — this one is ${Math.round(file.size / 1024 / 1024)}MB. Resize it and bring it back.`,
        });
        return;
      }

      setLoading(true);
      setSteps(loaderSteps());

      // One cancellation token per run: a new drop replaces the old work.
      const kind = await sniffImageKind(file).catch(() => "unknown" as ImageKind);
      if (runId.current !== run) return;

      if (kind === "unknown") {
        setLoading(false);
        setSteps(loaderSteps());
        setError({
          title: "That's not a photo we can read.",
          body: "The first bytes don't match any format CapyStrip knows — JPEG, PNG, WebP, HEIC, AVIF or TIFF. Try another file.",
        });
        return;
      }

      setSteps((prev) => prev.map((step, i) => (i === 0 ? { ...step, state: "done", detail: KIND_LABELS[kind] } : step)));

      let raw: RawMetadata;
      try {
        raw = await readRawMetadata(file);
      } catch {
        if (runId.current !== run) return;
        setLoading(false);
        setError({
          title: "The bytes refused to talk.",
          body: "Something in this file broke the reader partway through. The report needs a file it can walk — try another photo.",
        });
        return;
      }
      if (runId.current !== run) return;

      const nextReport = buildReport(raw, file.name);
      currentRaw.current = raw;
      setSteps(loaderSteps().map((step, i) => ({
        ...step,
        state: "done" as const,
        detail: i === 1 ? `${nextReport.fields.length} fields` : i === 2 ? `${nextReport.aiSignals.length} signals` : KIND_LABELS[kind],
      })));
      setReport(nextReport);
      setLoading(false);

      if (CLEANABLE_KINDS.has(kind)) {
        void runClean(file, raw, run);
      } else {
        // Report-only formats still owe the reader a reason for the missing download.
        setUnsupportedMessage(TIFF_UNSUPPORTED_MESSAGE);
      }

      setTimeout(() => {
        document.getElementById("report-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    },
    [releaseCleanUrl, runClean],
  );

  // Paste is a first-class input — screenshots especially.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) {
        event.preventDefault();
        void processFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [processFile]);

  const scheduleReencode = useCallback(() => {
    if (reencodeTimer.current) window.clearTimeout(reencodeTimer.current);
    reencodeTimer.current = window.setTimeout(() => {
      reencodeTimer.current = null;
      const file = currentFile.current;
      const raw = currentRaw.current;
      if (!file || !raw) return;
      void runClean(file, raw, runId.current);
    }, 250);
  }, [runClean]);

  const downloadClean = useCallback(() => {
    if (!clean || !report) return;
    const base = report.fileName.replace(/\.[^.]+$/, "") || "photo";
    const extension = EXTENSION_BY_MIME[clean.mimeType] ?? ".jpg";
    const url = URL.createObjectURL(clean.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clean-${base}${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [clean, report]);

  const copyReport = useCallback(async () => {
    if (!report || isDemo) return;
    const payload = JSON.stringify(
      {
        fileName: report.fileName,
        kind: report.kind,
        byteSize: report.byteSize,
        verdict: report.verdict,
        gps: report.gps ?? undefined,
        aiSignals: report.aiSignals,
        fields: report.fields.map(({ label, value, category, critical }) => ({ label, value, category, critical })),
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard denied — nothing to do, the card is readable as-is
    }
  }, [isDemo, report]);

  const grouped = report
    ? CATEGORY_ORDER.map((category) => ({
        category,
        items: report.fields.filter((f) => f.category === category),
      })).filter((group) => group.items.length > 0)
    : [];

  return (
    <div className="flex w-full flex-col gap-5">
      {/* CARD 1 — THE DROP */}
      <div className="relative rounded-3xl border border-border bg-card p-6 shadow-sm">
        <span aria-hidden className="lp-corner lp-corner-tl" />
        <span aria-hidden className="lp-corner lp-corner-tr" />
        <span aria-hidden className="lp-corner lp-corner-bl" />
        <span aria-hidden className="lp-corner lp-corner-br" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--lp-accent-ink)]">
          01 · The drop
        </span>

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
            const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/")) ?? e.dataTransfer.files[0];
            if (file) void processFile(file);
          }}
          className={cn(
            "mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring/50",
            dragOver && "border-primary bg-muted/50",
          )}
        >
          <ImageUp className="size-9 stroke-[1.25] text-muted-foreground" aria-hidden />
          <span className="mt-1 text-sm font-medium text-foreground">Drop a photo here</span>
          <span className="text-xs text-muted-foreground">
            or click to pick one — or paste a screenshot. it never leaves this tab.
          </span>
        </button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <ClipboardPaste className="size-3" aria-hidden />
          ctrl/⌘+V works too
        </p>
      </div>

      {/* Loading state — REAL progress: each line flips when its stage finishes. */}
      {loading && <TerminalLoader username={pendingName} steps={steps} />}

      {error && (
        <StripErrorCard title={error.title} body={error.body} />
      )}

      {/* CARD 2 — THE REPORT */}
      <ScrollReveal direction="up">
        {report && !loading && !error && (
          <div id="report-card" className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-sm" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--lp-accent-ink)]">
                  02 · The report
                </span>
                {isDemo && (
                  <span className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    demo
                  </span>
                )}
                <span className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {KIND_LABELS[report.kind]} · {formatBytes(report.byteSize)}
                </span>
              </div>

              {!isDemo && (
                <Button variant="ghost" size="sm" className="min-w-[84px] rounded-full" onClick={copyReport}>
                  {copied ? <Check className="mr-1 size-3.5" /> : <Copy className="mr-1 size-3.5" />}
                  {copied ? "Copied" : "Copy report as JSON"}
                </Button>
              )}
            </div>

            <h3 className="mt-3 font-display text-2xl font-light text-foreground">
              {VERDICT_COPY[report.verdict]}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.fileName} — {report.chattyCount > 0
                ? `${report.chattyCount} sensitive ${report.chattyCount === 1 ? "detail" : "details"} found.`
                : "nothing sensitive found."}
            </p>

            {/* GPS mini-card */}
            {report.gps && (
              <div className="mt-4 rounded-2xl border border-border/70 bg-muted/40 p-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--clay)]">
                  location · sensitive
                </span>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="font-mono text-[13px] text-foreground">
                      {report.gps.latitude.toFixed(5)}, {report.gps.longitude.toFixed(5)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatGpsDms(report.gps.latitude, "lat")} · {formatGpsDms(report.gps.longitude, "lon")}
                    </p>
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${report.gps.latitude}&mlon=${report.gps.longitude}#map=15/${report.gps.latitude}/${report.gps.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                  >
                    open in OpenStreetMap →
                  </a>
                </div>
              </div>
            )}

            {/* AI signals */}
            {report.aiSignals.length > 0 && (
              <div className="mt-4">
                <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  what it confesses
                </h4>
                <ul className="mt-2 space-y-1.5">
                  {report.aiSignals.map((signal) => (
                    <li key={signal} className="flex items-start gap-2 text-sm text-foreground">
                      <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fields by category */}
            {grouped.length > 0 ? (
              <div className="mt-5 space-y-5">
                {grouped.map((group) => (
                  <div key={group.category}>
                    <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {CATEGORY_LABELS[group.category]}
                    </h4>
                    <dl className="mt-2 divide-y divide-border/60">
                      {group.items.map((item) => (
                        <FieldRow key={item.id} item={item} />
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">
                No readable metadata — {VERDICT_COPY[report.verdict].toLowerCase()}
              </p>
            )}
          </div>
        )}
      </ScrollReveal>

      {/* CARD 3 — THE CLEAN COPY */}
      <ScrollReveal direction="up">
        {report && !isDemo && !loading && !error && clean && (
          <div id="clean-card" className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--lp-accent-ink)]">
                03 · The clean copy
              </span>
              {clean.verified ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-foreground">
                  re-scanned — clean
                </span>
              ) : (
                <span className="rounded-full border border-[var(--clay)]/30 bg-[var(--clay)]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--clay)]">
                  couldn&apos;t verify
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              {cleanUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cleanUrl}
                  alt={`Cleaned preview of ${report.fileName}`}
                  className="h-28 w-28 shrink-0 rounded-2xl border border-border bg-muted/40 object-contain"
                />
              )}

              <div className="flex-1">
                <p className="text-sm text-foreground">
                  {clean.mimeType.replace("image/", "")} · {clean.width} × {clean.height}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBytes(clean.bytesBefore)} → {formatBytes(clean.bytesAfter)}
                </p>

                {clean.mimeType === "image/jpeg" && (
                  <div className="mt-3">
                    <label htmlFor="clean-quality" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      quality · {Math.round(quality * 100)}
                    </label>
                    <input
                      id="clean-quality"
                      type="range"
                      min={0.5}
                      max={1}
                      step={0.01}
                      value={quality}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        qualityRef.current = next;
                        setQuality(next);
                        scheduleReencode();
                      }}
                      className="mt-1 block w-full accent-primary"
                    />
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button className="rounded-full" onClick={downloadClean}>
                    <Download className="mr-1.5 size-4" />
                    Download clean copy
                  </Button>
                </div>
              </div>
            </div>

            {clean.notes.length > 0 && (
              <div className="mt-4 space-y-1 rounded-2xl border border-border/60 bg-muted/30 p-3.5">
                {clean.notes.map((note) => (
                  <p key={note} className="text-xs leading-snug text-muted-foreground">
                    {note}
                  </p>
                ))}
              </div>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
              redrawn from scratch through a canvas — the copy carries none of the metadata above. your
              photo never left this tab.
            </p>
          </div>
        )}
      </ScrollReveal>

      {/* Report-only mode: HEIC off Safari, or any other decode refusal. */}
      {report && !isDemo && !loading && !error && unsupportedMessage && !clean && (
        <div className="flex items-start gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <CapyScene pose="nap" className="hidden w-16 shrink-0 text-foreground/60 sm:block" />
          <div>
            <h3 className="font-display text-lg text-foreground">No clean copy here.</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{unsupportedMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ item }: { item: MetadataField }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        {item.label}
        {item.critical && (
          <span className="rounded-full border border-[var(--clay)]/30 bg-[var(--clay)]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--clay)]">
            sensitive
          </span>
        )}
      </dt>
      <dd className="max-w-[60%] break-words text-right font-mono text-[13px] leading-snug text-foreground">
        {item.value}
      </dd>
    </div>
  );
}

/**
 * Calm error state. (ErrorCard itself is wired to GitHub error kinds — its
 * copy would read "We couldn't find this GitHub username" under a photo, so
 * this mirrors its structure with CapyStrip's own words instead.)
 */
function StripErrorCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex w-full flex-col items-center gap-4 rounded-[20px] border border-border bg-card px-8 py-10 text-center">
      <CapyScene pose="nap" className="w-20 text-foreground/70" title="Napping capybara" />
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
