import type { Metadata } from 'next';
import './globals.css';
import './privacy.css';
import PublicTracking from '@/components/public-tracking';
import { SITE_URL } from '@/lib/seo';
export const metadata:Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Isolation résidentielle | Demco',
  description: 'Parlez-nous de votre maison et de votre projet d’isolation. Une demande en quelques étapes, avec vérification de votre secteur.',
  icons: { icon: [{ url: '/assets/brand/demco-logo.png', type: 'image/png' }] },
};
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="fr-CA"><body>{children}<PublicTracking/></body></html>; }
