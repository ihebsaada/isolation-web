import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyProject, classify, validateStep, captureAttribution, buildLead, coverageStatus, attributionKeys } from '../src/lib/leads.ts';
const valid = { ...emptyProject, city: 'Ville test', postalCode: 'H2X 1Y4', owner: 'oui', detached: 'oui', need: 'Grenier / combles', timing: 'Dans 1 à 3 mois', estimate: 'oui', name: 'Test Projet', phone: '514 555-0123', email: 'test@example.com', consent: true };
// Synthetic test coverage only; never used by the landing.
const coverage={validated:true,cities:['Ville test']};
test('all five qualification statuses and deterministic priority',()=>{
  assert.equal(classify(valid,coverage),'qualified');
  assert.equal(classify({...valid,owner:'non'},coverage),'unqualified_owner');
  assert.equal(classify({...valid,detached:'non'},coverage),'unqualified_property_type');
  assert.equal(classify({...valid,city:'Toronto',postalCode:'M5V 2T6'},coverage),'out_of_area');
  assert.equal(classify({...valid,timing:'Je me renseigne pour le moment'},coverage),'low_intent');
  assert.equal(classify({...valid,estimate:'non'},coverage),'low_intent');
  assert.equal(classify({...valid,owner:'non',detached:'non',estimate:'non'},coverage),'unqualified_owner');
});
test('unconfirmed geography cannot qualify or falsely reject a location',()=>{
  assert.equal(classify(valid),null);
  assert.equal(coverageStatus(valid.city,valid.postalCode),'pending');
  assert.equal(coverageStatus(valid.city,'h2x 1y4',coverage),'inside');
  assert.equal(coverageStatus('Toronto','M5V 2T6',coverage),'outside');
});
test('disqualifying answers work before collecting contact information',()=>{
  assert.equal(classify({...emptyProject,owner:'non'}),'unqualified_owner');
  assert.equal(classify({...emptyProject,owner:'oui',detached:'non'}),'unqualified_property_type');
  assert.equal(classify({...emptyProject,timing:'Je me renseigne pour le moment'}),'low_intent');
});
test('complete inputs and consent are required to qualify',()=>{
  for(let step=0;step<4;step++) { assert.equal(validateStep(step,valid),null);assert.ok(validateStep(step,emptyProject)); }
  assert.equal(classify({...valid,consent:false},coverage),null);
  assert.equal(classify({...valid,email:''},coverage),'qualified');
  assert.ok(validateStep(2,{...valid,timing:'unexpected'}));
  assert.ok(validateStep(1,{...valid,owner:'unexpected'}));
  assert.ok(validateStep(3,{...valid,phone:'123'}));
  assert.ok(validateStep(0,{...valid,postalCode:'12345'}));
  assert.equal(validateStep(0,{...valid,postalCode:'M5V 2T6'}),null);
});
test('each submission retains all requested attribution and independent ID',()=>{
  const query='?source=paid&campaign=c1&ad=a1&creative=video&utm_source=meta&utm_campaign=renovation&fbclid=fb1&gclid=g1&email=private';
  const a=captureAttribution(query);
  const lead=buildLead(valid,a,coverage), other=buildLead(valid,a,coverage);
  for(const key of attributionKeys) assert.equal(lead[key],a[key]);
  for(const key of ['source','campaign','ad','creative','utm_source','utm_campaign','fbclid','gclid']) assert.ok(lead[key]);
  assert.equal(a.email,undefined);assert.notEqual(lead.lead_id,other.lead_id);
  assert.ok(Date.parse(lead.timestamp));assert.equal(lead.delivery,'not_sent');assert.equal(lead.project.postalCode,'H2X1Y4');
  assert.equal(lead.consent.timestamp,lead.timestamp);
});
test('pending submissions are explicit and never counted as qualified',()=>{
  const lead=buildLead(valid,captureAttribution(''));
  assert.equal(lead.classification,null);assert.equal(lead.qualification_pending,true);assert.equal(lead.coverage_status,'pending');
  assert.equal(lead.source,null);
});

