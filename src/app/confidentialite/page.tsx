import type { Metadata } from 'next';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { FullPrivacyNotice } from '@/components/privacy-notice';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Confidentialité | Isolation Québec',
  description: 'Informations sur votre demande d’estimation, les intervenants et vos choix publicitaires.',
  alternates: { canonical: '/confidentialite' },
  robots: { index: false, follow: true }, // Legal fields remain awaiting validation.
};

export default function Confidentialite() {
  return <>
    <a className="skip-link" href="#confidentialite">Aller à la notice</a>
    <header className="header wrap"><Brand/><Link className="privacy-return" href="/">Retour à l’accueil</Link></header>
    <main id="confidentialite" className="privacy-page wrap">
      <h1>Confidentialité</h1>
      <p className="privacy-intro">Votre projet, vos informations et vos choix.</p>
      <FullPrivacyNotice/>
    </main>
    <SiteFooter/>
  </>;
}
