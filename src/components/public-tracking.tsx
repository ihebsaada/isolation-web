'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { trackPublicVisit } from '@/lib/meta';
import { advertisingConsent, localMetaDiagnostic, metaConfigured, setAdvertisingConsent, subscribeAdvertisingConsent, type AdvertisingConsent } from '@/lib/advertising-consent';
export default function PublicTracking(){
  const path=usePathname();
  const choice=useSyncExternalStore(subscribeAdvertisingConsent,advertisingConsent,()=>null);
  const diagnostic=useSyncExternalStore(subscribeAdvertisingConsent,localMetaDiagnostic,()=>false);
  const [showChoices,setShowChoices]=useState(false);
  const panel=useRef<HTMLElement>(null), opener=useRef<HTMLElement|null>(null);
  const close=()=>{setShowChoices(false);opener.current?.focus();};
  const configured=metaConfigured();
  const enabled=configured && (diagnostic || choice==='accepted') && !path.startsWith('/leads');
  const choose=(value:AdvertisingConsent)=>{
    setAdvertisingConsent(value);close();
  };
  useEffect(()=>{
    const open=(event:Event)=>{
      opener.current=event instanceof CustomEvent && event.detail instanceof HTMLElement ? event.detail : null;
      setShowChoices(true);
    };
    const hash=()=>{if(location.hash==='#preferences-publicitaires')open(new Event('open'));};
    window.addEventListener('open-advertising-preferences',open);
    window.addEventListener('hashchange',hash);hash();
    return ()=>{window.removeEventListener('open-advertising-preferences',open);window.removeEventListener('hashchange',hash);};
  },[]);
  useEffect(()=>{if(showChoices)panel.current?.focus();},[showChoices]);
  useEffect(()=>{
    trackPublicVisit(path);
    if(path.startsWith('/leads'))return;
    try{
      const params=new URLSearchParams(location.search);
      const keys=['source','campaign','ad','creative','utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','fbclid','gclid'];
      const previous=JSON.parse(sessionStorage.getItem('lead-attribution')||'{}');
      const has=keys.some(k=>params.has(k));
      const attribution=has?Object.fromEntries(keys.map(k=>[k,params.get(k)?.slice(0,500)||null])):previous;
      if(!attribution.landing_path)attribution.landing_path=location.pathname;
      if(!attribution.referrer)attribution.referrer=document.referrer.slice(0,500);
      sessionStorage.setItem('lead-attribution',JSON.stringify(attribution));
    }catch{}
  },[path,enabled]);
  if(path.startsWith('/leads'))return null;
  return <>
    {showChoices&&<aside ref={panel} id="preferences-publicitaires" tabIndex={-1} className="advertising-choice" aria-labelledby="advertising-title" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close();}}}>
      <div className="advertising-choice-heading"><h2 id="advertising-title">Paramètres publicitaires</h2><button type="button" onClick={close} aria-label="Fermer les paramètres publicitaires">Fermer</button></div>
      {!configured&&<p>Le suivi publicitaire Meta est actuellement désactivé. Vous pouvez néanmoins gérer votre choix ci-dessous.</p>}
      {diagnostic&&<p>Diagnostic local actif : le suivi ignore temporairement votre choix sur cet ordinateur. Ce mode est bloqué en production.</p>}
      <p>Avec votre accord, le Pixel Meta transmet à Meta des informations sur vos visites et les demandes envoyées pour mesurer nos publicités. Vous pouvez refuser sans bloquer votre estimation. Ce choix est distinct du consentement au rappel.</p>
      <p>Votre choix est mémorisé pour la session de cet onglet et reste modifiable ici. <a href="/confidentialite">Lire la notice de confidentialité</a>.</p>
      <p role="status">{choice==='accepted'?'Votre choix : suivi autorisé.':choice==='refused'?'Votre choix : suivi désactivé.':'Le suivi reste désactivé tant que vous ne l’acceptez pas.'}</p>
      <div className="advertising-choice-actions"><button type="button" onClick={()=>choose('accepted')}>Accepter</button><button type="button" onClick={()=>choose('refused')}>{choice==='accepted'?'Désactiver le suivi':'Refuser'}</button></div>
    </aside>}
  </>;
}
