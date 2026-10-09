"use client";

/**
 * CapyInvoice — the tool.
 *
 * Everything happens in this tab: the draft and the business profile are read
 * from and written to `localStorage`, and the PDF and JSON are produced
 * locally. There is no server call anywhere in this file.
 *
 * The money inputs follow CapyResume's TagsInput pattern: while a field is
 * focused it shows the raw draft (so typing "12." is not fought by the
 * parser), and every keystroke still commits the parsed minor units to the
 * document. The stored value is always an integer (see ./lib/capyinvoice/money).
 *
 * Styling follows the suite language (DESIGN.md): house stage cards, pills,
 * and clay only where a field is required.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { StageCard } from "@/components/stage-card";
import {
  DEMO_INVOICE,
} from "@/lib/capyinvoice/demo";
import {
  computeTotals,
} from "@/lib/capyinvoice/compute";
import {
  emptyBusinessProfile,
  emptyInvoiceDoc,
  emptyLine,
  isBusinessEmpty,
  isInvoiceEmpty,
  LOGO_MAX_EDGE,
  uid,
} from "@/lib/capyinvoice/schema";
import {
  clearInvoice,
  getSnapshot,
  hasStoredInvoice,
  saveInvoice,
  useInvoiceWithServerSnapshot,
} from "@/lib/capyinvoice/store";
import {
  getBusinessSnapshot,
  saveBusiness,
  useBusinessWithServerSnapshot,
} from "@/lib/capyinvoice/business";
import {
  exportInvoiceJson,
  invoiceBackupFileName,
  invoiceFileName,
  MAX_BACKUP_BYTES,
  parseInvoiceBackup,
} from "@/lib/capyinvoice/json";
import {
  currencyMinorDigits,
  formatMoney,
  isCurrencyCode,
  parseMinorUnits,
  parsePercentToBp,
  parseQuantity,
} from "@/lib/capyinvoice/money";
import { formatBytes, todayIso } from "@/lib/capyinvoice/format";
import { getPaperSize, setPaperSize, usePaperSize } from "@/lib/capyinvoice/prefs";
import {
  downloadBlob,
  downloadText,
  readFileAsText,
} from "@/lib/capyresume/download";
import type { BusinessProfile, DocKind, InvoiceDoc, InvoiceLine } from "@/lib/capyinvoice/types";

/**
 * Warm the exporter a user is about to ask for — the module split keeps
 * `@react-pdf/renderer` out of first load, and the import itself preloads.
 */
const preloadPdfExporter = () => void import("@/lib/capyinvoice/pdf");

/**
 * The confirmation dialog is only reachable from an action that needs
 * confirming, so it does not belong in first load. `ssr: false` because it
 * renders nothing until a confirmation is pending.
 */
const ConfirmDialog = dynamic(
  () => import("@/components/capyresume/ConfirmDialog").then((m) => m.ConfirmDialog),
  { ssr: false },
);

const KINDS: { value: DocKind; label: string }[] = [
  { value: "invoice", label: "Invoice" },
  { value: "quote", label: "Quote" },
  { value: "receipt", label: "Receipt" },
];

const CURRENCY_SUGGESTIONS = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "SEK", "NOK", "DKK",
  "INR", "SGD", "HKD", "NZD", "ZAR", "BRL", "MXN", "PLN", "CZK", "KWD",
];

function kindLabels(kind: DocKind): { numberLabel: string; dueLabel: string } {
  switch (kind) {
    case "quote":
      return { numberLabel: "Quote no.", dueLabel: "Valid until" };
    case "receipt":
      return { numberLabel: "Receipt no.", dueLabel: "Due" };
    default:
      return { numberLabel: "Invoice no.", dueLabel: "Due date" };
  }
}

/** The profile a server render sees — a module constant, so the reference is stable. */
const EMPTY_BUSINESS_SNAPSHOT: BusinessProfile = Object.freeze({
  version: 1,
  name: "",
  details: "",
  logoDataUrl: "",
  currency: "",
  paymentDetails: "",
  updatedAt: "",
});

/**
 * A numeric field that keeps the raw keystrokes while focused and commits the
 * parsed value on every change. `parse` returning null (mid-edit junk) keeps
 * the document's last good value — the input still shows the draft.
 */
