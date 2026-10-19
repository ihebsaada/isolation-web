'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { initializePixel } from '@/lib/meta';
export default function PublicTracking(){
  const path=usePathname(),last=useRef('');
  const id=process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const enabled=process.env.NEXT_PUBLIC_META_PIXEL_ENABLED==='true' && !!id && /^\d+$/.test(id) && !path.startsWith('/leads');
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
    if(!enabled||last.current===path)return;
    initializePixel(id!);window.fbq?.('track','PageView');window.fbq?.('track','ViewContent');last.current=path;
  },[path,enabled,id]);
  return enabled?<Script id="meta-pixel-library" src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive"/>:null;
}
