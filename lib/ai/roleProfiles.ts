/**
 * Role-aware resume knowledge base.
 *
 * Every AI prompt in the resume builder can be grounded in the roles a resume
 * targets. Role profiles are BASELINES: what recruiters commonly screen for in
 * that field. When a job description is available, the JD always overrides the
 * profile keywords.
 *
 * Pure module - safe for server and client bundles.
 */

export type RoleFamily = 'tech' | 'business' | 'creative' | 'people';

import type { ParsedJobDescription } from '@/types/ai.types';

export interface RoleProfile {
    id: string;
    label: string;
    family: RoleFamily;
    aliases: string[];
    keywords: string[];
    verbs: string[];
    summaryAngle: string;
    bulletFocus: string;
    recruiterScreen: string;
    avoid: string[];
}

export const ROLE_CATALOG: RoleProfile[] = [
    // ============================================================
    // TECH
    // ============================================================
    {
        id: 'software-engineer',
        label: 'Software Engineer',
        family: 'tech',
        aliases: ['swe', 'developer', 'software developer', 'programmer'],
        keywords: ['REST APIs', 'microservices', 'SQL', 'Git', 'CI/CD', 'unit testing', 'agile', 'system design'],
        verbs: ['shipped', 'built', 'scaled', 'refactored', 'automated', 'designed', 'reduced', 'migrated'],
        summaryAngle: 'lead with shipped products and the scale of systems you have built and maintained',
        bulletFocus: 'delivery velocity, code quality, and the measurable impact of shipped work',
        recruiterScreen: 'stack fit, years of experience signals, and quantified product impact',
        avoid: ['"passionate about coding"', '"ninja"', '"rockstar"', 'vague "worked on" phrasing'],
    },
    {
        id: 'frontend-engineer',
        label: 'Frontend Engineer',
        family: 'tech',
        aliases: ['front end', 'front-end', 'frontend developer', 'front-end developer', 'front end developer', 'ui engineer', 'react developer', 'frontend dev'],
        keywords: ['React', 'TypeScript', 'accessibility', 'responsive design', 'performance', 'state management', 'testing'],
        verbs: ['implemented', 'optimized', 'shipped', 'migrated', 'built', 'improved'],
        summaryAngle: 'lead with user-facing product delivery and front-end architecture',
        bulletFocus: 'UI quality, performance (LCP/CWV), accessibility, and design-system work',
        recruiterScreen: 'framework depth, performance results, and attention to detail',
        avoid: ['"design-y" fluff without metrics', 'bullet points with no measurable outcome'],
    },
    {
        id: 'backend-engineer',
        label: 'Backend Engineer',
        family: 'tech',
        aliases: ['back end', 'back-end', 'api developer', 'server engineer'],
        keywords: ['distributed systems', 'databases', 'APIs', 'caching', 'message queues', 'observability', 'scalability'],
        verbs: ['architected', 'optimized', 'designed', 'migrated', 'hardened', 'reduced'],
        summaryAngle: 'lead with system reliability, throughput, and data integrity',
        bulletFocus: 'latency/throughput wins, fault tolerance, and clean service boundaries',
        recruiterScreen: 'system design depth, reliability metrics, data consistency',
        avoid: ['front-end-heavy bullets', 'no numbers on scale or latency'],
    },
    {
        id: 'fullstack-engineer',
        label: 'Full-Stack Engineer',
        family: 'tech',
        aliases: ['full stack', 'full-stack developer'],
        keywords: ['end-to-end', 'APIs', 'databases', 'CI/CD', 'frontend', 'backend', 'feature delivery'],
        verbs: ['shipped', 'integrated', 'built', 'automated', 'owned'],
        summaryAngle: 'lead with end-to-end ownership of features across the stack',
        bulletFocus: 'shipping complete features from database to UI',
        recruiterScreen: 'breadth across stack + depth in at least one layer',
        avoid: ['only frontend or only backend', 'generic "full-stack developer" with no examples'],
    },
    {
        id: 'devops-sre',
        label: 'DevOps / Site Reliability Engineer',
        family: 'tech',
        aliases: ['devops', 'sre', 'platform engineer', 'infrastructure engineer'],
        keywords: ['CI/CD', 'Kubernetes', 'Terraform', 'IaC', 'monitoring', 'SLOs', 'incident response', 'AWS'],
        verbs: ['automated', 'orchestrated', 'cut', 'achieved', 'standardized', 'reduced'],
        summaryAngle: 'lead with reliability outcomes (uptime, MTTR) and infrastructure as code',
        bulletFocus: 'automation, reliability metrics, and cost reduction',
        recruiterScreen: 'uptime %, MTTR, and hands-on IaC evidence',
        avoid: ['ops-only lists with no outcome', 'cert-only claims without applied results'],
    },
    {
        id: 'data-scientist',
        label: 'Data Scientist',
        family: 'tech',
        aliases: ['data science', 'ml scientist', 'analytics scientist'],
        keywords: ['statistics', 'machine learning', 'Python', 'experimentation', 'A/B testing', 'model evaluation', 'feature engineering'],
        verbs: ['modeled', 'evaluated', 'improved', 'measured', 'built', 'validated'],
        summaryAngle: 'lead with model/business impact and rigorous experimentation',
        bulletFocus: 'experiment wins, model performance, and communication of results',
        recruiterScreen: 'business impact of models, statistical rigor, stakeholder communication',
        avoid: ['pure math with no business result', 'notebook-only work'],
    },
    {
        id: 'data-analyst',
        label: 'Data Analyst',
        family: 'tech',
        aliases: ['analyst', 'business intelligence analyst', 'bi analyst'],
        keywords: ['SQL', 'dashboards', 'BI', 'KPIs', 'data storytelling', 'Excel', 'Python', 'Looker/Tableau/PowerBI'],
        verbs: ['analyzed', 'built', 'uncovered', 'recommended', 'streamlined', 'identified'],
        summaryAngle: 'lead with insights that drove real decisions',
        bulletFocus: 'analysis → decision → measurable outcome',
        recruiterScreen: 'tooling, and examples of insight that moved the business',
        avoid: ['"created reports" with no impact', 'vague dashboard descriptions'],
    },
    {
        id: 'ml-engineer',
        label: 'Machine Learning Engineer',
        family: 'tech',
        aliases: ['mle', 'ml ops', 'applied ml engineer'],
        keywords: ['model serving', 'MLOps', 'pipelines', 'LLMs', 'fine-tuning', 'evaluation', 'inference', 'Python'],
        verbs: ['deployed', 'productionized', 'reduced', 'optimized', 'built', 'operationalized'],
        summaryAngle: 'lead with models you deployed to production, not just trained',
        bulletFocus: 'production impact, latency/cost, and evaluation rigor',
        recruiterScreen: 'deployed systems, eval discipline, engineering pragmatism',
        avoid: ['notebook-only claims', 'no latency/cost/quality numbers'],
    },
    {
        id: 'cloud-architect',
        label: 'Cloud / Solutions Architect',
        family: 'tech',
        aliases: ['solutions architect', 'cloud engineer', 'aws architect', 'azure architect'],
        keywords: ['AWS', 'Azure', 'GCP', 'high availability', 'cost optimization', 'migrations', 'scalability', 'security'],
        verbs: ['designed', 'migrated', 'cut', 'standardized', 'architected', 'right-sized'],
        summaryAngle: 'lead with architecture decisions and their business outcomes',
        bulletFocus: 'cost savings, availability, and migration wins',
        recruiterScreen: 'architecture depth, cost impact, HA design',
        avoid: ['certs without outcomes', 'generic "architected solutions"'],
    },
    {
        id: 'cybersecurity-analyst',
        label: 'Cybersecurity Analyst',
        family: 'tech',
        aliases: ['security analyst', 'soc analyst', 'infosec'],
        keywords: ['SIEM', 'threat intelligence', 'incident response', 'vulnerability management', 'compliance', 'SOC2', 'ISO 27001', 'endpoint'],
        verbs: ['detected', 'remediated', 'hardened', 'responded', 'contained', 'reduced'],
        summaryAngle: 'lead with detection coverage and incident response outcomes',
        bulletFocus: 'response time, hardening results, and audit readiness',
        recruiterScreen: 'detection depth, IR experience, compliance familiarity',
        avoid: ['scaremongering', 'no specific detection/response examples'],
    },
    {
        id: 'qa-engineer',
        label: 'QA / Test Engineer',
        family: 'tech',
        aliases: ['quality assurance', 'test engineer', 'sdets', 'automation engineer'],
        keywords: ['test automation', 'CI integration', 'test strategy', 'coverage', 'Playwright', 'Selenium', 'regression'],
        verbs: ['automated', 'caught', 'reduced', 'built', 'hardened', 'prevented'],
        summaryAngle: 'lead with test strategy and the confidence you bring to releases',
        bulletFocus: 'automation coverage, defects caught, release confidence',
        recruiterScreen: 'automation skills and measurable quality outcomes',
        avoid: ['"tested everything"', 'no coverage/defect numbers'],
    },
    {
        id: 'product-manager',
        label: 'Product Manager',
        family: 'tech',
        aliases: ['pm', 'product', 'product owner', 'technical product manager'],
        keywords: ['roadmap', 'discovery', 'metrics', 'A/B testing', 'PRDs', 'stakeholders', 'prioritization', 'launch'],
        verbs: ['shipped', 'prioritized', 'launched', 'grew', 'defined', 'led'],
        summaryAngle: 'lead with outcomes shipped, not features delivered',
        bulletFocus: 'metric wins, decision quality, and cross-team leadership',
        recruiterScreen: 'shipped outcomes, north-star metrics, prioritization judgment',
        avoid: ['feature laundry lists', 'no metrics on impact'],
    },

    // ============================================================
    // BUSINESS / OPS
    // ============================================================
    {
        id: 'marketing-manager',
        label: 'Marketing Manager',
        family: 'business',
        aliases: ['marketing', 'growth manager', 'brand manager', 'digital marketing'],
        keywords: ['campaigns', 'funnel', 'CAC', 'ROAS', 'SEO/SEM', 'brand', 'content', 'email'],
        verbs: ['launched', 'grew', 'optimized', 'managed', 'scaled', 'improved'],
        summaryAngle: 'lead with channel growth and ROI',
        bulletFocus: 'campaign performance, budget efficiency, and pipeline contribution',
        recruiterScreen: 'ROI/CAC/ROAS numbers and channel depth',
        avoid: ['"creative" with no numbers', 'vanity metrics only'],
    },
    {
        id: 'sales-account-executive',
        label: 'Sales / Account Executive',
        family: 'business',
        aliases: ['sales', 'ae', 'account executive', 'business development', 'bdr', 'sales rep'],
        keywords: ['pipeline', 'quota attainment', 'CRM', 'discovery', 'negotiation', 'upsell', 'forecasting'],
        verbs: ['closed', 'grew', 'expanded', 'exceeded', 'negotiated', 'built'],
        summaryAngle: 'lead with revenue attainment',
        bulletFocus: 'quota, win rate, deal size, and pipeline quality',
        recruiterScreen: 'revenue numbers, quota achievement %, territory growth',
        avoid: ['"hunter" clichés without numbers', 'no quota attainment'],
    },
    {
        id: 'project-manager',
        label: 'Project Manager',
        family: 'business',
        aliases: ['pm', 'project lead', 'delivery manager', 'program manager'],
        keywords: ['scope', 'schedule', 'risk management', 'stakeholders', 'agile', 'waterfall', 'PMP', 'budgets'],
        verbs: ['delivered', 'coordinated', 'de-risked', 'streamlined', 'led', 'tracked'],
        summaryAngle: 'lead with on-time, on-budget delivery',
        bulletFocus: 'delivery reliability, risk handling, and cross-team coordination',
        recruiterScreen: 'delivery record, methodology fluency, stakeholder management',
        avoid: ['buzzword soup', 'no delivery metrics'],
    },
    {
        id: 'hr-people-ops',
        label: 'HR / People Operations',
        family: 'people',
        aliases: ['human resources', 'people ops', 'hr generalist', 'recruiter', 'talent'],
        keywords: ['recruiting', 'onboarding', 'engagement', 'retention', 'compliance', 'performance reviews', 'culture'],
        verbs: ['hired', 'improved', 'streamlined', 'reduced', 'built', 'retained'],
        summaryAngle: 'lead with people outcomes: retention, hiring quality, process',
        bulletFocus: 'retention, time-to-hire, engagement scores, process improvement',
        recruiterScreen: 'people metrics and compliance awareness',
        avoid: ['fluffy "people person"', 'no measurable HR outcomes'],
    },
    {
        id: 'financial-analyst',
        label: 'Financial Analyst',
        family: 'business',
        aliases: ['finance analyst', 'fp&a', 'investment analyst'],
        keywords: ['modeling', 'forecasting', 'variance analysis', 'Excel', 'BI', 'GAAP', 'due diligence'],
        verbs: ['modeled', 'forecasted', 'analyzed', 'recommended', 'streamlined', 'built'],
        summaryAngle: 'lead with analytical accuracy and decision impact',
        bulletFocus: 'forecast accuracy, variance insights, and models that moved decisions',
        recruiterScreen: 'modeling skill and business impact of analysis',
        avoid: ['no quantifiable impact', 'generic "prepared reports"'],
    },
    {
        id: 'accountant',
        label: 'Accountant',
        family: 'business',
        aliases: ['accounting', 'staff accountant', 'senior accountant', 'bookkeeper'],
        keywords: ['GAAP', 'reconciliations', 'month-end close', 'audits', 'tax preparation', 'ERP', 'AP/AR'],
        verbs: ['closed', 'reconciled', 'streamlined', 'prepared', 'reduced', 'implemented'],
        summaryAngle: 'lead with close speed and error-free accuracy',
        bulletFocus: 'close cycle time, audit cleanliness, process automation',
        recruiterScreen: 'accuracy, close efficiency, compliance knowledge',
        avoid: ['generic "handled the books"', 'no scale or efficiency data'],
    },
    {
        id: 'customer-success',
        label: 'Customer Success Manager',
        family: 'people',
        aliases: ['cs', 'customer success', 'client success', 'account manager'],
        keywords: ['retention', 'NRR', 'onboarding', 'churn reduction', 'QBRs', 'expansion revenue', 'advocacy'],
        verbs: ['retained', 'expanded', 'onboarded', 'reduced', 'grew', 'rescued'],
        summaryAngle: 'lead with retention and expansion revenue',
        bulletFocus: 'retention %, NRR, churn reduction, and upsell wins',
        recruiterScreen: 'retention/expansion numbers and customer empathy evidence',
        avoid: ['support-ticket framing', 'no retention metrics'],
    },
    {
        id: 'operations-manager',
        label: 'Operations Manager',
        family: 'business',
        aliases: ['operations', 'ops manager', 'plant manager', 'logistics manager'],
        keywords: ['process improvement', 'KPIs', 'cost control', 'vendors', 'logistics', 'lean', 'inventory'],
        verbs: ['streamlined', 'reduced', 'scaled', 'negotiated', 'implemented', 'improved'],
        summaryAngle: 'lead with efficiency and cost outcomes',
        bulletFocus: 'efficiency gains, cost savings, and process scale',
        recruiterScreen: 'measured efficiency/cost results',
        avoid: ['no numbers', 'responsibility lists without outcomes'],
    },
    {
        id: 'business-analyst',
        label: 'Business Analyst',
        family: 'business',
        aliases: ['ba', 'requirements analyst', 'systems analyst'],
        keywords: ['requirements', 'process mapping', 'BRDs', 'data analysis', 'agile ceremonies', 'stakeholders', 'SQL'],
        verbs: ['documented', 'mapped', 'quantified', 'aligned', 'identified', 'recommended'],
        summaryAngle: 'lead with requirements clarity and stakeholder alignment',
        bulletFocus: 'requirements quality, process improvements, and data-backed recommendations',
        recruiterScreen: 'requirements rigor and ability to bridge business/tech',
        avoid: ['"gathered requirements" only', 'no analysis outcomes'],
    },

    // ============================================================
    // CREATIVE / CONTENT
    // ============================================================
    {
        id: 'content-writer',
        label: 'Content Writer / Copywriter',
        family: 'creative',
        aliases: ['copywriter', 'content marketer', 'editor', 'blog writer', 'ux writer'],
        keywords: ['SEO', 'storytelling', 'conversion copy', 'brand voice', 'CMS', 'editorial', 'A/B copy'],
        verbs: ['wrote', 'increased', 'ranked', 'converted', 'edited', 'grew'],
        summaryAngle: 'lead with content performance, not just volume',
        bulletFocus: 'engagement, rankings, conversions, and editorial quality',
        recruiterScreen: 'writing quality and performance data',
        avoid: ['no performance data', 'self-indulgent "wordsmith" language'],
    },
    {
        id: 'graphic-ux-designer',
        label: 'Graphic / UX Designer',
        family: 'creative',
        aliases: ['ui designer', 'ux designer', 'product designer', 'graphic designer', 'visual designer'],
        keywords: ['Figma', 'design systems', 'usability', 'user research', 'wireframes', 'prototyping', 'accessibility'],
        verbs: ['designed', 'shipped', 'systematized', 'improved', 'researched', 'iterated'],
        summaryAngle: 'lead with shipped designs and usability outcomes',
        bulletFocus: 'design-system work, usability wins, and user research impact',
        recruiterScreen: 'portfolio-quality work and measurable usability improvements',
        avoid: ['"passionate about design"', 'no shipped work or outcomes'],
    },
    {
        id: 'executive-assistant',
        label: 'Executive Assistant / Admin',
        family: 'people',
        aliases: ['ea', 'administrative assistant', 'office manager', 'personal assistant'],
        keywords: ['calendar', 'travel', 'inbox', 'expenses', 'stakeholder communication', 'discretion', 'events'],
        verbs: ['coordinated', 'managed', 'streamlined', 'protected', 'prepared', 'executed'],
        summaryAngle: 'lead with reliability and the scope you support',
        bulletFocus: 'efficiency, discretion, and supporting leadership throughput',
        recruiterScreen: 'reliability, discretion, and scale of responsibility',
        avoid: ['no scale of responsibility', 'generic "assisted executive"'],
    },
];

