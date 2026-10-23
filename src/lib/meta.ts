import { canTrackMeta } from './advertising-consent.ts';
type Fbq = ((...args:unknown[])=>void) & {queue:unknown[][];loaded:boolean;version:string;push?:Fbq;disablePushState?:boolean;callMethod?:(...args:unknown[])=>void};
declare global { interface Window {fbq?:Fbq;_fbq?:Fbq;} }
const initialized = new WeakMap<object, { pixel: Fbq; id: string }>();
export function initializePixel(id:string){
  if(!canTrackMeta()||!/^\d+$/.test(id))return;
  let f=window.fbq;
  if(!f){
    const stub=((...args:unknown[])=>{if(stub.callMethod)stub.callMethod(...args);else stub.queue.push(args);}) as Fbq;
    stub.queue=[];stub.loaded=true;stub.version='2.0';stub.push=stub;
    window.fbq=stub;window._fbq=stub;f=stub;
  }
  const previous=initialized.get(window);
  if(previous?.pixel===f&&previous.id===id)return;
  // Application navigation is the sole PageView authority.
  f.disablePushState=true;
  f('consent','grant');f('set','autoConfig',false,id);f('init',id);
  initialized.set(window,{pixel:f,id});
}
const libraryUrl='https://connect.facebook.net/en_US/fbevents.js';
export function loadPixelLibrary(){
  if(!canTrackMeta()||!window.fbq||typeof document==='undefined')return;
  if(document.querySelector(`script[src="${libraryUrl}"]`))return;
  const script=document.createElement('script');
  script.id='meta-pixel-library';script.async=true;script.src=libraryUrl;
  // A failed load may be retried on the next authorized visit. Never mark it delivered.
  script.onerror=()=>script.remove();
  document.head.appendChild(script);
}
const visits=new WeakMap<object,{path:string;sent:Set<string>}>();
export function trackPublicVisit(path:string){
  if(typeof window==='undefined')return;
  let visit=visits.get(window);
  // Record navigation even while tracking is disabled, including private routes.
  if(!visit||visit.path!==path){visit={path,sent:new Set()};visits.set(window,visit);}
  if(path.startsWith('/leads')||!canTrackMeta())return;
  initializePixel(process.env.NEXT_PUBLIC_META_PIXEL_ID||'');
  if(!window.fbq)return;
  loadPixelLibrary();
  for(const event of ['PageView','ViewContent']){
    if(visit.sent.has(event))continue;
    // trackSingle supports successive manual PageViews in the same document.
    try{window.fbq('trackSingle',process.env.NEXT_PUBLIC_META_PIXEL_ID,event);visit.sent.add(event);}catch{/* A later authorized effect may retry this event. */}
  }
}
export function conversionEvents(status:string|undefined){return status==='qualified'?['Lead','QualifiedLead']:['Lead'];}
const sentReceiptEvents = new Set<string>();
export function trackReceipt(id:string,status:string|undefined){
  if(!canTrackMeta())return;
  if(!window.fbq)initializePixel(process.env.NEXT_PUBLIC_META_PIXEL_ID||'');
  if(!window.fbq)return;
  loadPixelLibrary();
  for(const event of conversionEvents(status)){
    const key='meta:'+event+':'+id;
    if(sentReceiptEvents.has(key))continue;
    try{if(sessionStorage.getItem(key))continue;}catch{/* Memory deduplication still applies. */}
    try {
      window.fbq(event==='QualifiedLead'?'trackCustom':'track',event,{}, {eventID:id+':'+event});
      sentReceiptEvents.add(key);
      try{sessionStorage.setItem(key,'1');}catch{/* Keep deduplication for this page lifetime when browser storage is unavailable. */}
    } catch { /* Analytics must not invalidate a persisted submission or mark a failed call as sent. */ }
  }
}
