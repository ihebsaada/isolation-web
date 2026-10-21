import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateCoverageProposal, hasSharedSegment } from '../scripts/coverage-review/proposed-classifier.mjs';
import { parseCsv } from '../scripts/coverage-review/csv.mjs';
import { serviceCoverage } from '../src/data/isolation.ts';
import { coverageStatus } from '../src/lib/service-area.ts';

const read=name=>JSON.parse(fs.readFileSync(new URL('../work/coverage-review/'+name,import.meta.url),'utf8'));
const snapshot=read('postal-reference-sample.json');
const policy={validated:true,version:'synthetic-test-policy',snapshotVersion:snapshot.version,approvedIds:['65005'],excludedIds:[]};

test('proposal uses exact full postal/municipal correspondence, never a G/H/J prefix',()=>{
  assert.equal(evaluateCoverageProposal('Laval','H7N 1A1',snapshot,policy).status,'inside');
  assert.deepEqual(evaluateCoverageProposal('Laval','H2X1Y4',snapshot,policy),{
    status:'invalid',reason:'city_postal_mismatch',municipalityId:'65005',
  });
  assert.equal(evaluateCoverageProposal('Montreal','H2X1Y4',snapshot,policy).status,'pending');
  assert.equal(evaluateCoverageProposal('Laval','H7Z9Z9',snapshot,policy).status,'pending');
});

test('production remains on existing exact cities; proposal policy is explicitly unvalidated',()=>{
  const draft=read('proposed-policy.json');
  assert.equal(draft.validated,false);assert.equal(draft.version,null);
  assert.equal(draft.approvedIds.length,23);assert.equal(serviceCoverage.cities.length,23);
  for(const city of ['Terrebonne','Repentigny','Joliette'])assert.ok(serviceCoverage.cities.includes(city));
  assert.equal(coverageStatus('Delson','J5B0A1'),'pending');
  assert.equal(evaluateCoverageProposal('Laval','H7N1A1',snapshot,draft).status,'pending');
});

test('an adjacent candidate is never approved automatically or by transitive expansion',()=>{
  assert.equal(evaluateCoverageProposal('Delson','J5B0A1',snapshot,{...policy,candidateIds:['67025']}).status,'pending');
  const approved={...policy,approvedIds:[...policy.approvedIds,'67025']};
  assert.equal(evaluateCoverageProposal('Delson','J5B0A1',snapshot,approved).status,'inside');
  assert.equal(evaluateCoverageProposal('Montreal','H2X1Y4',snapshot,approved).status,'pending');
});

test('outside requires a coherent pair and an explicitly validated exclusion',()=>{
  const exclusion={...policy,excludedIds:['66023']};
  assert.equal(evaluateCoverageProposal('Montréal','H2X1Y4',snapshot,exclusion).status,'outside');
  assert.equal(evaluateCoverageProposal('Laval','H2X1Y4',snapshot,exclusion).status,'invalid');
  assert.equal(evaluateCoverageProposal('Montréal','H2X1Y4',snapshot,{...exclusion,validated:false}).status,'pending');
});

test('missing evidence, stale policy versions and unknown names fail closed to pending',()=>{
  for(const reference of [null,{}])assert.equal(evaluateCoverageProposal('Laval','H7N1A1',reference,policy).status,'pending');
  assert.equal(evaluateCoverageProposal('Laval','H7N1A1',snapshot,{...policy,snapshotVersion:'older'}).status,'pending');
  assert.equal(evaluateCoverageProposal('Localité inconnue','H7N1A1',snapshot,policy).status,'pending');
  const collision={...snapshot,names:{...snapshot.names,laval:['65005','66023']}};
  assert.equal(evaluateCoverageProposal('Laval','H7N1A1',collision,policy).reason,'city_ambiguous');
});

test('shared postal codes retain all municipality links; no majority threshold is invented',()=>{
  const ids=snapshot.postals.G0A1E0;assert.equal(ids.length,3);
  const municipality=snapshot.municipalities[ids[0]];
  assert.equal(evaluateCoverageProposal(municipality.name,'G0A1E0',snapshot,{...policy,approvedIds:ids}).reason,'postal_shared_between_municipalities');
});

test('malformed input is invalid; unknown/retired formatted postal code is pending',()=>{
  for(const cp of ['',null,'12345','D1A1A1','H2X  1Y4'])assert.equal(evaluateCoverageProposal('Laval',cp,snapshot,policy).status,'invalid');
  assert.equal(evaluateCoverageProposal('','H7N1A1',snapshot,policy).status,'invalid');
  assert.equal(evaluateCoverageProposal('Laval','H7Z9Z9',snapshot,policy).reason,'postal_unknown_or_retired');
});

test('CSV preparation preserves quoted names, embedded newlines, BOM and missing columns',()=>{
  assert.deepEqual(parseCsv('\uFEFF"code","name"\r\n"01","Nom, ""Test"""\r\n'),[['code','name'],['01','Nom, "Test"']]);
  assert.deepEqual(parseCsv('a,b\n"x\ny",\n'),[['a','b'],['x\ny','']]);
  assert.throws(()=>parseCsv('"unclosed'));
});

test('shared-segment evidence is directional-independent, exact and conservative',()=>{
  const first={rings:[[[0,0],[1,0],[1,1],[0,0]]]};
  const lineNeighbour={rings:[[[1,1],[1,0],[2,1],[1,1]]]};
  const pointNeighbour={rings:[[[1,1],[2,2],[1,2],[1,1]]]};
  assert.equal(hasSharedSegment(first,lineNeighbour),true);
  assert.equal(hasSharedSegment(first,pointNeighbour),false);
  assert.equal(hasSharedSegment(first,{rings:[[[1,1],[1,0.5],[1,0],[2,1],[1,1]]]}),false);
});

test('review matrix is complete for snapshot and contains no new activated municipality',()=>{
  const rows=read('municipality-matrix.json'),summary=read('summary.json'),evidence=read('adjacency-evidence.json');
  assert.equal(rows.length,130);assert.equal(rows.filter(r=>r.categorie==='reference_approuvee').length,23);
  assert.equal(rows.filter(r=>r.categorie==='candidate_frontiere_partagee').length,99);
  assert.equal(summary.productionAdditions,0);
  const expectedIds=new Set([...evidence.anchors.map(a=>a.id),...evidence.adjacency.flatMap(a=>a.neighbours.map(n=>n.MUS_CO_GEO))]);
  assert.deepEqual(new Set(rows.map(r=>r.code)),expectedIds);
  for(const row of rows.filter(r=>r.categorie!=='reference_approuvee'))assert.match(row.decision_metier,/EN ATTENTE/);
  const montreal=rows.find(r=>r.municipalite==='Montréal');assert.match(montreal.incertitudes,/non approuvée/);
});