/** Maximum roles a resume should target (deliberate: each extra role dilutes keywords). */
export const MAX_TARGET_ROLES = 3;

function normalizeRole(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9+]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Resolves user-selected/custom role strings to role profiles.
 * Matches on label + aliases; unmatched custom roles fall back to a generic
 * guidance built from the user's own label (no fabricated keywords).
 */
export function resolveRoles(targetRoles: string[]): RoleProfile[] {
    const seen = new Set<string>();
    const profiles: RoleProfile[] = [];

    for (const raw of (targetRoles || []).slice(0, MAX_TARGET_ROLES)) {
        const needle = normalizeRole(raw);
        if (!needle || seen.has(needle)) continue;

        const match =
            ROLE_CATALOG.find(
                (p) =>
                    normalizeRole(p.label) === needle ||
                    p.aliases.some((a) => normalizeRole(a) === needle)
            ) ?? null;

        if (match) {
            seen.add(needle);
            profiles.push(match);
        } else {
            // Custom / unknown role: use the user's own phrasing as the target.
            seen.add(needle);
            profiles.push({
                id: `custom-${needle}`,
                label: raw.trim(),
                family: 'business',
                aliases: [raw.trim()],
                keywords: [],
                verbs: ['led', 'built', 'improved', 'delivered', 'optimized', 'grew', 'managed', 'launched'],
                summaryAngle: `position the candidate for ${raw.trim()} roles`,
                bulletFocus: 'measurable achievements and impact over responsibilities',
                recruiterScreen: `relevance to ${raw.trim()} responsibilities and measurable results`,
                avoid: ['generic filler', 'unquantified claims'],
            });
        }
    }

    return profiles;
}

