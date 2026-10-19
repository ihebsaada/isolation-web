import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES, canonicalUrl } from '../lib/seo.ts';

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map(page => ({
    url: canonicalUrl(page.path),
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
