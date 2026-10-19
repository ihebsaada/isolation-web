type Fbq = ((...args:unknown[])=>void) & {queue:unknown[][];loaded:boolean;version:string;callMethod?:(...args:unknown[])=>void};
declare global { interface Window {fbq?:Fbq;_fbq?:Fbq;} }
export function initializePixel(id:string){
  if(window.fbq)return;
  const f=((...args:unknown[])=>{if(f.callMethod)f.callMethod(...args);else f.queue.push(args);}) as Fbq;
  f.queue=[];f.loaded=true;f.version='2.0';window.fbq=f;window._fbq=f;
  f('set','autoConfig',false,id);f('init',id);
}
export function conversionEvents(status:string|undefined){return status==='qualified'?['Lead','QualifiedLead']:['Lead'];}
export function trackReceipt(id:string,status:string|undefined){
  if(!window.fbq)return;
  for(const event of conversionEvents(status)){
    const key='meta:'+event+':'+id;
    try{if(sessionStorage.getItem(key))continue;sessionStorage.setItem(key,'1');}catch{/* In-memory form lock still prevents double clicks. */}
    try { window.fbq(event==='QualifiedLead'?'trackCustom':'track',event,{}, {eventID:id+':'+event}); } catch { /* Analytics must not invalidate a persisted submission. */ }
  }
}