/**
 * Builds a compact instruction block injected into AI system prompts.
 * The job description, when present, always overrides role baseline keywords.
 */
export function buildRoleGuidance(targetRoles: string[]): string {
    const profiles = resolveRoles(targetRoles);
    const primary = profiles[0];
    if (!primary) return '';
    const secondary = profiles.slice(1);

    let block =
        'TARGET ROLE CONTEXT (apply on top of the generic rules; if a job description is also provided, its keywords override these baselines):\n' +
        `- PRIMARY target: ${primary.label}. Summary should ${primary.summaryAngle}. ` +
        `Emphasize: ${primary.bulletFocus}. Baseline keywords to weave in naturally where truthful: ${primary.keywords.slice(0, 6).join(', ') || 'the candidate\u2019s stated role language'}. ` +
        `Strong verbs to prefer: ${primary.verbs.join(', ')}. Recruiters screen for: ${primary.recruiterScreen}. ` +
        `Avoid: ${primary.avoid.join(', ')}.`;

    if (secondary.length > 0) {
        block +=
            '\n- Also targeting: ' +
            secondary
                .map(
                    (p) =>
                        `${p.label} (emphasize ${p.bulletFocus}; keywords: ${p.keywords.slice(0, 4).join(', ') || 'candidate\u2019s stated role language'})`
                )
                .join(' | ');
    }

    block +=
        '\n- Never fabricate experience, metrics, or skills that are not present in the source data. If numbers are missing, use honest relative phrasing or leave them out.';

    return block;
}

