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

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AiAssist } from '@/components/tool/AiAssist';
import { replaceTargetText } from '@/lib/capyresume/ai/targets';
import { SITE } from '@/lib/site';
import {
  saveResume,
  clearResume,
  hasStoredResume,
  useResumeWithServerSnapshot,
} from '@/lib/capyresume/store';
import { DEMO_RESUME } from '@/lib/capyresume/demo';
import { lintResume } from '@/lib/capyresume/hints';
import { isResumeEmpty } from '@/lib/capyresume/schema';
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
  importResumeJson,
  resumeBackupFileName,
  resumeFileName,
} from '@/lib/capyresume/json';
import { setPaperSize, usePaperSize } from '@/lib/capyresume/prefs';
import { downloadBlob, downloadText, readFileAsText } from '@/lib/capyresume/download';
import { formatBytes } from '@/lib/capyresume/format';
import type { Entry, ResumeDoc, ResumeLink, SectionType, TemplateId } from '@/lib/capyresume/types';
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

const SECTION_CHOICES: { type: SectionType; label: string }[] = [
  { type: 'summary', label: 'Summary' },
  { type: 'experience', label: 'Experience' },
  { type: 'education', label: 'Education' },
  { type: 'skills', label: 'Skills' },
  { type: 'projects', label: 'Projects' },
  { type: 'certifications', label: 'Certifications' },
  { type: 'custom', label: 'Custom section' },
];

