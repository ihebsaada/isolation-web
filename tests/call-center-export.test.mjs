import test from 'node:test';
import assert from 'node:assert/strict';
import { callCenterCsv, callCenterColumns } from '../src/lib/call-center-export.ts';
import { columns, csv } from '../src/lib/lead-record.ts';

export const sampleLead = {
  ...Object.fromEntries(columns.map(k => [k, ''])),
  lead_id: '11111111-1111-4111-8111-111111111111',
  submitted_at: '2026-01-15T15:30:00Z', name: 'Émilie Test', phone: '5145550123',
  email: 'synthetic@example.invalid', city: 'Montréal', postal_code: 'H2X1Y4',
  homeowner: 'oui', property_type: 'detached', insulation_need: 'Murs',
  project_timeline: 'Dans 1 à 3 mois', intent: 'oui', qualification_status: 'qualified',
  qualification_pending: 'false', call_status: 'new', notes: 'Rappeler demain',
  utm_source: 'meta', utm_campaign: 'Campagne été', utm_content: 'Créative A',
  fbclid: 'technical-fb', gclid: 'technical-g',
};

test('call-center CSV has BOM, exactly the French columns, readable labels and Toronto winter time', () => {
  const text = callCenterCsv([sampleLead]);
  assert.equal(text.charCodeAt(0), 0xfeff);
  assert.equal(text.split('\r\n')[0].slice(1), callCenterColumns.map(c => '"' + c + '"').join(','));
  assert.equal(callCenterColumns.length, 17);
  for (const value of ['Émilie Test', '5145550123', 'H2X1Y4', 'Montréal', 'Maison individuelle', 'Qualifié', 'Nouveau', 'Créative A']) assert.ok(text.includes(value), value);
  assert.match(text, /10:30:00/);
  for (const technical of ['lead_id', 'utm_', 'fbclid', 'gclid', 'technical-fb', 'technical-g']) assert.ok(!text.includes(technical));
});

test('Toronto daylight saving time, pending qualification, legacy attribution and empty export', () => {
  const text = callCenterCsv([{...sampleLead, submitted_at:'2026-07-15T15:30:00Z',
    qualification_status:'low_intent',qualification_pending:'true',call_status:'appointment',
    utm_source:'',utm_campaign:'',utm_content:'',source:'legacy source',campaign:'legacy campaign',creative:'legacy creative',ad:'ad A'}]);
  for (const value of ['11:30:00', 'Faible intention — secteur à vérifier', 'Rendez-vous', 'legacy source', 'legacy campaign', 'legacy creative / ad A']) assert.ok(text.includes(value), value);
  assert.equal(callCenterCsv([]).split('\r\n').length, 1);
});

test('call-center CSV escapes quotes, commas, newlines and spreadsheet formula prefixes', () => {
  const text=callCenterCsv([{...sampleLead,name:'Nom, "Test"',notes:'Ligne 1\nLigne 2'}]);
  assert.ok(text.includes('"Nom, ""Test"""'));
  assert.ok(text.includes('"Ligne 1\nLigne 2"'));
  for(const notes of ['=1+1','+SUM(A1)','-1+2','@SUM(A1)','\t=1','\r=1','  =1']) {
    assert.ok(callCenterCsv([{...sampleLead,notes}]).includes('"\''+notes+'"'));
  }
  assert.ok(!callCenterCsv([{...sampleLead,phone:'0012345678'}]).includes('="'));
});

test('full technical export retains stable columns and identifiers unchanged', () => {
  const text=csv([sampleLead]);
  assert.equal(text.slice(1).split('\r\n')[0],columns.join(','));
  for(const value of [sampleLead.lead_id,sampleLead.fbclid,sampleLead.gclid,'utm_content','qualification_pending']) assert.ok(text.includes(value));
});
