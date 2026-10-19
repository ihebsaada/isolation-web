import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {makeRecord} from '../src/lib/lead-record.ts';
import {buildLead,captureAttribution,emptyProject} from '../src/lib/leads.ts';
function harness(){
 const data=[],props={INTEGRATION_SECRET:'test-token',SHEET_ID:'test'};
 const sheet={getLastRow:()=>data.length,appendRow:r=>data.push([...r]),getDataRange:()=>({getDisplayValues:()=>data.map(r=>r.map(String))}),getRange:(row,col)=>({setNumberFormat(){return this;},setValues(values){data[row-1]??=[];values[0].forEach((v,i)=>data[row-1][col-1+i]=v);return this;}})};
 const context=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperty:(k,v)=>props[k]=v})},LockService:{getScriptLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush(){}},ContentService:{MimeType:{JSON:'json'},createTextOutput:v=>({setMimeType:()=>v})}});
 vm.runInContext(fs.readFileSync(new URL('../scripts/google-apps-script.gs',import.meta.url),'utf8'),context);
 return {data,call:b=>JSON.parse(context.doPost({postData:{contents:JSON.stringify({token:'test-token',...b})}}))};
}
function lead(){return makeRecord({...buildLead({...emptyProject,city:'Montreal',postalCode:'H2X1Y4',owner:'oui',detached:'oui',need:'Murs',timing:'Dans 1 à 3 mois',estimate:'oui',name:'Test',phone:'5145550123',consent:true},captureAttribution('')),website:''});}
test('Apps Script appends once per ID and updates by ID after rows move',()=>{const h=harness(),a=lead(),b=lead();assert.equal(h.call({action:'append',lead:a}).ok,true);h.call({action:'append',lead:a});h.call({action:'append',lead:b});assert.equal(h.data.length,3);[h.data[1],h.data[2]]=[h.data[2],h.data[1]];assert.equal(h.call({action:'update',lead_id:a.lead_id,call_status:'appointment',notes:'Called'}).ok,true);const rows=h.call({action:'list'}).leads;assert.equal(rows.find(r=>r.lead_id===a.lead_id).notes,'Called');assert.equal(rows.find(r=>r.lead_id===b.lead_id).notes,'');assert.equal(h.call({action:'update',lead_id:'missing',call_status:'refused',notes:''}).ok,false);});
test('Apps Script rejects unauthorized, malformed and schema-mismatched writes',()=>{const h=harness();assert.equal(h.call({token:'wrong',action:'list'}).ok,false);assert.equal(h.call({action:'append',lead:{}}).ok,false);assert.equal(h.data.length,1);h.data[0][0]='wrong';assert.equal(h.call({action:'append',lead:lead()}).ok,false);assert.equal(h.data.length,1);});
test('shared login limiter allows five attempts per address then blocks',()=>{const h=harness();for(let i=0;i<5;i++)assert.equal(h.call({action:'loginAttempt',key:'a'.repeat(64)}).allowed,true);assert.equal(h.call({action:'loginAttempt',key:'a'.repeat(64)}).allowed,false);assert.equal(h.call({action:'loginAttempt',key:'b'.repeat(64)}).allowed,true);});
