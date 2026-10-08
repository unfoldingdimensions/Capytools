"use client";

/**
 * CapyResume — the tool.
 *
 * Everything happens in this tab: the résumé is read from and written to
 * `localStorage`, and the PDF/DOCX/JSON are produced locally. There is no
 * server call anywhere in this file.
 *
 * Styling follows the suite language (DESIGN.md): three StageCards, house pills.
 *
 * The AI assist (src/components/capyresume/AiAssist.tsx) is deliberately not
 * rendered: it is a planned paid feature, kept in the tree and documented in
 * docs/plans/capyresume.md, and tests/capyresume-boundaries.test.ts fails if
 * anything imports it.
 */

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { StageCard } from "@/components/stage-card";
import {
  getSnapshot,
  saveResume,
  clearResume,
  hasStoredResume,
  useResumeWithServerSnapshot,
} from "@/lib/capyresume/store";
import { DEMO_RESUME } from "@/lib/capyresume/demo";
import { lintResume } from "@/lib/capyresume/hints";
import { isEntryEmpty, isResumeEmpty } from "@/lib/capyresume/schema";
import dynamic from "next/dynamic";
import {
  addBullet as addBulletTo,
  addEntry as addEntryTo,
  addLink as addLinkTo,
  addSection as addSectionTo,
  moveEntry as moveEntryIn,
  moveSection as moveSectionIn,
  removeBullet as removeBulletFrom,
  removeEntry as removeEntryFrom,
  removeLink as removeLinkFrom,
  removeSection as removeSectionFrom,
  setBullet as setBulletText,
  setContactField,
  setEntryField as setEntryFieldOn,
  setLink as setLinkOn,
  setSectionTitle as setSectionTitleOn,
  setTags as setTagsOn,
} from "@/lib/capyresume/edits";
import {
  TEMPLATE_LIST,
  getTemplate,
  isPackUnlocked,
} from "@/lib/capyresume/templates";
import { composeHeader, composeSections } from "@/lib/capyresume/document";
import {
  BlockView,
  previewPaperStyle,
} from "@/components/capyresume/BlockView";
import {
  exportResumeJson,
  MAX_BACKUP_BYTES,
  parseResumeBackup,
  resumeBackupFileName,
  resumeFileName,
} from "@/lib/capyresume/json";
import {
  getPaperSize,
  setPaperSize,
  usePaperSize,
} from "@/lib/capyresume/prefs";
import {
  downloadBlob,
  downloadText,
  readFileAsText,
} from "@/lib/capyresume/download";
import { formatBytes, formatDateRange } from "@/lib/capyresume/format";
import type {
  Bullet,
  Entry,
  ResumeDoc,
  ResumeLink,
  SectionType,
  TemplateId,
} from "@/lib/capyresume/types";
import type { ContactField } from "@/lib/capyresume/edits";

/**
 * Warm the exporter a user is about to ask for.
 *
 * The heavy modules are already split out of first load - `@react-pdf/renderer` is
 * 433 KB gzip and `docx` 90 KB - but nothing asked for them until the click, so a
 * first export stalled on the whole fetch plus parse. The import itself is what
 * preloads, so these are fire-and-forget and safe to call repeatedly: the module
 * registry keeps the result. Pointing at the button is the signal; a user who never
 * exports never pays.
 */
const preloadPdfExporter = () => void import("@/lib/capyresume/pdf");
const preloadDocxExporter = () => void import("@/lib/capyresume/docx");

/**
 * The confirmation dialog is only reachable from an action that needs confirming, so
 * Radix Dialog — with react-remove-scroll and its focus machinery — does not belong in
 * first load. `ssr: false` because it renders null until a confirmation is pending, so
 * there is nothing to server-render and no cost to deferring it.
 */
const ConfirmDialog = dynamic(
  () =>
    import("@/components/capyresume/ConfirmDialog").then(
      (m) => m.ConfirmDialog,
    ),
  { ssr: false },
);

/**
 * The paper-size control, subscribing to the prefs store on its own.
 *
 * It is separate because the value is needed in exactly two places: here, and inside
 * the export handlers, which can read it at click time. Subscribing at the top of the
 * editor instead made a paper change re-render every control in the form plus the
 * preview, all to move one control.
 */