export function CapyResume() {
  // The demo is the server snapshot, so the first paint has real content and
  // hydration matches; React then swaps in whatever is actually stored.
  const stored = useResumeWithServerSnapshot(DEMO_RESUME);
  const paperSize = usePaperSize();
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
  const edit = (mutate: (draft: ResumeDoc) => ResumeDoc) => {
    const next = mutate(doc);
    if (next === doc) return;
    try {
      saveResume(next);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save to this browser.');
    }
  };

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

  const removeSection = (id: string) => edit((d) => removeSectionFrom(d, id));

  const moveSection = (id: string, delta: number) => edit((d) => moveSectionIn(d, id, delta));

  const setSectionTitle = (id: string, title: string) =>
    edit((d) => setSectionTitleOn(d, id, title));

  // ---------------------------------------------------------------- entries
  const addEntry = (sectionId: string) => edit((d) => addEntryTo(d, sectionId));

  const removeEntry = (sectionId: string, entryId: string) =>
    edit((d) => removeEntryFrom(d, sectionId, entryId));

  const moveEntry = (sectionId: string, entryId: string, delta: number) =>
    edit((d) => moveEntryIn(d, sectionId, entryId, delta));

  const setEntryField = (
    sectionId: string,
    entryId: string,
    field: keyof Entry,
    value: string | boolean
  ) => edit((d) => setEntryFieldOn(d, sectionId, entryId, field, value));

  // ---------------------------------------------------------------- bullets
  const addBullet = (sectionId: string, entryId: string) =>
    edit((d) => addBulletTo(d, sectionId, entryId));

  const setBullet = (sectionId: string, entryId: string, bulletId: string, text: string) =>
    edit((d) => setBulletText(d, sectionId, entryId, bulletId, text));

  const removeBullet = (sectionId: string, entryId: string, bulletId: string) =>
    edit((d) => removeBulletFrom(d, sectionId, entryId, bulletId));

  const setTags = (sectionId: string, entryId: string, raw: string) =>
    edit((d) => setTagsOn(d, sectionId, entryId, raw));

  // ------------------------------------------------------------- exports
  const exportPdf = async () => {
    setBusy('pdf');
    setNotice(null);
    try {
      const { buildResumePdf } = await import('@/lib/capyresume/pdf');
      const blob = await buildResumePdf(doc, { paperSize });
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
      const blob = await buildResumeDocx(doc, { paperSize });
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
      const text = await readFileAsText(file);
      const imported = importResumeJson(text);
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
                    <div key={entry.id} className="rounded-md bg-muted/30 p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                          name={`${entry.id}-title`}
                          aria-label={`${section.title}, entry ${entryIndex + 1}, title`}
                          placeholder={
                            section.type === 'skills'
                              ? 'Group name (optional)'
                              : section.type === 'summary'
                                ? 'Summary heading (optional)'
                                : 'Title / role / degree'
                          }
                          value={entry.title ?? ''}
                          onChange={(event) =>
                            setEntryField(section.id, entry.id, 'title', event.target.value)
                          }
                        />
                        <input
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                          name={`${entry.id}-organisation`}
                          aria-label={`${section.title}, entry ${entryIndex + 1}, organisation`}
                          placeholder="organisation"
                          value={entry.organisation ?? ''}
                          onChange={(event) =>
                            setEntryField(section.id, entry.id, 'organisation', event.target.value)
                          }
                        />
                        <input
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                          name={`${entry.id}-location`}
                          aria-label={`${section.title}, entry ${entryIndex + 1}, location`}
                          autoComplete="off"
                          placeholder="location"
                          value={entry.location ?? ''}
                          onChange={(event) =>
                            setEntryField(section.id, entry.id, 'location', event.target.value)
                          }
                        />
                        <div className="flex gap-2">
                          <input
                            className="w-1/2 rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums"
                            name={`${entry.id}-start`}
                            aria-label={`${section.title}, entry ${entryIndex + 1}, start date, YYYY-MM`}
                            inputMode="text"
                            autoComplete="off"
                            placeholder="YYYY-MM"
                            value={entry.startDate ?? ''}
                            onChange={(event) =>
                              setEntryField(section.id, entry.id, 'startDate', event.target.value)
                            }
                          />
                          <input
                            className="w-1/2 rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums"
                            name={`${entry.id}-end`}
                            aria-label={`${section.title}, entry ${entryIndex + 1}, end date, YYYY-MM`}
                            inputMode="text"
                            autoComplete="off"
                            placeholder="YYYY-MM"
                            value={entry.endDate ?? ''}
                            disabled={entry.current === true}
                            onChange={(event) =>
                              setEntryField(section.id, entry.id, 'endDate', event.target.value)
                            }
                          />
                        </div>
                      </div>

                      <label className="mt-2 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name={`${entry.id}-current`}
                          checked={entry.current === true}
                          onChange={(event) =>
                            setEntryField(section.id, entry.id, 'current', event.target.checked)
                          }
                        />
                        current
                      </label>

                      <textarea
                        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        name={`${entry.id}-text`}
                        aria-label={`${section.title}, entry ${entryIndex + 1}, description`}
                        rows={2}
                        placeholder="description / summary text"
                        value={entry.text ?? ''}
                        onChange={(event) =>
                          setEntryField(section.id, entry.id, 'text', event.target.value)
                        }
                      />

                      <input
                        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        name={`${entry.id}-tags`}
                        aria-label={`${section.title}, entry ${entryIndex + 1}, skills, comma separated`}
                        autoComplete="off"
                        placeholder="skills, comma separated"
                        value={entry.tags.join(', ')}
                        onChange={(event) => setTags(section.id, entry.id, event.target.value)}
                      />

                      <div className="mt-2 space-y-2">
                        {entry.bullets.map((bullet, bulletIndex) => (
                          <div key={bullet.id} className="flex gap-2">
                            <input
                              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                              name={`${bullet.id}-text`}
                              aria-label={`${section.title}, entry ${entryIndex + 1}, achievement ${bulletIndex + 1}`}
                              placeholder="achievement"
                              value={bullet.text}
                              onChange={(event) =>
                                setBullet(section.id, entry.id, bullet.id, event.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="rounded-md border border-border px-2 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                              onClick={() => removeBullet(section.id, entry.id, bullet.id)}
                              aria-label={`remove achievement ${bulletIndex + 1} from ${section.title}, entry ${entryIndex + 1}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="text-sm underline transition-colors duration-fade ease-ui hover:text-foreground"
                          onClick={() => addBullet(section.id, entry.id)}
                        >
                          add bullet
                        </button>
                      </div>

                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                          onClick={() => moveEntry(section.id, entry.id, -1)}
                          aria-label="move entry up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                          onClick={() => moveEntry(section.id, entry.id, 1)}
                          aria-label="move entry down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-sm transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                          onClick={() => removeEntry(section.id, entry.id)}
                        >
                          remove entry
                        </button>
                      </div>
                    </div>
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
          <section className="space-y-4">
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
                <select
                  className="rounded-md border border-border bg-background px-3 py-2 transition-colors duration-fade ease-ui hover:bg-muted active:bg-muted/70"
                  name="paper"
                  value={paperSize}
                  onChange={(event) => {
                    setPaperSize(event.target.value === 'LETTER' ? 'LETTER' : 'A4');
                  }}
                >
                  <option value="A4">A4</option>
                  <option value="LETTER">US Letter</option>
                </select>
              </label>
            </div>

            <p className="text-xs text-muted-foreground">{spec.description}</p>

            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>✓ Single column — no columns for a parser to mangle</li>
              <li>✓ No tables, no text baked into images</li>
              <li>✓ A real PDF text layer, so the text can be selected and read</li>
            </ul>

            {/* The paper itself: white stock and black ink in both themes, because this is
                the document, not the interface. */}
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
