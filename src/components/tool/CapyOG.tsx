"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { OgScaled } from "@/components/card/og/OgScaled";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StageCard } from "@/components/stage-card";
import { COPIED_MS } from "@/lib/capytools/feedback";
import { useIsDark } from "@/lib/capytools/use-is-dark";
import { DEMO_CARD } from "@/lib/capyog/demo";
import { buildFileName, copyCardImage, exportCard } from "@/lib/capyog/export";
import { DEFAULT_SIZE_ID, SIZE_PRESETS, getSize } from "@/lib/capyog/sizes";
import { DEFAULT_TEMPLATE_ID, TEMPLATE_IDS, TEMPLATE_PRESETS } from "@/lib/capyog/templates";
import { accentTokens } from "@/lib/capyog/themes";
import type {
  OgAccent,
  OgCardData,
  OgFieldKey,
  OgTemplateId,
  OgVariant,
  ExportFormat,
  ExportScale,
} from "@/lib/capyog/types";
import { cn } from "@/lib/utils";

const ACCENTS: OgAccent[] = ["sage", "clay", "water", "gold"];

const FIELD_LABELS: Record<OgFieldKey, string> = {
  eyebrow: "Eyebrow",
  title: "Title",
  titleEm: "Title · italic segment",
  subtitle: "Subtitle",
  big: "Big text",
  attribution: "Attribution",
  tag: "Tag pill",
};

/** Fields that read better with room to wrap. */
const MULTILINE: OgFieldKey[] = ["title", "big", "subtitle"];

const SCALE_OPTIONS: ExportScale[] = [1, 2, 3];

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

