import Image from 'next/image';
import { SiteFooter } from '@/components/site-footer';
import { Brand, CTA } from '@/components/brand';
import { needs, benefits, process } from '@/data/isolation';
import { publicMetadata } from '@/lib/seo';
export const metadata = publicMetadata('/');
export default function Home() { return <>
  <a className="skip-link" href="#contenu">Aller au contenu</a>
  <header className="header wrap"><Brand/><nav aria-label="Navigation principale"><a href="#approche">Notre approche</a><CTA/></nav></header>
  <main id="contenu">
    <section className="hero wrap"><div className="hero-copy"><p className="eyebrow">ISOLATION RÉSIDENTIELLE</p><h1>Une maison<br/>mieux protégée,<br/><em>saison après saison.</em></h1><p className="intro">Parlez-nous de votre maison et de votre projet. Nous vérifierons votre secteur avant de transmettre votre demande.</p><CTA/><p className="caption">Pour les propriétaires de maisons individuelles.</p><div className="hero-note"><span aria-hidden="true">⌂</span><p>Le confort commence<br/>par une bonne enveloppe.</p></div></div><figure className="hero-image"><Image src="/assets/homes/isolation-maison-hiver.png" alt="Maison entourée de neige, éclairée à la tombée du jour" fill preload sizes="(max-width:700px) 100vw, 50vw"/><figcaption>Dehors, les saisons.<br/><span>Dedans, votre chez-vous.</span></figcaption></figure></section>
    <section className="needs section wrap" id="besoins"><div><p className="eyebrow">CHAQUE MAISON A SES BESOINS</p><h2>Quel espace<br/>souhaitez-vous améliorer ?</h2><p>Un besoin précis ou un projet encore à définir : commençons par ce que vous observez chez vous.</p></div><ol>{needs.map((need,i)=><li key={need}><span>0{i+1}</span>{need}<span aria-hidden="true">↗</span></li>)}</ol></section>
    <section className="comfort"><div className="wrap comfort-grid"><figure><Image src="/assets/homes/isolation-confort-famille.png" alt="Un moment en famille dans un intérieur chaleureux" width={1024} height={1024} sizes="(max-width:700px) 100vw, 50vw"/></figure><div><p className="eyebrow">LE CONFORT, DE L’INTÉRIEUR</p><h2>Bien chez vous.<br/><em>Tout simplement.</em></h2><div className="benefits">{benefits.map(([title,text])=><article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></div></div></section>
    <section className="section wrap process" id="approche"><div className="section-heading"><p className="eyebrow">UNE DÉMARCHE CLAIRE</p><h2>Votre maison.<br/>Votre projet. La suite, ensemble.</h2></div><ol>{process.map((text,i)=><li key={text}><span>0{i+1}</span><h3>{text}</h3></li>)}</ol></section>
    <section className="closing"><div className="wrap"><p className="eyebrow">FAISONS LE PREMIER PAS</p><h2>Parlons de votre<br/>projet d’isolation.</h2><CTA>Demander une estimation</CTA></div></section>
  </main><SiteFooter/>
</>; }