function PaperSizeSelect() {
  const paperSize = usePaperSize();
  return (
    <Select
      value={paperSize}
      onValueChange={(value) => setPaperSize(value === "LETTER" ? "LETTER" : "A4")}
    >
      <SelectTrigger
        className={SELECT_TRIGGER}
        aria-labelledby="capyresume-paper-label"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="A4">A4</SelectItem>
        <SelectItem value="LETTER">US Letter</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** The suite's own dropdown (as CapyQR and CapyOG use), not the OS list. */
const SELECT_TRIGGER =
  "min-w-36 rounded-full bg-background transition-colors hover:border-primary";

const SECTION_CHOICES: { type: SectionType; label: string }[] = [
  { type: "summary", label: "Summary" },
  { type: "experience", label: "Experience" },
  { type: "education", label: "Education" },
  { type: "skills", label: "Skills" },
  { type: "projects", label: "Projects" },
  { type: "certifications", label: "Certifications" },
  { type: "custom", label: "Custom section" },
];

/*
 * The builder's controls come in three weights, and every one fills on hover so it
 * reads as pressable: neutral (sage fill), additive (sage-tinted at rest), and
 * destructive (fills red). Before, every control was the same grey pill and the
 * same grey well, so nothing told the eye what was content and what was chrome.
 */
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background";
const BTN = `inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[13px] transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground pointer-coarse:min-h-11 ${FOCUS}`;
const ICON_BTN = `inline-grid size-8 shrink-0 place-items-center rounded-full border border-border text-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground pointer-coarse:size-11 ${FOCUS}`;
const DANGER_BTN = `inline-flex items-center rounded-full border border-border px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:border-destructive hover:bg-destructive hover:text-background pointer-coarse:min-h-11 ${FOCUS}`;
const ADD_BTN = `inline-flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary/10 px-3.5 py-1.5 text-[13px] transition-colors hover:bg-primary hover:text-primary-foreground pointer-coarse:min-h-11 ${FOCUS}`;
const FIELD =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/70 hover:border-primary/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50";
const LABEL =
  "mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground";
/** A just-added row glows briefly, so the click visibly landed somewhere. */
const FRESH = "bg-primary/15";
/** A group heading inside an open entry: a step above the field labels. */
const GROUP = "text-[13px] font-semibold text-foreground";

type EntryPart = "organisation" | "location" | "dates" | "text" | "tags" | "bullets";

/**
 * What each section type asks for, in its own words. A skills group has no employer
 * and a certificate no achievements, so showing every field on every entry was most
 * of the noise. A field outside its shape still appears once it holds something.
 */
const ENTRY_SHAPES: Record<
  SectionType,
  {
    parts: EntryPart[];
    basics: string;
    title: string;
    organisation: string;
    current: string;
    prose: string;
    text: string;
    tags: string;
  }
> = {
  summary: { parts: ["text"], basics: "Heading", title: "Heading (optional)", organisation: "Organisation", current: "Current", prose: "Your summary", text: "Summary", tags: "Skills" },
  experience: { parts: ["organisation", "location", "dates", "text", "tags", "bullets"], basics: "The role", title: "Role", organisation: "Company", current: "I still work here", prose: "In your words", text: "Description", tags: "Skills used" },
  education: { parts: ["organisation", "location", "dates", "text", "bullets"], basics: "The qualification", title: "Qualification", organisation: "Institution", current: "Still studying", prose: "In your words", text: "Description", tags: "Skills" },
  skills: { parts: ["tags"], basics: "The group", title: "Group name (optional)", organisation: "Organisation", current: "Current", prose: "The skills", text: "Description", tags: "Skills" },
  projects: { parts: ["organisation", "dates", "text", "tags", "bullets"], basics: "The project", title: "Project", organisation: "For / with", current: "Ongoing", prose: "In your words", text: "Description", tags: "Tools" },
  certifications: { parts: ["organisation", "dates"], basics: "The certificate", title: "Certificate", organisation: "Issuer", current: "Ongoing", prose: "Details", text: "Description", tags: "Skills" },
  custom: { parts: ["organisation", "location", "dates", "text", "tags", "bullets"], basics: "The entry", title: "Title", organisation: "Organisation", current: "Current", prose: "In your words", text: "Description", tags: "Skills" },
};

/** A visible label above its control — placeholders vanish once you type. */
function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}

/**
 * The helpers below exist so the memoized rows can be handed stable functions only.
 * That is what makes `memo` work at all: `EntryRow` receives its handlers as props
 * rather than closing over them, so a row can only re-render when its own `entry`
 * object changes — which `edits.ts` guarantees is only the row that was edited.
 */
type FieldEdit = (
  sectionId: string,
  entryId: string,
  field: keyof Entry,
  value: string | boolean,
) => void;

type TextEdit = (sectionId: string, entryId: string, text: string) => void;

/** Bullet text, which is its own edit — an Entry's `text` field is different prose. */
type BulletTextEdit = (
  sectionId: string,
  entryId: string,
  bulletId: string,
  text: string,
) => void;

/**
 * One achievement. Split out from the entry so typing in a bullet re-renders that
 * bullet rather than the whole entry.
 */
const BulletRow = memo(function BulletRow({
  sectionTitle,
  entryIndex,
  bullet,
  bulletIndex,
  entryId,
  sectionId,
  fresh,
  onBulletText,
  onRemove,
}: {
  sectionTitle: string;
  entryIndex: number;
  bullet: Bullet;
  bulletIndex: number;
  entryId: string;
  sectionId: string;
  fresh: boolean;
  onBulletText: BulletTextEdit;
  onRemove: (sectionId: string, entryId: string, bulletId: string) => void;
}) {
  const label = `${sectionTitle}, entry ${entryIndex + 1}, achievement ${bulletIndex + 1}`;
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-xl transition-colors duration-700",
        fresh && FRESH,
      )}
    >
      <span aria-hidden className="w-3 text-center text-muted-foreground">
        •
      </span>
      <input
        className={FIELD}
        name={`${bullet.id}-text`}
        aria-label={label}
        placeholder="what you did, with a number if there is one"
        value={bullet.text}
        onChange={(event) =>
          onBulletText(sectionId, entryId, bullet.id, event.target.value)
        }
      />
      <button
        type="button"
        className={cn(ICON_BTN, "hover:border-destructive hover:bg-destructive hover:text-background")}
        onClick={() => onRemove(sectionId, entryId, bullet.id)}
        aria-label={`remove ${label}`}
      >
        ×
      </button>
    </div>
  );
});

/**
 * The skills field. The document stores parsed tags, so a controlled value of
 * `tags.join(', ')` would erase a trailing comma or space the moment it is typed
 * (it parses to the same tags) — no second tag, no "Data analysis". While focused
 * the input shows the raw draft; every keystroke still saves the parsed tags.
 */
