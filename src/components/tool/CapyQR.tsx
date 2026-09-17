"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Dices, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StageCard, StageChip } from "@/components/stage-card";
import { COPIED_MS } from "@/lib/capytools/feedback";
import { saveBlob } from "@/lib/download";
import { buildPayload } from "@/lib/capyqr/payloads";
import { frameLayout } from "@/lib/capyqr/frame";
import {
  capacityNote,
  exportSpecLine,
  moduleCountFor,
} from "@/lib/capyqr/matrix";
import {
  CONTRAST_COPY,
  QUIET_COPY,
  contrastBand,
  contrastRatio,
  logoAdvice,
  quietBand,
  quietZonePx,
} from "@/lib/capyqr/guards";
import {
  BACKGROUND_SWATCHES,
  CAPY_PRESETS,
  CODE_SWATCHES,
  DEFAULT_STYLE,
  EYES_SWATCHES,
  randomGuardPassingStyle,
} from "@/lib/capyqr/presets";
import type { Options } from "qr-code-styling";

import {
  buildEngineOptions,
  composeStage,
  createQrEngine,
  exportStage,
  fileExtensionFor,
  formatKb,
  jpegFillNeeded,
  svgExportBlocked,
  type ExportFormat,
  type QrEngine,
} from "@/lib/capyqr/render";
import { verifyCanvas, type VerifyResult } from "@/lib/capyqr/verify";
import type { EccLevel, FrameState, FrameShape, PayloadFields, PayloadKind, QrStyleState } from "@/lib/capyqr/types";
import { DEFAULT_FRAME } from "@/lib/capyqr/types";
import { cn } from "@/lib/utils";

/** The frame shapes the style card offers, in display order. */
const FRAME_SHAPES: FrameShape[] = ["band", "banner", "card", "tab"];

/** Style updates funnel into one engine `update()` — the flicker guard. */
const DEBOUNCE_MS = 120;
/** Settle time between an engine repaint and reading the canvas back. */
const VERIFY_SETTLE_MS = 150;

const KINDS: { id: PayloadKind; label: string }[] = [
  { id: "link", label: "link & text" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "contact", label: "contact" },
  { id: "email", label: "email" },
  { id: "tel", label: "phone" },
  { id: "geo", label: "location" },
  { id: "event", label: "event" },
];

const DOT_TYPES: QrStyleState["dotType"][] = [
  "square",
  "rounded",
  "dots",
  "classy",
  "classy-rounded",
  "extra-rounded",
];
const CORNER_SQUARE_TYPES: QrStyleState["cornerSquareType"][] = [
  "square",
  "dot",
  "extra-rounded",
];
const CORNER_DOT_TYPES: QrStyleState["cornerDotType"][] = ["square", "dot"];
const ECC_LEVELS: EccLevel[] = ["L", "M", "Q", "H"];

const SIZES = [512, 1024, 2048];
const FORMATS: ExportFormat[] = ["png", "jpeg", "svg"];

const DEFAULT_FIELDS: PayloadFields = {
  link: { text: "https://capytools.app" },
  wifi: { ssid: "", password: "", encryption: "WPA", hidden: false },
  contact: { first: "", last: "" },
  email: { to: "" },
  tel: { phone: "" },
  geo: { lat: "", long: "" },
  event: { title: "", start: "", end: "", location: "" },
};

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

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
        "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
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

function ColorField({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", disabled && "opacity-40")}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="color"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="size-7 cursor-pointer rounded-full border border-border bg-transparent p-0.5 disabled:cursor-not-allowed"
      />
      <span className="font-mono text-[11px] uppercase tabular-nums text-muted-foreground">
        {value}
      </span>
    </div>
  );
}

