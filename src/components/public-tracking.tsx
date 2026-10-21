'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { initializePixel } from '@/lib/meta';
import { advertisingConsent, canTrackMeta, metaConfigured, setAdvertisingConsent, subscribeAdvertisingConsent, type AdvertisingConsent } from '@/lib/advertising-consent';
export default function PublicTracking(){
  const path=usePathname(),last=useRef('');
  const id=process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const choice=useSyncExternalStore(subscribeAdvertisingConsent,advertisingConsent,()=>null);
  const [showChoices,setShowChoices]=useState(false);
  const configured=metaConfigured();
  const enabled=configured && choice==='accepted' && !path.startsWith('/leads');
  const choose=(value:AdvertisingConsent)=>{
    setAdvertisingConsent(value);setShowChoices(false);
  };
  useEffect(()=>{
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
    if(!enabled||!canTrackMeta()||last.current===path)return;
    initializePixel(id!);window.fbq?.('track','PageView');window.fbq?.('track','ViewContent');last.current=path;
  },[path,enabled,id]);
  if(path.startsWith('/leads')||(!configured&&path!=='/confidentialite'))return null;
  return <>
    {enabled&&<Script id="meta-pixel-library" src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive"/>}
    <aside id="preferences-publicitaires" tabIndex={-1} className="advertising-choice" aria-label="Préférences publicitaires">
      {!configured&&<p>Le suivi publicitaire Meta est actuellement désactivé. Vous pouvez néanmoins gérer votre choix ci-dessous.</p>}
      {showChoices||choice===null?<><p>Avec votre accord, le Pixel Meta transmet à Meta des informations sur vos visites et les demandes envoyées pour mesurer nos publicités. Vous pouvez refuser sans bloquer votre estimation. Ce choix est distinct du consentement au rappel.</p><p>Votre choix est mémorisé pour la session de cet onglet. Vous pouvez le modifier ici à tout moment.</p><div><button type="button" onClick={()=>choose('accepted')}>Accepter</button><button type="button" onClick={()=>choose('refused')}>Refuser</button></div></>:<><button type="button" onClick={()=>setShowChoices(true)}>Préférences publicitaires</button>{choice==='accepted'&&<button type="button" onClick={()=>choose('refused')}>Retirer mon accord publicitaire</button>}</>}
    </aside>
  </>;
}
