import { Brand } from '@/components/brand';
import { AttributedLink } from '@/components/attributed-link';
import { LeadForm } from '@/components/lead-form';
import { publicMetadata } from '@/lib/seo';
export const metadata = publicMetadata('/isolation/estimation');
export default function Estimation() { return <div className="estimation"><a className="skip-link" href="#formulaire">Aller au formulaire</a><header className="estimation-header"><Brand/><AttributedLink path="/" className="return">← Retour</AttributedLink></header><main id="formulaire" className="estimation-main"><div className="estimation-heading"><h1>Obtenez une estimation pour votre projet d’isolation</h1><p>Répondez à quelques questions sur votre maison et votre projet.</p></div><LeadForm variant="standalone"/></main></div>; }