function Swatches({
  label,
  colors,
  value,
  onPick,
}: {
  label: string;
  colors: readonly string[];
  value: string;
  onPick: (hex: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={labelClass}>{label}</span>
      {colors.map((hex) => (
        <button
          key={hex}
          type="button"
          aria-label={`${label}: ${hex}`}
          aria-pressed={value.toLowerCase() === hex}
          onClick={() => onPick(hex)}
          className={cn(
            "size-5 rounded-full border transition-colors",
            value.toLowerCase() === hex
              ? "border-foreground ring-2 ring-[var(--primary)]/40"
              : "border-border hover:border-foreground/50",
          )}
          style={{ background: hex }}
        />
      ))}
    </div>
  );
}

function truncateForChip(data: string): string {
  return data.length > 40 ? `${data.slice(0, 40)}…` : data;
}

export function CapyQR() {
  const [kind, setKind] = useState<PayloadKind>("link");
  const [fields, setFields] = useState<PayloadFields>(DEFAULT_FIELDS);
  const [style, setStyle] = useState<QrStyleState>(DEFAULT_STYLE);
  const [size, setSize] = useState(1024);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [ready, setReady] = useState(false);
  // Card 2's disclosure level. Deliberately not persisted — the tool stores
  // nothing, and "simple" is the calm default every visit settles into.
  const [detail, setDetail] = useState<"simple" | "full">("simple");
  const [frame, setFrame] = useState<FrameState>(DEFAULT_FRAME);
  // Both stamped with what they describe, so neither outlives its subject:
  // the scan is only a proof of the options it actually read off the canvas,
  // and the status note only applies to the file it named.
  const [verify, setVerify] = useState<{ result: VerifyResult; of: Options } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", file: "" });

  const engineRef = useRef<QrEngine | null>(null);
  // The engine's own canvas lives in a hidden host (frames are composed over
  // it); the stage canvas is what the preview shows, the scan reads, and the
  // export hands to the browser.
  const engineHostRef = useRef<HTMLDivElement>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement>(null);

  const payload = useMemo(() => buildPayload(kind, fields), [kind, fields]);
  const moduleCount = useMemo(
    () => (payload.ok ? moduleCountFor(payload.value, style.ecc) : null),
    [payload, style.ecc],
  );
  const layout = useMemo(
    () => frameLayout({ size, moduleCount: moduleCount ?? 0, frame }),
    [size, moduleCount, frame],
  );
  const quietPx = useMemo(
    () =>
      moduleCount !== null
        ? quietZonePx(layout.qrSize, moduleCount, style.quietModules)
        : 0,
    [moduleCount, layout.qrSize, style.quietModules],
  );

  const engineOptions = useMemo(
    () =>
      payload.ok && moduleCount !== null
        ? buildEngineOptions({
            value: payload.value,
            size: layout.qrSize,
            style,
            quietPx,
            logoUrl,
          })
        : null,
    [payload, moduleCount, layout, style, quietPx, logoUrl],
  );

  // The engine loads client-side only — the library touches browser globals
  // at import time, so nothing above this effect may reach for it. Fonts
  // settle first so framed captions measure and draw in the house face.
  useEffect(() => {
    let cancelled = false;
    createQrEngine()
      .then(async (engine) => {
        try {
          await document.fonts.ready;
        } catch {
          // font availability is a nicety here, not a requirement
        }
        if (cancelled) return;
        engineRef.current = engine;
        if (engineHostRef.current) engine.mount(engineHostRef.current);
        setReady(true);
      })
      .catch(() =>
        setStatus({
        text: "the qr engine failed to load — refresh the page to try again.",
        file: "",
      }),
      );
    return () => {
      cancelled = true;
      engineRef.current = null;
    };
  }, []);

  // Replacing the logo revokes the old object URL; so does leaving the page.
  useEffect(() => {
    const url = logoUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [logoUrl]);

  // One debounced engine update per change, then compose the stage and read
  // it back — the proof scan runs on the exact pixels the preview shows and
  // the export saves.
  useEffect(() => {
    if (!ready || !engineOptions) return;
    let verifyTimer = 0;
    const timer = window.setTimeout(() => {
      engineRef.current?.update(engineOptions);
      verifyTimer = window.setTimeout(() => {
        const engineCanvas = engineHostRef.current?.querySelector("canvas");
        const stage = stageCanvasRef.current;
        if (engineCanvas instanceof HTMLCanvasElement && stage) {
          composeStage(engineCanvas, stage, layout, style, frame);
          setVerify({ result: verifyCanvas(stage), of: engineOptions });
        }
      }, VERIFY_SETTLE_MS);
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(verifyTimer);
    };
  }, [ready, engineOptions, layout, style, frame]);

  const setLink = (patch: Partial<NonNullable<PayloadFields["link"]>>) =>
    setFields((prev) => ({ ...prev, link: { text: "", ...prev.link, ...patch } }));
  const setWifi = (patch: Partial<NonNullable<PayloadFields["wifi"]>>) =>
    setFields((prev) => ({
      ...prev,
      wifi: { ssid: "", password: "", encryption: "WPA", hidden: false, ...prev.wifi, ...patch },
    }));
  const setContact = (patch: Partial<NonNullable<PayloadFields["contact"]>>) =>
    setFields((prev) => ({
      ...prev,
      contact: { first: "", last: "", ...prev.contact, ...patch },
    }));
  const setEmail = (patch: Partial<NonNullable<PayloadFields["email"]>>) =>
    setFields((prev) => ({ ...prev, email: { to: "", ...prev.email, ...patch } }));
  const setTel = (patch: Partial<NonNullable<PayloadFields["tel"]>>) =>
    setFields((prev) => ({ ...prev, tel: { phone: "", ...prev.tel, ...patch } }));
  const setGeo = (patch: Partial<NonNullable<PayloadFields["geo"]>>) =>
    setFields((prev) => ({ ...prev, geo: { lat: "", long: "", ...prev.geo, ...patch } }));
  const setEvent = (patch: Partial<NonNullable<PayloadFields["event"]>>) =>
    setFields((prev) => ({
      ...prev,
      event: { title: "", start: "", end: "", location: "", ...prev.event, ...patch },
    }));

  const setStylePatch = (patch: Partial<QrStyleState>) =>
    setStyle((prev) => ({ ...prev, ...patch }));

  const onLogoFile = useCallback((file: File | null) => {
    if (!file) return;
    setLogoUrl(URL.createObjectURL(file));
    setLogoName(file.name);
    // A logo covers data modules; H recovers about 30% of the codewords.
    setStyle((prev) => (prev.ecc === "H" ? prev : { ...prev, ecc: "H" }));
    setStatus({
      text: "logo set — error correction raised to H so the covered modules still decode.",
      file: "",
    });
  }, []);

  const handleDownload = useCallback(async () => {
    const engine = engineRef.current;
    const stage = stageCanvasRef.current;
    if (!engine || !engineOptions || !stage || busy) return;
    const name = `capyqr-${kind}-${size}.${fileExtensionFor(format)}`;
    setBusy(true);
    try {
      const blob =
        format === "svg"
          ? await engine.svgBlob()
          : await exportStage(stage, format, style.bg);
      if (!blob) {
        setStatus({ text: "nothing to save yet — compose the payload first.", file: name });
        return;
      }
      saveBlob(blob, name);
      const jpegNote = format === "jpeg" && jpegFillNeeded(style.bg);
      setStatus({
        text: jpegNote
          ? `saved ${name} (${formatKb(blob.size)}) — jpeg has no transparency, so it sits on white.`
          : `saved ${name} (${formatKb(blob.size)}).`,
        file: name,
      });
    } finally {
      setBusy(false);
    }
  }, [engineOptions, format, kind, size, style.bg, busy]);

  const handleCopy = useCallback(async () => {
    const stage = stageCanvasRef.current;
    if (!engineOptions || !stage || busy) return;
    const name = `capyqr-${kind}-${size}.${fileExtensionFor(format)}`;
    setBusy(true);
    try {
      if (typeof ClipboardItem === "undefined") throw new Error("clipboard unsupported");
      const blob = await exportStage(stage, "png", style.bg);
      if (!blob) throw new Error("no blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setStatus({ text: "copied — paste it straight into your composer.", file: name });
      window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setStatus({
        text: "this browser blocked the image copy. download instead — same pixels.",
        file: name,
      });
    } finally {
      setBusy(false);
    }
  }, [engineOptions, busy, kind, size, format, style.bg]);

  // The guards read the composed style; transparent previews measure against
  // white, the surface a code is most likely to sit on.
  const fgColor = style.fg.mode === "solid" ? style.fg.color : style.fg.from;
  const surface = style.bg === "transparent" ? "#ffffff" : style.bg;
  const contrast = contrastBand(contrastRatio(fgColor, surface));
  // The eyes carry the finder pattern — the modules a scanner looks for
  // first — so a custom eyes color gets its own guard line when it drifts
  // low-contrast. Eyes that follow the module color inherit its verdict.
  const eyesColor = style.cornerColor ?? fgColor;
  const eyesGuarded =
    style.cornerColor !== null && contrastBand(contrastRatio(eyesColor, surface)) !== "ok";
  const quiet = quietBand(style.quietModules);
  const logoNotes = logoAdvice(Boolean(logoUrl), style.ecc);
  // Only a scan of the render currently on screen proves anything about it.
  const proof = verify && verify.of === engineOptions ? verify.result : null;
  const downloadName = `capyqr-${kind}-${size}.${fileExtensionFor(format)}`;
  const wifi = fields.wifi;
  const svgBlocked = svgExportBlocked(Boolean(logoUrl), frame.on);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* CARD 1: THE PAYLOAD */}
      <StageCard index="01" title="The payload" marks>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {KINDS.map((k) => (
            <Pill
              key={k.id}
              active={kind === k.id}
              onClick={() => setKind(k.id)}
              label={`Payload kind ${k.label}`}
            >
              {k.label}
            </Pill>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {kind === "link" && (
            <div className="sm:col-span-2">
              <label htmlFor="capyqr-link-text" className={labelClass}>
                link or text
              </label>
              <Input
                id="capyqr-link-text"
                type="text"
                value={fields.link?.text ?? ""}
                onChange={(e) => setLink({ text: e.target.value })}
                placeholder="https://example.com — a scheme stays as-is, plain text too"
                className="mt-1.5 bg-muted/40 font-sans"
              />
            </div>
          )}

          {kind === "wifi" && (
            <>
              <div>
                <label htmlFor="capyqr-wifi-ssid" className={labelClass}>
                  network name (SSID)
                </label>
                <Input
                  id="capyqr-wifi-ssid"
                  type="text"
                  value={wifi?.ssid ?? ""}
                  onChange={(e) => setWifi({ ssid: e.target.value })}
                  placeholder="the network phones should join"
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyqr-wifi-password" className={labelClass}>
                  password
                </label>
                <Input
                  id="capyqr-wifi-password"
                  type="text"
                  value={wifi?.password ?? ""}
                  onChange={(e) => setWifi({ password: e.target.value })}
                  disabled={wifi?.encryption === "nopass"}
                  placeholder={wifi?.encryption === "nopass" ? "none — open network" : "the network password"}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyqr-wifi-encryption" className={labelClass}>
                  security
                </label>
                <Select
                  value={wifi?.encryption ?? "WPA"}
                  onValueChange={(v) => setWifi({ encryption: v as "WPA" | "WEP" | "nopass" })}
                >
                  <SelectTrigger
                    id="capyqr-wifi-encryption"
                    className="mt-1.5 w-full rounded-2xl bg-muted/40"
                    aria-label="Wi-Fi security"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WPA">WPA / WPA2</SelectItem>
                    <SelectItem value="WEP">WEP</SelectItem>
                    <SelectItem value="nopass">none — open network</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2 sm:mt-1.5">
                <label htmlFor="capyqr-wifi-hidden" className={labelClass}>
                  hidden network
                </label>
                <Switch
                  id="capyqr-wifi-hidden"
                  checked={Boolean(wifi?.hidden)}
                  onCheckedChange={(v) => setWifi({ hidden: v === true })}
                  aria-label="Hidden network"
                />
              </div>
            </>
          )}

          {kind === "contact" && (
            <>
              <div>
                <label htmlFor="capyqr-contact-first" className={labelClass}>
                  first name
                </label>
                <Input
                  id="capyqr-contact-first"
                  type="text"
                  value={fields.contact?.first ?? ""}
                  onChange={(e) => setContact({ first: e.target.value })}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyqr-contact-last" className={labelClass}>
                  last name
                </label>
                <Input
                  id="capyqr-contact-last"
                  type="text"
                  value={fields.contact?.last ?? ""}
                  onChange={(e) => setContact({ last: e.target.value })}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyqr-contact-org" className={labelClass}>
                  organization
                </label>
                <Input
                  id="capyqr-contact-org"
                  type="text"
                  value={fields.contact?.org ?? ""}
                  onChange={(e) => setContact({ org: e.target.value })}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyqr-contact-phone" className={labelClass}>
                  phone
                </label>
                <Input
                  id="capyqr-contact-phone"
                  type="text"
                  value={fields.contact?.phone ?? ""}
                  onChange={(e) => setContact({ phone: e.target.value })}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyqr-contact-email" className={labelClass}>
                  email
                </label>
                <Input
                  id="capyqr-contact-email"
                  type="text"
                  value={fields.contact?.email ?? ""}
                  onChange={(e) => setContact({ email: e.target.value })}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyqr-contact-url" className={labelClass}>
                  url
                </label>
                <Input
                  id="capyqr-contact-url"
                  type="text"
                  value={fields.contact?.url ?? ""}
                  onChange={(e) => setContact({ url: e.target.value })}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
            </>
          )}

          {kind === "email" && (
            <>
              <div>
                <label htmlFor="capyqr-email-to" className={labelClass}>
                  to
                </label>
                <Input
                  id="capyqr-email-to"
                  type="text"
                  value={fields.email?.to ?? ""}
                  onChange={(e) => setEmail({ to: e.target.value })}
                  placeholder="who this opens a draft for"
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyqr-email-subject" className={labelClass}>
                  subject
                </label>
                <Input
                  id="capyqr-email-subject"
                  type="text"
                  value={fields.email?.subject ?? ""}
                  onChange={(e) => setEmail({ subject: e.target.value })}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="capyqr-email-body" className={labelClass}>
                  body
                </label>
                <Textarea
                  id="capyqr-email-body"
                  rows={2}
                  value={fields.email?.body ?? ""}
                  onChange={(e) => setEmail({ body: e.target.value })}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
            </>
          )}

          {kind === "tel" && (
            <div className="sm:col-span-2">
              <label htmlFor="capyqr-tel-phone" className={labelClass}>
                phone number
              </label>
              <Input
                id="capyqr-tel-phone"
                type="tel"
                value={fields.tel?.phone ?? ""}
                onChange={(e) => setTel({ phone: e.target.value })}
                placeholder="+61 2 8374 4000 — country code and all"
                className="mt-1.5 bg-muted/40 font-sans"
              />
            </div>
          )}

          {kind === "geo" && (
            <>
              <div>
                <label htmlFor="capyqr-geo-lat" className={labelClass}>
                  latitude
                </label>
                <Input
                  id="capyqr-geo-lat"
                  type="text"
                  inputMode="decimal"
                  value={fields.geo?.lat ?? ""}
                  onChange={(e) => setGeo({ lat: e.target.value })}
                  placeholder="-33.8688"
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyqr-geo-long" className={labelClass}>
                  longitude
                </label>
                <Input
                  id="capyqr-geo-long"
                  type="text"
                  inputMode="decimal"
                  value={fields.geo?.long ?? ""}
                  onChange={(e) => setGeo({ long: e.target.value })}
                  placeholder="151.2093"
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
            </>
          )}

          {kind === "event" && (
            <>
              <div className="sm:col-span-2">
                <label htmlFor="capyqr-event-title" className={labelClass}>
                  title
                </label>
                <Input
                  id="capyqr-event-title"
                  type="text"
                  value={fields.event?.title ?? ""}
                  onChange={(e) => setEvent({ title: e.target.value })}
                  placeholder="what the phone will save"
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyqr-event-start" className={labelClass}>
                  starts
                </label>
                <Input
                  id="capyqr-event-start"
                  type="datetime-local"
                  value={fields.event?.start ?? ""}
                  onChange={(e) => setEvent({ start: e.target.value })}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div>
                <label htmlFor="capyqr-event-end" className={labelClass}>
                  ends
                </label>
                <Input
                  id="capyqr-event-end"
                  type="datetime-local"
                  value={fields.event?.end ?? ""}
                  onChange={(e) => setEvent({ end: e.target.value })}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="capyqr-event-location" className={labelClass}>
                  location (optional)
                </label>
                <Input
                  id="capyqr-event-location"
                  type="text"
                  value={fields.event?.location ?? ""}
                  onChange={(e) => setEvent({ location: e.target.value })}
                  className="mt-1.5 bg-muted/40 font-sans"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          <span className={labelClass}>encoded payload</span>
          <div className="mt-1.5 break-all rounded-2xl border border-border/70 bg-muted/50 p-4 font-mono text-[13px] leading-relaxed">
            {payload.ok ? (
              payload.value
            ) : (
              <span className="text-[var(--clay)]">{payload.error}</span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {payload.ok
              ? capacityNote(payload.value, style.ecc)
              : "the code waits until the payload above is complete."}
          </p>
        </div>
      </StageCard>

      {/* CARD 2: THE STYLE */}
      <StageCard
        index="02"
        title="The style"
        actions={
          <div className="flex items-center gap-1.5" role="group" aria-label="Settings detail">
            <Pill active={detail === "simple"} onClick={() => setDetail("simple")} label="Simple settings">
              simple
            </Pill>
            <Pill active={detail === "full"} onClick={() => setDetail("full")} label="Full settings">
              full
            </Pill>
          </div>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {CAPY_PRESETS.map((preset) => (
            <Pill
              key={preset.id}
              active={JSON.stringify(style) === JSON.stringify(preset.style)}
              onClick={() => setStyle(preset.style)}
              label={`Preset ${preset.label}`}
            >
              <span
                aria-hidden
                className="mr-1.5 inline-block size-2 rounded-full align-middle"
                style={{ background: preset.style.fg.mode === "solid" ? preset.style.fg.color : preset.style.fg.from }}
              />
              {preset.label}
            </Pill>
          ))}
          <Pill
            active={false}
            onClick={() => setStyle(randomGuardPassingStyle(Math.random))}
            label="Randomize style within the guards"
          >
            <Dices aria-hidden className="mr-1.5 inline size-3" />
            random
          </Pill>
        </div>

        <div className={cn("mt-4 grid gap-4", detail === "full" ? "sm:grid-cols-3" : "sm:grid-cols-1")}>
          <div>
            <label htmlFor="capyqr-dot-type" className={labelClass}>
              dot type
            </label>
            <Select
              value={style.dotType}
              onValueChange={(v) => setStylePatch({ dotType: v as QrStyleState["dotType"] })}
            >
              <SelectTrigger
                id="capyqr-dot-type"
                className="mt-1.5 w-full rounded-2xl bg-muted/40"
                aria-label="Dot type"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {detail === "full" ? (
            <div>
              <label htmlFor="capyqr-corner-square" className={labelClass}>
                corner squares
              </label>
              <Select
                value={style.cornerSquareType}
                onValueChange={(v) =>
                  setStylePatch({ cornerSquareType: v as QrStyleState["cornerSquareType"] })
                }
              >
                <SelectTrigger
                  id="capyqr-corner-square"
                  className="mt-1.5 w-full rounded-2xl bg-muted/40"
                  aria-label="Corner square type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CORNER_SQUARE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {detail === "full" ? (
            <div>
              <label htmlFor="capyqr-corner-dot" className={labelClass}>
                corner dots
              </label>
              <Select
                value={style.cornerDotType}
                onValueChange={(v) =>
                  setStylePatch({ cornerDotType: v as QrStyleState["cornerDotType"] })
                }
              >
                <SelectTrigger
                  id="capyqr-corner-dot"
                  className="mt-1.5 w-full rounded-2xl bg-muted/40"
                  aria-label="Corner dot type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CORNER_DOT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          {detail === "full" ? (
            <div className="flex items-center gap-1.5">
              <span className={labelClass}>color</span>
              <Pill
                active={style.fg.mode === "solid"}
                onClick={() =>
                  setStylePatch({
                    fg: { mode: "solid", color: style.fg.mode === "solid" ? style.fg.color : style.fg.from },
                  })
                }
                label="Solid color"
              >
                solid
              </Pill>
              <Pill
                active={style.fg.mode === "gradient"}
                onClick={() =>
                  setStylePatch({
                    fg: {
                      mode: "gradient",
                      gradientType: "linear",
                      from: fgColor,
                      to: surface === "#ffffff" ? "#5f7a72" : "#ffffff",
                      rotation: 45,
                    },
                  })
                }
                label="Gradient color"
              >
                gradient
              </Pill>
            </div>
          ) : null}

          {style.fg.mode === "solid" || detail === "simple" ? (
            <>
              <ColorField
                id="capyqr-fg-color"
                label="module color"
                value={style.fg.mode === "solid" ? style.fg.color : style.fg.from}
                onChange={(hex) =>
                  setStyle((prev) =>
                    prev.fg.mode === "solid"
                      ? { ...prev, fg: { mode: "solid", color: hex } }
                      : { ...prev, fg: { ...prev.fg, from: hex } },
                  )
                }
              />
              <Swatches
                label="code swatches"
                colors={CODE_SWATCHES}
                value={style.fg.mode === "solid" ? style.fg.color : style.fg.from}
                onPick={(hex) =>
                  setStyle((prev) =>
                    prev.fg.mode === "solid"
                      ? { ...prev, fg: { mode: "solid", color: hex } }
                      : { ...prev, fg: { ...prev.fg, from: hex } },
                  )
                }
              />
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <ColorField
                id="capyqr-gradient-from"
                label="from"
                value={style.fg.from}
                onChange={(hex) =>
                  setStyle((prev) =>
                    prev.fg.mode === "gradient"
                      ? { ...prev, fg: { ...prev.fg, from: hex } }
                      : prev,
                  )
                }
              />
              <ColorField
                id="capyqr-gradient-to"
                label="to"
                value={style.fg.to}
                onChange={(hex) =>
                  setStyle((prev) =>
                    prev.fg.mode === "gradient"
                      ? { ...prev, fg: { ...prev.fg, to: hex } }
                      : prev,
                  )
                }
              />
              <div className="flex items-center gap-2">
                <label htmlFor="capyqr-gradient-rotation" className={labelClass}>
                  angle
                </label>
                <input
                  id="capyqr-gradient-rotation"
                  type="range"
                  min={0}
                  max={359}
                  step={1}
                  value={style.fg.rotation}
                  onChange={(e) =>
                    setStyle((prev) =>
                      prev.fg.mode === "gradient"
                        ? { ...prev, fg: { ...prev.fg, rotation: Number(e.target.value) } }
                        : prev,
                    )
                  }
                  className="w-28 accent-[var(--primary)]"
                />
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {style.fg.rotation}°
                </span>
              </div>
            </div>
          )}

          <ColorField
            id="capyqr-bg-color"
            label="background"
            value={style.bg === "transparent" ? "#ffffff" : style.bg}
            disabled={style.bg === "transparent"}
            onChange={(hex) => setStylePatch({ bg: hex })}
          />
          <Swatches
            label="background swatches"
            colors={BACKGROUND_SWATCHES}
            value={style.bg === "transparent" ? "#ffffff" : style.bg}
            onPick={(hex) => setStylePatch({ bg: hex })}
          />
          {detail === "full" ? (
            <Pill
              active={style.bg === "transparent"}
              onClick={() => setStylePatch({ bg: style.bg === "transparent" ? "#ffffff" : "transparent" })}
              label="Transparent background"
            >
              transparent
            </Pill>
          ) : null}
        </div>

        {detail === "full" ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Swatches
              label="eyes color"
              colors={EYES_SWATCHES}
              value={style.cornerColor ?? fgColor}
              onPick={(hex) => setStylePatch({ cornerColor: hex })}
            />
            <Pill
              active={style.cornerColor === null}
              onClick={() => setStylePatch({ cornerColor: null })}
              label="Eyes follow the module color"
            >
              eyes match code
            </Pill>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="capyqr-quiet" className={labelClass}>
              quiet zone
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                id="capyqr-quiet"
                type="range"
                min={0}
                max={6}
                step={1}
                value={style.quietModules}
                onChange={(e) => setStylePatch({ quietModules: Number(e.target.value) })}
                className="w-40 accent-[var(--primary)]"
              />
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {style.quietModules} modules · ≈{Math.round(quietPx)} px at {size}
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="capyqr-ecc" className={labelClass}>
              error correction
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <Select
                value={style.ecc}
                onValueChange={(v) => setStylePatch({ ecc: v as EccLevel })}
              >
                <SelectTrigger
                  id="capyqr-ecc"
                  className="w-24 rounded-2xl bg-muted/40"
                  aria-label="Error correction level"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ECC_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-muted-foreground">
                H recovers the most; L packs the most data.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label
            htmlFor="capyqr-logo"
            className="cursor-pointer rounded-full border border-border bg-muted/30 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            upload logo
          </label>
          <input
            id="capyqr-logo"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              onLogoFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          {logoUrl ? (
            <>
              <span className="max-w-48 truncate text-[11px] text-muted-foreground">
                {logoName}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => {
                  setLogoUrl(null);
                  setLogoName("");
                  setStatus({
                    text: "logo removed — the pattern has the whole code again.",
                    file: "",
                  });
                }}
              >
                remove
              </Button>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              sits in the center, 40% of the code&rsquo;s width
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Pill
            active={frame.on}
            onClick={() => setFrame((prev) => ({ ...prev, on: !prev.on }))}
            label="Frame around the code"
          >
            frame
          </Pill>
          {frame.on && detail === "full" ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className={labelClass}>shape</span>
                {FRAME_SHAPES.map((shape) => (
                  <Pill
                    key={shape}
                    active={frame.shape === shape}
                    onClick={() => setFrame((prev) => ({ ...prev, shape }))}
                    label={`Frame shape ${shape}`}
                  >
                    {shape}
                  </Pill>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={labelClass}>position</span>
                <Pill
                  active={frame.position === "top"}
                  onClick={() => setFrame((prev) => ({ ...prev, position: "top" }))}
                  label="Caption position top"
                >
                  top
                </Pill>
                <Pill
                  active={frame.position === "bottom"}
                  onClick={() => setFrame((prev) => ({ ...prev, position: "bottom" }))}
                  label="Caption position bottom"
                >
                  bottom
                </Pill>
              </div>
              <Swatches
                label="frame color"
                colors={BACKGROUND_SWATCHES}
                value={frame.color}
                onPick={(hex) => setFrame((prev) => ({ ...prev, color: hex }))}
              />
            </>
          ) : null}
          {frame.on ? (
            <div className="flex items-center gap-2">
              <label htmlFor="capyqr-frame-label" className={labelClass}>
                caption
              </label>
              <Input
                id="capyqr-frame-label"
                type="text"
                maxLength={40}
                value={frame.label}
                onChange={(e) => setFrame((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="SCAN ME"
                className="w-44 bg-muted/40 font-sans"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <span className={labelClass}>the guards</span>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
            <li className={contrast === "ok" ? "text-muted-foreground" : "text-[var(--clay)]"}>
              contrast · {CONTRAST_COPY[contrast]}
            </li>
            {eyesGuarded ? (
              <li className="text-[var(--clay)]">
                eyes · the corner eyes are low-contrast and they carry the finder pattern —
                darken them or let them match the code.
              </li>
            ) : null}
            <li className={quiet === "ok" ? "text-muted-foreground" : "text-[var(--clay)]"}>
              quiet zone · {QUIET_COPY[quiet]}
            </li>
            {logoNotes.length > 0 ? (
              logoNotes.map((note) => (
                <li key={note} className="text-[var(--clay)]">
                  logo · {note}
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">logo · none, so nothing covers the modules.</li>
            )}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            the guards are rules of thumb, not a spec — the scan below is the proof.
          </p>
        </div>
      </StageCard>

      {/* CARD 3: THE CODE */}
      <StageCard index="03" title="The code">
        {/* The engine's own canvas — the QR alone — renders here, hidden;
            the composed stage below is the visible, scannable, exportable
            surface. */}
        <div ref={engineHostRef} aria-hidden className="pointer-events-none absolute size-0 overflow-hidden opacity-0" />
        <canvas
          ref={stageCanvasRef}
          role="img"
          aria-label="live QR preview — the exact pixels that export"
          width={size}
          height={size}
          className="mx-auto block aspect-square w-full max-w-[320px] rounded-2xl border border-border"
        />

        <div className="mt-4 text-center">
          {payload.ok && proof?.ok && !proof.inverted ? (
            <StageChip tone="sage">
              verified scannable — decoded: {truncateForChip(proof.data)}
            </StageChip>
          ) : payload.ok && proof?.ok ? (
            <StageChip tone="clay">
              decoded here, but the modules are light on dark — scanners that only read
              upright codes will refuse it. Swap the colours to be sure.
            </StageChip>
          ) : payload.ok && proof && !proof.ok ? (
            <StageChip tone="clay">
              the in-tab scan could not read this one — try higher contrast or a calmer dot style.
            </StageChip>
          ) : payload.ok ? (
            <StageChip>scanning the render…</StageChip>
          ) : null}
        </div>

        {payload.ok ? (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            high contrast scans best — test at arm&rsquo;s length.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-1.5">
            <span className={labelClass}>size</span>
            {SIZES.map((s) => (
              <Pill key={s} active={size === s} onClick={() => setSize(s)} label={`Size ${s}`}>
                {s}
              </Pill>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className={labelClass}>format</span>
            {FORMATS.map((f) => (
              <Pill
                key={f}
                active={format === f}
                disabled={f === "svg" && svgBlocked}
                onClick={() => setFormat(f)}
                label={`Format ${f}`}
              >
                {f === "jpeg" ? "JPEG" : f.toUpperCase()}
              </Pill>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              className="min-w-[84px] rounded-full"
              onClick={handleDownload}
              disabled={busy}
            >
              <Download className="mr-1.5 size-3.5" />
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="min-w-[84px] rounded-full"
              onClick={handleCopy}
              disabled={busy}
            >
              {copied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
              {copied ? "Copied" : "Copy image"}
            </Button>
          </div>
        </div>

        {moduleCount !== null && payload.ok ? (
          <p className="mt-3 font-mono text-[11px] tabular-nums text-muted-foreground">
            {exportSpecLine({
              ecc: style.ecc,
              moduleCount,
              quietModules: style.quietModules,
              quietPx,
              size,
              format,
            })}
          </p>
        ) : null}

        {svgBlocked ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {frame.on
              ? "SVG keeps vector purity — export the framed version as PNG."
              : "SVG keeps vector purity — export the logo version as PNG."}
          </p>
        ) : null}

        <p aria-live="polite" className="mt-3 min-h-5 text-xs text-muted-foreground">
          {status.text && status.file === downloadName
            ? status.text
            : payload.ok
              ? `next download: ${downloadName}`
              : "compose the payload above — the code is waiting."}
        </p>
      </StageCard>
    </div>
  );
}
