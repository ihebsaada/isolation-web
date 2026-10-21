import { setAdvertisingConsent } from '../src/lib/advertising-consent.ts';
process.env.NEXT_PUBLIC_META_PIXEL_ENABLED='true';
process.env.NEXT_PUBLIC_META_PIXEL_ID='123456';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildLead, captureAttribution, classify, emptyProject, validateStep } from '../src/lib/leads.ts';
import { makeRecord, columns, filterLeads, csv } from '../src/lib/lead-record.ts';
import { normalizeProject } from '../src/lib/project-normalization.ts';
import { firstInvalidField } from '../src/lib/validation.ts';
import { qualificationStatuses, storedQualification } from '../src/lib/qualification-status.ts';
import { callCenterCsv } from '../src/lib/call-center-export.ts';
import { conversionEvents, trackReceipt } from '../src/lib/meta.ts';
import { timings } from '../src/data/isolation.ts';

const valid = {...emptyProject, city:'Laval',postalCode:'H7N1A1',owner:'oui',detached:'oui',
  need:'Sous-sol',timing:timings[0],estimate:'oui',name:'Synthetic audit',phone:'5145550123',consent:true};
const payload = (p=valid) => ({...buildLead(p,captureAttribution('')),project:p,website:''});

test('Montreal production regression: immediate interested owner is pending, never low-intent or qualified', () => {
  const input={...valid,name:'Test Montreal',city:'Montreal',postalCode:'H2X1Y4'};
  const lead=buildLead(input,captureAttribution(''));
  assert.equal(lead.classification,null);assert.equal(lead.coverage_status,'pending');
  const row=makeRecord(payload(input));
  assert.equal(row.qualification_status,'pending');assert.equal(row.qualification_pending,'true');
  assert.equal(row.project_timeline,timings[0]);assert.equal(row.intent,'oui');assert.equal(row.call_status,'new');
  assert.deepEqual(Object.keys(row),columns);assert.equal(row.city,'Montreal');
  assert.deepEqual(conversionEvents(row.qualification_status),['Lead']);
});

test('known approved city stays qualified for each existing genuine project timeline', () => {
  for(const timing of timings.slice(0,3)){
    const row=makeRecord(payload({...valid,timing}));
    assert.equal(row.qualification_status,'qualified');assert.equal(row.qualification_pending,'false');
  }
});

test('equivalent affirmative answers normalize consistently in validation, frontend and server', () => {
  for(const answer of ['oui','OUI',' oui ','yes','YES','true',true]){
    const input={...valid,owner:answer,detached:answer,estimate:answer};
    assert.equal(classify(input),'qualified');
    for(let step=0;step<4;step++){assert.equal(validateStep(step,input),null);assert.equal(firstInvalidField(step,input),null);}
    const row=makeRecord(payload(input));
    assert.equal(row.homeowner,'oui');assert.equal(row.property_type,'detached');assert.equal(row.intent,'oui');
    assert.equal(row.qualification_status,'qualified');
  }
});

test('negative aliases preserve explicit owner/property/intent decisions', () => {
  for(const answer of ['non','NON',' no ','false',false]){
    for(const key of ['owner','detached'])assert.equal(makeRecord(payload({...valid,[key]:answer})).qualification_status,'rejected');
    assert.equal(makeRecord(payload({...valid,estimate:answer})).qualification_status,'low_intent');
  }
  assert.equal(makeRecord(payload({...valid,timing:timings[3]})).qualification_status,'low_intent');
  const pendingLow=makeRecord(payload({...valid,city:'Montreal',postalCode:'H2X1Y4',estimate:'non'}));
  assert.equal(pendingLow.qualification_status,'low_intent');assert.equal(pendingLow.qualification_pending,'true');
});

test('case/accent variants of existing options normalize without adding new business options', () => {
  const input={...valid,city:'SAINT-JEROME',need:'SOUS-SOL',timing:'DES QUE POSSIBLE'};
  assert.equal(classify(input),'qualified');
  const normalized=normalizeProject(input);assert.equal(normalized.timing,timings[0]);assert.equal(normalized.need,'Sous-sol');
  assert.equal(input.timing,'DES QUE POSSIBLE');assert.equal(input.city,'SAINT-JEROME');
  assert.equal(makeRecord(payload(input)).city,'SAINT-JEROME');
});

