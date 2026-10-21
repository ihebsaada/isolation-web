import { canTrackMeta } from './advertising-consent.ts';
type Fbq = ((...args:unknown[])=>void) & {queue:unknown[][];loaded:boolean;version:string;callMethod?:(...args:unknown[])=>void};
declare global { interface Window {fbq?:Fbq;_fbq?:Fbq;} }
export function initializePixel(id:string){
  if(!canTrackMeta())return;
  if(window.fbq)return;
  const f=((...args:unknown[])=>{if(f.callMethod)f.callMethod(...args);else f.queue.push(args);}) as Fbq;
  f.queue=[];f.loaded=true;f.version='2.0';window.fbq=f;window._fbq=f;
  f('consent','grant');f('set','autoConfig',false,id);f('init',id);
}
export function conversionEvents(status:string|undefined){return status==='qualified'?['Lead','QualifiedLead']:['Lead'];}
const sentReceiptEvents = new Set<string>();
export function trackReceipt(id:string,status:string|undefined){
  if(!canTrackMeta()||!window.fbq)return;
  for(const event of conversionEvents(status)){
    const key='meta:'+event+':'+id;
    if(sentReceiptEvents.has(key))continue;
    try{if(sessionStorage.getItem(key))continue;sessionStorage.setItem(key,'1');}catch{/* Keep deduplication for this page lifetime when browser storage is unavailable. */}
    sentReceiptEvents.add(key);
    try { window.fbq(event==='QualifiedLead'?'trackCustom':'track',event,{}, {eventID:id+':'+event}); } catch { /* Analytics must not invalidate a persisted submission. */ }
  }
}
