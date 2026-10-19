import type { Metadata } from 'next';

export const SITE_URL = 'https://isolationquebec.eu.cc';
export const SITE_NAME = 'Demco — Isolation résidentielle';
export const canonicalUrl = (path: string) => path === '/' ? SITE_URL : `${SITE_URL}${path}`;
export const PUBLIC_PAGES = [
  {
    path: '/',
    title: 'Isolation résidentielle au Québec | Demco',
    description: 'Parlez-nous de votre projet d’isolation résidentielle au Québec : grenier, murs ou sous-sol. Vérifiez votre secteur et préparez une demande d’estimation.',
    // Date of this page's indexing metadata update; not the crawl/request date.
    lastModified: '2026-10-19', changeFrequency: 'monthly', priority: 1,
  },
  {
    path: '/isolation/estimation',
    title: 'Estimation pour votre isolation résidentielle | Demco',
    description: 'Décrivez votre maison, votre besoin d’isolation et le délai de votre projet. Vérifiez les critères et votre secteur avant une demande de contact pour estimation.',
    lastModified: '2026-10-19', changeFrequency: 'monthly', priority: 0.8,
  },
] as const;

export function publicMetadata(path: typeof PUBLIC_PAGES[number]['path']): Metadata {
  const page = PUBLIC_PAGES.find(page => page.path === path)!;
  const url = canonicalUrl(page.path);
  const images = [{
    url: '/assets/homes/isolation-maison-hiver.png',
    width: 1122, height: 1402,
    alt: 'Maison entourée de neige, éclairée à la tombée du jour',
  }];
  return {
    title: page.title, description: page.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website', title: page.title, description: page.description,
      url, siteName: SITE_NAME, locale: 'fr_CA', images,
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description, images },
  };
}
