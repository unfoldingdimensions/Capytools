import {
    ROLE_CATALOG,
    MAX_TARGET_ROLES,
    resolveRoles,
    buildRoleGuidance,
    getRoleBaselineKeywords,
} from '@/lib/ai/roleProfiles';

describe('ROLE_CATALOG', () => {
    it('should contain 24 complete role profiles', () => {
        expect(ROLE_CATALOG.length).toBe(24);
    });

    it('should have unique ids and non-empty required fields for every profile', () => {
        const ids = ROLE_CATALOG.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);

        for (const profile of ROLE_CATALOG) {
            expect(profile.label.length).toBeGreaterThan(0);
            expect(profile.summaryAngle.length).toBeGreaterThan(0);
            expect(profile.bulletFocus.length).toBeGreaterThan(0);
            expect(profile.recruiterScreen.length).toBeGreaterThan(0);
            expect(profile.verbs.length).toBeGreaterThanOrEqual(5);
            expect(profile.keywords.length).toBeGreaterThanOrEqual(5);
            expect(profile.avoid.length).toBeGreaterThan(0);
        }
    });

    it('should cover both tech and non-tech families', () => {
        expect(ROLE_CATALOG.filter((p) => p.family === 'tech').length).toBeGreaterThan(10);
        expect(ROLE_CATALOG.filter((p) => p.family !== 'tech').length).toBeGreaterThan(10);
    });
});

describe('resolveRoles', () => {
    it('should resolve by exact label', () => {
        const [profile] = resolveRoles(['Software Engineer']);
        expect(profile?.id).toBe('software-engineer');
    });

    it('should resolve by alias (case/format insensitive)', () => {
        const [profile] = resolveRoles(['front-end developer']);
        expect(profile?.id).toBe('frontend-engineer');
        const [profile2] = resolveRoles(['Product Manager']);
        expect(profile2?.id).toBe('product-manager');
    });

    it('should cap at MAX_TARGET_ROLES', () => {
        const roles = ['Software Engineer', 'Data Analyst', 'Marketing Manager', 'Accountant'];
        const resolved = resolveRoles(roles);
        expect(resolved.length).toBe(MAX_TARGET_ROLES);
    });

    it('should de-duplicate repeated selections', () => {
        const resolved = resolveRoles(['Data Analyst', 'data analyst']);
        expect(resolved.length).toBe(1);
    });

    it('should fall back to a generic profile for custom roles', () => {
        const [profile] = resolveRoles(['Prompt Engineer']);
        expect(profile?.id).toContain('custom-');
        expect(profile?.label).toBe('Prompt Engineer');
        expect(profile?.keywords).toHaveLength(0); // no fabricated keywords
    });
});

describe('buildRoleGuidance', () => {
    it('should return empty string for no roles', () => {
        expect(buildRoleGuidance([])).toBe('');
        expect(buildRoleGuidance(undefined as unknown as string[])).toBe('');
    });

    it('should include the primary target and its keywords', () => {
        const guidance = buildRoleGuidance(['Software Engineer']);
        expect(guidance).toContain('PRIMARY target: Software Engineer');
        expect(guidance).toContain('REST APIs');
        expect(guidance).toContain('Never fabricate experience, metrics, or skills');
    });

    it('should list secondary targets', () => {
        const guidance = buildRoleGuidance(['Data Analyst', 'Business Analyst']);
        expect(guidance).toContain('Also targeting: Business Analyst');
    });

    it('should handle custom roles without fabricated keywords', () => {
        const guidance = buildRoleGuidance(['Prompt Engineer']);
        expect(guidance).toContain('PRIMARY target: Prompt Engineer');
        expect(guidance).not.toContain('REST APIs');
    });
});

describe('getRoleBaselineKeywords', () => {
    it('should return de-duplicated baseline keywords for known roles', () => {
        const keywords = getRoleBaselineKeywords(['Data Analyst', 'data analyst']);
        expect(keywords).toContain('SQL');
        expect(keywords).toContain('dashboards');
        expect(new Set(keywords).size).toBe(keywords.length);
    });

    it('should return no baseline keywords for custom-only roles', () => {
        expect(getRoleBaselineKeywords(['Prompt Engineer'])).toEqual([]);
    });
});