test('optional email remains validated when supplied and never bypasses qualification',()=>{
  for(const email of ['', '   ']) {
    assert.equal(validateStep(3,{...valid,email}),null);
    assert.equal(classify({...valid,email},coverage),'qualified');
    assert.equal(classify({...valid,email,owner:'non'},coverage),'unqualified_owner');
    assert.equal(classify({...valid,email,detached:'non'},coverage),'unqualified_property_type');
    assert.equal(classify({...valid,email,timing:'Je me renseigne pour le moment'},coverage),'low_intent');
    assert.equal(classify({...valid,email,city:'Toronto',postalCode:'M5V 2T6'},coverage),'out_of_area');
    assert.equal(classify({...valid,email,consent:false},coverage),null);
    assert.equal(classify({...valid,email,phone:''},coverage),null);
    assert.equal(classify({...valid,email,name:''},coverage),null);
    assert.equal(classify({...valid,email}),null);
  }
  assert.ok(validateStep(3,{...valid,email:'invalide'}));
  assert.equal(classify({...valid,email:'invalide'},coverage),null);
});

// Submission contract: success is impossible without a confirmed server receipt.
import { submitLead } from '../src/lib/lead-submission.ts';
test('default receiver requires a working same-origin server, never fake success',async()=>{
  const payload=buildLead(valid,captureAttribution('?utm_source=meta'));
  await assert.rejects(submitLead(payload,new AbortController().signal,undefined),/./);
});
test('server errors and unconfirmed HTTP 200 responses cannot become success',async()=>{
  const payload=buildLead(valid,captureAttribution(''));
  for(const receiver of [
    async()=>new Response('{}',{status:500}),
    async()=>new Response('{}',{status:200}),
    async()=>new Response(JSON.stringify({accepted:true,lead_id:'wrong'}),{status:200}),
    async()=>new Response('not json',{status:200}),
    async()=>{throw new Error('network error');},
  ]) await assert.rejects(submitLead(payload,new AbortController().signal,receiver));
});
test('only a successful explicit matching server receipt unlocks success',async()=>{
  const payload=buildLead(valid,captureAttribution('?utm_source=meta&gclid=test'));
  const controller=new AbortController();
  const receiver=async(body,signal)=>{
    assert.equal(body,payload);assert.equal(body.utm_source,'meta');assert.equal(body.gclid,'test');assert.equal(signal,controller.signal);
    return new Response(JSON.stringify({accepted:true,lead_id:body.lead_id}),{status:201});
  };
  assert.deepEqual(await submitLead(payload,controller.signal,receiver),{accepted:true,lead_id:payload.lead_id});
});

import { attributionHref } from '../src/lib/attribution.ts';
import { firstInvalidField } from '../src/lib/validation.ts';
test('every isolation need is supported, other product needs are rejected',()=>{
 for(const need of ['Grenier / combles','Murs','Sous-sol','Plusieurs zones','À déterminer']) assert.equal(validateStep(2,{...valid,need}),null);
 assert.ok(validateStep(2,{...valid,need:'Remplacement'}));
});
test('landing to form and return links preserve every attribution key',()=>{
 const params=new URLSearchParams(attributionKeys.map(key=>[key,`value + ${key}`]));
 const href=attributionHref('/isolation/estimation',`?${params}`);
 assert.deepEqual(captureAttribution(href.split('?')[1]),captureAttribution(`?${params}`));
 assert.equal(attributionHref('/', '?email=private'),'/');
});
test('normalization and validation errors identify their field',()=>{
 const lead=buildLead({...valid,phone:'+1 (514) 555-0123'},captureAttribution(''));
 assert.equal(lead.project.phone,'5145550123');
 assert.equal(firstInvalidField(0,{...valid,city:''}),'city');
 assert.equal(firstInvalidField(0,{...valid,postalCode:'bad'}),'postalCode');
 assert.equal(firstInvalidField(3,{...valid,consent:false}),'consent');
 for(let step=0;step<4;step++) assert.equal(firstInvalidField(step,valid),null);
});
test('aborted requests never accept a receipt',async()=>{
 const lead=buildLead(valid,captureAttribution('')),controller=new AbortController();
 controller.abort();
 await assert.rejects(submitLead(lead,controller.signal,async()=>new Response(JSON.stringify({accepted:true,lead_id:lead.lead_id}))));
});

test('a receiver that never responds times out without success',async()=>{
 const lead=buildLead(valid,captureAttribution(''));
 await assert.rejects(submitLead(lead,new AbortController().signal,()=>new Promise(()=>{}),10),/timed out/);
});
test('cancellation interrupts even a receiver that ignores its signal',async()=>{
 const lead=buildLead(valid,captureAttribution('')),controller=new AbortController();
 const pending=submitLead(lead,controller.signal,()=>new Promise(()=>{}));
 controller.abort(); await assert.rejects(pending);
});
