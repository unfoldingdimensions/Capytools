"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, FileArchive, FileText, Pencil, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CapyArt } from "@/components/mascot/CapyArt";
import { STAGE_TONE, StageCard, StageChip } from "@/components/stage-card";
import { saveBlob } from "@/lib/download";
import { formatBytes } from "@/lib/capyresize/render";
import { confidenceBucket, type Bucket } from "@/lib/capyread/clean";
import { DEMO_RUN } from "@/lib/capyread/demo";
import { disposeEngine, clearLanguageCache, recognisePage } from "@/lib/capyread/engine";
import { bucketLabel, formatMs } from "@/lib/capyread/format";
import { buildDocxBlob, buildTxtBlob, exportName } from "@/lib/capyread/export";
import { DEFAULT_LANG, LANGUAGES, findLang, pinFor } from "@/lib/capyread/langs";
import { FREE_PAGE_LIMIT, imageToCanvas, pdfPageCount, renderPdfPages } from "@/lib/capyread/raster";
import type { OcrPageResult, OcrProgress, OcrRunResult, Quality } from "@/lib/capyread/types";
import { cn } from "@/lib/utils";

/**
 * CapyRead — the words are in there; we get them out.
 *
 * One document at a time: an image or a PDF is rasterised in this tab and
 * read by tesseract in a Web Worker, with the engine and language files
 * served from this origin. There is no route that could receive a page even
 * if one wanted to, which tests/capyread-boundaries.test.ts holds by
 * refusing any request API in the tool's sources. The only thing a run ever
 * downloads is the language model — once, from this site, kept in the
 * browser's own storage, and the copy below says so.
 */

const labelClass =
  "font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground";

const isPdfFile = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);
const isImageFile = (file: File) => file.type.startsWith("image/");

const BUCKET_TONE: Record<Bucket, string> = {
  high: "border-primary/40 bg-primary/10 text-foreground",
  fair: "border-border bg-muted/60 text-foreground",
  unsure: "border-[var(--clay)]/40 bg-[var(--clay)]/10 text-[var(--clay)]",
  none: "border-border bg-muted/60 text-muted-foreground",
};

function BucketBadge({ confidence }: { confidence: number | null }) {
  const bucket = confidenceBucket(confidence);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]",
        BUCKET_TONE[bucket],
      )}
    >
      {bucketLabel(bucket)}
      {confidence !== null ? ` · ${confidence}%` : ""}
    </span>
  );
}

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

interface Downloadable {
  name: string;
  url: string;
}

