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
  ADD_BTN,
  BTN,
  CHOICE_BTN,
  DANGER_BTN,
  FIELD,
  Field,
  GROUP,
  ICON_BTN,
  LABEL,
  PRIMARY_BTN,
  SECTION,
  SELECT_TRIGGER,
} from "@/components/ui/house";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
      className={className ?? cn(FIELD, "tabular-nums")}
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
    // A row reads like the printed line: what it is, then the numbers, its amount on the right.
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={GROUP}>{prefix}</span>
        <span className="ml-auto text-sm font-semibold tabular-nums">{formatMoney(amountMinor, currency)}</span>
        <button
          type="button"
          className={ICON_BTN}
          onClick={() => onMove(line.id, -1)}
          aria-label={`Move ${prefix.toLowerCase()} up`}
        >
          ↑
        </button>
        <button
          type="button"
          className={ICON_BTN}
          onClick={() => onMove(line.id, 1)}
          aria-label={`Move ${prefix.toLowerCase()} down`}
        >
          ↓
        </button>
        <button
          type="button"
          className={DANGER_BTN}
          onClick={() => onRemove(line.id)}
          aria-label={`Remove ${prefix.toLowerCase()}`}
        >
          Remove
        </button>
      </div>
      <Field label="Description" className="mt-2">
        <input
          className={FIELD}
          name={`${line.id}-description`}
          aria-label={`${prefix}, description`}
          placeholder="What was delivered"
          value={line.description}
          onChange={(event) => onField(line.id, "description", event.target.value)}
        />
      </Field>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Field label="Quantity">
          <NumericInput
            name={`${line.id}-qty`}
            label={`${prefix}, quantity`}
            value={line.qty}
            parse={parseQuantity}
            format={(value) => String(value)}
            placeholder="1"
            onCommit={(value) => onField(line.id, "qty", value)}
          />
        </Field>
        <Field label="Unit price">
          <NumericInput
            name={`${line.id}-unit`}
            label={`${prefix}, unit price`}
            value={line.unitPriceMinor}
            parse={(raw) => parseMinorUnits(raw, digits)}
            format={(value) => formatMoney(value, currency)}
            placeholder={formatMoney(0, currency)}
            onCommit={(value) => onField(line.id, "unitPriceMinor", value)}
          />
        </Field>
        <Field label="Tax rate %">
          <NumericInput
            name={`${line.id}-tax`}
            label={`${prefix}, tax rate percent`}
            value={line.taxBp}
            parse={parsePercentToBp}
            format={(value) => (value === 0 ? "" : (value / 100).toString())}
            placeholder="0"
            onCommit={(value) => onField(line.id, "taxBp", value)}
          />
        </Field>
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

  // A new line takes focus, so the click visibly lands somewhere (DESIGN.md "Controls and hierarchy").
  const addLine = () => {
    edit((d) => ({ ...d, lines: [...d.lines, emptyLine()] }));
    const added = getSnapshot().lines.at(-1);
    if (added)
      requestAnimationFrame(() =>
        document.querySelector<HTMLInputElement>(`[name="${CSS.escape(added.id)}-description"]`)?.focus(),
      );
  };

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
        className={BTN}
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
        className={DANGER_BTN}
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

      {/* The form on the left, the totals pinned beside it — the way CapyResume pins its page.
          Cards 1–3 stack in one column so a tall card never leaves a hole beside a short one. */}
      <div className="grid w-full gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
        <div className="min-w-0 space-y-5">
        {/* ---------------------------------------------------- card 1 */}
        <StageCard index="01" title="The document" marks actions={startOver}>
          <div className="space-y-6">
            <div role="group" aria-label="Document type" className="flex flex-wrap gap-2">
              {KINDS.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={doc.kind === choice.value}
                  className={CHOICE_BTN(doc.kind === choice.value)}
                  onClick={() => setField("kind", choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={labels.numberLabel}>
                <input
                  className={FIELD}
                  name="doc-number"
                  aria-label={labels.numberLabel}
                  autoComplete="off"
                  placeholder="INV-2026-001"
                  value={doc.number}
                  onChange={(event) => setField("number", event.target.value)}
                />
              </Field>
              <Field label="Currency">
                <input
                  className={cn(FIELD, "font-mono")}
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
              </Field>
              <Field label="Issue date">
                <input
                  className={cn(FIELD, "tabular-nums")}
                  name="doc-issued"
                  type="date"
                  aria-label="Issue date"
                  value={doc.issueDate}
                  onChange={(event) => setField("issueDate", event.target.value)}
                />
              </Field>
              {doc.kind !== "receipt" ? (
                <Field label={labels.dueLabel}>
                  <input
                    className={cn(FIELD, "tabular-nums")}
                    name="doc-due"
                    type="date"
                    aria-label={labels.dueLabel}
                    value={doc.dueDate}
                    onChange={(event) => setField("dueDate", event.target.value)}
                  />
                </Field>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-border pt-5">
              <p className={GROUP}>Adjustments</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className={LABEL}>
                    Discount
                  </span>
                  <div className="flex gap-2">
                    <Select
                      value={doc.discountMode}
                      onValueChange={(value) => setField("discountMode", value === "fixed" ? "fixed" : "percent")}
                    >
                      <SelectTrigger className="w-20 shrink-0 rounded-xl bg-background" aria-label="Discount type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="fixed">{doc.currency || "Amount"}</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Field label="Amount already paid">
                    <NumericInput
                      name="doc-paid"
                      label="Amount already paid"
                      value={doc.amountPaidMinor}
                      parse={(raw) => parseMinorUnits(raw, digits)}
                      format={(value) => (value === 0 ? "" : formatMoney(value, doc.currency))}
                      placeholder={formatMoney(0, doc.currency)}
                      onCommit={(value) => setField("amountPaidMinor", value)}
                    />
                  </Field>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {doc.kind === "quote"
                  ? "A quote is the same document with its own words: “Valid until” instead of a due date, and no payment rows."
                  : "Type amounts with your usual decimal mark — the last separator counts. Amounts are held as integers, so nothing drifts."}
              </p>
            </div>
          </div>
        </StageCard>

        {/* ---------------------------------------------------- card 2 */}
        <StageCard index="02" title="From · To">
          <div className="space-y-6">
            <section aria-label="From" className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={SECTION}>From</h3>
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  <button type="button" className={BTN} onClick={saveProfile}>
                    Save as my profile
                  </button>
                  <button type="button" className={BTN} onClick={loadProfile}>
                    Load my profile
                  </button>
                </div>
              </div>
              {profile.name ? <p className="text-xs text-muted-foreground">Saved profile: {profile.name}</p> : null}
              <Field label="Business name">
                <input
                  className={FIELD}
                  name="from-name"
                  aria-label="From, business name"
                  autoComplete="organization"
                  placeholder="Meridian Design Studio"
                  value={doc.fromName}
                  onChange={(event) => setField("fromName", event.target.value)}
                />
              </Field>
              <Field label="Address and tax number">
                <textarea
                  className={FIELD}
                  name="from-details"
                  aria-label="From, address and tax number, one line each"
                  rows={3}
                  placeholder={"48 Callow Lane\nBristol BS1 5QT\nVAT GB …"}
                  value={doc.fromDetails}
                  onChange={(event) => setField("fromDetails", event.target.value)}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className={BTN} onClick={() => logoInputRef.current?.click()}>
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
                    <button type="button" className={DANGER_BTN} onClick={() => setField("logoDataUrl", "")}>
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
            </section>

            <section aria-label="To" className="space-y-3 border-t border-border pt-5">
              <h3 className={SECTION}>To</h3>
              <Field label="Client name">
                <input
                  className={FIELD}
                  name="to-name"
                  aria-label="To, client name"
                  autoComplete="off"
                  placeholder="Harbor & Lane Coffee Co."
                  value={doc.toName}
                  onChange={(event) => setField("toName", event.target.value)}
                />
              </Field>
              <Field label="Address">
                <textarea
                  className={FIELD}
                  name="to-details"
                  aria-label="To, address, one line each"
                  rows={2}
                  placeholder={"12 Quay Street\nBristol BS1 4HT"}
                  value={doc.toDetails}
                  onChange={(event) => setField("toDetails", event.target.value)}
                />
              </Field>
            </section>

            <section aria-label="Payment" className="space-y-3 border-t border-border pt-5">
              <h3 className={SECTION}>Payment</h3>
              <Field label="Bank details and reference">
                <textarea
                  className={FIELD}
                  name="doc-payment"
                  aria-label="Payment, bank details and reference, one line each"
                  rows={2}
                  placeholder={"Sort code · Account\nReference: …"}
                  value={doc.paymentDetails}
                  onChange={(event) => setField("paymentDetails", event.target.value)}
                />
              </Field>
            </section>
          </div>
        </StageCard>

        {/* ---------------------------------------------------- card 3 */}
        <StageCard index="03" title="The items">
          <div className="space-y-5">
            <div className="divide-y divide-border">
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
            </div>
            <button type="button" className={ADD_BTN} onClick={addLine}>
              <span aria-hidden>+</span> Add line
            </button>

            <div className="space-y-3 border-t border-border pt-5">
              <p className={GROUP}>Notes and terms</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Notes">
                  <textarea
                    className={FIELD}
                    name="doc-notes"
                    aria-label="Notes"
                    rows={2}
                    placeholder="Working files are handed over on final payment."
                    value={doc.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                  />
                </Field>
                <Field label="Terms">
                  <textarea
                    className={FIELD}
                    name="doc-terms"
                    aria-label="Terms"
                    rows={2}
                    placeholder="Payment due within 30 days."
                    value={doc.terms}
                    onChange={(event) => setField("terms", event.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>
        </StageCard>

        </div>

        {/* ---------------------------------------------------- card 4 */}
        <StageCard
          index="04"
          title="The totals"
          className="xl:sticky xl:top-24 xl:self-start"
        >
          <div className="space-y-5">
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
              <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(totals.totalMinor, doc.currency)}</dd>
              </div>
              {doc.kind !== "quote" ? (
                <>
                  <div className="flex items-baseline justify-between py-1">
                    <dt className="text-muted-foreground">Amount paid</dt>
                    <dd className="tabular-nums">{formatMoney(totals.amountPaidMinor, doc.currency)}</dd>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between rounded-xl bg-primary/15 px-3 py-3">
                    <dt className="font-medium">Balance due</dt>
                    <dd className="font-display text-2xl tabular-nums">{formatMoney(totals.balanceMinor, doc.currency)}</dd>
                  </div>
                </>
              ) : null}
            </dl>
            {totals.discountClamped ? (
              <p className="rounded-2xl border border-border p-3 text-xs text-muted-foreground">
                The discount was larger than the subtotal, so it was capped — the total never goes below the tax.
              </p>
            ) : null}

            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-5">
              <button
                type="button"
                className={cn(PRIMARY_BTN, "min-w-[140px]")}
                onClick={() => {
                  void exportPdf();
                }}
                onMouseEnter={preloadPdfExporter}
                onFocus={preloadPdfExporter}
                disabled={busy !== null}
              >
                {busy === "pdf" ? "Making PDF…" : "Download PDF"}
              </button>
              <PaperPicker />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={BTN} onClick={exportJson}>
                JSON backup
              </button>
              <button type="button" className={BTN} onClick={() => fileInputRef.current?.click()}>
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

            {/* The same statement the PDF prints in its fine print. */}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Line amounts are quantity × unit price. Any discount is applied
              before tax and spread across the lines in proportion to their
              amounts. Tax is calculated on each line at the line&apos;s own rate
              and rounded half up to the smallest unit of {doc.currency}.
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
 * editor would re-render every card to move one control (the CapyResume
 * lesson, which keeps its own PaperSizeSelect for the same reason).
 */
function PaperPicker() {
  const paper = usePaperSize();
  return (
    <div>
      <span id="capyinvoice-paper-label" className={LABEL}>
        Paper
      </span>
      <Select value={paper} onValueChange={(value) => setPaperSize(value === "LETTER" ? "LETTER" : "A4")}>
        <SelectTrigger className={SELECT_TRIGGER} aria-labelledby="capyinvoice-paper-label">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="A4">A4</SelectItem>
          <SelectItem value="LETTER">US Letter</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
