import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildGroups, renderReview } from '../scripts/coverage-review/build-business-validation.mjs';

const rows = JSON.parse(fs.readFileSync('work/coverage-review/municipality-matrix.json', 'utf8'));

test('business lots cover all 99 candidates and 8 other cases exactly once', () => {
  const groups = buildGroups(rows);
  const members = groups.flatMap(g => g.members);
  assert.equal(members.length, 107);
  assert.equal(new Set(members.map(r => r.code)).size, 107);
  assert.equal(members.filter(r => r.categorie === 'candidate_frontiere_partagee').length, 99);
  assert.equal(rows.filter(r => r.categorie === 'reference_approuvee').length, 23);
  assert.ok(groups.every(g => !g.validated && g.decision_client === 'vérifier'));
  assert.ok(groups.every(g => ['approuver', 'exclure', 'vérifier'].includes(g.recommendation)));
});

test('sensitive geographic cases have explicit separate review buckets', () => {
  const groups = buildGroups(rows);
  const owner = code => groups.find(g => g.members.some(r => r.code === code));
  assert.equal(owner('66023').id, 'URB');
  assert.equal(owner('58227').id, 'URB');
  assert.equal(owner('58007').id, 'TOP');
  assert.equal(owner('71065').id, 'EAU');
  assert.equal(owner('67802').id, 'TER');
  assert.equal(owner('72802').id, 'TER');
  assert.equal(groups.find(g => g.id === 'TNO-EAU').members.length, 5);
  assert.equal(groups.find(g => g.id === 'TNO-TER').members.length, 1);
});

test('population does not affect recommendations or group ownership; source rows remain intact', () => {
  const before = JSON.stringify(rows);
  const signature = input => buildGroups(input).map(g => [g.id, g.recommendation, g.members.map(r => r.code)]);
  assert.deepEqual(signature(rows), signature(rows.map(r => ({...r, population_mamh: 99999999}))));
  assert.equal(JSON.stringify(rows), before);
});

test('review preserves every reference association and keeps postal uncertainty separate from intent', () => {
  const groups = buildGroups(rows);
  const report = renderReview(rows, groups);
  for (const r of rows.filter(r => r.categorie === 'reference_approuvee')) assert.ok(report.includes(`| ${r.municipalite} |`));
  assert.match(report, /city_postal_mismatch/);
  assert.match(report, /aucun événement QualifiedLead/);
  assert.match(report, /qualification_pending=true/);
  const policy = JSON.parse(fs.readFileSync('work/coverage-review/proposed-policy.json', 'utf8'));
  assert.equal(policy.validated, false);
  assert.equal(policy.approvedIds.length, 23);
});