function NumericInput({
  name,
  label,
  value,
  parse,
  format,
  placeholder,
  onCommit,
  className,
}: {
  name: string;
  label: string;
  value: number;
  parse: (raw: string) => number | null;
  format: (value: number) => string;
  placeholder?: string;
  onCommit: (value: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className={className ?? "w-full rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums"}
      name={name}
      aria-label={label}
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={draft ?? format(value)}
      onFocus={() => setDraft(format(value))}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = parse(event.target.value);
        if (parsed !== null) onCommit(parsed);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

/**
 * One line item. Memoized on its own `line` object — the parent hands stable
 * handlers, so a keystroke in one row re-renders that row and the totals only.
 */
const LineRow = memo(function LineRow({
  line,
  index,
  digits,
  amountMinor,
  currency,
  onField,
  onMove,
  onRemove,
}: {
  line: InvoiceLine;
  index: number;
  digits: number;
  amountMinor: number;
  currency: string;
  onField: (lineId: string, field: "description" | "qty" | "unitPriceMinor" | "taxBp", value: string | number) => void;
  onMove: (lineId: string, delta: number) => void;
  onRemove: (lineId: string) => void;
}) {
  const prefix = `Item ${index + 1}`;
  return (
    <div className="rounded-2xl bg-muted/30 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <label className="flex-1">
          <span className="sr-only">{`${prefix}, description`}</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            name={`${line.id}-description`}
            aria-label={`${prefix}, description`}
            placeholder="What was delivered"
            value={line.description}
            onChange={(event) => onField(line.id, "description", event.target.value)}
          />
        </label>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label>
          <span className="mb-1 block text-xs text-muted-foreground">Qty</span>
          <NumericInput
            name={`${line.id}-qty`}
            label={`${prefix}, quantity`}
            value={line.qty}
            parse={parseQuantity}
            format={(value) => String(value)}
            placeholder="1"
            onCommit={(value) => onField(line.id, "qty", value)}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-muted-foreground">Unit price</span>
          <NumericInput
            name={`${line.id}-unit`}
            label={`${prefix}, unit price`}
            value={line.unitPriceMinor}
            parse={(raw) => parseMinorUnits(raw, digits)}
            format={(value) => formatMoney(value, currency)}
            placeholder={formatMoney(0, currency)}
            onCommit={(value) => onField(line.id, "unitPriceMinor", value)}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-muted-foreground">Tax %</span>
          <NumericInput
            name={`${line.id}-tax`}
            label={`${prefix}, tax rate percent`}
            value={line.taxBp}
            parse={parsePercentToBp}
            format={(value) => (value === 0 ? "" : (value / 100).toString())}
            placeholder="0"
            onCommit={(value) => onField(line.id, "taxBp", value)}
          />
        </label>
        <div>
          <span className="mb-1 block text-xs text-muted-foreground">Amount</span>
          <p className="overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-border bg-muted/40 px-3 py-2 text-sm tabular-nums">
            {formatMoney(amountMinor, currency)}
          </p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="rounded-full border border-border px-2 py-1 text-sm transition-colors hover:border-primary hover:bg-muted/50"
          onClick={() => onMove(line.id, -1)}
          aria-label={`Move ${prefix.toLowerCase()} up`}
        >
          ↑
        </button>
        <button
          type="button"
          className="rounded-full border border-border px-2 py-1 text-sm transition-colors hover:border-primary hover:bg-muted/50"
          onClick={() => onMove(line.id, 1)}
          aria-label={`Move ${prefix.toLowerCase()} down`}
        >
          ↓
        </button>
        <button
          type="button"
          className="rounded-full border border-border px-2 py-1 text-sm transition-colors hover:border-primary hover:bg-muted/50"
          onClick={() => onRemove(line.id)}
        >
          Remove line
        </button>
      </div>
    </div>
  );
});

export function CapyInvoice({ initialKind }: { initialKind?: DocKind } = {}) {
  // The demo is the server snapshot, so the first paint has real content and
  // hydration matches; React then swaps in whatever is actually stored.
  const stored = useInvoiceWithServerSnapshot(DEMO_INVOICE);
  const profile = useBusinessWithServerSnapshot(EMPTY_BUSINESS_SNAPSHOT);

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{
    title: string;
    message: string;
    confirmText: string;
    run: () => void;
  } | null>(null);
  const seeded = useRef(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    try {
      if (!hasStoredInvoice()) {
        // First visit: seed from the demo so the tool teaches instead of opening
        // blank, wearing the kind the landing asked for (invoice / quote / receipt).
        saveInvoice(initialKind ? { ...DEMO_INVOICE, kind: initialKind } : DEMO_INVOICE);
      } else if (initialKind && getSnapshot().kind !== initialKind) {
        // An intent page (/quote-template, /receipt-maker) opens on its kind.
        // Only the labels change — every line, party and total is kept.
        saveInvoice({ ...getSnapshot(), kind: initialKind });
      }
    } catch {
      // Storage unavailable (private mode). The editor still works in-memory.
    }
  }, [initialKind]);

  const doc = stored;
  const digits = useMemo(() => currencyMinorDigits(doc.currency), [doc.currency]);
  const labels = kindLabels(doc.kind);
  const totals = useMemo(() => computeTotals(doc), [doc]);

  /**
   * Apply a change and persist it, mirroring CapyResume's editor: read at
   * call time (keeps `edit` stable), skip no-ops, surface storage failures.
   */
  const edit = useCallback((mutate: (draft: InvoiceDoc) => InvoiceDoc) => {
    const current = getSnapshot();
    const next = mutate(current);
    if (next === current) return;
    try {
      saveInvoice(next);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save to this browser.");
    }
  }, []);

  const setField = <K extends keyof InvoiceDoc>(field: K, value: InvoiceDoc[K]) =>
    edit((d) => (d[field] === value ? d : { ...d, [field]: value }));

  const setLineField = useCallback(
    (lineId: string, field: "description" | "qty" | "unitPriceMinor" | "taxBp", value: string | number) =>
      edit((d) => {
        const lines = d.lines.map((line) =>
          line.id === lineId && line[field] !== value ? { ...line, [field]: value } : line,
        );
        return lines === d.lines ? d : { ...d, lines };
      }),
    [edit],
  );

  const addLine = () =>
    edit((d) => ({ ...d, lines: [...d.lines, emptyLine()] }));

  const moveLine = useCallback(
    (lineId: string, delta: number) =>
      edit((d) => {
        const at = d.lines.findIndex((line) => line.id === lineId);
        const to = at + delta;
        if (at === -1 || to < 0 || to >= d.lines.length) return d;
        const lines = [...d.lines];
        const [moved] = lines.splice(at, 1);
        lines.splice(to, 0, moved!);
        return { ...d, lines };
      }),
    [edit],
  );

  const removeLine = useCallback(
    (lineId: string) =>
      edit((d) => {
        if (d.lines.length === 1) {
          // The last row blanks instead of disappearing: there is always a line to type into.
          const blank = d.lines[0]!;
          if (
            !blank.description.trim() &&
            blank.unitPriceMinor === 0 &&
            blank.taxBp === 0 &&
            (blank.qty === 1 || blank.qty === 0)
          ) {
            return d;
          }
          return { ...d, lines: [{ ...blank, id: uid("line"), description: "", qty: 1, unitPriceMinor: 0, taxBp: 0 }] };
        }
        return { ...d, lines: d.lines.filter((line) => line.id !== lineId) };
      }),
    [edit],
  );

  // ------------------------------------------------------------- the logo
  // Picked, downscaled and stored as a data URL on this machine. A data URL
  // is also a promise: the PDF renderer never fetches a remote logo, because
  // there is no remote logo — a URL pasted in would be dropped by migrate().
  const pickLogo = async (file: File) => {
    try {
      if (!file.type.startsWith("image/")) {
        setNotice("That file is not an image — pick a PNG, JPEG or WebP logo.");
        return;
      }
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, LOGO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const dataUrl = canvas.toDataURL("image/png");
      setField("logoDataUrl", dataUrl);
      setNotice(`Logo added — it stays in this browser and rides along in the JSON backup (${formatBytes(dataUrl.length)}).`);
    } catch {
      setNotice("That image could not be read in this browser.");
    }
  };

  // ------------------------------------------------------ business profile
  const saveProfile = () => {
    try {
      saveBusiness({
        ...emptyBusinessProfile(),
        name: doc.fromName,
        details: doc.fromDetails,
        logoDataUrl: doc.logoDataUrl,
        currency: doc.currency,
        paymentDetails: doc.paymentDetails,
      });
      setNotice("Saved as your business profile — new invoices can start from it.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save the profile.");
    }
  };

  const loadProfile = () => {
    const storedProfile = getBusinessSnapshot();
    if (isBusinessEmpty(storedProfile)) {
      setNotice("No business profile in this browser yet — fill the From block, then “Save as my profile”.");
      return;
    }
    const apply = () => {
      edit((d) => ({
        ...d,
        fromName: storedProfile.name,
        fromDetails: storedProfile.details,
        logoDataUrl: storedProfile.logoDataUrl,
        paymentDetails: storedProfile.paymentDetails,
      }));
      setNotice("Loaded your business profile into From.");
    };
    const occupied = doc.fromName.trim() || doc.fromDetails.trim() || doc.paymentDetails.trim();
    if (!occupied) return apply();
    setConfirming({
      title: "Load your profile into From?",
      message: "It replaces the From block, the logo and the payment details now in the document.",
      confirmText: "Load it",
      run: apply,
    });
  };

  // ------------------------------------------------------------- exports
  const exportPdf = async () => {
    setBusy("pdf");
    setNotice(null);
    try {
      const { buildInvoicePdf } = await import("@/lib/capyinvoice/pdf");
      const blob = await buildInvoicePdf(doc, { paperSize: getPaperSize() });
      downloadBlob(blob, invoiceFileName(doc, "pdf"));
      setNotice(`PDF ready — ${formatBytes(blob.size)}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "PDF export failed.");
    } finally {
      setBusy(null);
    }
  };

  const exportJson = () => {
    try {
      downloadText(exportInvoiceJson(doc), invoiceBackupFileName(doc));
      setNotice("JSON backup ready.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "JSON export failed.");
    }
  };

  const importJson = async (file: File) => {
    try {
      if (file.size > MAX_BACKUP_BYTES) {
        setNotice(
          `That file is ${formatBytes(file.size)} — a backup is a few hundred KB at most. Nothing was replaced.`,
        );
        return;
      }
      const parsed = parseInvoiceBackup(await readFileAsText(file));
      if ("error" in parsed) {
        setNotice(parsed.error);
        return;
      }
      const imported = parsed.doc;
      const commit = () => {
        try {
          saveInvoice(imported);
          setNotice("Imported. Your document is back.");
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Could not save the import.");
        }
      };
      if (isInvoiceEmpty(doc)) return commit();
      setConfirming({
        title: "Replace the open document?",
        message: "The file replaces what is open in the editor now. Export a JSON backup first if you want to keep it.",
        confirmText: "Replace it",
        run: commit,
      });
    } catch {
      setNotice("That file could not be read.");
    }
  };

  const startOver = (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className="rounded-full border border-border bg-muted/30 px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground pointer-coarse:min-h-11"
        onClick={() => {
          const replace = () => edit(() => ({ ...DEMO_INVOICE, kind: doc.kind }));
          if (isInvoiceEmpty(doc)) replace();
          else
            setConfirming({
              title: "Load the example invoice?",
              message: "It replaces what is open in the editor now. Export a JSON backup first if you want to keep it.",
              confirmText: "Load example",
              run: replace,
            });
        }}
      >
        Load demo
      </button>
      <button
        type="button"
        className="rounded-full border border-border bg-muted/30 px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground pointer-coarse:min-h-11"
        onClick={() => {
          const clear = () => {
            clearInvoice();
            // A blank document keeps the kind and currency, and dates from today.
            saveInvoice({
              ...emptyInvoiceDoc(),
              kind: doc.kind,
              currency: doc.currency,
              issueDate: todayIso(),
            });
            setNotice("Cleared. The blank document is this browser's only copy.");
          };
          if (isInvoiceEmpty(doc)) clear();
          else
            setConfirming({
              title: "Delete this document?",
              message: "It is removed from this browser for good, and there is no copy anywhere else. Export a JSON backup first if you might want it back.",
              confirmText: "Delete it",
              run: clear,
            });
        }}
      >
        Clear
      </button>
    </div>
  );

  return (
    <div className="w-full">
      <p className="mb-5 rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Stored in this browser only.</strong>{" "}
        Your invoice — and your client&apos;s — never leaves this tab. There is no
        account and nothing to upload it to. Clearing your browser data deletes
        the draft, so use <em>JSON backup</em> to keep or move it.
      </p>

      {/* Mounted empty from the first paint, so status changes are announced. */}
      <p
        role="status"
        aria-live="polite"
        className={notice ? "mb-5 rounded-2xl border border-border bg-muted/60 p-3 text-sm" : "sr-only"}
      >
        {notice}
      </p>

      <div className="grid w-full gap-5 xl:grid-cols-2 xl:items-start">
        {/* ---------------------------------------------------- card 1 */}
        <StageCard index="01" title="The document" marks actions={startOver}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {KINDS.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={doc.kind === choice.value}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors pointer-coarse:min-h-11 ${
                    doc.kind === choice.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary hover:bg-muted/50"
                  }`}
                  onClick={() => setField("kind", choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">{labels.numberLabel}</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  name="doc-number"
                  aria-label={labels.numberLabel}
                  autoComplete="off"
                  placeholder="INV-2026-001"
                  value={doc.number}
                  onChange={(event) => setField("number", event.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Currency</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono"
                  name="doc-currency"
                  aria-label="Currency, three letters"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={3}
                  placeholder="USD"
                  list="capyinvoice-currencies"
                  value={doc.currency}
                  onChange={(event) => {
                    const raw = event.target.value.toUpperCase();
                    if (isCurrencyCode(raw)) setField("currency", raw);
                  }}
                />
                <datalist id="capyinvoice-currencies">
                  {CURRENCY_SUGGESTIONS.map((code) => (
                    <option key={code} value={code} />
                  ))}
                </datalist>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Issue date</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 tabular-nums"
                  name="doc-issued"
                  type="date"
                  aria-label="Issue date"
                  value={doc.issueDate}
                  onChange={(event) => setField("issueDate", event.target.value)}
                />
              </label>
              {doc.kind !== "receipt" ? (
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{labels.dueLabel}</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 tabular-nums"
                    name="doc-due"
                    type="date"
                    aria-label={labels.dueLabel}
                    value={doc.dueDate}
                    onChange={(event) => setField("dueDate", event.target.value)}
                  />
                </label>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="mb-1 block text-sm text-muted-foreground">Discount</span>
                <div className="flex gap-2">
                  <select
                    className="rounded-md border border-border bg-background px-2 py-2 text-sm"
                    name="discount-mode"
                    aria-label="Discount type"
                    value={doc.discountMode}
                    onChange={(event) =>
                      setField("discountMode", event.target.value === "fixed" ? "fixed" : "percent")
                    }
                  >
                    <option value="percent">%</option>
                    <option value="fixed">{doc.currency}</option>
                  </select>
                  {doc.discountMode === "percent" ? (
                    <NumericInput
                      name="discount-percent"
                      label="Discount percent"
                      value={doc.discountBp}
                      parse={parsePercentToBp}
                      format={(value) => (value === 0 ? "" : (value / 100).toString())}
                      placeholder="0"
                      onCommit={(value) => setField("discountBp", value)}
                    />
                  ) : (
                    <NumericInput
                      name="discount-fixed"
                      label="Discount amount"
                      value={doc.discountMinor}
                      parse={(raw) => parseMinorUnits(raw, digits)}
                      format={(value) => (value === 0 ? "" : formatMoney(value, doc.currency))}
                      placeholder={formatMoney(0, doc.currency)}
                      onCommit={(value) => setField("discountMinor", value)}
                    />
                  )}
                </div>
              </div>
              {doc.kind !== "quote" ? (
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Amount already paid</span>
                  <NumericInput
                    name="doc-paid"
                    label="Amount already paid"
                    value={doc.amountPaidMinor}
                    parse={(raw) => parseMinorUnits(raw, digits)}
                    format={(value) => (value === 0 ? "" : formatMoney(value, doc.currency))}
                    placeholder={formatMoney(0, doc.currency)}
                    onCommit={(value) => setField("amountPaidMinor", value)}
                  />
                </label>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              {doc.kind === "quote"
                ? "A quote is the same document with its own words: “Valid until” instead of a due date, and no payment rows."
                : "Type amounts with your usual decimal mark — the last separator counts. Amounts are held as integers, so nothing drifts."}
            </p>
          </div>
        </StageCard>

        {/* ---------------------------------------------------- card 2 */}
        <StageCard index="02" title="From · To">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-sm transition-colors hover:border-primary hover:bg-muted/50"
                onClick={saveProfile}
              >
                Save as my profile
              </button>
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-sm transition-colors hover:border-primary hover:bg-muted/50"
                onClick={loadProfile}
              >
                Load my profile
              </button>
              {profile.name ? (
                <span className="text-xs text-muted-foreground">Profile: {profile.name}</span>
              ) : null}
            </div>

            <div className="grid gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">From — your business</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  name="from-name"
                  aria-label="From name, your business"
                  autoComplete="organization"
                  placeholder="Meridian Design Studio"
                  value={doc.fromName}
                  onChange={(event) => setField("fromName", event.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="sr-only">From details, address and tax number</span>
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  name="from-details"
                  aria-label="From details, one line each"
                  rows={3}
                  placeholder={"48 Callow Lane\nBristol BS1 5QT\nVAT GB …"}
                  value={doc.fromDetails}
                  onChange={(event) => setField("fromDetails", event.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-sm transition-colors hover:border-primary hover:bg-muted/50"
                onClick={() => logoInputRef.current?.click()}
              >
                {doc.logoDataUrl ? "Replace logo" : "Add logo"}
              </button>
              {doc.logoDataUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={doc.logoDataUrl}
                    alt="Your logo, added to the document"
                    className="h-10 w-auto rounded border border-border bg-white p-0.5"
                  />
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-1 text-sm transition-colors hover:border-primary hover:bg-muted/50"
                    onClick={() => setField("logoDataUrl", "")}
                  >
                    Remove logo
                  </button>
                </>
              ) : null}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void pickLogo(file);
                  event.target.value = "";
                }}
              />
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">To — your client</span>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                name="to-name"
                aria-label="To name, your client"
                autoComplete="off"
                placeholder="Harbor & Lane Coffee Co."
                value={doc.toName}
                onChange={(event) => setField("toName", event.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="sr-only">To details, address lines</span>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                name="to-details"
                aria-label="To details, one line each"
                rows={2}
                placeholder={"12 Quay Street\nBristol BS1 4HT"}
                value={doc.toDetails}
                onChange={(event) => setField("toDetails", event.target.value)}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Payment details</span>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                name="doc-payment"
                aria-label="Payment details, one line each"
                rows={2}
                placeholder={"Sort code · Account\nReference: …"}
                value={doc.paymentDetails}
                onChange={(event) => setField("paymentDetails", event.target.value)}
              />
            </label>
          </div>
        </StageCard>

        {/* ---------------------------------------------------- card 3 */}
        <StageCard index="03" title="The items">
          <div className="space-y-3">
            {doc.lines.map((line, index) => (
              <LineRow
                key={line.id}
                line={line}
                index={index}
                digits={digits}
                currency={doc.currency}
                amountMinor={totals.lines[index]?.amountMinor ?? 0}
                onField={setLineField}
                onMove={moveLine}
                onRemove={removeLine}
              />
            ))}
            <button
              type="button"
              className="text-sm underline transition-colors hover:text-foreground pointer-coarse:min-h-11"
              onClick={addLine}
            >
              Add line
            </button>

            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Notes</span>
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  name="doc-notes"
                  aria-label="Notes"
                  rows={2}
                  placeholder="Working files are handed over on final payment."
                  value={doc.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Terms</span>
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  name="doc-terms"
                  aria-label="Terms"
                  rows={2}
                  placeholder="Payment due within 30 days."
                  value={doc.terms}
                  onChange={(event) => setField("terms", event.target.value)}
                />
              </label>
            </div>
          </div>
        </StageCard>

        {/* ---------------------------------------------------- card 4 */}
        <StageCard
          index="04"
          title="The totals"
          className="xl:sticky xl:top-24 xl:self-start"
        >
          <div className="space-y-4">
            <dl className="rounded-2xl bg-muted/30 p-4 text-sm">
              <div className="flex items-baseline justify-between py-1">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(totals.subtotalMinor, doc.currency)}</dd>
              </div>
              {totals.discountMinor > 0 ? (
                <div className="flex items-baseline justify-between py-1">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="tabular-nums">−{formatMoney(totals.discountMinor, doc.currency)}</dd>
                </div>
              ) : null}
              {totals.taxGroups.map((group) => (
                <div key={group.bp} className="flex items-baseline justify-between py-1">
                  <dt className="text-muted-foreground">
                    {group.bp === 0 ? "Tax (0%)" : `Tax at ${(group.bp / 100).toString()}%`}
                  </dt>
                  <dd className="tabular-nums">{formatMoney(group.taxMinor, doc.currency)}</dd>
                </div>
              ))}
              <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2 font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(totals.totalMinor, doc.currency)}</dd>
              </div>
              {doc.kind !== "quote" ? (
                <>
                  <div className="flex items-baseline justify-between py-1">
                    <dt className="text-muted-foreground">Amount paid</dt>
                    <dd className="tabular-nums">{formatMoney(totals.amountPaidMinor, doc.currency)}</dd>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between rounded-xl bg-primary/10 px-3 py-2 font-medium">
                    <dt>Balance due</dt>
                    <dd className="tabular-nums">{formatMoney(totals.balanceMinor, doc.currency)}</dd>
                  </div>
                </>
              ) : null}
            </dl>
            {totals.discountClamped ? (
              <p className="rounded-2xl border border-border p-3 text-xs text-muted-foreground">
                The discount was larger than the subtotal, so it was capped — the total never goes below the tax.
              </p>
            ) : null}

            {/* The same statement the PDF prints in its fine print. */}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Line amounts are quantity × unit price. Any discount is applied
              before tax and spread across the lines in proportion to their
              amounts. Tax is calculated on each line at the line&apos;s own rate
              and rounded half up to the smallest unit of {doc.currency}.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="min-w-[120px] rounded-full border border-border px-4 py-2 transition-colors hover:border-primary hover:bg-muted/50 pointer-coarse:min-h-11"
                onClick={() => {
                  void exportPdf();
                }}
                onMouseEnter={preloadPdfExporter}
                onFocus={preloadPdfExporter}
                disabled={busy !== null}
              >
                {busy === "pdf" ? "Making PDF…" : "Download PDF"}
              </button>
              <button
                type="button"
                className="min-w-[100px] rounded-full border border-border px-4 py-2 transition-colors hover:border-primary hover:bg-muted/50 pointer-coarse:min-h-11"
                onClick={exportJson}
              >
                JSON backup
              </button>
              <button
                type="button"
                className="min-w-[100px] rounded-full border border-border px-4 py-2 transition-colors hover:border-primary hover:bg-muted/50 pointer-coarse:min-h-11"
                onClick={() => fileInputRef.current?.click()}
              >
                Import JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importJson(file);
                  event.target.value = "";
                }}
              />
            </div>

            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none underline">Paper size</summary>
              <PaperPicker />
            </details>

            <p className="text-xs text-muted-foreground">
              Free, unlimited, unwatermarked: the document is yours, so the
              download always is too.
            </p>
          </div>
        </StageCard>
      </div>

      <ConfirmDialog
        isOpen={confirming !== null}
        title={confirming?.title ?? ""}
        message={confirming?.message ?? ""}
        confirmText={confirming?.confirmText}
        confirmVariant="destructive"
        onConfirm={() => {
          confirming?.run();
          setConfirming(null);
        }}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

/**
 * The paper-size control, subscribing to the prefs store on its own — the
 * value is only needed at export time, and subscribing at the top of the
 * editor would re-render every card to move one `<select>` (the CapyResume
 * lesson, which keeps its own PaperSizeSelect for the same reason).
 */
function PaperPicker() {
  const paper = usePaperSize();
  return (
    <select
      className="mt-2 rounded-full border border-border bg-background px-3 py-2 text-sm transition-colors hover:border-primary hover:bg-muted/50"
      name="paper"
      aria-label="Paper size"
      value={paper}
      onChange={(event) => setPaperSize(event.target.value === "LETTER" ? "LETTER" : "A4")}
    >
      <option value="A4">A4</option>
      <option value="LETTER">US Letter</option>
    </select>
  );
}