export function TagsInput({
  name,
  label,
  tags,
  onTags,
}: {
  name: string;
  label: string;
  tags: string[];
  onTags: (raw: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className={FIELD}
      name={name}
      aria-label={label}
      autoComplete="off"
      placeholder="comma separated"
      value={draft ?? tags.join(", ")}
      onFocus={() => setDraft(tags.join(", "))}
      onChange={(event) => {
        setDraft(event.target.value);
        onTags(event.target.value);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

/**
 * One entry — a job, degree, project or certification — as an accordion row.
 *
 * Collapsed, it is one line: what it is, where, when. Only the open entry shows its
 * fields, so the form reads as an outline of the résumé rather than a wall of inputs.
 *
 * Takes `sectionTitle` and `sectionType` as primitives rather than the whole section:
 * passing the section would mean every entry in it re-renders whenever any one of them
 * is edited, since the parent replaces the section object on a child edit. `open` and
 * `freshId` only change for the row they concern, so the memo still holds.
 */
const EntryRow = memo(function EntryRow({
  sectionId,
  sectionTitle,
  sectionType,
  entry,
  entryIndex,
  open,
  freshId,
  onToggle,
  onField,
  onTags,
  onBulletText,
  onAddBullet,
  onRemoveBullet,
  onMove,
  onRemove,
}: {
  sectionId: string;
  sectionTitle: string;
  sectionType: SectionType;
  entry: Entry;
  entryIndex: number;
  open: boolean;
  /** This entry's id or one of its bullets' while it is freshly added, else null. */
  freshId: string | null;
  onToggle: (entryId: string) => void;
  onField: FieldEdit;
  onTags: TextEdit;
  onBulletText: BulletTextEdit;
  onAddBullet: (sectionId: string, entryId: string) => void;
  onRemoveBullet: (sectionId: string, entryId: string, bulletId: string) => void;
  onMove: (sectionId: string, entryId: string, delta: number) => void;
  onRemove: (sectionId: string, entryId: string) => void;
}) {
  const prefix = `${sectionTitle}, entry ${entryIndex + 1}`;
  const shape = ENTRY_SHAPES[sectionType];
  // A field the section type does not use still shows once it holds something,
  // so switching shapes can never hide text the résumé prints.
  const has = (key: EntryPart, value: unknown) =>
    shape.parts.includes(key) ||
    (Array.isArray(value) ? value.length > 0 : Boolean(value));
  const show = {
    organisation: has("organisation", entry.organisation?.trim()),
    location: has("location", entry.location?.trim()),
    dates: has("dates", entry.startDate || entry.endDate || entry.current),
    text: has("text", entry.text?.trim()),
    tags: has("tags", entry.tags),
    bullets: has("bullets", entry.bullets),
  };
  const range = formatDateRange(entry.startDate, entry.endDate, entry.current);
  const heading =
    entry.title?.trim() ||
    entry.text?.trim() ||
    entry.tags.join(", ") ||
    "New entry";
  const detail = [entry.organisation?.trim(), range].filter(Boolean).join(" · ");
  const panelId = `${entry.id}-panel`;

  return (
    <div
      className={cn(
        "rounded-2xl border border-transparent transition-colors duration-700",
        open && "border-border bg-muted/30",
        freshId === entry.id && FRESH,
      )}
    >
      <div className="flex items-center gap-2 py-1 pl-1 pr-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onToggle(entry.id)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/70",
            FOCUS,
          )}
        >
          <span
            aria-hidden
            className={cn(
              "text-muted-foreground transition-transform duration-200",
              open && "rotate-90 text-primary",
            )}
          >
            ›
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                "block truncate text-[15px] text-foreground",
                open ? "font-semibold" : "font-medium",
              )}
            >
              {heading}
            </span>
            {detail ? (
              <span className="block truncate text-xs text-muted-foreground">
                {detail}
              </span>
            ) : null}
          </span>
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={ICON_BTN}
            onClick={() => onMove(sectionId, entry.id, -1)}
            aria-label={`move ${prefix} up`}
          >
            ↑
          </button>
          <button
            type="button"
            className={ICON_BTN}
            onClick={() => onMove(sectionId, entry.id, 1)}
            aria-label={`move ${prefix} down`}
          >
            ↓
          </button>
          <button
            type="button"
            className={DANGER_BTN}
            onClick={() => onRemove(sectionId, entry.id)}
            aria-label={`remove ${prefix}`}
          >
            remove
          </button>
        </div>
      </div>

      {open ? (
        // The open panel hangs off its header on a sage rule, and splits into the
        // same groups the printed entry has: what and where, the prose, the wins.
        <div
          id={panelId}
          className="mx-3 mb-4 mt-1 space-y-5 border-l-2 border-primary/50 pl-4"
        >
          <div role="group" aria-label={shape.basics} className="space-y-3">
            <p className={GROUP}>{shape.basics}</p>
            <Field label={shape.title}>
              <input
                className={cn(FIELD, "text-base font-medium")}
                name={`${entry.id}-title`}
                aria-label={`${prefix}, ${shape.title.toLowerCase()}`}
                value={entry.title ?? ""}
                onChange={(event) =>
                  onField(sectionId, entry.id, "title", event.target.value)
                }
              />
            </Field>
            {show.organisation || show.location ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {show.organisation ? (
                  <Field label={shape.organisation}>
                    <input
                      className={FIELD}
                      name={`${entry.id}-organisation`}
                      aria-label={`${prefix}, ${shape.organisation.toLowerCase()}`}
                      value={entry.organisation ?? ""}
                      onChange={(event) =>
                        onField(
                          sectionId,
                          entry.id,
                          "organisation",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                ) : null}
                {show.location ? (
                  <Field label="Location">
                    <input
                      className={FIELD}
                      name={`${entry.id}-location`}
                      aria-label={`${prefix}, location`}
                      autoComplete="off"
                      value={entry.location ?? ""}
                      onChange={(event) =>
                        onField(sectionId, entry.id, "location", event.target.value)
                      }
                    />
                  </Field>
                ) : null}
              </div>
            ) : null}
            {show.dates ? (
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Start" className="w-32">
                  <input
                    className={cn(FIELD, "tabular-nums")}
                    name={`${entry.id}-start`}
                    aria-label={`${prefix}, start date, YYYY-MM`}
                    inputMode="text"
                    autoComplete="off"
                    placeholder="YYYY-MM"
                    value={entry.startDate ?? ""}
                    onChange={(event) =>
                      onField(sectionId, entry.id, "startDate", event.target.value)
                    }
                  />
                </Field>
                <Field label="End" className="w-32">
                  <input
                    className={cn(FIELD, "tabular-nums")}
                    name={`${entry.id}-end`}
                    aria-label={`${prefix}, end date, YYYY-MM`}
                    inputMode="text"
                    autoComplete="off"
                    placeholder={entry.current ? "present" : "YYYY-MM"}
                    value={entry.endDate ?? ""}
                    disabled={entry.current === true}
                    onChange={(event) =>
                      onField(sectionId, entry.id, "endDate", event.target.value)
                    }
                  />
                </Field>
                <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    name={`${entry.id}-current`}
                    checked={entry.current === true}
                    onChange={(event) =>
                      onField(sectionId, entry.id, "current", event.target.checked)
                    }
                  />
                  {shape.current}
                </label>
              </div>
            ) : null}
          </div>

          {show.text || show.tags ? (
            <div role="group" aria-label={shape.prose} className="space-y-3 border-t border-border/70 pt-4">
              <p className={GROUP}>{shape.prose}</p>
              {show.text ? (
                <Field label={shape.text}>
                  <textarea
                    className={cn(FIELD, "min-h-20 resize-y")}
                    name={`${entry.id}-text`}
                    aria-label={`${prefix}, ${shape.text.toLowerCase()}`}
                    rows={3}
                    value={entry.text ?? ""}
                    onChange={(event) =>
                      onField(sectionId, entry.id, "text", event.target.value)
                    }
                  />
                </Field>
              ) : null}
              {show.tags ? (
                <Field label={shape.tags}>
                  <TagsInput
                    name={`${entry.id}-tags`}
                    label={`${prefix}, ${shape.tags.toLowerCase()}, comma separated`}
                    tags={entry.tags}
                    onTags={(raw) => onTags(sectionId, entry.id, raw)}
                  />
                </Field>
              ) : null}
            </div>
          ) : null}

          {show.bullets ? (
            <div role="group" aria-label="Achievements" className="border-t border-border/70 pt-4">
              <p className={GROUP}>Achievements</p>
              <div className="space-y-2">
                {entry.bullets.map((bullet, bulletIndex) => (
                  <BulletRow
                    key={bullet.id}
                    sectionId={sectionId}
                    sectionTitle={sectionTitle}
                    entryId={entry.id}
                    entryIndex={entryIndex}
                    bullet={bullet}
                    bulletIndex={bulletIndex}
                    fresh={freshId === bullet.id}
                    onBulletText={onBulletText}
                    onRemove={onRemoveBullet}
                  />
                ))}
              </div>
              <button
                type="button"
                className={cn(ADD_BTN, "mt-3")}
                onClick={() => onAddBullet(sectionId, entry.id)}
              >
                <span aria-hidden>+</span> add achievement
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

/** Move focus to a control the next frame, once React has rendered it. */
function focusByName(name: string) {
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`)
      ?.focus(),
  );
}

/** How long a removal can be taken back. */
const UNDO_MS = 10_000;

/** The preview's pointer at the entry being edited: a sage wash, fixed ink on paper. */
const PREVIEW_ACTIVE: CSSProperties = {
  backgroundColor: "rgba(142, 155, 126, 0.18)",
  boxShadow: "0 0 0 4pt rgba(142, 155, 126, 0.18)",
  borderRadius: "1pt",
  transition: "background-color 300ms, box-shadow 300ms",
};
const PREVIEW_IDLE: CSSProperties = {
  transition: "background-color 300ms, box-shadow 300ms",
};

export function CapyResume() {
  // The demo is the server snapshot, so the first paint has real content and
  // hydration matches; React then swaps in whatever is actually stored.
  const stored = useResumeWithServerSnapshot(DEMO_RESUME);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** The destructive action awaiting confirmation; null when nothing is pending. */
  const [confirming, setConfirming] = useState<{
    title: string;
    message: string;
    confirmText: string;
    run: () => void;
  } | null>(null);
  /** The one expanded entry: the form is an accordion, one row open at a time. */
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  /** The section whose heading is being renamed in place. */
  const [renaming, setRenaming] = useState<string | null>(null);
  /** The entry or bullet just added, glowing for a moment. */
  const [fresh, setFresh] = useState<string | null>(null);
  /** When the last edit reached storage; null until this visit saves something. */
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  /** The document as it was before the last removal, while it can be restored. */
  const [undo, setUndo] = useState<{ message: string; before: ResumeDoc } | null>(
    null,
  );
  const seeded = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paperScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (!hasStoredResume()) {
      // First visit: seed from the demo so the tool teaches instead of opening blank.
      try {
        saveResume(DEMO_RESUME);
      } catch {
        // Storage unavailable (private mode). The editor still works in-memory
        // and every save surfaces its own error.
      }
    }
  }, []);

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [undo]);

  const doc = stored;
  const spec = useMemo(() => getTemplate(doc.templateId), [doc.templateId]);
  const header = useMemo(() => composeHeader(doc), [doc]);
  const sections = useMemo(() => composeSections(doc, spec), [doc, spec]);
  const hints = useMemo(() => lintResume(doc), [doc]);

  // Keep the open entry in view inside the pinned preview. Only when the preview is
  // its own scroller (side by side, `xl:`): stacked, scrolling it would drag the
  // whole page away from the field being typed in.
  useEffect(() => {
    const scroller = paperScrollRef.current;
    if (!openEntry || !scroller) return;
    if (getComputedStyle(scroller).overflowY !== "auto") return;
    const target = scroller.querySelector<HTMLElement>(
      `[data-entry="${CSS.escape(openEntry)}"]`,
    );
    if (!target) return;
    const box = scroller.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    if (rect.top >= box.top && rect.bottom <= box.bottom) return;
    scroller.scrollTo({
      top: scroller.scrollTop + rect.top - box.top - 24,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [openEntry]);

  /**
   * Apply a change and persist it. Storage failures are surfaced, never swallowed.
   *
   * An edit that changed nothing never reaches storage. `edits.ts` goes to trouble to
   * return the *same* document reference for a no-op — a move off the end of a list, a
   * removal that matches nothing, a text field set to the value it already holds — and
   * `replaceTargetText` keeps the same contract. That guarantee was being thrown away
   * here: `saveResume` restamps `updatedAt` and notifies unconditionally, so an
   * untouched document was still re-serialised in full, written to localStorage, and
   * every subscriber re-rendered.
   *
   * Identity is the whole test. Comparing bodies instead would mean serialising the
   * document twice on every genuine keystroke to catch a case the modules already
   * handle by returning the reference, which is strictly cheaper and cannot drift.
   *
   * Any edit also retires a pending undo: restoring the pre-removal document after
   * further typing would silently throw that typing away.
   */
  const edit = useCallback((mutate: (draft: ResumeDoc) => ResumeDoc) => {
    // Read the document at call time rather than closing over it. That keeps `edit`
    // stable for the app's lifetime, which is what lets the memoized rows below take
    // it as a prop without a new function identity defeating them every render — while
    // still editing the current document. `getSnapshot` is cached on the stored bytes,
    // so this is not a storage read per keystroke.
    const current = getSnapshot();
    const next = mutate(current);
    if (next === current) return;
    try {
      saveResume(next);
      setNotice(null);
      setUndo(null);
      setSavedAt(new Date());
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not save to this browser.",
      );
    }
  }, []);

  /** Remove something and offer it back for a few seconds. */
  const removeWithUndo = useCallback(
    (message: string, mutate: (draft: ResumeDoc) => ResumeDoc) => {
      const before = getSnapshot();
      edit(mutate);
      if (getSnapshot() !== before) setUndo({ message, before });
    },
    [edit],
  );

  const restoreRemoved = () => {
    if (!undo) return;
    try {
      saveResume(undo.before);
      setSavedAt(new Date());
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not save to this browser.",
      );
    }
    setUndo(null);
  };

  /** Glow a just-added row for a moment. */
  const flash = useCallback((id: string) => {
    setFresh(id);
    window.setTimeout(
      () => setFresh((current) => (current === id ? null : current)),
      1400,
    );
  }, []);

  const toggleEntry = useCallback(
    (entryId: string) =>
      setOpenEntry((current) => (current === entryId ? null : entryId)),
    [],
  );

  /**
   * The two per-edit helpers the rows receive, both stable.
   *
   * `EntryRow` and `BulletRow` are memoized, so their props have to keep their identity
   * across a render that only changed a sibling. Handing them the already-bound
   * helpers below would give them a new function every render and the memo would never
   * hit; these take the ids as arguments instead and pass them straight through.
   */
  const editEntryField = useCallback<FieldEdit>(
    (sectionId, entryId, field, value) =>
      edit((d) =>
        setEntryFieldOn(d, sectionId, entryId, field, value as never),
      ),
    [edit],
  );

  /** The tags input is a comma-separated string, not a field assignment. */
  const editEntryTags = useCallback<TextEdit>(
    (sectionId, entryId, raw) =>
      edit((d) => setTagsOn(d, sectionId, entryId, raw)),
    [edit],
  );

  const handleAddBullet = useCallback(
    (sectionId: string, entryId: string) => {
      edit((d) => addBulletTo(d, sectionId, entryId));
      const bullet = getSnapshot()
        .sections.find((section) => section.id === sectionId)
        ?.entries.find((entry) => entry.id === entryId)
        ?.bullets.at(-1);
      if (!bullet) return;
      flash(bullet.id);
      focusByName(`${bullet.id}-text`);
    },
    [edit, flash],
  );

  const handleRemoveBullet = useCallback(
    (sectionId: string, entryId: string, bulletId: string) =>
      removeWithUndo("Achievement removed.", (d) =>
        removeBulletFrom(d, sectionId, entryId, bulletId),
      ),
    [removeWithUndo],
  );

  /**
   * Bullet text is `setBullet`, not `setEntryField(..., 'text', ...)`.
   *
   * Routing it through the generic field setter writes the enclosing Entry's prose
   * `text` instead of the bullet's — the bullet never changes, so React re-renders the
   * input back to its old value and typing appears to do nothing. The two are different
   * fields on different objects and need different edits.
   */
  const handleBulletText = useCallback<BulletTextEdit>(
    (sectionId, entryId, bulletId, text) =>
      edit((d) => setBulletText(d, sectionId, entryId, bulletId, text)),
    [edit],
  );

  const handleMoveEntry = useCallback(
    (sectionId: string, entryId: string, delta: number) =>
      edit((d) => moveEntryIn(d, sectionId, entryId, delta)),
    [edit],
  );

  // Removing a whole job asks first when it has content, then can still be undone.
  const handleRemoveEntry = useCallback(
    (sectionId: string, entryId: string) => {
      const entry = getSnapshot()
        .sections.find((section) => section.id === sectionId)
        ?.entries.find((candidate) => candidate.id === entryId);
      const name = entry?.title?.trim() || "this entry";
      const remove = () =>
        removeWithUndo(`Removed ${name}.`, (d) =>
          removeEntryFrom(d, sectionId, entryId),
        );
      if (!entry || isEntryEmpty(entry)) return remove();
      setConfirming({
        title: `remove ${name}?`,
        message:
          "Its details and achievements go with it. You can undo for a few seconds afterwards.",
        confirmText: "remove it",
        run: remove,
      });
    },
    [removeWithUndo],
  );

  // ---------------------------------------------------------------- contact
  // Each handler names the edit and hands the document to ./edits, which owns the
  // tree. Nothing here spreads a section, an entry or a bullet.
  const setContact = (field: ContactField, value: string) =>
    edit((d) => setContactField(d, field, value));

  const addLink = () => {
    edit(addLinkTo);
    focusByName(`link-${getSnapshot().contact.links.length - 1}-label`);
  };

  const setLink = (index: number, field: keyof ResumeLink, value: string) =>
    edit((d) => setLinkOn(d, index, field, value));

  const removeLink = (index: number) =>
    removeWithUndo("Link removed.", (d) => removeLinkFrom(d, index));

  // --------------------------------------------------------------- sections
  const addSection = (type: SectionType) => {
    const label =
      SECTION_CHOICES.find((c) => c.type === type)?.label ?? "Section";
    edit((d) => addSectionTo(d, type, label));
    // A new section is empty; open its first entry so there is somewhere to type.
    const added = getSnapshot().sections.at(-1);
    if (added) addEntry(added.id);
  };

  const removeSection = (id: string) => {
    const section = doc.sections.find((candidate) => candidate.id === id);
    const name = section?.title.trim() || "untitled";
    const remove = () =>
      removeWithUndo(`Removed the ${name} section.`, (d) =>
        removeSectionFrom(d, id),
      );
    if (!section || section.entries.every(isEntryEmpty)) return remove();
    setConfirming({
      title: `remove the ${name} section?`,
      message: `${section.entries.length === 1 ? "Its entry goes" : `All ${section.entries.length} of its entries go`} with it. You can undo for a few seconds afterwards.`,
      confirmText: "remove it",
      run: remove,
    });
  };

  const moveSection = (id: string, delta: number) =>
    edit((d) => moveSectionIn(d, id, delta));

  const setSectionTitle = (id: string, title: string) =>
    edit((d) => setSectionTitleOn(d, id, title));

  // ---------------------------------------------------------------- entries
  // Adding a row is a section-level control; every other entry and bullet edit is
  // passed to `EntryRow` as one of the stable helpers above, so the row stays memoized.
  // A new entry opens, glows, and takes focus, so the click visibly lands.
  const addEntry = (sectionId: string) => {
    edit((d) => addEntryTo(d, sectionId));
    const entry = getSnapshot()
      .sections.find((section) => section.id === sectionId)
      ?.entries.at(-1);
    if (!entry) return;
    setOpenEntry(entry.id);
    flash(entry.id);
    focusByName(`${entry.id}-title`);
  };

  // ------------------------------------------------------------- exports
  const exportPdf = async () => {
    setBusy("pdf");
    setNotice(null);
    try {
      const { buildResumePdf } = await import("@/lib/capyresume/pdf");
      // Read at click time rather than subscribing: the paper size is only needed when
      // an export runs, and subscribing at this level re-rendered the whole editor —
      // form, hints and preview — every time someone touched the paper `<select>`.
      const blob = await buildResumePdf(doc, { paperSize: getPaperSize() });
      downloadBlob(blob, resumeFileName(doc, "pdf"));
      setNotice(`PDF ready — ${formatBytes(blob.size)}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "PDF export failed.");
    } finally {
      setBusy(null);
    }
  };

  const exportDocx = async () => {
    setBusy("docx");
    setNotice(null);
    try {
      const { buildResumeDocx } = await import("@/lib/capyresume/docx");
      const blob = await buildResumeDocx(doc, { paperSize: getPaperSize() });
      downloadBlob(blob, resumeFileName(doc, "docx"));
      setNotice(`DOCX ready — ${formatBytes(blob.size)}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "DOCX export failed.");
    } finally {
      setBusy(null);
    }
  };

  const exportJson = () => {
    try {
      downloadText(exportResumeJson(doc), resumeBackupFileName(doc));
      setNotice("JSON backup ready.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "JSON export failed.");
    }
  };

  const importJson = async (file: File) => {
    try {
      if (file.size > MAX_BACKUP_BYTES) {
        setNotice(
          `That file is ${formatBytes(file.size)} — a backup is a few KB. Nothing was replaced.`,
        );
        return;
      }
      const parsed = parseResumeBackup(await readFileAsText(file));
      if ("error" in parsed) {
        setNotice(parsed.error);
        return;
      }
      const imported = parsed.doc;
      const commit = () => {
        saveResume(imported);
        setNotice("Imported. Your résumé is back.");
      };
      // Importing replaces the open document outright, so gate it the same way as
      // the other destructive actions rather than silently discarding edits.
      if (isResumeEmpty(doc)) commit();
      else
        setConfirming({
          title: "replace the open résumé?",
          message:
            "The file replaces what is open in the editor now. Export a JSON backup first if you want to keep it.",
          confirmText: "replace it",
          run: commit,
        });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "That file could not be read.",
      );
    }
  };

  const startOver = (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className="rounded-full border border-border bg-muted/30 px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground pointer-coarse:min-h-11"
        onClick={() => {
          const replace = () => edit(() => ({ ...DEMO_RESUME }));
          if (isResumeEmpty(doc)) replace();
          else
            setConfirming({
              title: "load the example résumé?",
              message:
                "It replaces what is open in the editor now. Export a JSON backup first if you want to keep it.",
              confirmText: "load example",
              run: replace,
            });
        }}
      >
        load demo
      </button>
      <button
        type="button"
        className="rounded-full border border-border bg-muted/30 px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground pointer-coarse:min-h-11"
        onClick={() => {
          const clear = () => {
            clearResume();
            setNotice("Cleared. Nothing of yours is left in this browser.");
          };
          if (isResumeEmpty(doc)) clear();
          else
            setConfirming({
              title: "delete this résumé?",
              message:
                "It is removed from this browser for good, and there is no copy anywhere else. Export a JSON backup first if you might want it back.",
              confirmText: "delete it",
              run: clear,
            });
        }}
      >
        clear
      </button>
    </div>
  );

  // Hydration-safe: null on the server and on the first client render alike.
  const savedStamp = (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
      title="Saved in this browser only"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-primary" />
      {savedAt
        ? `saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : "saved in this browser"}
    </span>
  );

  return (
    <div className="w-full">
      <p className="mb-5 rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <strong className="text-foreground">
          Stored in this browser only.
        </strong>{" "}
        Your details are never uploaded — there is nothing to upload them to.
        Clearing your browser data deletes this résumé, so use{" "}
        <em>JSON backup</em> to move it between devices.
      </p>

      {/* The live region is mounted empty from the first paint and filled later.
          A polite region that appears already populated is not reliably announced:
          assistive tech has to be subscribed before the content changes. Once
          there is no message it stays in the tree, just out of sight. */}
      <p
        role="status"
        aria-live="polite"
        className={
          notice
            ? "mb-5 rounded-2xl border border-border bg-muted/60 p-3 text-sm"
            : "sr-only"
        }
      >
        {notice}
      </p>

      <div className="grid w-full gap-5 xl:grid-cols-2 xl:items-start">
        <StageCard
          index="01"
          title="The details"
          marks
          chips={savedStamp}
          actions={startOver}
        >
          <div className="space-y-8">
            {hints.length > 0 && (
              <div className="rounded-2xl border border-dashed border-border p-3">
                <p className="text-xs font-medium text-foreground">
                  Worth a look — none of this blocks your export:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {hints.map((hint) => (
                    <li key={hint.id}>
                      {hint.tone === "attention" ? "• " : "· "}
                      {hint.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <section aria-label="Profile" className="space-y-4">
              <h3 className="font-display text-2xl font-light leading-tight">
                Profile
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { field: "name", label: "Full name", autocomplete: "name" },
                    {
                      field: "email",
                      label: "Email",
                      type: "email",
                      inputMode: "email",
                      autocomplete: "email",
                      spellCheck: false,
                    },
                    {
                      field: "phone",
                      label: "Phone",
                      type: "tel",
                      inputMode: "tel",
                      autocomplete: "tel",
                    },
                    {
                      field: "location",
                      label: "Location",
                      autocomplete: "address-level2",
                    },
                  ] as const
                ).map((spec) => (
                  <Field key={spec.field} label={spec.label}>
                    <input
                      className={FIELD}
                      name={spec.field}
                      type={"type" in spec ? spec.type : "text"}
                      inputMode={"inputMode" in spec ? spec.inputMode : undefined}
                      autoComplete={spec.autocomplete}
                      spellCheck={
                        "spellCheck" in spec ? spec.spellCheck : undefined
                      }
                      value={doc.contact[spec.field] ?? ""}
                      onChange={(event) =>
                        setContact(spec.field, event.target.value)
                      }
                    />
                  </Field>
                ))}
              </div>

              <div className="space-y-2">
                {doc.contact.links.map((link, index) => (
                  <div key={index} className="group flex items-end gap-2">
                    <Field label={`Link ${index + 1} label`} className="w-1/3">
                      <input
                        className={FIELD}
                        name={`link-${index}-label`}
                        autoComplete="off"
                        placeholder="LinkedIn"
                        value={link.label}
                        onChange={(event) =>
                          setLink(index, "label", event.target.value)
                        }
                      />
                    </Field>
                    <Field label={`Link ${index + 1} URL`} className="flex-1">
                      <input
                        className={FIELD}
                        name={`link-${index}-url`}
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        spellCheck={false}
                        placeholder="linkedin.com/in/you"
                        value={link.url}
                        onChange={(event) =>
                          setLink(index, "url", event.target.value)
                        }
                      />
                    </Field>
                    <button
                      type="button"
                      className={cn(DANGER_BTN, "mb-0.5")}
                      onClick={() => removeLink(index)}
                      aria-label={`remove link ${index + 1}`}
                    >
                      remove
                    </button>
                  </div>
                ))}
                <button type="button" className={ADD_BTN} onClick={addLink}>
                  <span aria-hidden>+</span> add link
                </button>
              </div>
            </section>

            {doc.sections.map((section) => {
              const title = section.title.trim() || "Untitled section";
              const count = section.entries.length;
              return (
                <section
                  key={section.id}
                  aria-label={title}
                  className="border-t border-border pt-6"
                >
                  <div className="group flex flex-wrap items-center gap-x-3 gap-y-2">
                    {renaming === section.id ? (
                      <input
                        autoFocus
                        className={cn(FIELD, "max-w-xs font-display text-xl")}
                        name={`${section.id}-title`}
                        aria-label="section title"
                        value={section.title}
                        onChange={(event) =>
                          setSectionTitle(section.id, event.target.value)
                        }
                        onBlur={() => setRenaming(null)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === "Escape")
                            setRenaming(null);
                        }}
                      />
                    ) : (
                      <h3 className="font-display text-2xl font-light leading-tight">
                        {title}
                      </h3>
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {count} {count === 1 ? "entry" : "entries"}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        className={BTN}
                        onClick={() => setRenaming(section.id)}
                        aria-label={`rename ${title}`}
                      >
                        rename
                      </button>
                      <button
                        type="button"
                        className={ICON_BTN}
                        onClick={() => moveSection(section.id, -1)}
                        aria-label={`Move ${title} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={ICON_BTN}
                        onClick={() => moveSection(section.id, 1)}
                        aria-label={`Move ${title} down`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={DANGER_BTN}
                        onClick={() => removeSection(section.id)}
                        aria-label={`remove the ${title} section`}
                      >
                        remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    {section.entries.map((entry, entryIndex) => (
                      <EntryRow
                        key={entry.id}
                        sectionId={section.id}
                        sectionTitle={section.title}
                        sectionType={section.type}
                        entry={entry}
                        entryIndex={entryIndex}
                        open={openEntry === entry.id}
                        freshId={
                          fresh &&
                          (fresh === entry.id ||
                            entry.bullets.some((bullet) => bullet.id === fresh))
                            ? fresh
                            : null
                        }
                        onToggle={toggleEntry}
                        onField={editEntryField}
                        onTags={editEntryTags}
                        onBulletText={handleBulletText}
                        onAddBullet={handleAddBullet}
                        onRemoveBullet={handleRemoveBullet}
                        onMove={handleMoveEntry}
                        onRemove={handleRemoveEntry}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className={cn(ADD_BTN, "mt-3")}
                    onClick={() => addEntry(section.id)}
                  >
                    <span aria-hidden>+</span> add to {title}
                  </button>
                </section>
              );
            })}

            <div className="border-t border-border pt-6">
              <span className={LABEL}>Add a section</span>
              <div className="flex flex-wrap gap-2">
                {SECTION_CHOICES.map((choice) => (
                  <button
                    key={choice.type}
                    type="button"
                    className={BTN}
                    onClick={() => addSection(choice.type)}
                  >
                    <span aria-hidden>+</span> {choice.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </StageCard>

        {/* ---------------------------------------------------- card 2 */}
        {/* Pinned on `xl:` so the document stays visible while the form scrolls
              (.hermes/plans/2026-09-24_120000-sticky-preview.md). `self-start` is load-bearing:
              a grid item stretches to its row height by default, and a stretched item has no
              distance left to travel, so `sticky` would never engage. Measured before this:
              the paper is 521x1056 in a 1440x900 viewport and sat 3623px above the viewport
              top once the form was scrolled. */}
        <StageCard
          index="02"
          title="The page"
          className="xl:sticky xl:top-24 xl:self-start"
        >
          <div className="space-y-4 xl:flex xl:max-h-[calc(100dvh-10rem)] xl:flex-col">
            <div className="flex flex-wrap gap-3">
              <div>
                <span id="capyresume-template-label" className={LABEL}>
                  Template
                </span>
                <Select
                  value={doc.templateId}
                  onValueChange={(value) =>
                    edit((d) => ({ ...d, templateId: value as TemplateId }))
                  }
                >
                  <SelectTrigger
                    className={SELECT_TRIGGER}
                    aria-labelledby="capyresume-template-label"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_LIST.filter((template) =>
                      isPackUnlocked(template.pack),
                    ).map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span id="capyresume-paper-label" className={LABEL}>
                  Paper
                </span>
                {/* Its own component so the prefs subscription is scoped to this control.
                    Subscribing at the top of the editor meant changing paper re-rendered
                    the entire form, hints and preview to update one control. */}
                <PaperSizeSelect />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{spec.description}</p>

            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>✓ Single column — no columns for a parser to mangle</li>
              <li>✓ No tables, no text baked into images</li>
              <li>
                ✓ A real PDF text layer, so the text can be selected and read
              </li>
            </ul>

            {/* The paper itself: white stock and black ink in both themes, because this is
                the document, not the interface. It is routinely taller than the viewport
                (521x1056 on a laptop), so the pinned pane scrolls it rather than clipping
                it — and `min-h-0` is what lets a flex child shrink below its content and
                become scrollable at all. The scrollbar rides the gutter beside the paper,
                never inside its border. */}
            <div
              ref={paperScrollRef}
              className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto"
            >
              <div
                className="max-w-[46rem] overflow-hidden rounded-md border border-border bg-white text-black"
                style={previewPaperStyle(spec)}
              >
                <div style={{ padding: "28pt 30pt" }}>
                  {header.map((block, index) => (
                    <BlockView key={`header-${index}`} block={block} spec={spec} />
                  ))}
                  {/* Grouped by entry so the one open in the form is washed sage here. */}
                  {sections.map((section) => (
                    <div key={section.sectionId}>
                      <BlockView block={section.heading} spec={spec} />
                      {section.entries.map((entry) => (
                        <div
                          key={entry.entryId}
                          data-entry={entry.entryId}
                          style={
                            entry.entryId === openEntry
                              ? PREVIEW_ACTIVE
                              : PREVIEW_IDLE
                          }
                        >
                          {entry.blocks.map((block, index) => (
                            <BlockView key={index} block={block} spec={spec} />
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </StageCard>
      </div>

      {/* ---------------------------------------------------- card 3 */}
      {/* Outside the two-pane grid on purpose: a sticky element is bounded by its
          containing block, which is the grid, so with this card inside it the pinned
          preview slid down over it and its last section could not be scrolled to. */}
      <div className="mt-5">
        <StageCard index="03" title="The file">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="min-w-[84px] rounded-full border border-border px-4 py-2 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-60"
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
                className="min-w-[84px] rounded-full border border-border px-4 py-2 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-60"
                onClick={() => {
                  void exportDocx();
                }}
                onMouseEnter={preloadDocxExporter}
                onFocus={preloadDocxExporter}
                disabled={busy !== null}
              >
                {busy === "docx" ? "Making DOCX…" : "Download DOCX"}
              </button>
              <button
                type="button"
                className="min-w-[84px] rounded-full border border-border px-4 py-2 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-60"
                onClick={exportJson}
              >
                JSON backup
              </button>
              <button
                type="button"
                className="min-w-[84px] rounded-full border border-border px-4 py-2 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-60"
                onClick={() => fileInputRef.current?.click()}
              >
                import JSON
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
            <p className="text-xs text-muted-foreground">
              Free, unlimited, and unwatermarked: the résumé is yours, so the
              download always is too.
            </p>
          </div>
        </StageCard>
      </div>

      {/* The builder should not be a dead end: the guides that sit beside it. */}
      <nav
        aria-label="CapyResume guides"
        className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"
      >
        <Link
          href="/capyresume/templates"
          className="inline-block py-1 transition-colors hover:text-foreground"
        >
          templates
        </Link>
        <Link
          href="/capyresume/ats-resume-format"
          className="inline-block py-1 transition-colors hover:text-foreground"
        >
          ats resume format
        </Link>
        <Link
          href="/capyresume/resume-templates"
          className="inline-block py-1 transition-colors hover:text-foreground"
        >
          by role
        </Link>
        <Link
          href="/capyresume/free-cv-builder"
          className="inline-block py-1 transition-colors hover:text-foreground"
        >
          by country
        </Link>
      </nav>

      {/* The undo toast. Its region is always mounted, for the same reason as the
          notice above: a live region that appears already filled is not announced. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        {undo ? (
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-foreground py-1.5 pl-4 pr-1.5 text-sm text-background shadow-lg">
            <span>{undo.message}</span>
            <button
              type="button"
              className={`rounded-full border border-background/40 px-3 py-1 text-[13px] transition-colors hover:bg-background hover:text-foreground pointer-coarse:min-h-11 ${FOCUS}`}
              onClick={restoreRemoved}
            >
              undo
            </button>
          </div>
        ) : null}
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
