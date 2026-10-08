'use client';

/**
 * CapyResume — the tool.
 *
 * Everything happens in this tab: the résumé is read from and written to
 * `localStorage`, and the PDF/DOCX/JSON are produced locally. There is no
 * server call anywhere in this file.
 *
 * Styling follows the suite language: DESIGN.md at the repo root, with the tokens in
 * app/globals.css and the vocabulary in the kit under components/ui.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AiAssist } from '@/components/tool/AiAssist';
import { replaceTargetText } from '@/lib/capyresume/ai/targets';
import { SITE } from '@/lib/site';
import {
  getSnapshot,
  saveResume,
  clearResume,
  hasStoredResume,
  useResumeWithServerSnapshot,
} from '@/lib/capyresume/store';
import { DEMO_RESUME } from '@/lib/capyresume/demo';
import { lintResume } from '@/lib/capyresume/hints';
import { isEntryEmpty, isResumeEmpty } from '@/lib/capyresume/schema';
import dynamic from 'next/dynamic';
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
} from '@/lib/capyresume/edits';
import { TEMPLATE_LIST, getTemplate, isPackUnlocked } from '@/lib/capyresume/templates';
import { composeDocument } from '@/lib/capyresume/document';
import { BlockView, previewPaperStyle } from '@/components/tool/BlockView';
import {
  exportResumeJson,
  MAX_BACKUP_BYTES,
  parseResumeBackup,
  resumeBackupFileName,
  resumeFileName,
} from '@/lib/capyresume/json';
import { getPaperSize, setPaperSize, usePaperSize } from '@/lib/capyresume/prefs';
import { downloadBlob, downloadText, readFileAsText } from '@/lib/capyresume/download';
import { formatBytes } from '@/lib/capyresume/format';
import type {
  Bullet,
  Entry,
  ResumeDoc,
  ResumeLink,
  SectionType,
  TemplateId,
} from '@/lib/capyresume/types';
import type { ContactField } from '@/lib/capyresume/edits';

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
const preloadPdfExporter = () => void import('@/lib/capyresume/pdf');
const preloadDocxExporter = () => void import('@/lib/capyresume/docx');

/**
 * The confirmation dialog is only reachable from an action that needs confirming, so
 * Radix Dialog — with react-remove-scroll and its focus machinery — does not belong in
 * first load. `ssr: false` because it renders null until a confirmation is pending, so
 * there is nothing to server-render and no cost to deferring it.
 */
const ConfirmDialog = dynamic(
  () => import('@/components/ui/ConfirmDialog').then((m) => m.ConfirmDialog),
  { ssr: false }
);

/**
 * The paper-size control, subscribing to the prefs store on its own.
 *
 * It is separate because the value is needed in exactly two places: here, and inside
 * the export handlers, which can read it at click time. Subscribing at the top of the
 * editor instead made a paper change re-render every control in the form plus the
 * preview, all to move one `<select>`.
 */
function PaperSizeSelect() {
  const paperSize = usePaperSize();
  return (
    <select
      className="rounded-md border border-border bg-background px-3 py-2 transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
      name="paper"
      value={paperSize}
      onChange={(event) => setPaperSize(event.target.value === 'LETTER' ? 'LETTER' : 'A4')}
    >
      <option value="A4">A4</option>
      <option value="LETTER">US Letter</option>
    </select>
  );
}

const SECTION_CHOICES: { type: SectionType; label: string }[] = [
  { type: 'summary', label: 'Summary' },
  { type: 'experience', label: 'Experience' },
  { type: 'education', label: 'Education' },
  { type: 'skills', label: 'Skills' },
  { type: 'projects', label: 'Projects' },
  { type: 'certifications', label: 'Certifications' },
  { type: 'custom', label: 'Custom section' },
];

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
  value: string | boolean
) => void;

type TextEdit = (sectionId: string, entryId: string, text: string) => void;

