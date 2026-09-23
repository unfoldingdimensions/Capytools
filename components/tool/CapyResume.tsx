'use client';

/**
 * CapyResume — the tool.
 *
 * Everything happens in this tab: the résumé is read from and written to
 * `localStorage`, and the PDF/DOCX/JSON are produced locally. There is no
 * server call anywhere in this file.
 *
 * Styling is deliberately plain — the visual pass comes later.
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
import { emptyBullet, emptyEntry, emptySection } from '@/lib/capyresume/schema';
import { lintResume } from '@/lib/capyresume/hints';
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
import type { Entry, ResumeDoc, Section, SectionType, TemplateId } from '@/lib/capyresume/types';

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

  /** Apply a change and persist it. Storage failures are surfaced, never swallowed. */
  const edit = (mutate: (draft: ResumeDoc) => ResumeDoc) => {
    try {
      saveResume(mutate(doc));
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save to this browser.');
    }
  };

  // ---------------------------------------------------------------- contact
  const setContact = (field: 'name' | 'email' | 'phone' | 'location', value: string) =>
    edit((d) => ({ ...d, contact: { ...d.contact, [field]: value } }));

  const addLink = () =>
    edit((d) => ({
      ...d,
      contact: { ...d.contact, links: [...d.contact.links, { label: '', url: '' }] },
    }));

  const setLink = (index: number, field: 'label' | 'url', value: string) =>
    edit((d) => ({
      ...d,
      contact: {
        ...d.contact,
        links: d.contact.links.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
      },
    }));

  const removeLink = (index: number) =>
    edit((d) => ({
      ...d,
      contact: { ...d.contact, links: d.contact.links.filter((_, i) => i !== index) },
    }));

  // --------------------------------------------------------------- sections
  const mapSections = (d: ResumeDoc, fn: (section: Section) => Section): ResumeDoc => ({
    ...d,
    sections: d.sections.map(fn),
  });

  const addSection = (type: SectionType) => {
    const label = SECTION_CHOICES.find((c) => c.type === type)?.label ?? 'Section';
    edit((d) => ({ ...d, sections: [...d.sections, emptySection(type, label)] }));
  };

  const removeSection = (id: string) =>
    edit((d) => ({ ...d, sections: d.sections.filter((s) => s.id !== id) }));

  const moveSection = (id: string, delta: number) =>
    edit((d) => {
      const index = d.sections.findIndex((s) => s.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= d.sections.length) return d;
      const sections = [...d.sections];
      const [moved] = sections.splice(index, 1);
      sections.splice(target, 0, moved!);
      return { ...d, sections };
    });

  const setSectionTitle = (id: string, title: string) =>
    edit((d) => mapSections(d, (s) => (s.id === id ? { ...s, title } : s)));

  const addEntry = (sectionId: string) =>
    edit((d) =>
      mapSections(d, (s) =>
        s.id === sectionId ? { ...s, entries: [...s.entries, emptyEntry()] } : s
      )
    );

  const removeEntry = (sectionId: string, entryId: string) =>
    edit((d) =>
      mapSections(d, (s) =>
        s.id === sectionId ? { ...s, entries: s.entries.filter((e) => e.id !== entryId) } : s
      )
    );

  const moveEntry = (sectionId: string, entryId: string, delta: number) =>
    edit((d) =>
      mapSections(d, (s) => {
        if (s.id !== sectionId) return s;
        const index = s.entries.findIndex((e) => e.id === entryId);
        const target = index + delta;
        if (index < 0 || target < 0 || target >= s.entries.length) return s;
        const entries = [...s.entries];
        const [moved] = entries.splice(index, 1);
        entries.splice(target, 0, moved!);
        return { ...s, entries };
      })
    );

  const mapEntries = (d: ResumeDoc, sectionId: string, fn: (entry: Entry) => Entry): ResumeDoc =>
    mapSections(d, (s) => (s.id === sectionId ? { ...s, entries: s.entries.map(fn) } : s));

  const setEntryField = (
    sectionId: string,
    entryId: string,
    field: keyof Entry,
    value: string | boolean
  ) =>
    edit((d) => mapEntries(d, sectionId, (e) => (e.id === entryId ? { ...e, [field]: value } : e)));

  const addBullet = (sectionId: string, entryId: string) =>
    edit((d) =>
      mapEntries(d, sectionId, (e) =>
        e.id === entryId ? { ...e, bullets: [...e.bullets, emptyBullet()] } : e
      )
    );

  const setBullet = (sectionId: string, entryId: string, bulletId: string, text: string) =>
    edit((d) =>
      mapEntries(d, sectionId, (e) =>
        e.id === entryId
          ? { ...e, bullets: e.bullets.map((b) => (b.id === bulletId ? { ...b, text } : b)) }
          : e
      )
    );

  const removeBullet = (sectionId: string, entryId: string, bulletId: string) =>
    edit((d) =>
      mapEntries(d, sectionId, (e) =>
        e.id === entryId ? { ...e, bullets: e.bullets.filter((b) => b.id !== bulletId) } : e
      )
    );

  const setTags = (sectionId: string, entryId: string, raw: string) =>
    edit((d) =>
      mapEntries(d, sectionId, (e) =>
        e.id === entryId
          ? {
              ...e,
              tags: raw
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t.length > 0),
            }
          : e
      )
    );

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
      saveResume(imported);
      setNotice('Imported. Your résumé is back.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'That file could not be read.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">CapyResume</h1>
            <p className="text-sm text-muted-foreground">
              A CV that&rsquo;s actually yours. Made in your tab.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm"
              onClick={() => edit(() => ({ ...DEMO_RESUME }))}
            >
              Load demo
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm"
              onClick={() => {
                clearResume();
                setNotice('Cleared. Nothing of yours is left in this browser.');
              }}
            >
              Clear
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

        {notice && (
          <p role="status" className="mb-6 rounded-md border border-border bg-muted/60 p-3 text-sm">
            {notice}
          </p>
        )}

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
                  ['name', 'Full name'],
                  ['email', 'Email'],
                  ['phone', 'Phone'],
                  ['location', 'Location'],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{label}</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    value={doc.contact[field] ?? ''}
                    onChange={(event) => setContact(field, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Links</span>
                <button type="button" className="text-sm underline" onClick={addLink}>
                  Add link
                </button>
              </div>
              {doc.contact.links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    className="w-1/3 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Label"
                    value={link.label}
                    onChange={(event) => setLink(index, 'label', event.target.value)}
                  />
                  <input
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="URL"
                    value={link.url}
                    onChange={(event) => setLink(index, 'url', event.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 text-sm"
                    onClick={() => removeLink(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {doc.sections.map((section) => (
              <div key={section.id} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <input
                    className="min-w-[10rem] flex-1 rounded-md border border-border bg-background px-3 py-2 font-medium"
                    value={section.title}
                    onChange={(event) => setSectionTitle(section.id, event.target.value)}
                    aria-label="Section title"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 text-sm"
                    onClick={() => moveSection(section.id, -1)}
                    aria-label={`Move ${section.title} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 text-sm"
                    onClick={() => moveSection(section.id, 1)}
                    aria-label={`Move ${section.title} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 text-sm"
                    onClick={() => removeSection(section.id)}
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-4">
                  {section.entries.map((entry) => (
                    <div key={entry.id} className="rounded-md bg-muted/30 p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                          placeholder="Organisation"
                          value={entry.organisation ?? ''}
                          onChange={(event) =>
                            setEntryField(section.id, entry.id, 'organisation', event.target.value)
                          }
                        />
                        <input
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                          placeholder="Location"
                          value={entry.location ?? ''}
                          onChange={(event) =>
                            setEntryField(section.id, entry.id, 'location', event.target.value)
                          }
                        />
                        <div className="flex gap-2">
                          <input
                            className="w-1/2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                            placeholder="YYYY-MM"
                            value={entry.startDate ?? ''}
                            onChange={(event) =>
                              setEntryField(section.id, entry.id, 'startDate', event.target.value)
                            }
                          />
                          <input
                            className="w-1/2 rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                          checked={entry.current === true}
                          onChange={(event) =>
                            setEntryField(section.id, entry.id, 'current', event.target.checked)
                          }
                        />
                        Current
                      </label>

                      <textarea
                        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        rows={2}
                        placeholder="Description / summary text"
                        value={entry.text ?? ''}
                        onChange={(event) =>
                          setEntryField(section.id, entry.id, 'text', event.target.value)
                        }
                      />

                      <input
                        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        placeholder="Skills, comma separated"
                        value={entry.tags.join(', ')}
                        onChange={(event) => setTags(section.id, entry.id, event.target.value)}
                      />

                      <div className="mt-2 space-y-2">
                        {entry.bullets.map((bullet) => (
                          <div key={bullet.id} className="flex gap-2">
                            <input
                              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                              placeholder="Achievement"
                              value={bullet.text}
                              onChange={(event) =>
                                setBullet(section.id, entry.id, bullet.id, event.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="rounded-md border border-border px-2 text-sm"
                              onClick={() => removeBullet(section.id, entry.id, bullet.id)}
                              aria-label="Remove bullet"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="text-sm underline"
                          onClick={() => addBullet(section.id, entry.id)}
                        >
                          Add bullet
                        </button>
                      </div>

                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-sm"
                          onClick={() => moveEntry(section.id, entry.id, -1)}
                          aria-label="Move entry up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-sm"
                          onClick={() => moveEntry(section.id, entry.id, 1)}
                          aria-label="Move entry down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-sm"
                          onClick={() => removeEntry(section.id, entry.id)}
                        >
                          Remove entry
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="text-sm underline"
                    onClick={() => addEntry(section.id)}
                  >
                    Add entry
                  </button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Add section:</span>
              {SECTION_CHOICES.map((choice) => (
                <button
                  key={choice.type}
                  type="button"
                  className="rounded-md border border-border px-3 py-1.5 text-sm"
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
                <span className="mb-1 block text-muted-foreground">Template</span>
                <select
                  className="rounded-md border border-border bg-background px-3 py-2"
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
                <span className="mb-1 block text-muted-foreground">Paper</span>
                <select
                  className="rounded-md border border-border bg-background px-3 py-2"
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
                className="min-w-[84px] rounded-md border border-border px-4 py-2"
                onClick={() => {
                  void exportPdf();
                }}
                disabled={busy !== null}
              >
                {busy === 'pdf' ? 'Making PDF…' : 'Download PDF'}
              </button>
              <button
                type="button"
                className="min-w-[84px] rounded-md border border-border px-4 py-2"
                onClick={() => {
                  void exportDocx();
                }}
                disabled={busy !== null}
              >
                {busy === 'docx' ? 'Making DOCX…' : 'Download DOCX'}
              </button>
              <button
                type="button"
                className="min-w-[84px] rounded-md border border-border px-4 py-2"
                onClick={exportJson}
              >
                JSON backup
              </button>
              <button
                type="button"
                className="min-w-[84px] rounded-md border border-border px-4 py-2"
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
        </div>
      </footer>
    </div>
  );
}
