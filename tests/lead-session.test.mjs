import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,validSession,equal} from '../src/lib/lead-session.ts';
test('correct/incorrect code and signed session validation, logout, tampering and rotation',()=>{
 process.env.LEADS_ACCESS_CODE='synthetic-test-code-123456';
 assert.equal(equal('correct','correct'),true);assert.equal(equal('wrong','correct'),false);
 const token=newSession();assert.equal(validSession(token),true);assert.equal(validSession(''),false);
 assert.equal(validSession(token+'extra'),false);assert.equal(validSession('0.'+token.split('.').slice(1).join('.')),false);
 process.env.LEADS_ACCESS_CODE='rotated-synthetic-test-code';assert.equal(validSession(token),false);
 delete process.env.LEADS_ACCESS_CODE;assert.equal(validSession(token),false);assert.throws(()=>newSession());
});
