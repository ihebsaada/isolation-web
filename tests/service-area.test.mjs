import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceCoverage } from '../src/data/isolation.ts';
import { normalizeCity, coverageStatus, validPostalCode } from '../src/lib/service-area.ts';
import { buildLead, classify, emptyProject, captureAttribution, validateStep } from '../src/lib/leads.ts';
import { makeRecord, columns } from '../src/lib/lead-record.ts';
import { conversionEvents } from '../src/lib/meta.ts';

const project = { ...emptyProject, city:'Laval', postalCode:'H7N 1A1', owner:'oui', detached:'oui',
  need:'Murs', timing:'Dans 1 à 3 mois', estimate:'oui', name:'Synthetic Test', phone:'5145550123', consent:true };
function record(overrides = {}) {
  const input = {...project,...overrides};
  return makeRecord({ ...buildLead(input,captureAttribution('')), project:input, website:'' });
}

for (const city of ['Châteauguay', 'Saint-Jean-sur-Richelieu', 'St Jean sur Richelieu',
  'Saint-Bruno-de-Montarville', 'St Bruno de montarville', 'Laval', 'Deux-Montagnes', 'Saint-Jérôme']) {
  test(`approved city qualifies: ${city}`, () => {
    const result = record({city});
    assert.equal(result.qualification_status,'qualified');
    assert.equal(result.qualification_pending,'false');
    assert.deepEqual(conversionEvents(result.qualification_status),['Lead','QualifiedLead']);
    assert.deepEqual(Object.keys(result),columns);
  });
}

test('all and only the 23 supplied cities are on the approval list', () => {
  assert.deepEqual([...serviceCoverage.cities],[
    'Beauharnois','Châteauguay','Candiac','Saint-Jean-sur-Richelieu','Granby','Sherbrooke',
    'Drummondville','Varennes','Beloeil','Sainte-Julie','Saint-Bruno-de-Montarville','Chambly',
    'Laval','Pointe-Calumet','Deux-Montagnes','Saint-Eustache','Boisbriand','Mirabel',
    'Saint-Jérôme','Terrebonne','Repentigny','Joliette','Rawdon',
  ]);
  for(const city of serviceCoverage.cities)assert.equal(record({city}).qualification_status,'qualified');
});

test('safe exact normalization: accents, case, whitespace, hyphens and Saint abbreviations', () => {
  for(const [input,expected] of [
    ['  CHÂTEAUGUAY  ','chateauguay'], [' St. Jean-sur-Richelieu ','saint jean sur richelieu'],
    ['St-Jérôme','saint jerome'],['Ste. Julie','sainte julie'],['SAINT–BRUNO de  Montarville','saint bruno de montarville'],
  ])assert.equal(normalizeCity(input),expected);
  for(const city of ['Châteauguay Sud','Lavaltrie','Laval-des-Rapides','Saint-Jean','St Bruno','Saint Jérôme Nord']) {
    assert.equal(record({city}).qualification_status,'pending');
    assert.equal(record({city}).qualification_pending,'true');
  }
});

test('Montréal and Montreal remain pending, never approved', () => {
  for(const city of ['Montréal','Montreal']){
    const result=record({city,postalCode:'H2X 1Y4'});
    assert.equal(result.qualification_status,'pending');assert.equal(result.qualification_pending,'true');
    assert.deepEqual(conversionEvents(result.qualification_status),['Lead']);
  }
});

test('unlisted Québec municipality remains pending without inferring proximity or expanding by prefix', () => {
  for(const postalCode of ['J0K 1A0','H7N 1A1','G1A 0A2']){
    const result=record({city:'Municipalité non confirmée',postalCode});
    assert.equal(result.qualification_status,'pending');assert.equal(result.qualification_pending,'true');
    assert.equal(classify({...project,city:'Municipalité non confirmée',postalCode}),null);
  }
});

test('clearly unrelated city outside Québec is rejected/out_of_area', () => {
  for(const [city,postalCode] of [['Toronto','M5V 2T6'],['Vancouver','V6B 1A1']]){
    assert.equal(classify({...project,city,postalCode}),'out_of_area');
    const result=record({city,postalCode});
    assert.equal(result.qualification_status,'rejected');assert.equal(result.qualification_pending,'false');
  }
});

test('invalid Canadian postal codes classify as invalid and cannot persist', () => {
  for(const postalCode of ['12345','D1A 1A1','H2X  1Y4','H2X1Y','H2X1Y44']){
    assert.equal(validPostalCode(postalCode),false);
    assert.equal(coverageStatus('Laval',postalCode),'invalid');
    assert.equal(classify({...project,postalCode}),'invalid');
    assert.ok(validateStep(0,{...project,postalCode}));
    assert.throws(()=>record({postalCode}));
  }
  assert.equal(record({postalCode:' h7n 1a1 '}).postal_code,'H7N1A1');
});

test('approved cities still require ownership, property, valid intent, contact details and consent', () => {
  for(const [overrides,status] of [[{owner:'non'},'rejected'],[{detached:'non'},'rejected'],
    [{estimate:'non'},'low_intent'],[{timing:'Je me renseigne pour le moment'},'low_intent']]) {
    const result=record(overrides);assert.equal(result.qualification_status,status);
    assert.equal(result.qualification_pending,'false');
  }
  for(const overrides of [{consent:false},{name:''},{phone:'123'},{estimate:'unexpected'},{timing:'unexpected'}]) {
    assert.notEqual(classify({...project,...overrides}),'qualified');assert.throws(()=>record(overrides));
  }
});
