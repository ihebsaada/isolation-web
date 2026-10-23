import test from 'node:test';
import assert from 'node:assert/strict';
import { initializePixel, trackPublicVisit, trackReceipt } from '../src/lib/meta.ts';
import { setAdvertisingConsent } from '../src/lib/advertising-consent.ts';

function browser(run) {
  const keys=['NODE_ENV','NEXT_PUBLIC_META_PIXEL_ENABLED','NEXT_PUBLIC_META_PIXEL_ID'];
  const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{NODE_ENV:'production',NEXT_PUBLIC_META_PIXEL_ENABLED:'true',NEXT_PUBLIC_META_PIXEL_ID:'123456'});
  const stored=new Map(),scripts=[];
  globalThis.window={location:{pathname:'/',hostname:'isolationquebec.eu.cc'}};
  globalThis.sessionStorage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)};
  globalThis.document={querySelector:()=>scripts[0],createElement:()=>({remove(){scripts.splice(scripts.indexOf(this),1);}}),head:{appendChild(script){assert.equal(typeof window.fbq,'function');assert.ok(window.fbq.queue.some(a=>a[0]==='init'));scripts.push(script);}}};
  try{run({stored,scripts,visit:path=>{window.location.pathname=path;trackPublicVisit(path);}});}
  finally{for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}delete globalThis.window;delete globalThis.document;delete globalThis.sessionStorage;}
}

test('production bootstraps before script load, only after consent; initializes and loads once',()=>browser(({scripts,visit})=>{
  visit('/');assert.equal(window.fbq,undefined);assert.equal(scripts.length,0);
  setAdvertisingConsent('accepted');visit('/');visit('/');
  assert.equal(scripts.length,1);assert.equal(window.fbq.push,window.fbq);
  assert.equal(window.fbq.queue.filter(a=>a[0]==='init').length,1);
  assert.equal(window.fbq.disablePushState,true);
  assert.deepEqual(window.fbq.queue.filter(a=>a[0]==='trackSingle').map(a=>a.slice(1)),[['123456','PageView'],['123456','ViewContent']]);
}));

test('existing callable fbq is initialized once rather than silently skipped',()=>browser(()=>{
  const calls=[];window.fbq=(...a)=>calls.push(a);setAdvertisingConsent('accepted');calls.length=0;
  initializePixel('123456');initializePixel('123456');assert.equal(calls.filter(a=>a[0]==='init').length,1);
}));

test('refusal, reactivation and navigation retain visit boundaries without duplicate current-page events',()=>browser(({visit})=>{
  const calls=[];setAdvertisingConsent('accepted');visit('/');window.fbq.callMethod=(...a)=>calls.push(a);
  setAdvertisingConsent('refused');visit('/isolation/estimation');visit('/');assert.equal(calls.filter(a=>a[0]==='track').length,0);
  setAdvertisingConsent('accepted');visit('/');visit('/');
  assert.equal(calls.filter(a=>a[2]==='PageView').length,1);
  setAdvertisingConsent('refused');visit('/');setAdvertisingConsent('accepted');visit('/');
  assert.equal(calls.filter(a=>a[2]==='PageView').length,1);
  visit('/leads');assert.equal(calls.filter(a=>a[2]==='PageView').length,1);
  visit('/');assert.equal(calls.filter(a=>a[2]==='PageView').length,2);
}));

test('receipt before tracking effect initializes queue and stays unique; refused receipts never replay',()=>browser(({scripts})=>{
  trackReceipt('refused-before-consent','pending');assert.equal(window.fbq,undefined);
  setAdvertisingConsent('accepted');trackReceipt('early-persisted','pending');trackReceipt('early-persisted','pending');
  assert.equal(scripts.length,1);assert.equal(window.fbq.queue.filter(a=>a[1]==='Lead').length,1);
  assert.equal(window.fbq.queue.filter(a=>a[1]==='QualifiedLead').length,0);
  setAdvertisingConsent('refused');assert.equal(window.fbq.queue.filter(a=>a[0]==='track').length,0);
  setAdvertisingConsent('accepted');assert.equal(window.fbq.queue.filter(a=>a[0]==='track').length,0);
}));

test('failed library load can retry; failed conversion call is not marked as sent',()=>browser(({scripts,stored,visit})=>{
  setAdvertisingConsent('accepted');visit('/');scripts[0].onerror();assert.equal(scripts.length,0);visit('/');assert.equal(scripts.length,1);
  window.fbq.callMethod=()=>{throw Error('Library failure');};
  trackReceipt('retry-failed-call','pending');assert.equal(stored.has('meta:Lead:retry-failed-call'),false);
  const calls=[];window.fbq.callMethod=(...a)=>calls.push(a);trackReceipt('retry-failed-call','pending');trackReceipt('retry-failed-call','pending');
  assert.equal(calls.length,1);assert.equal(stored.get('meta:Lead:retry-failed-call'),'1');
}));
