/**
 * CapyResume — schema: factories + the migration guard.
 *
 * Pure module. `migrate()` is the safety net that makes the store trustworthy:
 * it accepts *anything* (a stale version, a hand-edited blob, `null`, a
 * half-written string) and always returns a valid `ResumeDoc`. It never throws,
 * because throwing here would lose the user's only copy of their résumé.
 */

import {
  RESUME_SCHEMA_VERSION,
  type Bullet,
  type ContactInfo,
  type Entry,
  type ResumeDoc,
  type ResumeLink,
  type Section,
  type SectionType,
  type TemplateId,
} from './types';

/** Deterministic-enough unique id. Prefers the platform UUID when available. */
export function uid(prefix = 'id'): string {
  const cryptoRef = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return `${prefix}_${cryptoRef.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export const DEFAULT_TEMPLATE: TemplateId = 'classic';

const TEMPLATE_IDS: readonly TemplateId[] = ['classic', 'compact', 'serif'];

const SECTION_TYPES: readonly SectionType[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'custom',
];

/** The sections a brand-new résumé starts with, in ATS-recommended order. */
const DEFAULT_SECTIONS: ReadonlyArray<{ type: SectionType; title: string }> = [
  { type: 'summary', title: 'Summary' },
  { type: 'experience', title: 'Experience' },
  { type: 'education', title: 'Education' },
  { type: 'skills', title: 'Skills' },
  { type: 'projects', title: 'Projects' },
  { type: 'certifications', title: 'Certifications' },
];

export function emptyBullet(text = ''): Bullet {
  return { id: uid('b'), text };
}

export function emptyEntry(): Entry {
  return { id: uid('e'), bullets: [], tags: [] };
}

export function emptySection(type: SectionType = 'custom', title = ''): Section {
  return { id: uid('s'), type, title, entries: [] };
}

export function emptyContact(): ContactInfo {
  return { name: '', links: [] };
}

export function emptyResume(): ResumeDoc {
  return {
    version: RESUME_SCHEMA_VERSION,
    templateId: DEFAULT_TEMPLATE,
    contact: emptyContact(),
    sections: DEFAULT_SECTIONS.map((section) => emptySection(section.type, section.title)),
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Coercion helpers — total functions, never throw.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Non-empty strings only, so optional fields stay optional rather than blank. */
function asOptionalString(value: unknown): string | undefined {
  const text = asString(value);
  if (text === undefined) return undefined;
  return text.length > 0 ? text : undefined;
}

function asId(value: unknown, prefix: string): string {
  const text = asString(value);
  return text && text.trim().length > 0 ? text : uid(prefix);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function asLinks(value: unknown): ResumeLink[] {
  if (!Array.isArray(value)) return [];
  const links: ResumeLink[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const label = asString(item.label) ?? '';
    const url = asString(item.url) ?? '';
    if (label.trim() || url.trim()) links.push({ label, url });
  }
  return links;
}

function asContact(value: unknown): ContactInfo {
  if (!isRecord(value)) return emptyContact();
  return {
    name: asString(value.name) ?? '',
    email: asOptionalString(value.email),
    phone: asOptionalString(value.phone),
    location: asOptionalString(value.location),
    links: asLinks(value.links),
  };
}

function asBullets(value: unknown): Bullet[] {
  if (!Array.isArray(value)) return [];
  const bullets: Bullet[] = [];
  for (const item of value) {
    // Tolerate the legacy shape where a bullet was a bare string.
    if (typeof item === 'string') {
      if (item.trim()) bullets.push(emptyBullet(item));
      continue;
    }
    if (!isRecord(item)) continue;
    bullets.push({ id: asId(item.id, 'b'), text: asString(item.text) ?? '' });
  }
  return bullets;
}

function asEntry(value: unknown): Entry | null {
  if (!isRecord(value)) return null;
  return {
    id: asId(value.id, 'e'),
    title: asOptionalString(value.title),
    organisation: asOptionalString(value.organisation),
    location: asOptionalString(value.location),
    startDate: asOptionalString(value.startDate),
    endDate: asOptionalString(value.endDate),
    current: value.current === true,
    text: asOptionalString(value.text),
    bullets: asBullets(value.bullets),
    tags: asStringArray(value.tags),
  };
}

function asSection(value: unknown): Section | null {
  if (!isRecord(value)) return null;
  const rawType = asString(value.type);
  const type: SectionType =
    rawType && (SECTION_TYPES as readonly string[]).includes(rawType)
      ? (rawType as SectionType)
      : 'custom';

  const entries: Entry[] = [];
  if (Array.isArray(value.entries)) {
    for (const item of value.entries) {
      const entry = asEntry(item);
      if (entry) entries.push(entry);
    }
  }

  return {
    id: asId(value.id, 's'),
    type,
    title: asString(value.title) ?? '',
    entries,
  };
}

function asTemplateId(value: unknown): TemplateId {
  const raw = asString(value);
  return raw && (TEMPLATE_IDS as readonly string[]).includes(raw)
    ? (raw as TemplateId)
    : DEFAULT_TEMPLATE;
}

function asIsoDate(value: unknown): string {
  const raw = asString(value);
  if (raw) {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Turn arbitrary persisted input into a valid `ResumeDoc`.
 *
 * Accepts a JSON string, a parsed object, a legacy shape, `null`, or junk.
 * Always returns a usable document and never throws.
 */
export function migrate(raw: unknown): ResumeDoc {
  let input: unknown = raw;

  // A stored string that is not JSON is a corrupt blob, not a résumé.
  if (typeof input === 'string') {
    const text = input.trim();
    if (!text) return emptyResume();
    try {
      input = JSON.parse(text);
    } catch {
      return emptyResume();
    }
  }

  if (!isRecord(input)) return emptyResume();

  const rawSections = Array.isArray(input.sections) ? input.sections : [];
  const sections: Section[] = [];
  for (const item of rawSections) {
    const section = asSection(item);
    if (section) sections.push(section);
  }

  return {
    version: RESUME_SCHEMA_VERSION,
    templateId: asTemplateId(input.templateId),
    contact: asContact(input.contact),
    sections: sections.length > 0 ? sections : emptyResume().sections,
    updatedAt: asIsoDate(input.updatedAt),
  };
}

/** Cheap structural check used by the store to decide whether to re-parse. */
export function isResumeDoc(value: unknown): value is ResumeDoc {
  return (
    isRecord(value) &&
    typeof value.version === 'number' &&
    isRecord(value.contact) &&
    Array.isArray(value.sections)
  );
}

/** True when an entry holds nothing a user typed — safe to delete without asking. */
export function isEntryEmpty(entry: Entry): boolean {
  return !(
    Boolean(
      entry.title?.trim() ||
        entry.organisation?.trim() ||
        entry.text?.trim() ||
        entry.location?.trim() ||
        entry.startDate?.trim() ||
        entry.endDate?.trim()
    ) ||
    entry.bullets.some((bullet) => bullet.text.trim().length > 0) ||
    // Blank tags are noise from a half-typed input, not content.
    entry.tags.some((tag) => tag.trim().length > 0)
  );
}

/** True when the résumé has nothing a user would recognise as content yet. */
export function isResumeEmpty(doc: ResumeDoc): boolean {
  const { contact, sections } = doc;
  const hasContact = Boolean(
    contact.name.trim() ||
      contact.email?.trim() ||
      contact.phone?.trim() ||
      contact.location?.trim() ||
      contact.links.length > 0
  );
  if (hasContact) return false;

  return sections.every((section) => section.entries.every(isEntryEmpty));
}
