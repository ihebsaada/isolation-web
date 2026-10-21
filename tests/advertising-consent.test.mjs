import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { advertisingConsent, advertisingConsentKey, setAdvertisingConsent, canTrackMeta } from '../src/lib/advertising-consent.ts';
import { initializePixel, trackReceipt } from '../src/lib/meta.ts';

test('advertising opt-in gates initialization, page events configuration and conversions; refusal and withdrawal block future events', () => {
  const oldEnabled=process.env.NEXT_PUBLIC_META_PIXEL_ENABLED,oldId=process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const saved=new Map();
  globalThis.window={location:{pathname:'/'}};
  globalThis.sessionStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
  process.env.NEXT_PUBLIC_META_PIXEL_ENABLED='true';process.env.NEXT_PUBLIC_META_PIXEL_ID='123456';
  try {
    assert.equal(advertisingConsent(),null);
    assert.equal(canTrackMeta(),false);
    initializePixel('123456');assert.equal(window.fbq,undefined);
    setAdvertisingConsent('refused');initializePixel('123456');assert.equal(window.fbq,undefined);
    setAdvertisingConsent('accepted');initializePixel('123456');assert.ok(window.fbq);
    trackReceipt('consent-pending','pending');
    assert.equal(window.fbq.queue.filter(a=>a[0]==='track'&&a[1]==='Lead').length,1);
    assert.equal(window.fbq.queue.filter(a=>a[1]==='QualifiedLead').length,0);
    setAdvertisingConsent('refused');assert.equal(canTrackMeta(),false);
    assert.equal(saved.get(advertisingConsentKey),'refused');
    assert.equal(window.fbq.queue.filter(a=>a[0]==='track').length,0);
    const count=window.fbq.queue.length;
    trackReceipt('after-withdrawal','qualified');assert.equal(window.fbq.queue.length,count);
    setAdvertisingConsent('accepted');
    assert.equal(window.fbq.queue.filter(a=>a[0]==='track').length,0); // No replay.
    process.env.NEXT_PUBLIC_META_PIXEL_ENABLED='false';assert.equal(canTrackMeta(),false);
    trackReceipt('disabled','qualified');assert.equal(window.fbq.queue.filter(a=>a[0]==='track').length,0);
    process.env.NEXT_PUBLIC_META_PIXEL_ENABLED='true';window.location.pathname='/leads';assert.equal(canTrackMeta(),false);
  } finally {
    if(oldEnabled===undefined)delete process.env.NEXT_PUBLIC_META_PIXEL_ENABLED;else process.env.NEXT_PUBLIC_META_PIXEL_ENABLED=oldEnabled;
    if(oldId===undefined)delete process.env.NEXT_PUBLIC_META_PIXEL_ID;else process.env.NEXT_PUBLIC_META_PIXEL_ID=oldId;
    delete globalThis.window;delete globalThis.sessionStorage;
  }
});

test('unknown stored choices fail closed; choice persists within the tab and UI keeps refusal independent of form submission', () => {
  const saved=new Map([[advertisingConsentKey,'invalid']]);
  globalThis.window={};globalThis.sessionStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
  try {
    assert.equal(advertisingConsent(),null);
    setAdvertisingConsent('refused');globalThis.window={};assert.equal(advertisingConsent(),'refused');
    const ui=fs.readFileSync('src/components/public-tracking.tsx','utf8');
    assert.match(ui,/enabled&&<Script/);
    assert.match(ui,/type="button" onClick=\{\(\)=>choose\('accepted'\)\}/);
    assert.match(ui,/type="button" onClick=\{\(\)=>choose\('refused'\)\}/);
    assert.ok(!ui.includes('submitLead'));
    assert.ok(fs.readFileSync('.env.example','utf8').includes('NEXT_PUBLIC_META_PIXEL_ENABLED=false'));
  } finally {delete globalThis.window;delete globalThis.sessionStorage;}
});