/**
 * Returns baseline keywords for role-based ATS scoring when no job description exists.
 * Distinct labels are combined and de-duplicated (primary role weighted first).
 */
export function getRoleBaselineKeywords(targetRoles: string[]): string[] {
    const profiles = resolveRoles(targetRoles);
    const keywords: string[] = [];

    for (const profile of profiles) {
        for (const keyword of profile.keywords) {
            if (!keywords.includes(keyword)) keywords.push(keyword);
        }
    }

    return keywords;
}

/**
 * Builds a synthetic job description from target roles, used for role-baseline
 * ATS scoring and section optimization when no real job description exists.
 *
 * - `requirements` is always non-empty (the server scorer throws on empty).
 * - `experienceLevel` stays undefined: we cannot infer seniority from a role name,
 *   so the experience category is scored neutrally rather than guessed.
 *
 * Returns null when there are no resolvable roles.
 */
export function buildRoleBaselineJobDescription(targetRoles: string[]): ParsedJobDescription | null {
    const profiles = resolveRoles(targetRoles);
    const primary = profiles[0];
    if (!primary) return null;

    const keywords = getRoleBaselineKeywords(targetRoles);
    const requirements =
        keywords.length > 0
            ? keywords.map((keyword) => `Proficiency in ${keyword}`)
            : [`Experience in ${primary.label}`];

    return {
        title: primary.label,
        company: '',
        description: `Target roles: ${profiles.map((p) => p.label).join(', ')}`,
        requirements,
        responsibilities: [],
        skills: keywords,
        keywords,
        experienceLevel: undefined,
        employmentType: undefined,
    };
}
