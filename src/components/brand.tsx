import Image from 'next/image';
import { AttributedLink } from './attributed-link';
export function Brand() { return <AttributedLink path="/" className="brand"><Image src="/assets/brand/demco-logo.png" width={132} height={48} alt="Demco" /><span>ISOLATION RÉSIDENTIELLE</span></AttributedLink>; }
export function CTA({children='Obtenir une estimation'}:{children?:string}) { return <AttributedLink className="button">{children}<span aria-hidden="true">↗</span></AttributedLink>; }
