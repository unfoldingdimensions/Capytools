"use client";

/**
 * The poster stage — the canvas, the style/format pills and the export
 * actions, shared by Feel and Generate (plan §6b.3: any MoodPalette
 * renders). The component owns the drawing; the caller owns the palette.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { COPIED_MS } from "@/lib/capytools/feedback";
import { renderCard, type LayoutName } from "@/lib/capytone/render";
import {
  copyPngToClipboard,
  copyText,
  cssTokens,
  downloadPng,
  pngFilename,
  shareText,
  tailwindTokens,
} from "@/lib/capytone/export";
import { CARD_FORMATS, type CardFormat, type MoodPalette } from "@/lib/capytone/types";

import { Pill, labelClass } from "./controls";

/** House export convention (Wrapped/OG): PNGs render at twice the logical size. */
const EXPORT_SCALE = 2;

export function PosterStage({
  palette,
  note,
  layout,
  format,
  onLayout,
  onFormat,
  emptyState,
  ariaLabel,
  onRemix,
  remixHint,
  share,
}: {
  /** Null shows the empty state and draws nothing. */
  palette: MoodPalette | null;
  /** An engine note (feel's fallback line), under the canvas. */
  note?: string | null;
  layout: LayoutName;
  format: CardFormat;
  onLayout: (layout: LayoutName) => void;
  onFormat: (format: CardFormat) => void;
  emptyState: React.ReactNode;
  ariaLabel: string;
  /** When set, card 02 carries the remix button. */
  onRemix?: () => void;
  /** Suffix on the remix label — feel's "⏎space". */
  remixHint?: string;
  /** Feel only: the share text copies the deep link, which only exists there. */
  share?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("");
  const [drawNote, setDrawNote] = useState<string | null>(null);

  const flash = useCallback((msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(""), COPIED_MS);
  }, []);

  // One draw per palette/style/format change; the preview renders at the
  // screen's own density while the drawing maths stays at the format's
  // logical size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !palette) return;
    const dpr = window.devicePixelRatio || 1;
    renderCard(canvas, palette, layout, format, dpr)
      .then(() => setDrawNote(null))
      .catch(() => setDrawNote("something went wrong drawing that one — try again"));
  }, [palette, layout, format]);

  /** A fresh offscreen card at export density — the preview stays untouched. */
  const exportCanvas = useCallback(
    async (p: MoodPalette): Promise<HTMLCanvasElement> => {
      const offscreen = document.createElement("canvas");
      await renderCard(offscreen, p, layout, format, EXPORT_SCALE);
      return offscreen;
    },
    [layout, format],
  );

  const download = useCallback(async () => {
    if (!palette) return;
    downloadPng(await exportCanvas(palette), palette);
    flash(`saved ${pngFilename(palette)} — 2× density.`);
  }, [palette, exportCanvas, flash]);

  const copyImage = useCallback(async () => {
    if (!palette) return;
    const ok = await copyPngToClipboard(await exportCanvas(palette));
    flash(ok ? "card copied — paste anywhere" : "clipboard blocked; try download");
  }, [palette, exportCanvas, flash]);

  return (
    <>
      <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className={labelClass}>poster style</span>
          <div className="flex flex-wrap items-center gap-1.5" role="group">
            <Pill active={layout === "editorial"} onClick={() => onLayout("editorial")} label="Editorial poster style">
              Editorial
            </Pill>
            <Pill active={layout === "minimal"} onClick={() => onLayout("minimal")} label="Minimal poster style">
              Minimal
            </Pill>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={labelClass}>format</span>
          <div className="flex flex-wrap items-center gap-1.5" role="group">
            {(Object.keys(CARD_FORMATS) as CardFormat[]).map((f) => (
              <Pill
                key={f}
                active={format === f}
                onClick={() => onFormat(f)}
                label={`${f} format, ${CARD_FORMATS[f].w} by ${CARD_FORMATS[f].h}`}
              >
                {f === "wide" ? "Wide 1200×630" : "Square 1080×1080"}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      {/* Mounted with the stage itself: the draw effect needs this node
          before it can paint the palette the actions below describe. */}
      {palette ? (
        <div className="mt-5 flex justify-center rounded-2xl border border-border bg-muted/30 p-4">
          <canvas
            key={format}
            ref={canvasRef}
            aria-label={ariaLabel}
            className="h-auto w-full max-w-[880px] rounded-xl border border-border"
          />
        </div>
      ) : (
        emptyState
      )}

      {note || drawNote ? (
        <p className="mt-3 text-center text-[13px] text-[var(--clay)]">{note ?? drawNote}</p>
      ) : null}

      {palette ? (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" className="min-w-[84px] rounded-full" onClick={() => void download()}>
              {pngFilename(palette)}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => void copyImage()}>
              Copy image
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => void copyText(cssTokens(palette)).then(() => flash("CSS variables copied"))}
            >
              Copy CSS
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => void copyText(tailwindTokens(palette)).then(() => flash("Tailwind tokens copied"))}
            >
              Copy Tailwind
            </Button>
            {share ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  void copyText(shareText(palette, window.location.href)).then(() => flash("share text copied"))
                }
              >
                Copy share text
              </Button>
            ) : null}
            {onRemix ? (
              <Button size="sm" variant="ghost" className="rounded-full" onClick={onRemix}>
                {remixHint ? `Remix ⏎${remixHint}` : "Remix"}
              </Button>
            ) : null}
          </div>
          <p aria-live="polite" className="mt-3 min-h-5 text-center text-xs text-muted-foreground">
            {status}
          </p>
        </>
      ) : null}
    </>
  );
}