/** Bullet text, which is its own edit — an Entry's `text` field is different prose. */
type BulletTextEdit = (sectionId: string, entryId: string, bulletId: string, text: string) => void;

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
  onBulletText,
  onRemove,
}: {
  sectionTitle: string;
  entryIndex: number;
  bullet: Bullet;
  bulletIndex: number;
  entryId: string;
  sectionId: string;
  onBulletText: BulletTextEdit;
  onRemove: (sectionId: string, entryId: string, bulletId: string, label: string) => void;
}) {
  const label = `${sectionTitle}, entry ${entryIndex + 1}, achievement ${bulletIndex + 1}`;
  return (
    <div className="flex gap-2">
      <input
        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        name={`${bullet.id}-text`}
        aria-label={label}
        placeholder="achievement"
        value={bullet.text}
        onChange={(event) => onBulletText(sectionId, entryId, bullet.id, event.target.value)}
      />
      <button
        type="button"
        className="rounded-md border border-border px-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
        onClick={() => onRemove(sectionId, entryId, bullet.id, label)}
        aria-label={`remove ${label}`}
      >
        ×
      </button>
    </div>
  );
});

/**
 * One entry — a job, degree, project or certification.
 *
 * Takes `sectionTitle` and `sectionType` as primitives rather than the whole section:
 * passing the section would mean every entry in it re-renders whenever any one of them
 * is edited, since the parent replaces the section object on a child edit. The ids are
 * primitives already, so a keystroke here propagates to this row and the preview only.
 *
 * Handlers are the two stable functions from the parent, not the per-edit helpers —
 * those are already bound to this row's section and entry, so they change identity
 * every render and would defeat the memo.
 */
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
      className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      name={name}
      aria-label={label}
      autoComplete="off"
      placeholder="skills, comma separated"
      value={draft ?? tags.join(', ')}
      onFocus={() => setDraft(tags.join(', '))}
      onChange={(event) => {
        setDraft(event.target.value);
        onTags(event.target.value);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

const EntryRow = memo(function EntryRow({
  sectionId,
  sectionTitle,
  sectionType,
  entry,
  entryIndex,
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
  onField: FieldEdit;
  onTags: TextEdit;
  onBulletText: BulletTextEdit;
  onAddBullet: (sectionId: string, entryId: string) => void;
  onRemoveBullet: (sectionId: string, entryId: string, bulletId: string, label: string) => void;
  onMove: (sectionId: string, entryId: string, delta: number) => void;
  onRemove: (sectionId: string, entryId: string) => void;
}) {
  const prefix = `${sectionTitle}, entry ${entryIndex + 1}`;
  const titlePlaceholder =
    sectionType === 'skills'
      ? 'Group name (optional)'
      : sectionType === 'summary'
        ? 'Summary heading (optional)'
        : 'Title / role / degree';

  return (
    <div className="rounded-md bg-muted/30 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
          name={`${entry.id}-title`}
          aria-label={`${prefix}, title`}
          placeholder={titlePlaceholder}
          value={entry.title ?? ''}
          onChange={(event) => onField(sectionId, entry.id, 'title', event.target.value)}
        />
        <input
          className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
          name={`${entry.id}-organisation`}
          aria-label={`${prefix}, organisation`}
          placeholder="organisation"
          value={entry.organisation ?? ''}
          onChange={(event) => onField(sectionId, entry.id, 'organisation', event.target.value)}
        />
        <input
          className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
          name={`${entry.id}-location`}
          aria-label={`${prefix}, location`}
          autoComplete="off"
          placeholder="location"
          value={entry.location ?? ''}
          onChange={(event) => onField(sectionId, entry.id, 'location', event.target.value)}
        />
        <div className="flex gap-2">
          <input
            className="w-1/2 rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums"
            name={`${entry.id}-start`}
            aria-label={`${prefix}, start date, YYYY-MM`}
            inputMode="text"
            autoComplete="off"
            placeholder="YYYY-MM"
            value={entry.startDate ?? ''}
            onChange={(event) => onField(sectionId, entry.id, 'startDate', event.target.value)}
          />
          <input
            className="w-1/2 rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums"
            name={`${entry.id}-end`}
            aria-label={`${prefix}, end date, YYYY-MM`}
            inputMode="text"
            autoComplete="off"
            placeholder="YYYY-MM"
            value={entry.endDate ?? ''}
            disabled={entry.current === true}
            onChange={(event) => onField(sectionId, entry.id, 'endDate', event.target.value)}
          />
        </div>
      </div>

      <label className="mt-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name={`${entry.id}-current`}
          checked={entry.current === true}
          onChange={(event) => onField(sectionId, entry.id, 'current', event.target.checked)}
        />
        current
      </label>

      <textarea
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        name={`${entry.id}-text`}
        aria-label={`${prefix}, description`}
        rows={2}
        placeholder="description / summary text"
        value={entry.text ?? ''}
        onChange={(event) => onField(sectionId, entry.id, 'text', event.target.value)}
      />

      <TagsInput
        name={`${entry.id}-tags`}
        label={`${prefix}, skills, comma separated`}
        tags={entry.tags}
        onTags={(raw) => onTags(sectionId, entry.id, raw)}
      />

      <div className="mt-2 space-y-2">
        {entry.bullets.map((bullet, bulletIndex) => (
          <BulletRow
            key={bullet.id}
            sectionId={sectionId}
            sectionTitle={sectionTitle}
            entryId={entry.id}
            entryIndex={entryIndex}
            bullet={bullet}
            bulletIndex={bulletIndex}
            onBulletText={onBulletText}
            onRemove={onRemoveBullet}
          />
        ))}
        <button
          type="button"
          className="text-sm underline transition-colors duration-fade ease-ui hover:text-foreground"
          onClick={() => onAddBullet(sectionId, entry.id)}
        >
          add bullet
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
          onClick={() => onMove(sectionId, entry.id, -1)}
          aria-label={`move ${prefix} up`}
        >
          ↑
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
          onClick={() => onMove(sectionId, entry.id, 1)}
          aria-label={`move ${prefix} down`}
        >
          ↓
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
          onClick={() => onRemove(sectionId, entry.id)}
        >
          remove entry
        </button>
      </div>
    </div>
  );
});

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
  const seeded = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const doc = stored;
  const spec = useMemo(() => getTemplate(doc.templateId), [doc.templateId]);
  const blocks = useMemo(() => composeDocument(doc, spec), [doc, spec]);
  const hints = useMemo(() => lintResume(doc), [doc]);

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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save to this browser.');
    }
  }, []);

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
      edit((d) => setEntryFieldOn(d, sectionId, entryId, field, value as never)),
    [edit]
  );

  /** The tags input is a comma-separated string, not a field assignment. */
  const editEntryTags = useCallback<TextEdit>(
    (sectionId, entryId, raw) => edit((d) => setTagsOn(d, sectionId, entryId, raw)),
    [edit]
  );

  const handleAddBullet = useCallback(
    (sectionId: string, entryId: string) => edit((d) => addBulletTo(d, sectionId, entryId)),
    [edit]
  );

  const handleRemoveBullet = useCallback(
    (sectionId: string, entryId: string, bulletId: string) =>
      edit((d) => removeBulletFrom(d, sectionId, entryId, bulletId)),
    [edit]
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
    [edit]
  );

  const handleMoveEntry = useCallback(
    (sectionId: string, entryId: string, delta: number) =>
      edit((d) => moveEntryIn(d, sectionId, entryId, delta)),
    [edit]
  );

  // One click used to delete a whole job with no way back; anything with content
  // now asks first, the same way the other destructive actions do.
  const handleRemoveEntry = useCallback(
    (sectionId: string, entryId: string) => {
      const entry = getSnapshot()
        .sections.find((section) => section.id === sectionId)
        ?.entries.find((candidate) => candidate.id === entryId);
      const remove = () => edit((d) => removeEntryFrom(d, sectionId, entryId));
      if (!entry || isEntryEmpty(entry)) return remove();
      setConfirming({
        title: `remove ${entry.title?.trim() || 'this entry'}?`,
        message:
          'Its details and bullets go with it, and there is no undo. Export a JSON backup first if you might want it back.',
        confirmText: 'remove it',
        run: remove,
      });
    },
    [edit]
  );

  // ---------------------------------------------------------------- contact
  // Each handler names the edit and hands the document to ./edits, which owns the
  // tree. Nothing here spreads a section, an entry or a bullet.
  const setContact = (field: ContactField, value: string) =>
    edit((d) => setContactField(d, field, value));

  const addLink = () => edit(addLinkTo);

  const setLink = (index: number, field: keyof ResumeLink, value: string) =>
    edit((d) => setLinkOn(d, index, field, value));

  const removeLink = (index: number) => edit((d) => removeLinkFrom(d, index));

  // --------------------------------------------------------------- sections
  const addSection = (type: SectionType) => {
    const label = SECTION_CHOICES.find((c) => c.type === type)?.label ?? 'Section';
    edit((d) => addSectionTo(d, type, label));
  };

  const removeSection = (id: string) => {
    const section = doc.sections.find((candidate) => candidate.id === id);
    const remove = () => edit((d) => removeSectionFrom(d, id));
    if (!section || section.entries.every(isEntryEmpty)) return remove();
    setConfirming({
      title: `remove the ${section.title.trim() || 'untitled'} section?`,
      message: `${section.entries.length === 1 ? 'Its entry goes' : `All ${section.entries.length} of its entries go`} with it, and there is no undo. Export a JSON backup first if you might want it back.`,
      confirmText: 'remove it',
      run: remove,
    });
  };

  const moveSection = (id: string, delta: number) => edit((d) => moveSectionIn(d, id, delta));

  const setSectionTitle = (id: string, title: string) =>
    edit((d) => setSectionTitleOn(d, id, title));

  // ---------------------------------------------------------------- entries
  // Only `addEntry` is still needed here: adding a row is a section-level control. Every
  // other entry and bullet edit is passed to `EntryRow` as one of the stable helpers
  // above, so the row can stay memoized.
  const addEntry = (sectionId: string) => edit((d) => addEntryTo(d, sectionId));

  // ------------------------------------------------------------- exports
  const exportPdf = async () => {
    setBusy('pdf');
    setNotice(null);
    try {
      const { buildResumePdf } = await import('@/lib/capyresume/pdf');
      // Read at click time rather than subscribing: the paper size is only needed when
      // an export runs, and subscribing at this level re-rendered the whole editor —
      // form, hints and preview — every time someone touched the paper `<select>`.
      const blob = await buildResumePdf(doc, { paperSize: getPaperSize() });
      downloadBlob(blob, resumeFileName(doc, 'pdf'));
      setNotice(`PDF ready — ${formatBytes(blob.size)}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'PDF export failed.');
    } finally {
      setBusy(null);
    }
  };

  const exportDocx = async () => {
    setBusy('docx');
    setNotice(null);
    try {
      const { buildResumeDocx } = await import('@/lib/capyresume/docx');
      const blob = await buildResumeDocx(doc, { paperSize: getPaperSize() });
      downloadBlob(blob, resumeFileName(doc, 'docx'));
      setNotice(`DOCX ready — ${formatBytes(blob.size)}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'DOCX export failed.');
    } finally {
      setBusy(null);
    }
  };

  const exportJson = () => {
    try {
      downloadText(exportResumeJson(doc), resumeBackupFileName(doc));
      setNotice('JSON backup ready.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'JSON export failed.');
    }
  };

  const importJson = async (file: File) => {
    try {
      if (file.size > MAX_BACKUP_BYTES) {
        setNotice(
          `That file is ${formatBytes(file.size)} — a backup is a few KB. Nothing was replaced.`
        );
        return;
      }
      const parsed = parseResumeBackup(await readFileAsText(file));
      if ('error' in parsed) {
        setNotice(parsed.error);
        return;
      }
      const imported = parsed.doc;
      const commit = () => {
        saveResume(imported);
        setNotice('Imported. Your résumé is back.');
      };
      // Importing replaces the open document outright, so gate it the same way as
      // the other destructive actions rather than silently discarding edits.
      if (isResumeEmpty(doc)) commit();
      else
        setConfirming({
          title: 'replace the open résumé?',
          message:
            'The file replaces what is open in the editor now. Export a JSON backup first if you want to keep it.',
          confirmText: 'replace it',
          run: commit,
        });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'That file could not be read.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              <Link
                href="/"
                className="transition-colors duration-fade ease-ui hover:text-sage-deep dark:hover:text-primary"
              >
                CapyResume
              </Link>
            </h1>
            <p className="text-sm text-muted-foreground">{SITE.tagline}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
              onClick={() => {
                const replace = () => edit(() => ({ ...DEMO_RESUME }));
                if (isResumeEmpty(doc)) replace();
                else
                  setConfirming({
                    title: 'load the example résumé?',
                    message:
                      'It replaces what is open in the editor now. Export a JSON backup first if you want to keep it.',
                    confirmText: 'load example',
                    run: replace,
                  });
              }}
            >
              load demo
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
              onClick={() => {
                const clear = () => {
                  clearResume();
                  setNotice('Cleared. Nothing of yours is left in this browser.');
                };
                if (isResumeEmpty(doc)) clear();
                else
                  setConfirming({
                    title: 'delete this résumé?',
                    message:
                      'It is removed from this browser for good, and there is no copy anywhere else. Export a JSON backup first if you might want it back.',
                    confirmText: 'delete it',
                    run: clear,
                  });
              }}
            >
              clear
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-6 py-8">
        <p className="mb-6 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <strong className="text-foreground">Stored in this browser only.</strong> Your details are
          never uploaded — there is nothing to upload them to. Clearing your browser data deletes
          this résumé, so use <em>JSON backup</em> to move it between devices.
        </p>

        {/* The live region is mounted empty from the first paint and filled later.
            A polite region that appears already populated is not reliably announced:
            assistive tech has to be subscribed before the content changes. Once
            there is no message it stays in the tree, just out of sight. */}
        <p
          role="status"
          aria-live="polite"
          className={
            notice ? 'mb-6 rounded-md border border-border bg-muted/60 p-3 text-sm' : 'sr-only'
          }
        >
          {notice}
        </p>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* ---------------------------------------------------- card 1 */}
          <section className="space-y-6">
            <h2 className="font-display text-lg font-semibold">1. The details</h2>

            {hints.length > 0 && (
              <div className="rounded-md border border-border p-3">
                <p className="text-xs font-medium text-foreground">
                  Worth a look — none of this blocks your export:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {hints.map((hint) => (
                    <li key={hint.id}>
                      {hint.tone === 'attention' ? '• ' : '· '}
                      {hint.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { field: 'name', label: 'Full name', autocomplete: 'name' },
                  {
                    field: 'email',
                    label: 'Email',
                    type: 'email',
                    inputMode: 'email',
                    autocomplete: 'email',
                    spellCheck: false,
                  },
                  {
                    field: 'phone',
                    label: 'Phone',
                    type: 'tel',
                    inputMode: 'tel',
                    autocomplete: 'tel',
                  },
                  { field: 'location', label: 'location', autocomplete: 'address-level2' },
                ] as const
              ).map((spec) => (
                <label key={spec.field} className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{spec.label}</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    name={spec.field}
                    type={'type' in spec ? spec.type : 'text'}
                    inputMode={'inputMode' in spec ? spec.inputMode : undefined}
                    autoComplete={spec.autocomplete}
                    spellCheck={'spellCheck' in spec ? spec.spellCheck : undefined}
                    value={doc.contact[spec.field] ?? ''}
                    onChange={(event) => setContact(spec.field, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">links</span>
                <button
                  type="button"
                  className="text-sm underline transition-colors duration-fade ease-ui hover:text-foreground"
                  onClick={addLink}
                >
                  add link
                </button>
              </div>
              {doc.contact.links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  {/* Visible label is the placeholder; the real name comes from an
                      sr-only label so screen readers get more than "label". */}
                  <label className="w-1/3">
                    <span className="sr-only">{`link ${index + 1} label`}</span>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      name={`link-${index}-label`}
                      autoComplete="off"
                      placeholder="label"
                      value={link.label}
                      onChange={(event) => setLink(index, 'label', event.target.value)}
                    />
                  </label>
                  <label className="flex-1">
                    <span className="sr-only">{`link ${index + 1} URL`}</span>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      name={`link-${index}-url`}
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      spellCheck={false}
                      placeholder="URL"
                      value={link.url}
                      onChange={(event) => setLink(index, 'url', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                    onClick={() => removeLink(index)}
                    aria-label={`remove link ${index + 1}`}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>

            {doc.sections.map((section) => (
              <div key={section.id} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <input
                    className="min-w-[10rem] flex-1 rounded-md border border-border bg-background px-3 py-2 font-medium"
                    name={`${section.id}-title`}
                    value={section.title}
                    onChange={(event) => setSectionTitle(section.id, event.target.value)}
                    aria-label="section title"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                    onClick={() => moveSection(section.id, -1)}
                    aria-label={`Move ${section.title} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                    onClick={() => moveSection(section.id, 1)}
                    aria-label={`Move ${section.title} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                    onClick={() => removeSection(section.id)}
                  >
                    remove
                  </button>
                </div>

                <div className="space-y-4">
                  {section.entries.map((entry, entryIndex) => (
                    <EntryRow
                      key={entry.id}
                      sectionId={section.id}
                      sectionTitle={section.title}
                      sectionType={section.type}
                      entry={entry}
                      entryIndex={entryIndex}
                      onField={editEntryField}
                      onTags={editEntryTags}
                      onBulletText={handleBulletText}
                      onAddBullet={handleAddBullet}
                      onRemoveBullet={handleRemoveBullet}
                      onMove={handleMoveEntry}
                      onRemove={handleRemoveEntry}
                    />
                  ))}

                  <button
                    type="button"
                    className="text-sm underline transition-colors duration-fade ease-ui hover:text-foreground"
                    onClick={() => addEntry(section.id)}
                  >
                    add entry
                  </button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">add section:</span>
              {SECTION_CHOICES.map((choice) => (
                <button
                  key={choice.type}
                  type="button"
                  className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                  onClick={() => addSection(choice.type)}
                >
                  {choice.label}
                </button>
              ))}
            </div>

            <AiAssist
              doc={doc}
              onApply={(targetId, text) => edit((d) => replaceTargetText(d, targetId, text))}
            />
          </section>

          {/* ---------------------------------------------------- card 2 */}
          {/* Pinned on `lg:` so the document stays visible while the form scrolls
              (.hermes/plans/2026-09-24_120000-sticky-preview.md). `self-start` is load-bearing:
              a grid item stretches to its row height by default, and a stretched item has no
              distance left to travel, so `sticky` would never engage. Measured before this:
              the paper is 521x1056 in a 1440x900 viewport and sat 3623px above the viewport
              top once the form was scrolled. */}
          <section className="space-y-4 lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
            <h2 className="font-display text-lg font-semibold">2. The page</h2>

            <div className="flex flex-wrap gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">template</span>
                <select
                  className="rounded-md border border-border bg-background px-3 py-2 transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                  name="template"
                  value={doc.templateId}
                  onChange={(event) =>
                    edit((d) => ({ ...d, templateId: event.target.value as TemplateId }))
                  }
                >
                  {TEMPLATE_LIST.filter((template) => isPackUnlocked(template.pack)).map(
                    (template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">paper</span>
                {/* Its own component so the prefs subscription is scoped to this control.
                    Subscribing at the top of the editor meant changing paper re-rendered
                    the entire form, hints and preview to update one `<select>`. */}
                <PaperSizeSelect />
              </label>
            </div>

            <p className="text-xs text-muted-foreground">{spec.description}</p>

            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>✓ Single column — no columns for a parser to mangle</li>
              <li>✓ No tables, no text baked into images</li>
              <li>✓ A real PDF text layer, so the text can be selected and read</li>
            </ul>

            {/* The paper itself: white stock and black ink in both themes, because this is
                the document, not the interface. It is routinely taller than the viewport
                (521x1056 on a laptop), so the pinned pane scrolls it rather than clipping
                it — and `min-h-0` is what lets a flex child shrink below its content and
                become scrollable at all. The scrollbar rides the gutter beside the paper,
                never inside its border. */}
            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <div
                className="max-w-[46rem] overflow-hidden rounded-md border border-border bg-white text-black"
                style={previewPaperStyle(spec)}
              >
                <div style={{ padding: '28pt 30pt' }}>
                  {blocks.map((block, index) => (
                    <BlockView key={index} block={block} spec={spec} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------- card 3 */}
          <section className="space-y-4 lg:col-span-2">
            <h2 className="font-display text-lg font-semibold">3. The file</h2>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="min-w-[84px] rounded-md border border-border px-4 py-2 transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                onClick={() => {
                  void exportPdf();
                }}
                onMouseEnter={preloadPdfExporter}
                onFocus={preloadPdfExporter}
                disabled={busy !== null}
              >
                {busy === 'pdf' ? 'Making PDF…' : 'Download PDF'}
              </button>
              <button
                type="button"
                className="min-w-[84px] rounded-md border border-border px-4 py-2 transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                onClick={() => {
                  void exportDocx();
                }}
                onMouseEnter={preloadDocxExporter}
                onFocus={preloadDocxExporter}
                disabled={busy !== null}
              >
                {busy === 'docx' ? 'Making DOCX…' : 'Download DOCX'}
              </button>
              <button
                type="button"
                className="min-w-[84px] rounded-md border border-border px-4 py-2 transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                onClick={exportJson}
              >
                JSON backup
              </button>
              <button
                type="button"
                className="min-w-[84px] rounded-md border border-border px-4 py-2 transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
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
                  event.target.value = '';
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Free, unlimited, and unwatermarked: the résumé is yours, so the download always is
              too.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">
          <p className="leading-relaxed">
            {SITE.name} — free, open source, and yours. Your résumé stays in this browser.{' '}
            <Link href="/privacy" className="underline underline-offset-4">
              privacy
            </Link>{' '}
            <Link href="/terms" className="underline underline-offset-4">
              terms
            </Link>{' '}
            <Link href="/cookies" className="underline underline-offset-4">
              cookies
            </Link>
          </p>
          {/* The builder is where most people land, and it should not be a dead end: these
              are the same four links the site header carries. The wordmark above goes
              home, the legal links stay inline in the sentence. */}
          <nav aria-label="site" className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
            <Link
              href="/templates"
              className="inline-block py-1 transition-colors duration-fade ease-ui hover:text-foreground"
            >
              templates
            </Link>
            <Link
              href="/ats-resume-format"
              className="inline-block py-1 transition-colors duration-fade ease-ui hover:text-foreground"
            >
              ats resume format
            </Link>
            <Link
              href="/resume-templates"
              className="inline-block py-1 transition-colors duration-fade ease-ui hover:text-foreground"
            >
              by role
            </Link>
            <Link
              href="/free-cv-builder"
              className="inline-block py-1 transition-colors duration-fade ease-ui hover:text-foreground"
            >
              by country
            </Link>
          </nav>
        </div>
      </footer>

      <ConfirmDialog
        isOpen={confirming !== null}
        title={confirming?.title ?? ''}
        message={confirming?.message ?? ''}
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
