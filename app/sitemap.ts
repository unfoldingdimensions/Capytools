import type { MetadataRoute } from 'next';

import { COUNTRY_PAGES } from '@/lib/capyresume/seo/countries';
import { ROLE_PAGES } from '@/lib/capyresume/seo/roles';
import { TEMPLATE_LIST } from '@/lib/capyresume/templates';
import { siteUrl } from '@/lib/site';

/** Every route that exists whether or not the data modules grow. */
export const STATIC_PATHS = [
  '/',
  '/capyresume',
  '/privacy',
  '/terms',
  '/cookies',
  '/templates',
  '/ats-resume-format',
] as const;

/**
 * Generated from the registries, so a new template, role or country is
 * indexed without anyone remembering to edit a list. Empty while
 * NEXT_PUBLIC_SITE_URL is unset: an empty sitemap beats one full of invented
 * origins.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  if (!url) return [];

  const lastModified = new Date();
  const statics = STATIC_PATHS.map((path) => ({ url: `${url}${path}`, lastModified }));
  const yearly = (path: string) => ({
    url: `${url}${path}`,
    lastModified,
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  });
  const templates = TEMPLATE_LIST.map((spec) => ({
    ...yearly(`/templates/${spec.id}`),
    priority: 0.7,
  }));
  const roles = ROLE_PAGES.map((page) => yearly(`/resume-templates/${page.slug}`));
  const countries = COUNTRY_PAGES.map((page) => yearly(`/free-cv-builder/${page.slug}`));

  return [...statics, ...templates, ...roles, ...countries];
}
