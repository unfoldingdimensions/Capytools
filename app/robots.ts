import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const url = siteUrl();
  return {
    rules: { userAgent: '*', allow: '/' },
    // Advertised only when there is a real origin to point at.
    sitemap: url ? `${url}/sitemap.xml` : undefined,
  };
}