test('missing/unknown values and non-boolean consent cannot yield persisted false positives', () => {
  for(const key of ['owner','detached','estimate','need','timing','city','postalCode','name','phone','consent']){
    const input={...valid};delete input[key];assert.throws(()=>makeRecord(payload(input)));
  }
  for(const key of ['owner','detached','estimate','need','timing']){
    for(const value of ['unknown','',1,null])assert.throws(()=>makeRecord(payload({...valid,[key]:value})));
  }
  for(const consent of [false,'true','yes',1,null]){
    assert.notEqual(classify({...valid,consent}),'qualified');assert.throws(()=>makeRecord(payload({...valid,consent})));
  }
  assert.equal(buildLead({...valid,consent:false},captureAttribution('')).qualification_pending,false);
  assert.equal(makeRecord(payload({...valid,city:'Toronto',postalCode:'M5V2T6'})).qualification_status,'rejected');
});

test('pending persists as pending in filtered exports; historical rows retain their original values', () => {
  const pending=makeRecord(payload({...valid,city:'Montréal',postalCode:'H2X1Y4'}));
  const historical={...pending,lead_id:crypto.randomUUID(),qualification_status:'low_intent'};
  const rows=[pending,historical],before=JSON.stringify(rows);
  assert.equal(filterLeads(rows,new URLSearchParams('qualification=pending')).length,1);
  assert.equal(filterLeads(rows,new URLSearchParams('qualification=low_intent')).length,1);
  assert.ok(csv([pending]).includes('"pending"'));assert.ok(callCenterCsv([pending]).includes('À vérifier'));
  assert.ok(callCenterCsv([historical]).includes('Faible intention'));
  assert.equal(JSON.stringify(rows),before);
  assert.deepEqual(qualificationStatuses,['qualified','pending','low_intent','rejected']);
  assert.equal(storedQualification(null),'pending');
});

test('pending receipts never emit QualifiedLead and repeated receipts never duplicate conversions', () => {
  const calls=[],saved=new Map([['isolation-advertising-consent-v1','accepted']]);
  globalThis.window={fbq:(...args)=>calls.push(args)};
  globalThis.sessionStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
  try{
    trackReceipt('synthetic-pending','pending');trackReceipt('synthetic-pending','pending');
    assert.equal(calls.length,1);assert.equal(calls[0][1],'Lead');
    trackReceipt('synthetic-qualified','qualified');trackReceipt('synthetic-qualified','qualified');
    assert.equal(calls.filter(c=>c[1]==='QualifiedLead').length,1);
  }finally{delete globalThis.window;delete globalThis.sessionStorage;}
});

test('consent names the caller and recipient; checkbox is explicit, required and not prechecked', async () => {
  const source=fs.readFileSync(new URL('../src/components/lead-form.tsx',import.meta.url),'utf8');
  const {contactConsentText,contactConsentVersion}=await import('../src/data/privacy.ts');
  assert.ok(source.includes('{contactConsentText}'));
  assert.match(contactConsentText,/TechVoice/);
  assert.match(contactConsentText,/DEMCO/);
  assert.match(contactConsentText,/par téléphone/);
  assert.match(contactConsentText,/informations pertinentes/);
  assert.equal(buildLead(valid,captureAttribution('')).consent.version,contactConsentVersion);
  assert.ok(/type="checkbox" checked=\{project\.consent\}.*?required/.test(source));
  assert.equal(emptyProject.consent,false);
  assert.ok(source.includes('<PrivacyNotice/>'));
  const notice=fs.readFileSync(new URL('../src/components/privacy-notice.tsx',import.meta.url),'utf8');
  for(const actor of ['Nest Studio','TechVoice','DEMCO'])assert.ok(notice.includes(actor));
  assert.ok(notice.includes('Il ne vaut pas accord au suivi publicitaire Meta'));
});

test('pending receipt remains deduplicated when browser storage is blocked', () => {
  const calls=[];
  globalThis.window={fbq:(...args)=>calls.push(args)};
  globalThis.sessionStorage={getItem(){throw Error('Storage blocked');},setItem(){throw Error('Storage blocked');}};
  setAdvertisingConsent('accepted');calls.length=0;
  try {
    trackReceipt('synthetic-storage-blocked','pending');
    trackReceipt('synthetic-storage-blocked','pending');
    assert.equal(calls.length,1);
    assert.equal(calls[0][1],'Lead');
  } finally {delete globalThis.window;delete globalThis.sessionStorage;}
});