export function CapyRead() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<number | null>(null);
  const [langId, setLangId] = useState(DEFAULT_LANG.id);
  const [quality, setQuality] = useState<Quality>("fast");

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [pagesDone, setPagesDone] = useState(0);
  const [pagesPlanned, setPagesPlanned] = useState(0);

  const [result, setResult] = useState<OcrRunResult | null>(null);
  const [partialPages, setPartialPages] = useState<OcrPageResult[]>([]);
  const [editedText, setEditedText] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("");
  const [download, setDownload] = useState<Downloadable | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [inputInView, setInputInView] = useState(true);

  const fileInput = useRef<HTMLInputElement>(null);
  const stopRef = useRef(false);
  const thumbUrlRef = useRef<string | null>(null);
  const downloadUrlRef = useRef<string | null>(null);

  const lang = findLang(langId);
  const pin = pinFor(lang, quality);
  const isPdf = file !== null && isPdfFile(file);
  const hasText = editing ? (editedText ?? "").trim().length > 0 : (result?.text ?? "").trim().length > 0;

  // The shown words: the live result while pages stream in, else the demo.
  const shown = useMemo<OcrRunResult | null>(() => {
    if (result) return result;
    if (running && partialPages.length > 0) {
      const pageText = partialPages.map((page) => page.text).filter(Boolean).join("\n\n");
      const confidences = partialPages
        .map((page) => page.confidence)
        .filter((c): c is number => c !== null);
      return {
        pages: partialPages,
        text: pageText,
        confidence: confidences.length
          ? Math.round(confidences.reduce((sum, c) => sum + c, 0) / confidences.length)
          : null,
        lang: langId,
        quality,
        ms: partialPages.reduce((sum, page) => sum + page.ms, 0),
      };
    }
    return null;
  }, [result, running, partialPages, langId, quality]);

  const releaseThumb = useCallback(() => {
    if (thumbUrlRef.current) URL.revokeObjectURL(thumbUrlRef.current);
    thumbUrlRef.current = null;
    setThumbUrl(null);
  }, []);

  const releaseDownload = useCallback(() => {
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
    setDownload(null);
  }, []);

  // Free every object URL we ever made when the tab goes away.
  useEffect(() => {
    return () => {
      if (thumbUrlRef.current) URL.revokeObjectURL(thumbUrlRef.current);
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      void disposeEngine();
    };
  }, []);

  // The dock only exists once the client mounts (portalled to <body>).
  const markPortalReady = useCallback(() => setPortalReady(true), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(markPortalReady, [markPortalReady]);

  useEffect(() => {
    const card = document.getElementById("capyread-input");
    if (!card || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInputInView(entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // ——— the document ———

  const takeFile = useCallback(
    (incoming: File | null | undefined) => {
      if (!incoming) return;
      if (running) {
        setStatus("wait for this run to finish — one page at a time.");
        return;
      }
      if (!isPdfFile(incoming) && !isImageFile(incoming)) {
        setStatus("that's not a page CapyRead knows — an image, or a PDF.");
        return;
      }
      releaseThumb();
      releaseDownload();
      setResult(null);
      setEditedText(null);
      setEditing(false);
      setPartialPages([]);
      setStatus("");
      setFile(incoming);
      if (isImageFile(incoming)) {
        setPdfPages(null);
        const url = URL.createObjectURL(incoming);
        thumbUrlRef.current = url;
        setThumbUrl(url);
      } else {
        // The count is a cheap read (no rendering), and the cap warning is
        // worth showing before a run, not during it.
        void pdfPageCount(incoming)
          .then((pages) => {
            if (stopRef.current) return;
            setPdfPages(pages);
          })
          .catch(() => {
            setStatus("that PDF wouldn't open — it may be damaged or password-protected.");
            setFile(null);
          });
      }
    },
    [running, releaseThumb, releaseDownload],
  );

  const clearFile = useCallback(() => {
    if (running) return;
    releaseThumb();
    releaseDownload();
    setFile(null);
    setPdfPages(null);
    setResult(null);
    setEditedText(null);
    setEditing(false);
    setPartialPages([]);
    setStatus("");
  }, [running, releaseThumb, releaseDownload]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      takeFile(e.dataTransfer.files[0]);
    },
    [takeFile],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length > 0) {
        event.preventDefault();
        takeFile(files[0]);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [takeFile]);

  // ——— the run ———

  const runRead = useCallback(async () => {
    if (!file || running) return;
    stopRef.current = false;
    setRunning(true);
    setResult(null);
    setEditedText(null);
    setEditing(false);
    setPartialPages([]);
    releaseDownload();
    setStatus("");

    // Derived from raw state inside the callback — manual deps carry only
    // what the compiler can verify (state, refs, stable callbacks).
    const lang = findLang(langId);
    const pdf = isPdfFile(file);
    const choice = { lang, quality };
    const pages: OcrPageResult[] = [];
    const planned = pdf ? Math.min(pdfPages ?? FREE_PAGE_LIMIT, FREE_PAGE_LIMIT) : 1;
    setPagesPlanned(planned);
    setPagesDone(0);
    const started = performance.now();
    let stopped = false;

    try {
      const collect = async (page: OcrPageResult) => {
        pages.push(page);
        setPartialPages([...pages]);
        setPagesDone(pages.length);
      };
      if (pdf) {
        await renderPdfPages(
          file,
          async ({ page, canvas }) => {
            collect(await recognisePage(canvas, choice, page, planned, setProgress));
            // Release the bitmap before the next page renders.
            canvas.width = 0;
            canvas.height = 0;
          },
          () => stopRef.current,
        );
        stopped = stopRef.current;
      } else {
        const canvas = await imageToCanvas(file);
        await collect(await recognisePage(canvas, choice, 1, 1, setProgress));
      }

      const withWords = pages.filter((page) => page.confidence !== null);
      const run: OcrRunResult = {
        pages,
        text: pages.map((page) => page.text).filter(Boolean).join("\n\n"),
        confidence: withWords.length
          ? Math.round(
              withWords.reduce((sum, page) => sum + (page.confidence ?? 0), 0) / withWords.length,
            )
          : null,
        lang: lang.id,
        quality,
        ms: Math.round(performance.now() - started),
      };
      setResult(run);
      const unreadable = pages.reduce((sum, page) => sum + page.unreadable, 0);
      setStatus(
        [
          run.text ? `${pages.length} page${pages.length === 1 ? "" : "s"} read in ${formatMs(run.ms)}.` : "nothing read — try a sharper, straighter, better-lit page.",
          unreadable > 0 ? `${unreadable} word${unreadable === 1 ? "" : "s"} were too unsure to print and are marked [unreadable] in the text.` : "",
          stopped ? "stopped early — the pages read so far are kept." : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (error) {
      setStatus(
        `the read stopped: ${(error as Error).message || "something went wrong in this browser."} — the pages read so far are kept.`,
      );
    } finally {
      setProgress(null);
      setRunning(false);
    }
  }, [file, running, pdfPages, langId, quality, releaseDownload]);

  const cancelRead = useCallback(() => {
    stopRef.current = true;
  }, []);

  // ——— the exports ———

  const currentText = useCallback(
    () => (editing ? editedText ?? "" : result?.text ?? ""),
    [editing, editedText, result],
  );

  const copyText = useCallback(async () => {
    const value = currentText();
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied.");
    } catch {
      setStatus("this browser refused the clipboard — select the text and copy by hand.");
    }
  }, [currentText]);

  const downloadTxt = useCallback(() => {
    if (!file || !hasText) return;
    releaseDownload();
    const value = currentText();
    const blob = buildTxtBlob(value);
    const url = URL.createObjectURL(blob);
    downloadUrlRef.current = url;
    setDownload({ name: exportName(file.name, "txt"), url });
    saveBlob(blob, exportName(file.name, "txt"));
    setStatus("plain text saved.");
  }, [file, hasText, releaseDownload, currentText]);

  const downloadDocx = useCallback(async () => {
    if (!file || !hasText) return;
    releaseDownload();
    try {
      const blob = await buildDocxBlob(currentText());
      const url = URL.createObjectURL(blob);
      downloadUrlRef.current = url;
      setDownload({ name: exportName(file.name, "docx"), url });
      saveBlob(blob, exportName(file.name, "docx"));
      setStatus("document saved — plain paragraphs, your Word styles apply.");
    } catch {
      setStatus("the document build failed in this browser — the .txt still works.");
    }
  }, [file, hasText, releaseDownload, currentText]);

  const forgetLanguages = useCallback(async () => {
    try {
      await clearLanguageCache();
      setStatus("saved language files removed from this browser — the next run downloads again.");
    } catch {
      setStatus("stop the current run before clearing the saved language.");
    }
  }, []);

  // ——— copy ———

  const words = shown ?? DEMO_RUN;
  const capNote =
    isPdf && pdfPages !== null && pdfPages > FREE_PAGE_LIMIT
      ? `CapyRead reads the first ${FREE_PAGE_LIMIT} pages of a PDF in one run — this document has ${pdfPages}. Split it, or read it in parts.`
      : "";

  const runLabel = !file
    ? "read the page"
    : !isPdf || pdfPages === 1
      ? "read the page"
      : pdfPages !== null && pdfPages <= FREE_PAGE_LIMIT
        ? `read all ${pdfPages} pages`
        : `read the first ${FREE_PAGE_LIMIT} pages`;

  return (
    <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_368px] lg:items-start">
      {/* CARD 1: THE PAGE */}
      <StageCard id="capyread-input" index="01" title="The page" marks className="lg:col-start-1">
        <input
          ref={fileInput}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            takeFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {!file ? (
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
            <span className="mt-1 text-sm font-medium text-foreground">Drop a photo, a screenshot or a PDF</span>
            <span className="text-xs text-muted-foreground">
              or click to pick, or paste. one document — it never leaves this tab.
            </span>
          </button>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-3 transition-colors",
              dragOver && "border-primary",
            )}
          >
            {thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbUrl} alt="" className="h-16 w-16 flex-none rounded-xl border border-border object-cover" />
            ) : (
              <span className="flex h-16 w-16 flex-none items-center justify-center rounded-xl border border-border bg-muted/40">
                <FileText className="size-6 text-muted-foreground" aria-hidden />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
                {isPdf && pdfPages !== null ? ` · ${pdfPages} page${pdfPages === 1 ? "" : "s"}` : ""}
                {isPdf && pdfPages === null ? " · counting pages…" : ""}
              </p>
            </div>
            <Button size="sm" variant="ghost" className="rounded-full" disabled={running} onClick={clearFile}>
              <X className="mr-1 size-3.5" aria-hidden />
              remove
            </Button>
          </div>
        )}

        {/* Language + quality */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="capyread-lang" className={labelClass}>
              language of the text
            </label>
            <select
              id="capyread-lang"
              value={langId}
              disabled={running}
              onChange={(e) => setLangId(e.target.value)}
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60"
            >
              {LANGUAGES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={cn(labelClass, "block")} id="capyread-quality-label">
              model size
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-labelledby="capyread-quality-label">
              <Pill
                active={quality === "fast"}
                disabled={running || !lang.standard}
                onClick={() => setQuality("fast")}
                label={`Fast model, ${formatBytes(lang.fast.bytes)}, downloaded once`}
              >
                fast · {formatBytes(lang.fast.bytes)}
              </Pill>
              <Pill
                active={quality === "standard"}
                disabled={running || !lang.standard}
                onClick={() => setQuality("standard")}
                label={
                  lang.standard
                    ? `Standard model, ${formatBytes(lang.standard.bytes)}, downloaded once`
                    : "Only English ships the larger model"
                }
              >
                {lang.standard ? `standard · ${formatBytes(lang.standard.bytes)}` : "standard — english only"}
              </Pill>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs leading-snug text-muted-foreground">
          the {lang.label.toLowerCase()} file ({formatBytes(pin.bytes)}) downloads from this site on first use and is
          kept in your browser for next time — your document never is.
        </p>

        {/* The one sage primary on the screen. */}
        <Button className="mt-4 h-11 w-full rounded-full text-base" onClick={runRead} disabled={!file || running}>
          {running
            ? pagesPlanned > 1
              ? `reading page ${Math.min(pagesDone + 1, pagesPlanned)} of ${pagesPlanned}…`
              : "reading…"
            : runLabel}
        </Button>
        {running ? (
          <Button variant="ghost" className="mt-2 h-11 w-full rounded-full" onClick={cancelRead}>
            <Square className="mr-1.5 size-3.5" aria-hidden />
            stop — finished pages are kept
          </Button>
        ) : null}

        {progress?.stage === "language" || progress?.stage === "engine" ? (
          <p aria-live="polite" className={cn("mt-3 rounded-2xl border px-4 py-2 text-[13px] leading-snug", STAGE_TONE.plain)}>
            {progress.message}
          </p>
        ) : null}
        {progress?.stage === "reading" && pagesPlanned > 1 ? (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-valuenow={pagesDone}
              aria-valuemin={0}
              aria-valuemax={pagesPlanned}
              aria-label="reading progress"
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.round((pagesDone / pagesPlanned) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        {capNote ? (
          <p className={cn("mt-3 rounded-2xl border px-4 py-2 text-[13px] leading-snug", STAGE_TONE.clay)} role="status">
            {capNote}
          </p>
        ) : null}

        <p className="mt-3 text-center text-xs text-muted-foreground">
          nothing uploaded — the reading happens in this tab.
        </p>
      </StageCard>

      {/* CARD 2: THE WORDS */}
      <StageCard
        id="capyread-words"
        index="02"
        title="The words"
        className="lg:col-start-1"
        chips={
          shown ? (
            <StageChip tone="sage">
              {running
                ? `${pagesDone} of ${pagesPlanned || "?"} page${pagesPlanned === 1 ? "" : "s"}`
                : words.pages.length === 1
                  ? "1 page"
                  : `${words.pages.length} pages`}
            </StageChip>
          ) : (
            <StageChip>demo</StageChip>
          )
        }
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="min-w-[84px] rounded-full"
              disabled={!hasText}
              onClick={copyText}
            >
              <Copy className="mr-1 size-3.5" aria-hidden />
              copy
            </Button>
            <Pill
              active={editing}
              disabled={!hasText}
              onClick={() => setEditing((prev) => !prev)}
              label={editing ? "Back to the read with its confidence badges" : "Edit the text by hand"}
            >
              <Pencil className="mr-1 inline size-3" aria-hidden />
              edit
            </Pill>
          </div>
        }
      >
        {editing ? (
          <div>
            <label htmlFor="capyread-text" className={labelClass}>
              the words, as you want them
            </label>
            <textarea
              id="capyread-text"
              value={editedText ?? ""}
              onChange={(e) => setEditedText(e.target.value)}
              rows={12}
              className="mt-1.5 block w-full rounded-2xl border border-input bg-muted/30 p-4 font-sans text-sm leading-relaxed text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              you&rsquo;re editing — the confidence badges describe the original read, not your changes.
            </p>
          </div>
        ) : (
          <>
            <ol className="flex list-none flex-col gap-4">
              {words.pages.flatMap((page) =>
                page.blocks.map((block, index) => (
                  <li key={`${page.page}-${index}`} className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <BucketBadge confidence={block.confidence} />
                      {words.pages.length > 1 ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                          page {page.page}
                        </span>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{block.text}</p>
                  </li>
                )),
              )}
            </ol>
            {words.pages.every((page) => page.blocks.length === 0) ? (
              <p className="text-sm text-muted-foreground">
                nothing readable here — a sharper, straighter, better-lit page reads better.
              </p>
            ) : null}
          </>
        )}

        <p aria-live="polite" className="mt-4 min-h-5 text-xs text-muted-foreground">
          {status}
        </p>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          badges are the engine&rsquo;s own confidence — high, fair, unsure in its words, never just a colour. words it
          couldn&rsquo;t read are marked [unreadable] rather than guessed.
        </p>
      </StageCard>

      {/* CARD 3: THE FILE — sticky on desktop. */}
      <StageCard
        id="capyread-output"
        index="03"
        title="The file"
        className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        chips={words.confidence !== null ? <StageChip>{bucketLabel(confidenceBucket(words.confidence))} read</StageChip> : undefined}
      >
        {words.pages.length > 1 || words.pages[0]?.ms ? (
          <ul className="flex flex-col gap-1.5">
            {words.pages.map((page) => (
              <li
                key={page.page}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-1.5 text-[13px]"
              >
                <span className="text-muted-foreground">{words.pages.length > 1 ? `page ${page.page}` : "the page"}</span>
                <span className="flex items-center gap-2">
                  <BucketBadge confidence={page.confidence} />
                  {page.ms > 0 ? <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{formatMs(page.ms)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            the page&rsquo;s own read lands here — what was found, how sure the engine was, and how long it took.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <Button variant="outline" className="h-11 w-full rounded-full" disabled={!file || !hasText} onClick={downloadTxt}>
            <FileText className="mr-1.5 size-4" aria-hidden />
            download .txt
          </Button>
          <Button variant="outline" className="h-11 w-full rounded-full" disabled={!file || !hasText} onClick={downloadDocx}>
            <FileArchive className="mr-1.5 size-4" aria-hidden />
            download .docx
          </Button>
          {download ? (
            <a
              href={download.url}
              download={download.name}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-primary/20 pointer-coarse:min-h-11"
            >
              <Download className="size-4" aria-hidden />
              {download.name}
            </a>
          ) : null}
        </div>

        <p className="mt-4 text-xs leading-snug text-muted-foreground">
          handwriting and very low-resolution scans often fail — this is a reader, not a restorer. the language file
          is kept in your browser so the next run starts instantly; your document never is.
        </p>
        <details className="mt-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <summary className="cursor-pointer select-none">
            <span className={labelClass}>saved in this browser</span>
          </summary>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">
            the language model lives in the browser&rsquo;s own storage — settings, never documents. removing it is one
            click, and the next run downloads it again.
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 rounded-full"
            disabled={running}
            onClick={forgetLanguages}
          >
            forget the saved language files
          </Button>
        </details>
      </StageCard>

      {/* Below lg, the run follows the thumb (CapyQR's dock). Portalled to
          <body>: a transformed ancestor re-anchors position: fixed. */}
      {portalReady
        ? createPortal(
            <div
              inert={inputInView || !file}
              aria-hidden={inputInView || !file}
              className={cn(
                "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden",
                inputInView || !file ? "translate-y-full" : "translate-y-0",
              )}
            >
              <div className="mx-auto flex max-w-xl items-center gap-3">
                <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground" aria-live="polite">
                  {running
                    ? pagesPlanned > 1
                      ? `reading page ${Math.min(pagesDone + 1, pagesPlanned)} of ${pagesPlanned}…`
                      : "reading…"
                    : hasText
                      ? "words are ready, in this tab."
                      : "a page is waiting."}
                </p>
                <Button className="h-11 flex-none rounded-full px-5" onClick={running ? cancelRead : runRead} disabled={!running && !file}>
                  {running ? "stop" : "read"}
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
