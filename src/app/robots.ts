import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/seo.ts';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/leads', '/api/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
