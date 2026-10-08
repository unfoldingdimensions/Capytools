/**
 * Child pages under `/capyresume/resume-templates/{role}` — plan §8.4's
 * "{role} resume template" family.
 *
 * Twelve roles, each with its own introduction. The count stays small on
 * purpose: near-duplicate doorway pages are a liability, not an asset, so the
 * test suite refuses pages whose intros are filler and §6.3's banned claims
 * apply here exactly as they do on the template pages.
 */
import type { TemplateId } from '@/lib/capyresume/types';

export interface RolePageCopy {
  readonly slug: string;
  /** The H1. Also the seed for the page title. */
  readonly heading: string;
  readonly description: string;
  readonly intro: string;
}

export const ROLE_PAGES: readonly RolePageCopy[] = [
  {
    slug: 'nurse',
    heading: 'Nurse resume template',
    description:
      'Single-column nurse resume template: licence, registrations and recent clinical experience findable without hunting.',
    intro:
      'Nursing applications pass through a recruiter and a ward lead, and neither has time to hunt for a PIN number. This layout keeps licence, registrations and certifications in a block near the top, then gives clinical experience a bullets-led list where each role can state setting, caseload and hours. Nothing sits in a sidebar that a print or an extraction could drop.',
  },
  {
    slug: 'teacher',
    heading: 'Teacher resume template',
    description:
      'Teacher resume template: qualifications and key stage first, classroom and pastoral work as scannable bullets.',
    intro:
      'Schools want subjects, key stages and qualifications early — often before they want a personal statement. This template opens with that block, then runs teaching experience as bullets that separate classroom work from pastoral responsibility. Certification lines stay near the top, where a panel expects to find them.',
  },
  {
    slug: 'software-engineer',
    heading: 'Software engineer resume template',
    description:
      'Software engineer resume template: one column, outcomes with numbers, and a stack a recruiter and an engineer can both read.',
    intro:
      'Two people read this document with different eyes: a recruiter looking for a stack match, and an engineer looking for what you actually shipped. A single column serves both — the summary carries what you build, each bullet leads with an outcome and a number, and long project names wrap inside the column instead of colliding with a second one.',
  },
  {
    slug: 'product-manager',
    heading: 'Product manager resume template',
    description:
      'Product manager resume template: scope and outcomes up front, experience in one plain column.',
    intro:
      'Product hiring turns on scope — team size, surface area, timeframe — and then on outcomes. This template gives the summary room for scope, and asks each role to lead with what changed because of the work: retention, revenue, ship dates. The single column keeps metric-heavy bullets on one line where they can be compared.',
  },
  {
    slug: 'designer',
    heading: 'Designer resume template',
    description:
      'Designer resume template: a clean single column that lets the work link speak rather than a decorated layout.',
    intro:
      'A decorated résumé competes with your portfolio, and a decorative layout gives a recruiter nothing a link could not. This page keeps the document plain — one column, plain text, a link line for the portfolio — so the design work is judged where design work belongs. It exports to a PDF whose text is selectable, which matters when someone copies your contact details.',
  },
  {
    slug: 'accountant',
    heading: 'Accountant resume template',
    description:
      'Accountant resume template: qualifications, memberships and tools first, then a factual employment history.',
    intro:
      'Accounting applications are read for credentials before they are read for narrative: qualifications, memberships, and the ledgers or systems you have run. This template puts them in a block that survives a quick scan, then records employment factually — entity, role, period — with bullets for close cycles, reporting and audit work.',
  },
  {
    slug: 'sales',
    heading: 'Sales resume template',
    description:
      'Sales resume template: quota, territory and results stated plainly, one column, no charts.',
    intro:
      'Sales is the one profession where the number belongs in the résumé, not the cover letter. This layout invites you to open each role with quota attainment, territory and average deal size, and keeps those figures in plain text so they stay readable when the file is printed, forwarded or pasted into a tracker. No bars, no dials, no graphics a parser would skip.',
  },
  {
    slug: 'marketing',
    heading: 'Marketing resume template',
    description:
      'Marketing resume template: channels, budgets and measured results in a single scannable column.',
    intro:
      'Marketing experience reads best as channels plus results: what you ran, what it cost, what moved. This template gives each role a bullets-led block for campaigns and channels, and keeps budgets and percentages in the text where they can be compared across employers rather than hidden in a graphic.',
  },
  {
    slug: 'project-manager',
    heading: 'Project manager resume template',
    description:
      'Project manager resume template: methods, scale and delivery outcomes without a gantt chart in sight.',
    intro:
      'Delivery hiring wants method, scale and outcome, in that order. This page opens with the methods you actually work in, then records projects as roles: team size, budget or timeline, and what shipped. Everything sits in one column so a mixed audience — PMO, hiring manager, agency — can read it the same way.',
  },
  {
    slug: 'customer-service',
    heading: 'Customer service resume template',
    description:
      'Customer service resume template: volume, channels and quality metrics in plain, readable bullets.',
    intro:
      'Service work is judged on volume, channels and quality, so this template asks for the figures that show them: tickets or calls per shift, response targets, satisfaction scores. Contact-centre and retail systems are named in the bullets, and the whole page stays in one column for fast scanning by a team lead with twelve more to read.',
  },
  {
    slug: 'electrician',
    heading: 'Electrician resume template',
    description:
      'Electrician resume template: licences, certifications and site experience, set for one-page printing.',
    intro:
      'Trade applications are checked for tickets before they are read for style. This layout leads with licences and certifications — including expiry dates where they matter — then lists site experience by setting: commercial, domestic, industrial, new-build. It is built to print cleanly on one page, because that is how it will usually be handed over.',
  },
  {
    slug: 'chef',
    heading: 'Chef resume template',
    description:
      'Chef resume template: stations, sections and kitchens worked, on a page that survives a busy pass.',
    intro:
      'Kitchens hire on where you have worked and what station you can hold. This template lists kitchens by section and brigade size, with bullets for menu work, ordering and food-safety responsibilities. It prints in plain black on one page — practical, because it will be read with wet hands and no time.',
  },
];

/** Look a role page up by its URL slug. */
export function rolePage(slug: string): RolePageCopy | undefined {
  return ROLE_PAGES.find((page) => page.slug === slug);
}

/**
 * The two templates each role page links onward to (plan §8.4's onward links).
 * Kept as one block so the prose above stays prose; the suite asserts every
 * slug has exactly two and that every id resolves to a real template.
 */
export const ROLE_TEMPLATE_SUGGESTIONS: Record<string, readonly TemplateId[]> = {
  nurse: ['compact', 'classic'],
  teacher: ['classic', 'serif'],
  'software-engineer': ['compact', 'classic'],
  'product-manager': ['classic', 'air'],
  designer: ['air', 'journal'],
  accountant: ['classic', 'compact'],
  sales: ['compact', 'classic'],
  marketing: ['air', 'executive'],
  'project-manager': ['classic', 'compact'],
  'customer-service': ['compact', 'classic'],
  electrician: ['compact', 'classic'],
  chef: ['compact', 'air'],
};
