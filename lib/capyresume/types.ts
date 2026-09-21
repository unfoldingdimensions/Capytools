/**
 * CapyResume — data model.
 *
 * The résumé is a plain-JSON, versioned document that lives entirely in the
 * user's browser. Nothing in these types may depend on a server, a database,
 * a session or a user account.
 *
 * Any shape change must bump `RESUME_SCHEMA_VERSION` and be handled by
 * `migrate()` in ./schema.ts — a saved résumé must never be read back as
 * garbage, and reading must never throw.
 */

/** Bump when the persisted shape changes in a way `migrate()` must repair. */
export const RESUME_SCHEMA_VERSION = 1;

/** The three single-column, ATS-parse-friendly layouts shipped in v1. */
export type TemplateId = 'classic' | 'compact' | 'serif';

export type SectionType =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'custom';

export interface ResumeLink {
  label: string;
  url: string;
}

export interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  links: ResumeLink[];
}

export interface Bullet {
  id: string;
  text: string;
}

/**
 * One row inside a section. A job, a degree, a project, a certification, or —
 * for prose sections (summary/custom) — a single entry holding `text`.
 */
export interface Entry {
  id: string;
  /** Job title / degree / project name / certification name. */
  title?: string;
  /** Company / institution / issuer. */
  organisation?: string;
  location?: string;
  /** `YYYY-MM`, or `YYYY` when only a year is known. */
  startDate?: string;
  endDate?: string;
  current?: boolean;
  /** Free prose for this entry (used by summary/custom sections). */
  text?: string;
  bullets: Bullet[];
  /** Skills / technologies. */
  tags: string[];
}

export interface Section {
  id: string;
  type: SectionType;
  /** User-editable heading — never derived at render time. */
  title: string;
  entries: Entry[];
}

/** The résumé payload: what the user actually wrote. */
export interface ResumeData {
  contact: ContactInfo;
  sections: Section[];
}

/**
 * The persisted document — `ResumeData` plus the envelope the store owns.
 * This is the single root type; `migrate()` always returns one of these.
 */
export interface ResumeDoc extends ResumeData {
  version: number;
  templateId: TemplateId;
  /** ISO-8601. Set by the store on every write. */
  updatedAt: string;
}