export function CapyOG() {
  const [templateId, setTemplateId] = useState<OgTemplateId>(DEFAULT_TEMPLATE_ID);
  const [sizeId, setSizeId] = useState<string>(DEFAULT_SIZE_ID);
  const [accent, setAccent] = useState<OgAccent>("sage");
  const [fields, setFields] = useState<OgCardData>(DEMO_CARD);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState<ExportScale>(2);
  const [quality, setQuality] = useState(0.92);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");

  const captureRef = useRef<HTMLDivElement>(null);

  // The card's variant follows the site theme, the same hook Wrapped uses.
  const dark = useIsDark();
  const variant: OgVariant = dark ? "dark" : "light";

  const template = TEMPLATE_PRESETS[templateId];
  const size = getSize(sizeId);
  const theme = accentTokens(accent, variant);

  const setField = useCallback((key: OgFieldKey, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const filename = buildFileName({
    template: templateId,
    width: size.width,
    height: size.height,
    scale,
    format,
  });

  const handleDownload = useCallback(async () => {
    const node = captureRef.current;
    if (!node) return;
    setStatus("Rendering…");
    try {
      await exportCard(node, {
        width: size.width,
        height: size.height,
        scale,
        format,
        quality,
        background: theme.bg,
        filename,
      });
      setStatus(`Saved ${filename}.`);
    } catch {
      // A 1080×1920 at 3× is ~18.7 MP of canvas; some mobile browsers refuse.
      setStatus("That was a lot of canvas for one image — try 2×.");
    }
  }, [size.width, size.height, scale, format, quality, theme.bg, filename]);

  const handleCopy = useCallback(async () => {
    const node = captureRef.current;
    if (!node) return;
    const ok = await copyCardImage(node, size.width, size.height);
    if (ok) {
      setCopied(true);
      setStatus("Copied — paste it straight into your composer.");
      window.setTimeout(() => setCopied(false), COPIED_MS);
    } else {
      setStatus("Your browser blocked the image copy. Download instead — same pixels.");
    }
  }, [size.width, size.height]);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* CARD 1: THE COMPOSITION */}
      <StageCard index="01" title="The composition" marks>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="capyog-template"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Template
            </label>
            <Select
              value={templateId}
              onValueChange={(v) => setTemplateId(v as OgTemplateId)}
            >
              <SelectTrigger
                id="capyog-template"
                className="mt-1.5 w-full rounded-2xl bg-muted/40"
                aria-label="Template"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {TEMPLATE_PRESETS[id].name} — {TEMPLATE_PRESETS[id].line}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="capyog-size"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Size
            </label>
            <Select value={sizeId} onValueChange={setSizeId}>
              <SelectTrigger
                id="capyog-size"
                className="mt-1.5 w-full rounded-2xl bg-muted/40"
                aria-label="Size preset"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label} · {preset.width}×{preset.height}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {size.platforms} — {size.note}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Accent
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ACCENTS.map((a) => (
              <Pill
                key={a}
                active={accent === a}
                onClick={() => setAccent(a)}
                label={`Accent ${a}`}
              >
                <span
                  aria-hidden
                  className="mr-1.5 inline-block size-2 rounded-full align-middle"
                  style={{ background: accentTokens(a, variant).accent }}
                />
                {a}
              </Pill>
            ))}
            <span className="self-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              variant follows the site theme
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {template.fields.map((key) => (
            <div key={key} className={cn(MULTILINE.includes(key) && "sm:col-span-2")}>
              <label
                htmlFor={`capyog-field-${key}`}
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                {FIELD_LABELS[key]}
              </label>
              {MULTILINE.includes(key) ? (
                <Textarea
                  id={`capyog-field-${key}`}
                  rows={2}
                  value={fields[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              ) : (
                <Input
                  id={`capyog-field-${key}`}
                  type="text"
                  value={fields[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              )}
            </div>
          ))}
        </div>
      </StageCard>

      {/* CARD 2: THE PREVIEW + EXPORT */}
      <StageCard index="02" title="The preview">
        <div className="mt-4">
          <OgScaled
            data={fields}
            template={templateId}
            accent={accent}
            variant={variant}
            width={size.width}
            height={size.height}
            captureRef={captureRef}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Format
            </span>
            <Pill active={format === "png"} onClick={() => setFormat("png")} label="Format PNG">
              PNG
            </Pill>
            <Pill
              active={format === "jpeg"}
              onClick={() => setFormat("jpeg")}
              label="Format JPEG"
            >
              JPEG
            </Pill>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Scale
            </span>
            {SCALE_OPTIONS.map((s) => (
              <Pill key={s} active={scale === s} onClick={() => setScale(s)} label={`Scale ${s}×`}>
                {s}×
              </Pill>
            ))}
          </div>

          {format === "jpeg" && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="capyog-quality"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                Quality
              </label>
              <input
                id="capyog-quality"
                type="range"
                min={0.5}
                max={1}
                step={0.01}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-32 accent-[var(--primary)]"
              />
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {quality.toFixed(2)}
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" className="min-w-[84px] rounded-full" onClick={handleDownload}>
              <Download className="mr-1.5 size-3.5" />
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="min-w-[84px] rounded-full"
              onClick={handleCopy}
            >
              {copied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
              {copied ? "Copied!" : "Copy image"}
            </Button>
          </div>
        </div>

        <p aria-live="polite" className="mt-3 min-h-5 text-xs text-muted-foreground">
          {status || `Next download: ${filename}`}
        </p>
      </StageCard>

      {/* CARD 3: THE CHECKLIST */}
      <StageCard index="03" title="The checklist" caption="What to do with the file.">
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Paste, don&rsquo;t link.</span> X&rsquo;s
            intent URLs can&rsquo;t carry images, so the card travels on the clipboard — copy it
            here, paste it into the composer.
          </li>
          <li>
            <span className="font-medium text-foreground">Mind Facebook&rsquo;s 8&nbsp;MB.</span> A
            2× PNG of any preset lands far under it.
          </li>
          <li>
            <span className="font-medium text-foreground">LinkedIn needs ≥&nbsp;1200×627.</span> The
            link card preset clears the minimum; smaller images get rejected or cropped.
          </li>
          <li>
            <span className="font-medium text-foreground">Pinterest cuts past 2:3.</span> Taller
            pins get trimmed in the feed — the pin preset is exactly the ratio it documents.
          </li>
        </ul>
      </StageCard>
    </div>
  );
}
