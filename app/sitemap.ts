import type { MetadataRoute } from 'next';

import { TEMPLATE_LIST } from '@/lib/capyresume/templates';
import { siteUrl } from '@/lib/site';

/** The routes that exist whether or not the registry grows. */
const STATIC_PATHS = ['/', '/capyresume', '/privacy', '/terms', '/cookies'] as const;

/**
 * Generated from the template registry, so a new template is indexed without
 * anyone remembering to edit a list. Empty while NEXT_PUBLIC_SITE_URL is
 * unset: an empty sitemap beats one full of invented origins.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  if (!url) return [];

  const lastModified = new Date();
  const statics = STATIC_PATHS.map((path) => ({ url: `${url}${path}`, lastModified }));
  const templates = TEMPLATE_LIST.map((spec) => ({
    url: `${url}/templates/${spec.id}`,
    lastModified,
    changeFrequency: 'yearly',
    priority: 0.7,
  }));

  return [...statics, ...templates];
}
